/**
 * Serverless-friendly Template Creator Client
 * 
 * This version works in Vercel's serverless environment without spawning subprocesses.
 * It provides the same interface as the MCP client but implements the functionality directly.
 */

import { Octokit } from '@octokit/rest';
import { minimatch } from 'minimatch';

interface TemplateExtractionOptions {
  preserveStructure?: boolean;
  keepComments?: boolean;
  includeTypes?: boolean;
  removeBusinessLogic?: boolean;
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

interface StructureAnalysis {
  repoUrl: string;
  mainLanguage: string;
  framework: string;
  keyFiles: string[];
  directories: string[];
  recommendedPatterns: string[];
  templateWorthiness: number;
  insights: string[];
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
      
      return {
        repoUrl,
        mainLanguage: analysis.mainLanguage,
        framework: analysis.framework,
        keyFiles: analysis.keyFiles,
        directories: analysis.directories,
        recommendedPatterns: analysis.recommendedPatterns,
        templateWorthiness: analysis.templateWorthiness,
        insights: analysis.insights,
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

      // Get all files matching the patterns
      const files = await this.getMatchingFiles(octokit, owner, repo, filePatterns, path);
      
      // Process files to create template
      const templateFiles: TemplateFile[] = [];
      const placeholders: Record<string, string> = {};
      const instructions: string[] = [];

      for (const file of files) {
        const processedFile = await this.processFileForTemplate(file, options);
        templateFiles.push(processedFile);
        
        // Extract placeholders
        processedFile.placeholders.forEach(placeholder => {
          if (!placeholders[placeholder]) {
            placeholders[placeholder] = `{{${placeholder}}}`;
          }
        });
      }

      // Generate instructions (without numbers - let the UI handle formatting)
      instructions.push(
        'Replace all placeholders with your specific values',
        'Update package.json with your project details',
        'Install dependencies: npm install',
        'Customize the code for your specific use case',
        'Update README.md with your project information'
      );

      return {
        files: templateFiles,
        structure: this.generateStructureDescription(templateFiles),
        instructions,
        placeholders,
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
  }> {
    const keyFiles: string[] = [];
    const directories: string[] = [];
    const insights: string[] = [];
    
    let mainLanguage = 'unknown';
    let framework = 'unknown';
    let templateWorthiness = 0.5;

    // Analyze files
    for (const item of contents) {
      if (item.type === 'file') {
        keyFiles.push(item.name);
        
        // Detect language and framework
        if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
          mainLanguage = 'TypeScript';
          if (item.name.includes('next') || item.name === 'next.config.js') {
            framework = 'Next.js';
          } else if (item.name.includes('react')) {
            framework = 'React';
          }
        } else if (item.name.endsWith('.js') || item.name.endsWith('.jsx')) {
          mainLanguage = 'JavaScript';
          if (item.name.includes('next') || item.name === 'next.config.js') {
            framework = 'Next.js';
          } else if (item.name.includes('react')) {
            framework = 'React';
          }
        } else if (item.name.endsWith('.py')) {
          mainLanguage = 'Python';
          if (item.name.includes('django')) {
            framework = 'Django';
          } else if (item.name.includes('flask')) {
            framework = 'Flask';
          }
        } else if (item.name.endsWith('.java')) {
          mainLanguage = 'Java';
          framework = 'Spring';
        }
      } else if (item.type === 'dir') {
        directories.push(item.name);
      }
    }

    // Calculate template worthiness
    const hasPackageJson = keyFiles.includes('package.json');
    const hasReadme = keyFiles.includes('README.md');
    const hasSourceFiles = keyFiles.some(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx'));
    const hasConfigFiles = keyFiles.some(f => f.includes('config') || f.includes('Config'));
    
    templateWorthiness = 0.3; // Base score
    if (hasPackageJson) templateWorthiness += 0.2;
    if (hasReadme) templateWorthiness += 0.1;
    if (hasSourceFiles) templateWorthiness += 0.2;
    if (hasConfigFiles) templateWorthiness += 0.1;
    if (directories.length > 2) templateWorthiness += 0.1;

    // Generate insights
    insights.push(`Repository uses ${mainLanguage} with ${framework} framework`);
    if (hasPackageJson) insights.push('Contains package.json for dependency management');
    if (hasReadme) insights.push('Has documentation in README.md');
    if (hasSourceFiles) insights.push('Contains source code files');
    if (directories.length > 2) insights.push('Well-organized directory structure');

    // Generate recommended patterns
    const recommendedPatterns: string[] = [];
    if (mainLanguage === 'TypeScript' || mainLanguage === 'JavaScript') {
      recommendedPatterns.push('**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', 'package.json', '*.config.js');
    } else if (mainLanguage === 'Python') {
      recommendedPatterns.push('**/*.py', 'requirements.txt', 'setup.py', 'pyproject.toml');
    } else if (mainLanguage === 'Java') {
      recommendedPatterns.push('**/*.java', 'pom.xml', 'build.gradle');
    }

    return {
      mainLanguage,
      framework,
      keyFiles,
      directories,
      recommendedPatterns,
      templateWorthiness,
      insights,
    };
  }

  private async getMatchingFiles(
    octokit: Octokit,
    owner: string,
    repo: string,
    patterns: string[],
    subPath?: string
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
      patterns.some(pattern => minimatch(item.path!, pattern))
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

    // Get file contents - increased limit to 50 files to get more actual code
    for (const file of sortedFiles.slice(0, 50)) { // Limit to 50 files
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

  private async processFileForTemplate(
    file: { path: string; content: string; type: string },
    options: TemplateExtractionOptions
  ): Promise<TemplateFile> {
    let content = file.content;
    const placeholders: string[] = [];
    
    // Extract placeholders based on file type
    if (file.type === 'json' && file.path.includes('package.json')) {
      // Replace package.json specific values
      content = content.replace(/"name":\s*"[^"]*"/, '"name": "{{project-name}}"');
      content = content.replace(/"description":\s*"[^"]*"/, '"description": "{{project-description}}"');
      content = content.replace(/"version":\s*"[^"]*"/, '"version": "{{project-version}}"');
      placeholders.push('project-name', 'project-description', 'project-version');
    } else if (file.type === 'md' && file.path.includes('README')) {
      // Replace README specific values
      content = content.replace(/#\s+[^\n]+/g, '# {{project-title}}');
      placeholders.push('project-title');
    } else if (file.type === 'ts' || file.type === 'tsx' || file.type === 'js' || file.type === 'jsx') {
      // Replace common patterns in source files
      content = content.replace(/export\s+default\s+function\s+(\w+)/g, 'export default function {{component-name}}');
      content = content.replace(/const\s+(\w+)\s*=/g, 'const {{variable-name}} =');
      placeholders.push('component-name', 'variable-name');
    }

    // Generate description
    let description = `Template file: ${file.path}`;
    if (file.path.includes('package.json')) {
      description = 'Package configuration file';
    } else if (file.path.includes('README')) {
      description = 'Project documentation';
    } else if (file.type === 'ts' || file.type === 'tsx') {
      description = 'TypeScript source file';
    } else if (file.type === 'js' || file.type === 'jsx') {
      description = 'JavaScript source file';
    }

    return {
      path: file.path,
      content,
      description,
      placeholders,
    };
  }

  private generateStructureDescription(files: TemplateFile[]): string {
    const structure = files.map(file => {
      const indent = '  '.repeat(file.path.split('/').length - 1);
      return `${indent}${file.path.split('/').pop()}`;
    }).join('\n');
    
    return `Template Structure:\n${structure}`;
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
