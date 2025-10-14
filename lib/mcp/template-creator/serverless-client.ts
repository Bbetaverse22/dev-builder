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
      const { owner, repo } = this.parseRepositoryUrl(repoUrl);
      const octokit = this.getOctokit();

      // Get repository information
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      
      // Get repository contents
      const { data: contents } = await octokit.repos.getContent({
        owner,
        repo,
        path: '',
      });

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
      const { owner, repo } = this.parseRepositoryUrl(repoUrl);
      const octokit = this.getOctokit();

      // Get all files matching the patterns
      const files = await this.getMatchingFiles(octokit, owner, repo, filePatterns);
      
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

      // Generate instructions
      instructions.push(
        '1. Replace all placeholders with your specific values',
        '2. Update package.json with your project details',
        '3. Install dependencies: npm install',
        '4. Customize the code for your specific use case',
        '5. Update README.md with your project information'
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
    patterns: string[]
  ): Promise<Array<{ path: string; content: string; type: string }>> {
    const files: Array<{ path: string; content: string; type: string }> = [];
    
    // Get repository tree
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true',
    });

    // Filter files by patterns
    const matchingFiles = tree.tree.filter(item => 
      item.type === 'blob' && 
      patterns.some(pattern => minimatch(item.path, pattern))
    );

    // Get file contents
    for (const file of matchingFiles.slice(0, 20)) { // Limit to 20 files
      try {
        const { data: content } = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: file.sha!,
        });
        
        files.push({
          path: file.path,
          content: Buffer.from(content.content!, 'base64').toString('utf-8'),
          type: file.path.split('.').pop() || 'unknown',
        });
      } catch (error) {
        console.warn(`Failed to get content for ${file.path}:`, error);
      }
    }

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

  private parseRepositoryUrl(repoUrl: string): { owner: string; repo: string } {
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
