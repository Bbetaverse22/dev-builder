/**
 * Serverless-friendly Template Creator Client
 * 
 * This version works in Vercel's serverless environment without spawning subprocesses.
 * It provides the same interface as the MCP client but implements the functionality directly.
 */

import path from 'node:path';
import { Octokit } from '@octokit/rest';
import { minimatch } from 'minimatch';
import * as ts from 'typescript';

interface TemplateExtractionOptions {
  preserveStructure?: boolean;
  keepComments?: boolean;
  includeTypes?: boolean;
  removeBusinessLogic?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  configPath?: string;
  verbosity?: 'minimal' | 'default' | 'full';
  strictRedaction?: boolean;
  fallbackToRawCopy?: boolean;
  mode?: 'skeleton' | 'copier';
  fallbackMode?: 'copier' | 'skip';
  maxFiles?: number;
  maxFileSizeKb?: number;
  minSkeletonFiles?: number;
}

interface TemplateExtractionConfig {
  includePatterns?: string[];
  excludePatterns?: string[];
  instructions?: string[];
  placeholderMappings?: Record<string, string>;
  preserveFiles?: string[];
  maxFiles?: number;
  strictRedaction?: boolean;
  notes?: string[];
  mode?: 'skeleton' | 'copier';
  maxFileSizeKb?: number;
  minSkeletonFiles?: number;
}

interface TemplateMetadata {
  modeUsed: 'skeleton' | 'copier';
  redactedFunctions: number;
  droppedFiles: string[];
  totalFilesConsidered: number;
  warnings?: string[];
  fallbackReason?: string;
  notes?: string[];
}

interface ExtractedTemplate {
  files: TemplateFile[];
  structure: string;
  instructions: string[];
  placeholders: Record<string, string>;
  metadata?: TemplateMetadata;
}

interface TemplateFile {
  path: string;
  content: string;
  description: string;
  placeholders: string[];
  notes?: string[];
}

interface ResolvedTemplateExtractionOptions extends TemplateExtractionOptions {
  mode: 'skeleton' | 'copier';
  fallbackMode: 'copier' | 'skip';
  maxFiles: number;
  maxFileSizeKb: number;
  minSkeletonFiles: number;
}

interface TemplateBuildResult {
  files: TemplateFile[];
  placeholders: Record<string, string>;
  notes: string[];
  metadata: TemplateMetadata;
}

interface StructureAnalysis {
  repoUrl: string;
  mainLanguage: string;
  framework: string;
  keyFiles: string[];
  directories: string[];
  recommendedPatterns: string[];
  templateWorthiness: number;
  insights: string[];
  redactionConfidence?: number;
  configPath?: string | null;
  warnings?: string[];
  heuristics?: Record<string, number>;
}

export class ServerlessTemplateCreatorClient {
  private octokit: Octokit | null = null;

  constructor() {
    // Initialize without MCP dependencies
  }

  /**
   * Analyze repository structure to identify template-worthy files
   */
  async analyzeStructure(repoUrl: string, depth: number = 3): Promise<StructureAnalysis> {
    try {
      const { owner, repo, path } = this.parseRepositoryUrl(repoUrl);
      const octokit = this.getOctokit();

      // Get repository information
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      
      // Get repository contents
      const { data: contentsResponse } = await octokit.repos.getContent({
        owner,
        repo,
        path: path || '',
      });

      // Ensure we have an array of contents
      const contents = Array.isArray(contentsResponse) ? contentsResponse : [contentsResponse];

      // Analyze the repository structure
      const analysis = await this.analyzeRepositoryStructure(contents, repoData, depth);
      const config = await this.loadTemplateConfig(octokit, owner, repo, path, analysis.configPath);
      
      return {
        repoUrl,
        mainLanguage: analysis.mainLanguage,
        framework: analysis.framework,
        keyFiles: analysis.keyFiles,
        directories: analysis.directories,
        recommendedPatterns: analysis.recommendedPatterns,
        templateWorthiness: analysis.templateWorthiness,
        insights: analysis.insights,
        redactionConfidence: analysis.redactionConfidence,
        configPath: config?.configPath ?? analysis.configPath,
        warnings: analysis.warnings ?? [],
        heuristics: analysis.heuristics,
      };
    } catch (error) {
      console.error('Repository analysis failed:', error);
      throw new Error(`Failed to analyze repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract a clean template from a GitHub repository
   */
  async extractTemplate(
    repoUrl: string,
    filePatterns: string[],
    options: TemplateExtractionOptions = {}
  ): Promise<ExtractedTemplate> {
    try {
      const { owner, repo, path } = this.parseRepositoryUrl(repoUrl);
      const octokit = this.getOctokit();

      const config = await this.loadTemplateConfig(octokit, owner, repo, path, options.configPath);
      const resolvedOptions = this.mergeExtractionOptions(options, config);

      const rawFiles = await this.getMatchingFiles(
        octokit,
        owner,
        repo,
        resolvedOptions.includePatterns ?? filePatterns,
        resolvedOptions.excludePatterns,
        path,
        resolvedOptions.maxFiles
      );

      let templateResult = this.buildTemplateFromFiles(rawFiles, resolvedOptions);
      let fallbackReason: string | null = null;

      if (resolvedOptions.mode === 'skeleton') {
        fallbackReason = this.evaluateSkeletonFallback(templateResult, resolvedOptions);

        if (fallbackReason && resolvedOptions.fallbackMode === 'copier') {
          const copierOptions: ResolvedTemplateExtractionOptions = {
            ...resolvedOptions,
            mode: 'copier',
            fallbackMode: 'skip',
          };
          const copierResult = this.buildTemplateFromFiles(rawFiles, copierOptions);
          copierResult.metadata.fallbackReason = fallbackReason;
          copierResult.notes.push(`Fallback to copier mode: ${fallbackReason}`);
          templateResult = copierResult;
        } else if (fallbackReason) {
          templateResult.metadata.warnings = [
            ...(templateResult.metadata.warnings ?? []),
            fallbackReason,
          ];
        }
      }

      const instructions = this.buildInstructions(templateResult, config);
      if (templateResult.notes.length) {
        instructions.push(
          ...templateResult.notes.map((note) => `NOTE: ${note}`)
        );
      }

      const metadata: TemplateMetadata = {
        ...templateResult.metadata,
        notes: templateResult.notes.length ? templateResult.notes : templateResult.metadata.notes,
      };

      return {
        files: templateResult.files,
        structure: this.generateStructureDescription(templateResult.files),
        instructions,
        placeholders: templateResult.placeholders,
        metadata,
      };
    } catch (error) {
      console.error('Template extraction failed:', error);
      throw new Error(`Failed to extract template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeRepositoryStructure(
    contents: any[],
    repoData: any,
    depth: number
  ): Promise<{
    mainLanguage: string;
    framework: string;
    keyFiles: string[];
    directories: string[];
    recommendedPatterns: string[];
    templateWorthiness: number;
    insights: string[];
    redactionConfidence: number;
    configPath: string | null;
    warnings: string[];
    heuristics: Record<string, number>;
  }> {
    const keyFiles: string[] = [];
    const directories: string[] = [];
    const insights: string[] = [];
    const warnings: string[] = [];
    const heuristics: Record<string, number> = {
      configSignals: 0,
      docsSignals: 0,
      dataSignals: 0,
      testSignals: 0,
      businessLogicSignals: 0,
      uiSignals: 0,
      infraSignals: 0,
    };

    let mainLanguage = repoData.language || 'unknown';
    let framework = 'unknown';
    let templateWorthiness = 0.35;
    let redactionConfidence = 0.4;
    let configPath: string | null = null;

    for (const item of contents) {
      if (item.type === 'file') {
        keyFiles.push(item.name);
        this.captureTopLevelHeuristics(item.name, heuristics);
        const detection = this.detectLanguageAndFramework(item.name, mainLanguage, framework);
        mainLanguage = detection.language;
        framework = detection.framework;
        if (item.name === 'package.json') configPath = 'package.json';
      } else if (item.type === 'dir') {
        directories.push(item.name);
        this.captureDirectoryHeuristics(item.name, heuristics);
      }
    }

    const hasPackageJson = keyFiles.includes('package.json');
    const hasReadme = keyFiles.some(f => /^readme/i.test(f));
    const hasSourceFiles = keyFiles.some(f => this.isLikelySourceFile(f));
    const hasConfigFiles = heuristics.configSignals > 0;

    templateWorthiness += hasPackageJson ? 0.2 : -0.05;
    templateWorthiness += hasSourceFiles ? 0.2 : -0.1;
    templateWorthiness += hasConfigFiles ? 0.15 : 0;
    templateWorthiness += directories.length > 2 ? 0.1 : 0;
    templateWorthiness += heuristics.docsSignals > 0 ? 0.05 : 0;
    templateWorthiness = Math.min(0.95, Math.max(0.05, templateWorthiness));

    redactionConfidence += heuristics.configSignals * 0.05;
    redactionConfidence += heuristics.infraSignals * 0.04;
    redactionConfidence -= heuristics.businessLogicSignals * 0.08;
    redactionConfidence -= heuristics.dataSignals * 0.05;
    redactionConfidence = Math.min(0.9, Math.max(0.1, redactionConfidence));

    insights.push(`Detected ${mainLanguage} project${framework !== 'unknown' ? ` using ${framework}` : ''}`);
    if (hasPackageJson) insights.push('Found package.json for dependency management');
    if (hasReadme) insights.push('Includes top-level documentation');
    if (heuristics.businessLogicSignals > 0) insights.push('Repository contains business logic routes/services that may need redaction');
    if (heuristics.testSignals > 0) insights.push('Tests detected; consider excluding to keep template minimal');
    if (!hasSourceFiles) warnings.push('No obvious source files found; template extraction may be limited');
    if (heuristics.dataSignals > 0) warnings.push('Data/backfill files detected; ensure proprietary datasets are stripped');

    const recommendedPatterns = this.buildRecommendedPatterns(mainLanguage, framework, heuristics, directories, depth);

    return {
      mainLanguage,
      framework,
      keyFiles,
      directories,
      recommendedPatterns,
      templateWorthiness,
      insights,
      redactionConfidence,
      configPath,
      warnings,
      heuristics,
    };
  }

  private captureTopLevelHeuristics(fileName: string, heuristics: Record<string, number>) {
    const normalized = fileName.toLowerCase();
    if (/(^|\.)config(\.|$)|\.env|\.toml|\.yaml|\.yml|tsconfig|jsconfig|package\.json/.test(normalized)) {
      heuristics.configSignals += 1;
    }
    if (/readme|docs?|changelog|guides?/.test(normalized)) {
      heuristics.docsSignals += 1;
    }
    if (/\.test\.|\.spec\.|__tests__|__mocks__/.test(normalized)) {
      heuristics.testSignals += 1;
    }
    if (/seed|fixture|dataset|sample-data|backfill|migrations?/.test(normalized)) {
      heuristics.dataSignals += 1;
    }
    if (/service|controller|resolver|usecase|workflow|pipeline/.test(normalized)) {
      heuristics.businessLogicSignals += 1;
    }
    if (/router|route|api\//.test(normalized)) {
      heuristics.businessLogicSignals += 1;
    }
    if (/terraform|docker|k8s|helm|cloudformation/.test(normalized)) {
      heuristics.infraSignals += 1;
    }
    if (/component|page|layout|view|ui\//.test(normalized)) {
      heuristics.uiSignals += 1;
    }
  }

  private detectLanguageAndFramework(
    fileName: string,
    currentLanguage: string,
    currentFramework: string
  ): { language: string; framework: string } {
    const normalized = fileName.toLowerCase();
    let language = currentLanguage;
    let framework = currentFramework;

    if (/\.tsx?$/.test(normalized)) {
      language = 'TypeScript';
      if (normalized.includes('next.config') || normalized.includes('pages/') || normalized.includes('app/')) {
        framework = 'Next.js';
      } else if (normalized.includes('gatsby')) {
        framework = 'Gatsby';
      } else if (normalized.includes('remix')) {
        framework = 'Remix';
      } else if (normalized.includes('react')) {
        framework = framework === 'unknown' ? 'React' : framework;
      }
    } else if (/\.jsx?$/.test(normalized)) {
      language = language === 'unknown' ? 'JavaScript' : language;
      if (normalized.includes('next.config') || normalized.includes('pages/') || normalized.includes('app/')) {
        framework = 'Next.js';
      } else if (normalized.includes('express')) {
        framework = framework === 'unknown' ? 'Express' : framework;
      }
    } else if (/\.py$/.test(normalized)) {
      language = 'Python';
      if (normalized.includes('django')) {
        framework = 'Django';
      } else if (normalized.includes('flask')) {
        framework = 'Flask';
      } else if (normalized.includes('fastapi')) {
        framework = 'FastAPI';
      }
    } else if (/\.java$/.test(normalized)) {
      language = 'Java';
      if (normalized.includes('spring')) {
        framework = 'Spring';
      }
    } else if (/\.go$/.test(normalized)) {
      language = 'Go';
    } else if (/\.rs$/.test(normalized)) {
      language = 'Rust';
    }

    return { language, framework };
  }

  private captureDirectoryHeuristics(dirName: string, heuristics: Record<string, number>) {
    const normalized = dirName.toLowerCase();
    if (/^config|configs?$/.test(normalized)) {
      heuristics.configSignals += 1;
    }
    if (/^docs?$/.test(normalized)) {
      heuristics.docsSignals += 1;
    }
    if (/test|spec|__tests__/.test(normalized)) {
      heuristics.testSignals += 1;
    }
    if (/mocks?|fixtures?|samples?|examples?/.test(normalized)) {
      heuristics.dataSignals += 1;
    }
    if (/services?|api|routes?|controllers?/.test(normalized)) {
      heuristics.businessLogicSignals += 1;
    }
    if (/ui|components?|views?|pages?|app/.test(normalized)) {
      heuristics.uiSignals += 1;
    }
    if (/infra|ops|deploy|terraform|helm/.test(normalized)) {
      heuristics.infraSignals += 1;
    }
  }

  private isLikelySourceFile(fileName: string): boolean {
    return /(\.tsx?|\.jsx?|\.py|\.go|\.java|\.rs|\.rb|\.php)$/.test(fileName.toLowerCase());
  }

  private buildRecommendedPatterns(
    mainLanguage: string,
    framework: string,
    heuristics: Record<string, number>,
    directories: string[],
    depth: number
  ): string[] {
    const patterns = new Set<string>(['package.json', 'tsconfig.json', 'jsconfig.json']);

    const addPatterns = (items: string[]) => items.forEach(item => patterns.add(item));

    if (mainLanguage === 'TypeScript' || mainLanguage === 'JavaScript') {
      addPatterns(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);
      if (framework === 'Next.js') {
        addPatterns(['app/**/*', 'pages/**/*', 'components/**/*', 'lib/**/*']);
      } else if (framework === 'React') {
        addPatterns(['src/**/*', 'public/**/*']);
      }
    } else if (mainLanguage === 'Python') {
      addPatterns(['**/*.py', 'pyproject.toml', 'requirements.txt']);
    } else if (mainLanguage === 'Go') {
      addPatterns(['**/*.go', 'go.mod', 'go.sum']);
    } else if (mainLanguage === 'Java') {
      addPatterns(['**/*.java', 'pom.xml', 'build.gradle']);
    }

    if (heuristics.configSignals > 0) {
      addPatterns(['**/*.config.*', '**/*config/*', '**/.env*', 'config/**/*']);
    }
    if (heuristics.uiSignals > 0) {
      addPatterns(['components/**/*', 'layouts/**/*']);
    }
    if (directories.some(dir => dir.toLowerCase() === 'src')) {
      addPatterns(['src/**/*']);
    }
    if (directories.some(dir => dir.toLowerCase() === 'lib')) {
      addPatterns(['lib/**/*']);
    }

    if (depth > 4) {
      addPatterns(['**/*.d.ts', '**/*.interface.ts']);
    }

    return Array.from(patterns);
  }

  private async getMatchingFiles(
    octokit: Octokit,
    owner: string,
    repo: string,
    includePatterns: string[],
    excludePatterns: string[] | undefined,
    subPath?: string,
    maxFiles: number = 40
  ): Promise<Array<{ path: string; content: string; type: string }>> {
    const files: Array<{ path: string; content: string; type: string }> = [];

    // Get repository tree
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true',
    });

    // Filter files by patterns and subdirectory
    const matchingFiles = tree.tree.filter(item =>
      item.type === 'blob' &&
      item.path &&
      (!subPath || item.path.startsWith(subPath + '/')) &&
      includePatterns.some(pattern => minimatch(item.path!, pattern)) &&
      !(excludePatterns?.some(pattern => minimatch(item.path!, pattern)))
    );

    console.log(`[Template Extractor] Found ${matchingFiles.length} matching files`);

    // Prioritize code files over documentation
    const sortedFiles = matchingFiles.sort((a, b) => {
      const aPath = a.path || '';
      const bPath = b.path || '';
      
      // Prioritize source code directories
      const aPriority = (
        aPath.includes('/src/') ? 1000 :
        aPath.includes('/lib/') ? 900 :
        aPath.includes('/components/') ? 850 :
        aPath.includes('/pages/') ? 850 :
        aPath.includes('/app/') ? 850 :
        aPath.includes('/api/') ? 800 :
        aPath.match(/\.(ts|tsx|js|jsx|py|go|java|rs)$/) ? 700 :
        aPath.match(/\.(json|yml|yaml)$/) ? 300 :
        aPath.match(/\.md$/i) ? 100 :
        0
      );
      
      const bPriority = (
        bPath.includes('/src/') ? 1000 :
        bPath.includes('/lib/') ? 900 :
        bPath.includes('/components/') ? 850 :
        bPath.includes('/pages/') ? 850 :
        bPath.includes('/app/') ? 850 :
        bPath.includes('/api/') ? 800 :
        bPath.match(/\.(ts|tsx|js|jsx|py|go|java|rs)$/) ? 700 :
        bPath.match(/\.(json|yml|yaml)$/) ? 300 :
        bPath.match(/\.md$/i) ? 100 :
        0
      );
      
      return bPriority - aPriority;
    });

    const limit = Math.max(5, Math.min(maxFiles, 80));
    for (const file of sortedFiles.slice(0, limit)) {
      if (!file.path || !file.sha) continue;

      try {
        const { data: content } = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: file.sha,
        });

        const fileData = {
          path: file.path,
          content: Buffer.from(content.content!, 'base64').toString('utf-8'),
          type: file.path.split('.').pop() || 'unknown',
        };
        files.push(fileData);
        console.log(`[Template Extractor] ✓ Extracted: ${file.path}`);
      } catch (error) {
        console.warn(`[Template Extractor] ✗ Failed to get content for ${file.path}:`, error);
      }
    }

    console.log(`[Template Extractor] Successfully extracted ${files.length} files`);
    const fileTypes = files.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[Template Extractor] File types:`, fileTypes);

    return files;
  }

  private createTemplateFile(
    file: { path: string; content: string; type: string },
    transformedContent: string,
    options: ResolvedTemplateExtractionOptions,
    placeholders: Record<string, string>
  ): TemplateFile {
    let content = transformedContent;
    const placeholderKeys: string[] = [];
    const normalizedPath = file.path.toLowerCase();

    if (normalizedPath.endsWith('package.json')) {
      try {
        const packageJson = JSON.parse(file.content || transformedContent);
        if (typeof packageJson.name === 'string' && packageJson.name.trim()) {
          packageJson.name = '{{project-name}}';
          this.addPlaceholder(placeholders, placeholderKeys, 'project-name', 'Name of your project/application');
        }
        if (typeof packageJson.description === 'string') {
          packageJson.description = '{{project-description}}';
          this.addPlaceholder(placeholders, placeholderKeys, 'project-description', 'Short description of your project');
        }
        if (typeof packageJson.version === 'string') {
          packageJson.version = '{{project-version}}';
          this.addPlaceholder(placeholders, placeholderKeys, 'project-version', 'Project semantic version');
        }
        if (packageJson.repository) {
          packageJson.repository = '{{project-repository}}';
          this.addPlaceholder(placeholders, placeholderKeys, 'project-repository', 'Repository URL');
        }
        if (packageJson.homepage) {
          packageJson.homepage = '{{project-homepage}}';
          this.addPlaceholder(placeholders, placeholderKeys, 'project-homepage', 'Project homepage URL');
        }
        content = JSON.stringify(packageJson, null, 2);
      } catch {
        content = content.replace(/"name":\s*"[^"]*"/, '"name": "{{project-name}}"');
        content = content.replace(/"description":\s*"[^"]*"/, '"description": "{{project-description}}"');
        content = content.replace(/"version":\s*"[^"]*"/, '"version": "{{project-version}}"');
        this.addPlaceholder(placeholders, placeholderKeys, 'project-name', 'Name of your project/application');
        this.addPlaceholder(placeholders, placeholderKeys, 'project-description', 'Short description of your project');
        this.addPlaceholder(placeholders, placeholderKeys, 'project-version', 'Project semantic version');
      }
    } else if (normalizedPath.includes('readme')) {
      const replaced = content.replace(/#\s+[^\n]+/g, '# {{project-title}}');
      if (replaced !== content) {
        content = replaced;
        this.addPlaceholder(placeholders, placeholderKeys, 'project-title', 'Title to show at the top of the README');
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(normalizedPath)) {
      const componentReplaced = content.replace(
        /export\s+default\s+function\s+(\w+)/g,
        'export default function {{component-name}}'
      );
      if (componentReplaced !== content) {
        content = componentReplaced;
        this.addPlaceholder(placeholders, placeholderKeys, 'component-name', 'Name of the exported component');
      }

      const variableReplaced = content.replace(/const\s+(\w+)\s*=/g, (match) => {
        if (match.includes('{{variable-name}}')) {
          return match;
        }
        this.addPlaceholder(placeholders, placeholderKeys, 'variable-name', 'Local variable to customise');
        return match.replace(/const\s+\w+/, 'const {{variable-name}}');
      });
      content = variableReplaced;
    } else if (/\.(yml|yaml)$/.test(normalizedPath)) {
      const apiReplaced = content.replace(/(api_key|token|secret):\s*.+/gi, '$1: "{{value}}"');
      if (apiReplaced !== content) {
        content = apiReplaced;
        this.addPlaceholder(placeholders, placeholderKeys, 'value', 'Provide configuration value');
      }
    }

    const description = this.describeFile(file.path, file.type);

    return {
      path: file.path,
      content,
      description,
      placeholders: placeholderKeys,
    };
  }

  private generateStructureDescription(files: TemplateFile[]): string {
    const structure = files.map(file => {
      const indent = '  '.repeat(file.path.split('/').length - 1);
      return `${indent}${file.path.split('/').pop()}`;
    }).join('\n');
    
    return `Template Structure:\n${structure}`;
  }

  private buildTemplateFromFiles(
    rawFiles: Array<{ path: string; content: string; type: string }>,
    options: ResolvedTemplateExtractionOptions
  ): TemplateBuildResult {
    const placeholders: Record<string, string> = {};
    const files: TemplateFile[] = [];
    const notes: string[] = [];
    const metadata: TemplateMetadata = {
      modeUsed: options.mode,
      redactedFunctions: 0,
      droppedFiles: [],
      totalFilesConsidered: rawFiles.length,
    };

    const seenPaths = new Set<string>();

    for (const file of rawFiles) {
      if (seenPaths.has(file.path)) {
        continue;
      }
      seenPaths.add(file.path);

      const sizeKb = Buffer.byteLength(file.content, 'utf8') / 1024;
      if (sizeKb > options.maxFileSizeKb) {
        metadata.droppedFiles.push(file.path);
        notes.push(`Skipped ${file.path} (${Math.round(sizeKb)}KB) because it exceeds the ${options.maxFileSizeKb}KB limit.`);
        continue;
      }

      if (this.isBinaryContent(file.content)) {
        metadata.droppedFiles.push(file.path);
        notes.push(`Skipped ${file.path} because it appears to be a binary file.`);
        continue;
      }

      const includeDecision = this.shouldIncludeFile(file, options);
      if (!includeDecision.include) {
        metadata.droppedFiles.push(file.path);
        if (includeDecision.reason) {
          notes.push(includeDecision.reason);
        }
        continue;
      }

      let transformedContent = file.content;
      if (options.mode === 'skeleton') {
        const redaction = this.redactFileContent(file, options);
        transformedContent = redaction.content;
        metadata.redactedFunctions += redaction.redactedFunctions;
        if (redaction.note) {
          notes.push(redaction.note);
        }
      }

      const templateFile = this.createTemplateFile(file, transformedContent, options, placeholders);
      files.push(templateFile);

      if (files.length >= options.maxFiles) {
        notes.push(`Stopped after ${files.length} files due to maxFiles limit (${options.maxFiles}).`);
        break;
      }
    }

    return {
      files,
      placeholders,
      notes,
      metadata,
    };
  }

  private evaluateSkeletonFallback(
    result: TemplateBuildResult,
    options: ResolvedTemplateExtractionOptions
  ): string | null {
    if (result.files.length === 0) {
      return 'Skeleton extraction produced no files after filtering.';
    }

    if (result.metadata.redactedFunctions === 0 && result.metadata.totalFilesConsidered > result.files.length) {
      return 'Skeleton extraction could not safely strip business logic from the selected files.';
    }

    const expectedMinimum = Math.min(options.minSkeletonFiles, result.metadata.totalFilesConsidered);
    if (result.files.length < expectedMinimum) {
      return `Skeleton extraction only produced ${result.files.length} file(s); expected at least ${expectedMinimum}.`;
    }

    return null;
  }

  private buildInstructions(
    result: TemplateBuildResult,
    config: (TemplateExtractionConfig & { configPath: string }) | null
  ): string[] {
    const baseInstructions = config?.instructions?.length
      ? [...config.instructions]
      : [
          'Replace TODO comments with the intended implementation.',
          'Review placeholders (`{{...}}`) and supply project-specific values.',
          'Install dependencies and verify the template runs end-to-end.',
          'Update documentation files so they match your project context.',
        ];

    if (result.metadata.modeUsed === 'skeleton') {
      baseInstructions.unshift('Skeleton mode stripped business logic. Re-implement the TODO sections before shipping.');
    } else if (result.metadata.fallbackReason) {
      baseInstructions.unshift('Skeleton extraction was unavailable; carefully review copied files for sensitive logic.');
    }

    if (config?.notes?.length) {
      baseInstructions.push(...config.notes);
    }

    return Array.from(new Set(baseInstructions));
  }

  private shouldIncludeFile(
    file: { path: string; content: string; type: string },
    options: ResolvedTemplateExtractionOptions
  ): { include: boolean; reason?: string } {
    const normalized = file.path.toLowerCase();

    const excludedSegments = [
      '/node_modules/',
      '/.git/',
      '/dist/',
      '/build/',
      '/coverage/',
      '/.next/',
      '/.vercel/',
      '/tmp/',
      '/logs/',
      '/.cache/',
    ];
    if (excludedSegments.some((segment) => normalized.includes(segment))) {
      return {
        include: false,
        reason: `Skipped ${file.path} (vendor/build asset).`,
      };
    }

    if (/\.(lock|min\.js|min\.css|bundle\.js)$/i.test(normalized)) {
      return {
        include: false,
        reason: `Skipped ${file.path} (generated or lock file).`,
      };
    }

    if (options.mode === 'skeleton') {
      if (
        /\/(__tests__|tests?|spec|fixtures?|mocks?|stories|examples?)\//.test(normalized) ||
        /\.test\./.test(normalized) ||
        /\.spec\./.test(normalized)
      ) {
        return {
          include: false,
          reason: `Removed ${file.path} to keep the skeleton focused on core structure (tests/docs omitted).`,
        };
      }

      if (
        /\/(services?|repositories?|usecases?|daos?|migrations?|seed|sql|queries|workers?)\//.test(normalized) ||
        /service\.(ts|js|py|go|java|rb|php)$/.test(normalized)
      ) {
        return {
          include: false,
          reason: `Removed ${file.path} because it is mostly business logic.`,
        };
      }

      const lineCount = file.content.split('\n').length;
      if (lineCount > 400) {
        return {
          include: false,
          reason: `Skipped ${file.path} because it exceeds 400 lines; consider linking to the original implementation instead.`,
        };
      }
    }

    return { include: true };
  }

  private redactFileContent(
    file: { path: string; content: string; type: string },
    options: ResolvedTemplateExtractionOptions
  ): { content: string; redactedFunctions: number; note?: string } {
    const extension = path.extname(file.path).toLowerCase();

    if (['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
      return this.redactTypeScriptLikeSource(file.path, file.content);
    }

    if (extension === '.py') {
      return this.redactPythonSource(file.path, file.content);
    }

    if (['.go', '.java', '.cs', '.rb', '.php'].includes(extension)) {
      return this.redactGenericBlockLanguage(file.path, file.content);
    }

    if (['.md', '.txt'].includes(extension)) {
      return {
        content: this.buildStubForFile(file.path, file.content),
        redactedFunctions: 0,
        note: `Collapsed ${file.path} into a short skeleton summary.`,
      };
    }

    if (extension === '.json') {
      return {
        content: file.content,
        redactedFunctions: 0,
      };
    }

    return {
      content: this.buildStubForFile(file.path, file.content),
      redactedFunctions: 0,
      note: `Replaced ${file.path} with a TODO stub because skeleton mode has no transformer for this file type.`,
    };
  }

  private redactTypeScriptLikeSource(filePath: string, source: string): { content: string; redactedFunctions: number } {
    try {
      const scriptKind = filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
        ? ts.ScriptKind.TSX
        : filePath.endsWith('.ts')
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JS;
      const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
      let redactedFunctions = 0;

      const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        const visit = (node: ts.Node): ts.Node => {
          if (ts.isFunctionDeclaration(node) && node.body) {
            redactedFunctions++;
            const block = this.createSkeletonBlock(node, node.name?.getText());
            return ts.factory.updateFunctionDeclaration(
              node,
              node.modifiers,
              node.asteriskToken,
              node.name,
              node.typeParameters,
              node.parameters,
              node.type,
              block
            );
          }

          if (ts.isMethodDeclaration(node) && node.body) {
            redactedFunctions++;
            const block = this.createSkeletonBlock(node, node.name?.getText());
            return ts.factory.updateMethodDeclaration(
              node,
              node.modifiers,
              node.asteriskToken,
              node.name,
              node.questionToken,
              node.typeParameters,
              node.parameters,
              node.type,
              block
            );
          }

          if (ts.isConstructorDeclaration(node) && node.body) {
            redactedFunctions++;
            const block = this.createSkeletonBlock(node, 'constructor', false);
            return ts.factory.updateConstructorDeclaration(
              node,
              node.modifiers,
              node.parameters,
              block
            );
          }

          if (ts.isArrowFunction(node)) {
            if (ts.isBlock(node.body)) {
              redactedFunctions++;
              const block = this.createSkeletonBlock(node, this.getNodeName(node), true);
              return ts.factory.updateArrowFunction(
                node,
                node.modifiers,
                node.typeParameters,
                node.parameters,
                node.type,
                node.equalsGreaterThanToken,
                block
              );
            }

            redactedFunctions++;
            const block = this.createSkeletonBlock(node, this.getNodeName(node), true);
            return ts.factory.updateArrowFunction(
              node,
              node.modifiers,
              node.typeParameters,
              node.parameters,
              node.type,
              node.equalsGreaterThanToken,
              block
            );
          }

          if (ts.isFunctionExpression(node) && node.body) {
            redactedFunctions++;
            const block = this.createSkeletonBlock(node, this.getNodeName(node), true);
            return ts.factory.updateFunctionExpression(
              node,
              node.modifiers,
              node.asteriskToken,
              node.name,
              node.typeParameters,
              node.parameters,
              node.type,
              block
            );
          }

          return ts.visitEachChild(node, visit, context);
        };

        return (node) => ts.visitNode(node, visit) as ts.SourceFile;
      };

      const result = ts.transform(sourceFile, [transformer]);
      const transformed = result.transformed[0] as ts.SourceFile;
      const updatedContent = printer.printFile(transformed);
      result.dispose();

      return { content: updatedContent, redactedFunctions };
    } catch (error) {
      console.warn(`[Template Extractor] Failed to redact ${filePath}:`, error);
      return { content: source, redactedFunctions: 0 };
    }
  }

  private createSkeletonBlock(
    node: ts.FunctionLikeDeclaration,
    name?: string,
    allowReturn: boolean = true
  ): ts.Block {
    const statements: ts.Statement[] = [
      this.createTodoStatement(name),
    ];

    if (allowReturn && this.shouldAddReturnPlaceholder(node)) {
      statements.push(this.createReturnPlaceholder(node));
    }

    return ts.factory.createBlock(statements, true);
  }

  private createTodoStatement(name?: string): ts.Statement {
    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('console'),
          ts.factory.createIdentifier('warn')
        ),
        undefined,
        [ts.factory.createStringLiteral(`TODO: Implement ${name ?? 'this logic'}`)]
      )
    );
  }

  private shouldAddReturnPlaceholder(node: ts.FunctionLikeDeclaration): boolean {
    if (node.type) {
      if (node.type.kind === ts.SyntaxKind.VoidKeyword) {
        return false;
      }

      const typeText = node.type.getText();
      if (/^Promise/i.test(typeText)) {
        return true;
      }
    }

    return !(ts.isConstructorDeclaration(node));
  }

  private createReturnPlaceholder(node: ts.FunctionLikeDeclaration): ts.Statement {
    if (node.type && ts.isTypeReferenceNode(node.type)) {
      const typeName = node.type.typeName.getText();
      if (typeName === 'Promise') {
        return ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('Promise'),
              ts.factory.createIdentifier('resolve')
            ),
            undefined,
            [ts.factory.createIdentifier('undefined')]
          )
        );
      }
    }

    return ts.factory.createReturnStatement(ts.factory.createIdentifier('undefined'));
  }

  private getNodeName(node: ts.Node): string | undefined {
    const nameNode = (node as any)?.name as ts.Node | undefined;
    if (nameNode) {
      if (ts.isIdentifier(nameNode)) {
        return nameNode.text;
      }
      return nameNode.getText();
    }

    const parent = node.parent as ts.Node | undefined;
    if (parent && ts.isVariableDeclaration(parent) && parent.name) {
      const parentName = parent.name;
      if (ts.isIdentifier(parentName)) {
        return parentName.text;
      }
      return parentName.getText();
    }

    return undefined;
  }

  private redactPythonSource(filePath: string, source: string): { content: string; redactedFunctions: number; note?: string } {
    const lines = source.split('\n');
    const resultLines: string[] = [];
    let index = 0;
    let redacted = 0;

    const skipIndentedBlock = (baseIndent: number) => {
      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index += 1;
          continue;
        }
        const indent = line.match(/^\s*/)?.[0].length ?? 0;
        if (indent <= baseIndent) {
          break;
        }
        index += 1;
      }
    };

    while (index < lines.length) {
      const line = lines[index];
      resultLines.push(line);

      const functionMatch = line.match(/^\s*(async\s+)?def\s+([a-zA-Z0-9_]+)/);
      const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)/);

      if (functionMatch) {
        const indent = line.match(/^\s*/)?.[0].length ?? 0;
        const name = functionMatch[2];
        resultLines.push(`${' '.repeat(indent + 4)}# TODO: Implement ${name}`);
        resultLines.push(`${' '.repeat(indent + 4)}pass`);
        redacted += 1;
        index += 1;
        skipIndentedBlock(indent);
        continue;
      }

      if (classMatch) {
        const indent = line.match(/^\s*/)?.[0].length ?? 0;
        resultLines.push(`${' '.repeat(indent + 4)}# TODO: Flesh out ${classMatch[1]} methods`);
        redacted += 1;
        index += 1;
        skipIndentedBlock(indent);
        continue;
      }

      index += 1;
    }

    const note = redacted > 0 ? `Redacted ${redacted} Python block(s) in ${filePath}.` : undefined;
    return { content: resultLines.join('\n'), redactedFunctions: redacted, note };
  }

  private redactGenericBlockLanguage(
    filePath: string,
    source: string
  ): { content: string; redactedFunctions: number; note?: string } {
    const lines = source.split('\n');
    const resultLines: string[] = [];
    let redacted = 0;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      resultLines.push(line);

      const functionLike =
        /\b(fn|function|def|void|int|float|double|char|bool|public|private|protected)\b/.test(line) &&
        line.includes('(') &&
        line.includes(')');

      if (functionLike && line.includes('{')) {
        const indent = line.match(/^\s*/)?.[0] ?? '';
        resultLines.push(`${indent}    // TODO: Implement this logic`);
        redacted += 1;

        let braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        i += 1;
        while (i < lines.length && braceDepth > 0) {
          const current = lines[i];
          braceDepth += (current.match(/{/g) || []).length;
          braceDepth -= (current.match(/}/g) || []).length;
          if (braceDepth <= 0) {
            resultLines.push(current);
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }

      i += 1;
    }

    const note = redacted > 0 ? `Redacted ${redacted} block(s) in ${filePath}.` : undefined;
    return { content: resultLines.join('\n'), redactedFunctions: redacted, note };
  }

  private buildStubForFile(filePath: string, originalContent: string): string {
    const headerLines: string[] = [];
    const lines = originalContent.split('\n');
    for (const line of lines) {
      if (/^\s*(import|from\s+\S+\s+import|require\(|#include|using\s)/.test(line)) {
        headerLines.push(line);
        continue;
      }
      if (line.trim() === '') {
        headerLines.push(line);
        continue;
      }
      break;
    }

    headerLines.push(this.buildCommentForExtension(filePath, `TODO: Implement ${filePath}`));
    return headerLines.join('\n');
  }

  private buildCommentForExtension(filePath: string, message: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const commentStart =
      extension === '.py' || extension === '.rb' || extension === '.sh'
        ? '#'
        : extension === '.php'
          ? '//'
          : extension === '.md'
            ? '> '
            : '//';
    return `${commentStart} ${message}`;
  }

  private addPlaceholder(
    placeholders: Record<string, string>,
    placeholderKeys: string[],
    key: string,
    description: string
  ) {
    if (!placeholderKeys.includes(key)) {
      placeholderKeys.push(key);
    }
    if (!placeholders[key]) {
      placeholders[key] = description;
    }
  }

  private describeFile(filePath: string, fileType: string): string {
    const normalized = filePath.toLowerCase();
    if (normalized.endsWith('package.json')) {
      return 'Package configuration file';
    }
    if (normalized.includes('readme')) {
      return 'Project documentation';
    }
    if (normalized.endsWith('.md')) {
      return 'Markdown documentation file';
    }
    if (/\.(ts|tsx)$/.test(normalized)) {
      return 'TypeScript source file';
    }
    if (/\.(js|jsx)$/.test(normalized)) {
      return 'JavaScript source file';
    }
    if (/\.py$/.test(normalized)) {
      return 'Python source file';
    }
    if (/\.go$/.test(normalized)) {
      return 'Go source file';
    }
    if (/\.java$/.test(normalized)) {
      return 'Java source file';
    }
    if (/\.cs$/.test(normalized)) {
      return 'C# source file';
    }
    if (/\.rb$/.test(normalized)) {
      return 'Ruby source file';
    }
    if (/\.php$/.test(normalized)) {
      return 'PHP source file';
    }
    if (/\.(yml|yaml)$/.test(normalized)) {
      return 'YAML configuration file';
    }
    if (/\.(json)$/.test(normalized)) {
      return 'JSON configuration file';
    }
    if (/\.(css|scss|sass)$/.test(normalized)) {
      return 'Stylesheet file';
    }
    return `Template file: ${fileType || 'text'}`;
  }

  private isBinaryContent(content: string): boolean {
    return content.includes('\u0000');
  }

  private mergeExtractionOptions(
    options: TemplateExtractionOptions,
    config: (TemplateExtractionConfig & { configPath: string }) | null
  ): ResolvedTemplateExtractionOptions {
    const mode = options.mode ?? config?.mode ?? 'skeleton';
    const maxFilesBase = mode === 'skeleton' ? 60 : 40;

    return {
      ...options,
      mode,
      fallbackMode: options.fallbackMode ?? 'copier',
      maxFiles: options.maxFiles ?? config?.maxFiles ?? maxFilesBase,
      maxFileSizeKb: options.maxFileSizeKb ?? config?.maxFileSizeKb ?? 180,
      minSkeletonFiles: options.minSkeletonFiles ?? config?.minSkeletonFiles ?? 3,
      includePatterns: options.includePatterns ?? config?.includePatterns,
      excludePatterns: options.excludePatterns ?? config?.excludePatterns ?? [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.vercel/**',
        '**/coverage/**',
      ],
      preserveStructure: options.preserveStructure ?? true,
      keepComments: options.keepComments ?? true,
      includeTypes: options.includeTypes ?? true,
      removeBusinessLogic: options.removeBusinessLogic ?? (mode === 'skeleton'),
      verbosity: options.verbosity ?? 'default',
      strictRedaction: options.strictRedaction ?? config?.strictRedaction ?? false,
      fallbackToRawCopy: options.fallbackToRawCopy ?? false,
    };
  }

  private async loadTemplateConfig(
    octokit: Octokit,
    owner: string,
    repo: string,
    repoSubPath?: string,
    configPathHint?: string | null
  ): Promise<(TemplateExtractionConfig & { configPath: string }) | null> {
    const candidatePaths = new Set<string>();
    if (configPathHint) {
      candidatePaths.add(configPathHint);
    }
    if (repoSubPath) {
      candidatePaths.add(`${repoSubPath}/.devbuilder-template.json`);
    }
    candidatePaths.add('.devbuilder-template.json');

    for (const candidate of candidatePaths) {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: candidate });
        if (!('content' in data) || !data.content) {
          continue;
        }

        const decoded = Buffer.from(data.content, 'base64').toString('utf8');
        try {
          const parsed = JSON.parse(decoded) as TemplateExtractionConfig;
          return { ...parsed, configPath: candidate };
        } catch (jsonError) {
          console.warn(`[Template Extractor] Failed to parse ${candidate} as JSON:`, jsonError);
          continue;
        }
      } catch (error) {
        // Ignore missing config files
        continue;
      }
    }

    return null;
  }

  private parseRepositoryUrl(repoUrl: string): { owner: string; repo: string; path?: string } {
    // Handle URLs like: https://github.com/owner/repo/tree/branch/path/to/dir
    const treeMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?\/tree\/[^\/]+\/(.+)/i);
    if (treeMatch) {
      return {
        owner: treeMatch[1],
        repo: treeMatch[2],
        path: treeMatch[3],
      };
    }
    
    // Handle regular URLs like: https://github.com/owner/repo
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/i);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }
    return {
      owner: match[1],
      repo: match[2],
    };
  }

  private getOctokit(): Octokit {
    if (!this.octokit) {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        throw new Error('GITHUB_TOKEN environment variable is required');
      }
      this.octokit = new Octokit({ auth: token });
    }
    return this.octokit;
  }
}

// Export singleton instance
let serverlessClient: ServerlessTemplateCreatorClient | null = null;

export function getServerlessTemplateCreatorClient(): ServerlessTemplateCreatorClient {
  if (!serverlessClient) {
    serverlessClient = new ServerlessTemplateCreatorClient();
  }
  return serverlessClient;
}
