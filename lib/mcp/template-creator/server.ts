#!/usr/bin/env node

/**
 * Custom Template Creator MCP Server
 *
 * This MCP server provides tools for extracting clean, reusable templates
 * from example GitHub repositories by removing custom implementation details.
 *
 * Tools provided:
 * 1. extract_template - Extract a clean template from repository code
 * 2. analyze_structure - Analyze repository structure and identify template-worthy files
 * 3. generate_boilerplate - Generate boilerplate code based on patterns
 */

import { Octokit } from '@octokit/rest';
import { minimatch } from 'minimatch';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Buffer } from 'node:buffer';
import path from 'node:path';

interface TemplateExtractionOptions {
  preserveStructure: boolean;
  keepComments: boolean;
  includeTypes: boolean;
  removeBusinessLogic: boolean;
}

interface ExtractedTemplate {
  files: TemplateFile[];
  structure: string;
  instructions: string[];
  placeholders: Record<string, string>;
}

interface TemplateFile {
  path: string;
  content: string;
  description: string;
  placeholders: string[];
}

interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string | null;
  topics: string[];
  language?: string | null;
  htmlUrl: string;
}

interface GitTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
}

interface PlaceholderReplacement {
  placeholder: string;
  description: string;
  patterns: RegExp[];
}

const MAX_FILES = 120;
const MAX_FILE_SIZE_BYTES = 500_000;

function getFilePriority(filePath: string): number {
  const normalized = filePath.toLowerCase();
  let score = 0;

  if (normalized.startsWith('.git')) score -= 5;
  if (normalized.includes('readme')) score -= 1;
  if (normalized.includes('license')) score -= 2;
  if (normalized.includes('.github/workflows')) score -= 3;

  if (/\b(src|app|lib|server|services|api|backend|core|pkg|project)\b/.test(normalized)) {
    score += 6;
  }
  if (/\btests?\b/.test(normalized)) {
    score += 4;
  }

  if (/\.(ts|tsx|js|jsx|py|go|rs|java|kt|rb|cs|php)$/.test(normalized)) {
    score += 8;
  }
  if (/\.(json|yaml|yml|toml|env|ini)$/.test(normalized)) {
    score += 2;
  }

  const depth = normalized.split('/').length;
  score += Math.min(depth, 6);

  return score;
}

class TemplateCreatorServer {
  private server: Server;
  private octokit: Octokit | null = null;
  private repoCache = new Map<string, RepoContext>();
  private treeCache = new Map<string, GitTreeItem[]>();

  constructor() {
    this.server = new Server(
      {
        name: 'template-creator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'extract_template':
          return await this.extractTemplate(args);
        case 'analyze_structure':
          return await this.analyzeStructure(args);
        case 'generate_boilerplate':
          return await this.generateBoilerplate(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'extract_template',
        description: 'Extract a clean, reusable template from repository code by removing custom implementation details and replacing them with placeholders',
        inputSchema: {
          type: 'object',
          properties: {
            repoUrl: {
              type: 'string',
              description: 'GitHub repository URL to extract template from',
            },
            filePatterns: {
              type: 'array',
              items: { type: 'string' },
              description: 'File patterns to include (e.g., ["*.ts", "*.tsx", "package.json"])',
            },
            options: {
              type: 'object',
              properties: {
                preserveStructure: {
                  type: 'boolean',
                  description: 'Keep directory structure intact',
                  default: true,
                },
                keepComments: {
                  type: 'boolean',
                  description: 'Preserve code comments',
                  default: true,
                },
                includeTypes: {
                  type: 'boolean',
                  description: 'Keep TypeScript types and interfaces',
                  default: true,
                },
                removeBusinessLogic: {
                  type: 'boolean',
                  description: 'Remove specific business logic, keep structure',
                  default: true,
                },
              },
            },
          },
          required: ['repoUrl', 'filePatterns'],
        },
      },
      {
        name: 'analyze_structure',
        description: 'Analyze repository structure to identify key files and patterns suitable for template extraction',
        inputSchema: {
          type: 'object',
          properties: {
            repoUrl: {
              type: 'string',
              description: 'GitHub repository URL to analyze',
            },
            depth: {
              type: 'number',
              description: 'Directory depth to analyze',
              default: 3,
            },
          },
          required: ['repoUrl'],
        },
      },
      {
        name: 'generate_boilerplate',
        description: 'Generate boilerplate code based on detected patterns and best practices',
        inputSchema: {
          type: 'object',
          properties: {
            technology: {
              type: 'string',
              description: 'Technology/framework (e.g., "react", "express", "nextjs")',
            },
            features: {
              type: 'array',
              items: { type: 'string' },
              description: 'Features to include (e.g., ["authentication", "database", "testing"])',
            },
            typescript: {
              type: 'boolean',
              description: 'Use TypeScript',
              default: true,
            },
          },
          required: ['technology', 'features'],
        },
      },
    ];
  }

  private getOctokit(): Octokit {
    if (this.octokit) {
      return this.octokit;
    }

    const token = process.env.GITHUB_TOKEN;
    this.octokit = new Octokit(
      token
        ? { auth: token }
        : {}
    );
    return this.octokit;
  }

  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
    try {
      const cleanedUrl = repoUrl.replace(/\.git$/, '');
      const parsed = new URL(cleanedUrl);

      if (!parsed.hostname.endsWith('github.com')) {
        throw new Error('Only GitHub repositories are supported at this time.');
      }

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length < 2) {
        throw new Error('Invalid repository URL. Expected format: https://github.com/owner/repo');
      }

      return {
        owner: segments[0],
        repo: segments[1],
      };
    } catch (error) {
      throw new Error(`Failed to parse repository URL "${repoUrl}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getRepoContext(repoUrl: string): Promise<RepoContext> {
    const cacheKey = repoUrl;
    if (this.repoCache.has(cacheKey)) {
      return this.repoCache.get(cacheKey)!;
    }

    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const octokit = this.getOctokit();

    try {
      const { data } = await octokit.repos.get({
        owner,
        repo,
      });

      const context: RepoContext = {
        owner,
        repo,
        defaultBranch: data.default_branch ?? 'main',
        description: data.description,
        topics: data.topics ?? [],
        language: data.language,
        htmlUrl: data.html_url,
      };

      this.repoCache.set(cacheKey, context);
      return context;
    } catch (error) {
      if (this.isGitHubAuthError(error)) {
        throw new Error(
          `Unable to access ${owner}/${repo}. Make sure the repository exists and that you have configured a GITHUB_TOKEN with appropriate permissions.`
        );
      }
      throw error;
    }
  }

  private async getRepoTree(context: RepoContext, ref?: string): Promise<GitTreeItem[]> {
    const branch = ref ?? context.defaultBranch;
    const cacheKey = `${context.owner}/${context.repo}@${branch}`;

    if (this.treeCache.has(cacheKey)) {
      return this.treeCache.get(cacheKey)!;
    }

    const octokit = this.getOctokit();
    try {
      const { data } = await octokit.git.getTree({
        owner: context.owner,
        repo: context.repo,
        tree_sha: branch,
        recursive: '1',
      });

      const tree: GitTreeItem[] = (data.tree ?? [])
        .filter((item): item is GitTreeItem => !!item.path && !!item.sha)
        .map((item) => ({
          path: item.path!,
          type: item.type === 'tree' ? 'tree' : 'blob',
          size: item.size,
          sha: item.sha!,
        }));

      this.treeCache.set(cacheKey, tree);
      return tree;
    } catch (error) {
      if (this.isGitHubAuthError(error)) {
        throw new Error(
          `Unable to list files for ${context.owner}/${context.repo}. Ensure GITHUB_TOKEN grants access to this repository.`
        );
      }
      throw error;
    }
  }

  private async fetchFileContent(context: RepoContext, filePath: string, ref?: string): Promise<{ content: string; size: number }> {
    const octokit = this.getOctokit();
    try {
      const response = await octokit.repos.getContent({
        owner: context.owner,
        repo: context.repo,
        path: filePath,
        ref: ref ?? context.defaultBranch,
      });

      if (Array.isArray(response.data) || response.data.type !== 'file' || !response.data.content) {
        throw new Error(`Unable to fetch file content for ${filePath}`);
      }

      const buffer = Buffer.from(response.data.content, 'base64');
      return {
        content: buffer.toString('utf8'),
        size: response.data.size ?? buffer.length,
      };
    } catch (error) {
      if (this.isGitHubAuthError(error)) {
        throw new Error(
          `Unable to read ${filePath} in ${context.owner}/${context.repo}. Check repository visibility or provide a GITHUB_TOKEN with access.`
        );
      }
      throw error;
    }
  }

  private isGitHubAuthError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const status = (error as any).status;
    return status === 401 || status === 403 || status === 404;
  }

  private isBinaryContent(content: string): boolean {
    const sample = content.slice(0, 1000);
    for (let i = 0; i < sample.length; i += 1) {
      if (sample.charCodeAt(i) === 0) {
        return true;
      }
    }
    return false;
  }

  private buildPlaceholderReplacements(context: RepoContext): PlaceholderReplacement[] {
    const replacements: PlaceholderReplacement[] = [];
    const patterns = (value?: string | null): RegExp[] => {
      if (!value) return [];
      const escaped = this.escapeRegExp(value);
      const alt = this.escapeRegExp(value.replace(/[-_]/g, ' '));
      return [
        new RegExp(escaped, 'gi'),
        new RegExp(alt, 'gi'),
      ];
    };

    replacements.push({
      placeholder: 'PROJECT_NAME',
      description: 'Repository name placeholder',
      patterns: patterns(context.repo),
    });

    replacements.push({
      placeholder: 'OWNER_NAME',
      description: 'GitHub owner or organization name',
      patterns: patterns(context.owner),
    });

    replacements.push({
      placeholder: 'REPO_URL',
      description: 'GitHub repository URL',
      patterns: [new RegExp(this.escapeRegExp(context.htmlUrl), 'gi')],
    });

    replacements.push({
      placeholder: 'DEFAULT_BRANCH',
      description: 'Default Git branch',
      patterns: patterns(context.defaultBranch),
    });

    if (context.description) {
      replacements.push({
        placeholder: 'PROJECT_DESCRIPTION',
        description: 'Short project description',
        patterns: patterns(context.description),
      });
    }

    return replacements;
  }

  private sanitizeFileContent(
    content: string,
    replacements: PlaceholderReplacement[],
    placeholderDescriptions: Record<string, string>
  ): { sanitized: string; placeholders: string[] } {
    let sanitized = content;
    const placeholdersUsed = new Set<string>();

    for (const replacement of replacements) {
      for (const regex of replacement.patterns) {
        if (!regex.source) {
          continue;
        }
        const before = sanitized;
        sanitized = sanitized.replace(regex, `{{${replacement.placeholder}}}`);
        if (before !== sanitized) {
          placeholdersUsed.add(replacement.placeholder);
          if (!placeholderDescriptions[replacement.placeholder]) {
            placeholderDescriptions[replacement.placeholder] = replacement.description;
          }
        }
      }
    }

    return { sanitized, placeholders: Array.from(placeholdersUsed) };
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildStructureTree(filePaths: string[]): string {
    if (filePaths.length === 0) {
      return '└── {{PROJECT_NAME}}/';
    }

    interface TreeNode {
      name: string;
      children: Map<string, TreeNode>;
      isFile: boolean;
    }

    const root: TreeNode = {
      name: '{{PROJECT_NAME}}',
      children: new Map(),
      isFile: false,
    };

    const insertPath = (node: TreeNode, segments: string[]) => {
      if (segments.length === 0) {
        return;
      }
      const [current, ...rest] = segments;
      if (!node.children.has(current)) {
        node.children.set(current, {
          name: current,
          children: new Map(),
          isFile: rest.length === 0,
        });
      }
      insertPath(node.children.get(current)!, rest);
    };

    filePaths
      .map((filePath) => filePath.split('/').filter(Boolean))
      .forEach((segments) => insertPath(root, segments));

    const lines: string[] = [];

    const traverse = (node: TreeNode, prefix: string, isLast: boolean, depth: number) => {
      const connector = depth === 0 ? '└── ' : (isLast ? '└── ' : '├── ');
      const linePrefix = depth === 0 ? '' : prefix;
      if (depth === 0) {
        lines.push(`${connector}${node.name}/`);
      } else {
        lines.push(`${linePrefix}${connector}${node.name}${node.isFile ? '' : '/'}`);
      }

      const children = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
      children.forEach((child, index) => {
        const childIsLast = index === children.length - 1;
        const nextPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
        traverse(child, nextPrefix, childIsLast, depth + 1);
      });
    };

    traverse(root, '', true, 0);
    return lines.join('\n');
  }

  private describeFile(filePath: string, extension: string): string {
    const normalized = filePath.toLowerCase();

    if (normalized.includes('readme')) {
      return 'Project documentation and onboarding guidance';
    }
    if (normalized.includes('.github/workflows')) {
      return 'GitHub Actions workflow for CI/CD automation';
    }
    if (normalized.includes('dependabot')) {
      return 'Dependabot configuration for automated dependency updates';
    }
    if (normalized.endsWith('license') || normalized.endsWith('license.md')) {
      return 'License terms for project distribution';
    }
    if (extension === '.md') {
      return 'Markdown documentation extracted from the example repository';
    }
    if (['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
      return 'Source code example from the reference repository';
    }
    if (['.yml', '.yaml'].includes(extension)) {
      return 'YAML configuration extracted from the reference repository';
    }
    if (extension === '.json') {
      return 'JSON configuration extracted from the reference repository';
    }
    return 'Template file extracted from the example repository';
  }

  private async extractTemplate(args: any) {
    const { repoUrl, filePatterns, options = {} } = args;

    try {
      // Fetch repository content, sanitize identifying details,
      // and build a reusable template payload.
      const template = await this.performTemplateExtraction(
        repoUrl,
        filePatterns,
        options
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(template, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Template extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  private async analyzeStructure(args: any) {
    const { repoUrl, depth = 3 } = args;

    try {
      const analysis = await this.performStructureAnalysis(repoUrl, depth);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Structure analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  private async generateBoilerplate(args: any) {
    const { technology, features, typescript = true } = args;

    try {
      const boilerplate = await this.performBoilerplateGeneration(
        technology,
        features,
        typescript
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(boilerplate, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Boilerplate generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }),
          },
        ],
        isError: true,
      };
    }
  }

  private async performTemplateExtraction(
    repoUrl: string,
    filePatterns: string[],
    options: Partial<TemplateExtractionOptions>
  ): Promise<ExtractedTemplate> {
    const context = await this.getRepoContext(repoUrl);
    const tree = await this.getRepoTree(context, options?.preserveStructure ? undefined : context.defaultBranch);
    const placeholderDescriptions: Record<string, string> = {};
    const replacements = this.buildPlaceholderReplacements(context);
    replacements.forEach((replacement) => {
      if (!placeholderDescriptions[replacement.placeholder]) {
        placeholderDescriptions[replacement.placeholder] = replacement.description;
      }
    });

    const template: ExtractedTemplate = {
      files: [],
      structure: '',
      instructions: [],
      placeholders: {},
    };

    const collectedPaths: string[] = [];
    const normalizedPatterns = filePatterns.length > 0
      ? filePatterns
          .map((pattern) => pattern.trim())
          .filter(Boolean)
      : ['**/*.md', '**/*.yml', '**/*.yaml', 'package.json'];

    const matchesPattern = (filePath: string) =>
      normalizedPatterns.some((pattern) => minimatch(filePath, pattern, { nocase: true, dot: true }));

    const matchedFiles = tree
      .filter((item) => item.type === 'blob' && matchesPattern(item.path))
      .sort((a, b) => getFilePriority(b.path) - getFilePriority(a.path))
      .slice(0, MAX_FILES);

    const addTemplateFile = (
      filePath: string,
      rawContent: string,
      description: string,
      extraPlaceholderDescriptions: Record<string, string> = {}
    ) => {
      const { sanitized, placeholders } = this.sanitizeFileContent(
        rawContent,
        replacements,
        placeholderDescriptions
      );

      const placeholderSet = new Set(placeholders);
      Object.entries(extraPlaceholderDescriptions).forEach(([key, desc]) => {
        if (!placeholderDescriptions[key]) {
          placeholderDescriptions[key] = desc;
        }
        placeholderSet.add(key);
      });

      template.files.push({
        path: filePath,
        content: sanitized,
        description,
        placeholders: Array.from(placeholderSet),
      });
      collectedPaths.push(filePath);
    };

    for (const file of matchedFiles) {
      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        continue; // Skip large files (>500 KB)
      }

      try {
        const { content } = await this.fetchFileContent(context, file.path);

        if (content.length > MAX_FILE_SIZE_BYTES) {
          continue;
        }

        if (this.isBinaryContent(content)) {
          continue;
        }

        const extension = path.extname(file.path).toLowerCase();
        const description = this.describeFile(file.path, extension);
        addTemplateFile(file.path, content, description);
      } catch (error) {
        console.error(`Failed to extract template file ${file.path}:`, error);
      }
    }

    if (template.files.length === 0) {
      const fallback = '# {{PROJECT_NAME}} Template\n\nTemplate extraction did not find matching files for the requested patterns. Review the repository manually for reusable assets.\n';
      addTemplateFile('README.md', fallback, 'Fallback template when no files matched.');
    }

    template.structure = this.buildStructureTree(collectedPaths);

    const instructions: string[] = [];
    const hasPackageJson = template.files.some((file) => file.path.endsWith('package.json'));
    const hasWorkflows = template.files.some((file) => file.path.startsWith('.github/workflows/'));
    const hasDocs = template.files.some((file) => file.path.startsWith('docs/'));
    const hasTests = template.files.some((file) => file.path.includes('test'));
    const hasLicense = template.files.some((file) => file.path.toLowerCase().includes('license'));

    if (hasPackageJson) {
      instructions.push('Update package metadata (name, description) and review dependencies before publishing.');
    }
    if (hasWorkflows) {
      instructions.push('Check GitHub Actions secrets and adjust workflow triggers, caching strategy, and branch filters.');
    }
    if (hasDocs) {
      instructions.push('Adapt documentation pages to match your product features and onboarding steps.');
    }
    if (hasTests) {
      instructions.push('Replace assertions and setup logic so tests reflect your implementation details.');
    }
    if (hasLicense) {
      instructions.push('Confirm the license terms and copyright holder information before distribution.');
    }
    if (instructions.length === 0) {
      instructions.push('Review each file, replace placeholder values, and adapt code or documents to your project context.');
    }

    template.instructions = instructions;
    template.placeholders = placeholderDescriptions;

    return template;
  }

  private async performStructureAnalysis(repoUrl: string, depth: number) {
    const context = await this.getRepoContext(repoUrl);
    const tree = await this.getRepoTree(context);
    const fileEntries = tree.filter((item) => item.type === 'blob');

    const directories = new Set<string>();
    const keyFiles: string[] = [];
    const insights: string[] = [];
    const extensionCounts = new Map<string, number>();

    const addKeyFile = (filePath: string) => {
      if (!keyFiles.includes(filePath)) {
        keyFiles.push(filePath);
      }
    };

    fileEntries.forEach((item) => {
      const segments = item.path.split('/');
      segments.slice(0, Math.min(depth, segments.length - 1)).forEach((segment) => {
        if (segment && !segment.includes('.')) {
          directories.add(segment);
        }
      });

      const extension = path.extname(item.path).toLowerCase();
      if (extension) {
        extensionCounts.set(extension, (extensionCounts.get(extension) ?? 0) + 1);
      }

      if (item.path.toLowerCase().includes('readme')) {
        addKeyFile(item.path);
      }
      if (item.path.startsWith('.github/workflows/')) {
        addKeyFile(item.path);
      }
      if (item.path.toLowerCase().includes('license')) {
        addKeyFile(item.path);
      }
      if (item.path.startsWith('docs/')) {
        addKeyFile(item.path);
      }
      if (item.path.endsWith('package.json') || item.path.endsWith('pnpm-workspace.yaml')) {
        addKeyFile(item.path);
      }
      if (item.path.includes('__tests__') || item.path.includes('.test.') || item.path.includes('.spec.')) {
        addKeyFile(item.path);
      }
    });

    const languagePriority: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.cs': 'C#',
    };

    let mainLanguage: string | undefined;
    let maxCount = 0;
    for (const [extension, count] of extensionCounts.entries()) {
      if (count > maxCount && languagePriority[extension]) {
        maxCount = count;
        mainLanguage = languagePriority[extension];
      }
    }

    const hasReadme = keyFiles.some((file) => file.toLowerCase().includes('readme'));
    const hasWorkflows = keyFiles.some((file) => file.startsWith('.github/workflows/'));
    const hasTests = keyFiles.some((file) => file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.'));
    const hasDocs = keyFiles.some((file) => file.startsWith('docs/'));
    const hasLicense = keyFiles.some((file) => file.toLowerCase().includes('license'));

    const recommendedPatterns = new Set<string>();
    if (hasReadme) recommendedPatterns.add('README.md');
    if (hasDocs) recommendedPatterns.add('docs/**/*.md');
    if (hasWorkflows) recommendedPatterns.add('.github/workflows/**/*.yml');
    if (hasWorkflows) recommendedPatterns.add('.github/workflows/**/*.yaml');
    if (hasLicense) recommendedPatterns.add('LICENSE*');
    if (hasTests) recommendedPatterns.add('**/*.test.*');
    if (extensionCounts.has('.ts')) recommendedPatterns.add('**/*.ts');
    if (extensionCounts.has('.tsx')) recommendedPatterns.add('**/*.tsx');
    if (extensionCounts.has('.js')) recommendedPatterns.add('**/*.js');
    if (extensionCounts.has('.jsx')) recommendedPatterns.add('**/*.jsx');
    if (extensionCounts.has('.yml') || extensionCounts.has('.yaml')) recommendedPatterns.add('**/*.yml');
    if (extensionCounts.has('.json')) recommendedPatterns.add('**/*.json');
    if (recommendedPatterns.size === 0) recommendedPatterns.add('README.md');

    let templateWorthiness = 0.4;
    if (hasReadme) templateWorthiness += 0.15;
    if (hasWorkflows) templateWorthiness += 0.1;
    if (hasDocs) templateWorthiness += 0.1;
    if (hasTests) templateWorthiness += 0.1;
    if (hasLicense) templateWorthiness += 0.05;
    if (context.topics.includes('starter') || context.topics.includes('template')) {
      templateWorthiness += 0.1;
    }
    templateWorthiness = Math.min(1, templateWorthiness);

    if (hasReadme) insights.push('README documentation available for onboarding.');
    if (hasWorkflows) insights.push('CI workflows detected under .github/workflows/.');
    if (hasDocs) insights.push('Additional docs/ directory found for deeper documentation.');
    if (hasTests) insights.push('Automated tests detected; include testing patterns in templates.');
    if (hasLicense) insights.push('License file present for compliance.');
    if (!insights.length) insights.push('Repository contains reusable assets but limited metadata was detected.');

    const detectFramework = (): string => {
      const files = keyFiles.map((file) => file.toLowerCase());
      if (files.some((file) => file.includes('next.config'))) return 'Next.js';
      if (files.some((file) => file.includes('nuxt.config'))) return 'Nuxt';
      if (files.some((file) => file.includes('angular.json'))) return 'Angular';
      if (files.some((file) => file.includes('gatsby-config'))) return 'Gatsby';
      if (files.some((file) => file.includes('svelte.config'))) return 'SvelteKit';
      if (files.some((file) => file.includes('vue.config'))) return 'Vue';
      return 'Unknown';
    };

    return {
      repoUrl,
      mainLanguage: mainLanguage ?? context.language ?? 'Unknown',
      framework: detectFramework(),
      keyFiles: keyFiles.slice(0, 10),
      directories: Array.from(directories).slice(0, 10),
      recommendedPatterns: Array.from(recommendedPatterns),
      templateWorthiness,
      insights,
    };
  }

  private async performBoilerplateGeneration(
    technology: string,
    features: string[],
    typescript: boolean
  ) {
    const extension = typescript ? 'ts' : 'js';

    return {
      technology,
      features,
      files: [
        {
          path: `src/index.${extension}`,
          content: this.generateIndexFile(technology, typescript),
          description: 'Main entry point',
        },
        {
          path: `src/config.${extension}`,
          content: this.generateConfigFile(features, typescript),
          description: 'Configuration file',
        },
        {
          path: 'package.json',
          content: this.generatePackageJson(technology, features),
          description: 'Package dependencies',
        },
      ],
      setupInstructions: [
        `Install dependencies: npm install`,
        `Configure environment: Copy .env.example to .env`,
        `Start development: npm run dev`,
      ],
    };
  }

  private generateIndexFile(technology: string, typescript: boolean): string {
    const typeAnnotation = typescript ? ': void' : '';

    return `// Main entry point for ${technology} application
import { config } from './config';

async function main()${typeAnnotation} {
  console.log('Starting ${technology} application...');
  // TODO: Add your application logic here
}

main().catch(console.error);
`;
  }

  private generateConfigFile(features: string[], typescript: boolean): string {
    const typeAnnotation = typescript ? ': Config' : '';

    return `${typescript ? 'interface Config {\n  [key: string]: any;\n}\n\n' : ''}export const config${typeAnnotation} = {
  features: ${JSON.stringify(features, null, 2)},
  // TODO: Add your configuration here
};
`;
  }

  private generatePackageJson(technology: string, features: string[]): string {
    return JSON.stringify(
      {
        name: `{{PROJECT_NAME}}`,
        version: '1.0.0',
        description: `${technology} project with ${features.join(', ')}`,
        scripts: {
          dev: 'node src/index.js',
          build: 'tsc',
          test: 'jest',
        },
      },
      null,
      2
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Template Creator MCP Server running on stdio');
  }
}

// Start the server
const server = new TemplateCreatorServer();
server.run().catch(console.error);
