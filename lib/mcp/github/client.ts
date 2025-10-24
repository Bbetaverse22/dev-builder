/**
 * GitHub MCP Client
 *
 * Client wrapper for the GitHub MCP server.
 * Uses HTTP transport to reach the GitHub MCP server.
 *
 * Official Server: https://github.com/github/github-mcp-server
 */

import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  GitHubRepository,
  SearchRepositoriesOptions,
  SearchRepositoriesResponse,
  MinimalRepository,
  FileContent,
  DecodedFileContent,
  CreateIssueOptions,
  GitHubIssue,
  GitHubMCPClientConfig,
  RepositoryContent,
  RepositoryLanguages,
  GitHubSkillAssessment,
} from './types.js';

export class GitHubMCPClient {
  private mcpClient: any = null;
  private config: GitHubMCPClientConfig;

  constructor(config?: GitHubMCPClientConfig) {
    const envToolsetCandidates = process.env.GITHUB_MCP_TOOLSETS
      ? process.env.GITHUB_MCP_TOOLSETS.split(',').map((value) => value.trim()).filter(Boolean)
      : undefined;
    const envToolsets = envToolsetCandidates && envToolsetCandidates.length > 0 ? envToolsetCandidates : undefined;
    const envReadOnlyRaw = process.env.GITHUB_MCP_READONLY;
    const envReadOnly = typeof envReadOnlyRaw === 'string'
      ? ['1', 'true', 'yes', 'y', 'on'].includes(envReadOnlyRaw.trim().toLowerCase())
      : undefined;

    const defaultHeaders: Record<string, string> = {};
    const bearer = process.env.GITHUB_MCP_BEARER;
    if (bearer) {
      defaultHeaders['Authorization'] = `Bearer ${bearer.replace(/^Bearer\s+/i, '')}`;
    }

    this.config = {
      githubToken: config?.githubToken || process.env.GITHUB_TOKEN,
      serverUrl: config?.serverUrl || process.env.GITHUB_MCP_SERVER_URL,
      timeout: config?.timeout || Number(process.env.GITHUB_MCP_TIMEOUT) || 30000,
      retryAttempts: config?.retryAttempts || Number(process.env.GITHUB_MCP_RETRY_ATTEMPTS) || 3,
      toolsets: config?.toolsets ?? envToolsets ?? ['repos', 'issues', 'pull_requests'],
      readOnly: config?.readOnly ?? envReadOnly ?? false,
      headers: {
        ...defaultHeaders,
        ...(config?.headers ?? {}),
      },
    };

    if (this.config.toolsets && this.config.toolsets.length > 0 && !this.config.headers?.['X-MCP-Toolsets']) {
      this.config.headers = {
        ...this.config.headers,
        'X-MCP-Toolsets': this.config.toolsets.join(','),
      };
    }

    if (this.config.readOnly && !this.config.headers?.['X-MCP-Readonly']) {
      this.config.headers = {
        ...this.config.headers,
        'X-MCP-Readonly': 'true',
      };
    }
  }

  /**
   * Connect to the GitHub MCP server
   */
  async connect(): Promise<void> {
    if (this.mcpClient) {
      return; // Already connected
    }

    if (!this.config.githubToken) {
      throw new Error(
        'GitHub token is required. Set GITHUB_TOKEN environment variable or pass it in config.'
      );
    }

    // Production: HTTP transport to /api/github-mcp
    const serverUrl = this.config.serverUrl;
    if (!serverUrl) {
      throw new Error(
        'GitHub MCP server URL is required. Set GITHUB_MCP_SERVER_URL environment variable or pass it in config.'
      );
    }

    const url = new URL(serverUrl);
    const headers: Record<string, string> = {};
    if (this.config.toolsets && this.config.toolsets.length > 0) {
      headers['X-MCP-Toolsets'] = this.config.toolsets.join(',');
    }
    if (this.config.readOnly) {
      headers['X-MCP-Readonly'] = 'true';
    }
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }

    const requestInit = Object.keys(headers).length > 0 ? { headers } : undefined;
    
    // Add timeout to fetch requests
    const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
          throw new Error(`MCP connection timeout after ${this.config.timeout}ms`);
        }
        throw error;
      }
    };
    
    this.mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(url, {
        sessionId: `devbuilder-${Date.now()}`,
        requestInit,
        fetch: fetchWithTimeout,
      }),
    });
    
    console.log(`[GitHub MCP] Connected via HTTP: ${url.toString()} (timeout: ${this.config.timeout}ms)`);
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.close();
      this.mcpClient = null;
    }
  }

  /**
   * Get available tools from the MCP server
   */
  async getTools() {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return await this.mcpClient.tools();
  }

  private async callMcpTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return await this.mcpClient.callTool({
      name: toolName,
      args,
    });
  }

  private parseTextContentResponse(text: string, owner: string, repo: string, path: string): FileContent {
    const shaMatch = text.match(/successfully downloaded text file \(SHA: ([a-f0-9]+)\)/i);
    if (shaMatch) {
      const sha = shaMatch[1];
      const newlineIndex = text.indexOf('\n');
      const content = newlineIndex >= 0 ? text.substring(newlineIndex + 1) : '';

      return {
        name: path.split('/').pop() || path,
        path,
        sha,
        size: content.length,
        url: '',
        html_url: `https://github.com/${owner}/${repo}/blob/main/${path}`,
        git_url: '',
        download_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
        type: 'file',
        _links: { self: '', git: '', html: '' },
        decodedContent: content,
      } as FileContent;
    }

    if (/missing resource/i.test(text)) {
      throw new Error(`GitHub MCP reported missing resource for ${owner}/${repo}/${path}`);
    }

    throw new Error(`Unrecognized MCP response format for ${owner}/${repo}/${path}`);
  }

  private async fetchGitHubRest<T>(endpoint: string, initHeaders?: Record<string, string>): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SkillBridge.ai-Agents/1.0.0',
      ...(initHeaders ?? {}),
    };

    if (this.config.githubToken) {
      headers.Authorization = `token ${this.config.githubToken}`;
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`GitHub REST request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search GitHub repositories
   *
   * @param query - Search query (e.g., "react authentication stars:>100")
   * @param options - Search options (pagination, sorting)
   * @returns Array of repositories
   *
   * @example
   * const repos = await client.searchRepositories('react hooks language:typescript stars:>1000', {
   *   per_page: 10,
   *   sort: 'stars',
   *   order: 'desc'
   * });
   */
  async searchRepositories(
    query: string,
    options?: Omit<SearchRepositoriesOptions, 'query'>
  ): Promise<GitHubRepository[] | MinimalRepository[]> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const args: Record<string, unknown> = {
      query,
      per_page: options?.per_page ?? 30,
      page: options?.page ?? 1,
      sort: options?.sort ?? 'stars',
      order: options?.order ?? 'desc',
      minimal_output: options?.minimal_output ?? true,
    };

    try {
      const result = await this.callMcpTool('search_repositories', args);

      const responseText = this.extractTextFromResponse(result);
      const parsed: SearchRepositoriesResponse = JSON.parse(responseText);

      return parsed.items;
    } catch (error) {
      throw this.handleError(error, 'search_repositories');
    }
  }

  /**
   * Get file contents from a repository
   *
   * @param owner - Repository owner (e.g., "facebook")
   * @param repo - Repository name (e.g., "react")
   * @param path - File path (e.g., "package.json")
   * @param ref - Optional branch/tag/commit (default: default branch)
   * @returns File content with metadata
   *
   * @example
   * const file = await client.getFileContents('facebook', 'react', 'package.json');
   * console.log(file.decodedContent); // UTF-8 decoded content
   */
  async getFileContents(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<DecodedFileContent> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const args: Record<string, unknown> = {
      owner,
      repo,
      path,
      ...(ref && { ref }),
    };

    try {
      const result = await this.callMcpTool('get_file_contents', args);

      const responseText = this.extractTextFromResponse(result);

      // Check for error messages from MCP
      if (responseText.toLowerCase().includes('failed') || responseText.toLowerCase().includes('not found')) {
        console.warn('[GitHub MCP] MCP returned error, falling back to REST API');
        const restFile = await this.fetchGitHubRest<FileContent>(
          `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${encodeURIComponent(String(ref))}` : ''}`
        );
        const decodedRestContent = restFile.content
          ? Buffer.from(restFile.content, 'base64').toString('utf-8')
          : '';

        return {
          ...restFile,
          decodedContent: decodedRestContent,
        };
      }

      // GitHub MCP server returns the file content directly as text, not JSON
      // The response format is: "successfully downloaded text file (SHA: xxx)"
      // followed by the actual file content

      // Check if response is a success message + content
      const shaMatch = responseText.match(/successfully downloaded text file \(SHA: ([a-f0-9]+)\)/);

      if (shaMatch) {
        // Extract the actual content after the success message
        const sha = shaMatch[1];

        // Debug: log raw response
        console.log('[DEBUG] Raw response first 500 chars:', responseText.substring(0, 500));

        // Content starts after the first newline
        const lines = responseText.split('\n');
        console.log('[DEBUG] Lines found:', lines.length);
        const actualContent = lines.slice(1).join('\n');

        if (actualContent.trim().length === 0) {
          const restFile = await this.fetchGitHubRest<FileContent>(
            `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${encodeURIComponent(String(ref))}` : ''}`
          );
          const decodedRestContent = restFile.content
            ? Buffer.from(restFile.content, 'base64').toString('utf-8')
            : '';

          return {
            ...restFile,
            decodedContent: decodedRestContent,
          };
        }

        // Return in expected format
        return {
          name: path.split('/').pop() || path,
          path: path,
          sha: sha,
          size: actualContent.length,
          url: '',
          html_url: `https://github.com/${owner}/${repo}/blob/main/${path}`,
          git_url: '',
          download_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
          type: 'file',
          _links: { self: '', git: '', html: '' },
          decodedContent: actualContent,
        };
      }

      // Try to parse as JSON (fallback for potential future format changes)
      try {
        const fileContent: FileContent = JSON.parse(responseText);
        const decodedContent = fileContent.content
          ? Buffer.from(fileContent.content, 'base64').toString('utf-8')
          : '';

        return {
          ...fileContent,
          decodedContent,
        };
      } catch {
        // If neither format works, return raw content
        return {
          name: path.split('/').pop() || path,
          path: path,
          sha: '',
          size: responseText.length,
          url: '',
          html_url: `https://github.com/${owner}/${repo}/blob/main/${path}`,
          git_url: '',
          download_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
          type: 'file',
          _links: { self: '', git: '', html: '' },
          decodedContent: responseText,
        };
      }
    } catch (error) {
      throw this.handleError(error, 'get_file_contents');
    }
  }

  /**
   * Get repository metadata
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const result = await this.callMcpTool('search_repositories', {
        query: `repo:${owner}/${repo}`,
        per_page: 1,
        page: 1,
        minimal_output: false,
      });

      const responseText = this.extractTextFromResponse(result);
      
      // Check if response is an error message
      if (responseText.toLowerCase().includes('failed') || responseText.toLowerCase().includes('error')) {
        console.warn('[GitHub MCP] MCP returned error, falling back to REST API:', responseText.substring(0, 100));
        return await this.fetchGitHubRest<GitHubRepository>(`/repos/${owner}/${repo}`);
      }
      
      const parsed: SearchRepositoriesResponse = JSON.parse(responseText);
      if (!parsed.items || parsed.items.length === 0) {
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      return parsed.items[0];
    } catch (error) {
      // Fall back to REST API
      console.warn('[GitHub MCP] MCP failed, using REST API fallback:', error instanceof Error ? error.message : 'Unknown error');
      try {
        return await this.fetchGitHubRest<GitHubRepository>(`/repos/${owner}/${repo}`);
      } catch (restError) {
        throw this.handleError(restError, 'get_repository');
      }
    }
  }

  /**
   * Get repository language usage
   */
  async getRepositoryLanguages(owner: string, repo: string): Promise<RepositoryLanguages> {
    return await this.fetchGitHubRest<RepositoryLanguages>(`/repos/${owner}/${repo}/languages`);
  }

  /**
   * List repository contents for a given path
   */
  async listRepositoryContents(
    owner: string,
    repo: string,
    path?: string,
    ref?: string
  ): Promise<RepositoryContent> {
    const args: Record<string, unknown> = {
      owner,
      repo,
      ...(path ? { path } : {}),
      ...(ref ? { ref } : {}),
    };

    const result = await this.callMcpTool('get_file_contents', args);
    const responseText = this.extractTextFromResponse(result);

    try {
      return JSON.parse(responseText);
    } catch {
      return await this.fetchGitHubRest<RepositoryContent>(
        `/repos/${owner}/${repo}/contents${path ? `/${path}` : ''}${ref ? `?ref=${encodeURIComponent(String(ref))}` : ''}`
      );
    }
  }

  /**
   * Get repository README file
   */
  async getRepositoryReadme(
    owner: string,
    repo: string,
    ref?: string
  ): Promise<DecodedFileContent> {
    const result = await this.callMcpTool('get_file_contents', {
      owner,
      repo,
      path: 'README.md',
      ...(ref ? { ref } : {}),
    });

    const responseText = this.extractTextFromResponse(result);

    try {
      const fileContent: FileContent = JSON.parse(responseText);
      const decodedContent = fileContent.content
        ? Buffer.from(fileContent.content, 'base64').toString('utf-8')
        : '';

      return {
        ...fileContent,
        decodedContent,
      };
    } catch {
      try {
        return this.parseTextContentResponse(responseText, owner, repo, 'README.md') as FileContent & {
          decodedContent: string;
        };
      } catch (error) {
        console.warn('[GitHub MCP] Falling back to REST for README:', error);
        const restReadme = await this.fetchGitHubRest<FileContent>(
          `/repos/${owner}/${repo}/readme${ref ? `?ref=${encodeURIComponent(String(ref))}` : ''}`
        );
        const decodedContent = restReadme.content
          ? Buffer.from(restReadme.content, 'base64').toString('utf-8')
          : '';

        return {
          ...restReadme,
          decodedContent,
        };
      }
    }
  }

  /**
   * Build a comprehensive skill assessment using available MCP tools
   * Analyzes repository structure, dependencies, and README to assess skills
   */
  async getSkillAssessment(
    owner: string,
    repo: string,
    options?: { ref?: string }
  ): Promise<GitHubSkillAssessment> {
    console.log(`[GitHub MCP] Building skill assessment for ${owner}/${repo}...`);
    
    try {
      const ref = options?.ref;
      
      // Gather data from multiple sources in parallel
      const [repoData, languages, readme, packageJson, tsConfig] = await Promise.allSettled([
        this.getRepository(owner, repo),
        this.getRepositoryLanguages(owner, repo),
        this.getRepositoryReadme(owner, repo, ref).catch(() => null),
        this.getFileContents(owner, repo, 'package.json', ref).catch(() => null),
        this.getFileContents(owner, repo, 'tsconfig.json', ref).catch(() => null),
      ]);

      // Extract successful results
      const repoInfo = repoData.status === 'fulfilled' ? repoData.value : null;
      const languageData = languages.status === 'fulfilled' ? languages.value : {};
      const readmeContent = readme.status === 'fulfilled' && readme.value ? readme.value.decodedContent : null;
      const packageJsonContent = packageJson.status === 'fulfilled' && packageJson.value ? packageJson.value.decodedContent : null;
      const hasTypeScript = tsConfig.status === 'fulfilled' && tsConfig.value !== null;

      // Analyze skills from various sources
      const detectedSkills = this.analyzeSkillsFromRepository(
        repoInfo,
        languageData,
        readmeContent,
        packageJsonContent,
        hasTypeScript
      );

      // Generate assessment summary
      const summary = this.generateAssessmentSummary(detectedSkills, repoInfo, languageData);
      
      // Generate recommendations
      const recommendations = this.generateSkillRecommendations(detectedSkills, languageData);

      console.log(`[GitHub MCP] ✅ Skill assessment complete: ${detectedSkills.length} skills detected`);

      return {
        summary,
        recommendations,
        skills: detectedSkills,
      };

    } catch (error) {
      console.error(`[GitHub MCP] ❌ Skill assessment failed for ${owner}/${repo}:`, error);
      throw this.handleError(error, 'skill_assessment');
    }
  }

  /**
   * Analyze skills from repository data
   */
  private analyzeSkillsFromRepository(
    repoInfo: any,
    languageData: Record<string, number>,
    readmeContent: string | null,
    packageJsonContent: string | null,
    hasTypeScript: boolean
  ): Array<{
    name: string;
    currentLevel: number;
    targetLevel: number;
    importance: number;
    category: string;
    confidence: number;
    description: string;
    recommendations: string[];
  }> {
    const skills: any[] = [];
    const totalBytes = Object.values(languageData).reduce((sum, bytes) => sum + bytes, 0);

    // Analyze programming languages
    Object.entries(languageData).forEach(([language, bytes]) => {
      const percentage = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0;
      
      // Only include languages with >5% usage
      if (percentage > 5) {
        const currentLevel = this.estimateLanguageLevel(percentage, repoInfo);
        
        skills.push({
          name: language,
          currentLevel,
          targetLevel: Math.min(5, currentLevel + 1),
          importance: Math.round(percentage / 10), // 0-10 scale
          category: 'programming_language',
          confidence: 0.85,
          description: `${percentage.toFixed(1)}% of repository code`,
          recommendations: this.getLanguageRecommendations(language, currentLevel),
        });
      }
    });

    // Analyze frameworks and libraries from package.json
    if (packageJsonContent) {
      try {
        const pkg = JSON.parse(packageJsonContent);
        const frameworks = this.detectFrameworks(pkg);
        
        frameworks.forEach(framework => {
          skills.push({
            name: framework.name,
            currentLevel: framework.level,
            targetLevel: Math.min(5, framework.level + 1),
            importance: framework.importance,
            category: 'framework',
            confidence: 0.9,
            description: framework.description,
            recommendations: framework.recommendations,
          });
        });
      } catch (e) {
        console.warn('[GitHub MCP] Failed to parse package.json:', e);
      }
    }

    // Analyze TypeScript usage
    if (hasTypeScript && languageData['TypeScript']) {
      const tsPercentage = (languageData['TypeScript'] / totalBytes) * 100;
      skills.push({
        name: 'TypeScript',
        currentLevel: tsPercentage > 50 ? 4 : 3,
        targetLevel: 5,
        importance: 8,
        category: 'programming_language',
        confidence: 0.95,
        description: 'TypeScript configuration detected',
        recommendations: [
          'Explore advanced TypeScript features like conditional types',
          'Implement strict type checking',
          'Use utility types effectively'
        ],
      });
    }

    // Analyze testing infrastructure
    if (packageJsonContent) {
      const testingSkills = this.detectTestingSkills(packageJsonContent);
      skills.push(...testingSkills);
    }

    // Analyze documentation quality from README
    if (readmeContent && readmeContent.length > 200) {
      const docSkill = this.assessDocumentationSkill(readmeContent);
      if (docSkill) {
        skills.push(docSkill);
      }
    }

    return skills;
  }

  /**
   * Estimate language proficiency level based on usage
   */
  private estimateLanguageLevel(percentage: number, repoInfo: any): number {
    // Base level on percentage and repository metrics
    let level = 2; // Default intermediate
    
    if (percentage > 80) level = 4; // Primary language
    else if (percentage > 50) level = 3;
    else if (percentage > 20) level = 3;
    else level = 2;

    // Adjust based on repo maturity
    if (repoInfo?.stargazers_count > 100) level = Math.min(5, level + 1);
    if (repoInfo?.forks_count > 50) level = Math.min(5, level + 1);

    return Math.max(1, Math.min(5, level));
  }

  /**
   * Detect frameworks from package.json
   */
  private detectFrameworks(pkg: any): Array<{
    name: string;
    level: number;
    importance: number;
    description: string;
    recommendations: string[];
  }> {
    const frameworks: any[] = [];
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // React
    if (deps['react']) {
      frameworks.push({
        name: 'React',
        level: deps['react'].includes('^18') || deps['react'].includes('^19') ? 4 : 3,
        importance: 9,
        description: `React ${deps['react']} - Modern UI library`,
        recommendations: [
          'Master React Hooks (useState, useEffect, custom hooks)',
          'Learn React performance optimization techniques',
          'Explore React Server Components if using Next.js'
        ],
      });
    }

    // Next.js
    if (deps['next']) {
      frameworks.push({
        name: 'Next.js',
        level: 4,
        importance: 9,
        description: 'Full-stack React framework',
        recommendations: [
          'Master App Router and Server Components',
          'Learn advanced data fetching patterns',
          'Implement proper caching strategies'
        ],
      });
    }

    // Vue
    if (deps['vue']) {
      frameworks.push({
        name: 'Vue.js',
        level: 3,
        importance: 8,
        description: `Vue ${deps['vue']} - Progressive framework`,
        recommendations: [
          'Master Composition API',
          'Learn Vue Router and Pinia for state management',
          'Practice component composition patterns'
        ],
      });
    }

    // Express
    if (deps['express']) {
      frameworks.push({
        name: 'Express.js',
        level: 3,
        importance: 7,
        description: 'Node.js web framework',
        recommendations: [
          'Learn middleware patterns',
          'Implement proper error handling',
          'Add authentication and security best practices'
        ],
      });
    }

    // Testing frameworks
    if (deps['jest'] || deps['vitest']) {
      frameworks.push({
        name: deps['jest'] ? 'Jest' : 'Vitest',
        level: 3,
        importance: 8,
        description: 'JavaScript testing framework',
        recommendations: [
          'Write comprehensive unit tests',
          'Practice test-driven development (TDD)',
          'Learn mocking and snapshot testing'
        ],
      });
    }

    return frameworks;
  }

  /**
   * Detect testing skills from package.json
   */
  private detectTestingSkills(packageJsonContent: string): any[] {
    const skills: any[] = [];
    
    if (packageJsonContent.includes('jest') || packageJsonContent.includes('vitest')) {
      skills.push({
        name: 'Unit Testing',
        currentLevel: 3,
        targetLevel: 5,
        importance: 9,
        category: 'testing',
        confidence: 0.85,
        description: 'Testing framework detected',
        recommendations: [
          'Increase test coverage to >80%',
          'Write integration tests for critical paths',
          'Practice test-driven development (TDD)'
        ],
      });
    }

    if (packageJsonContent.includes('cypress') || packageJsonContent.includes('playwright')) {
      skills.push({
        name: 'E2E Testing',
        currentLevel: 3,
        targetLevel: 5,
        importance: 7,
        category: 'testing',
        confidence: 0.9,
        description: 'End-to-end testing tool detected',
        recommendations: [
          'Build comprehensive E2E test suites',
          'Test critical user flows',
          'Implement visual regression testing'
        ],
      });
    }

    return skills;
  }

  /**
   * Assess documentation skill from README
   */
  private assessDocumentationSkill(readmeContent: string): any | null {
    const hasInstallation = /install|setup|getting started/i.test(readmeContent);
    const hasUsage = /usage|example|how to use/i.test(readmeContent);
    const hasApi = /api|reference|documentation/i.test(readmeContent);
    const hasBadges = /\[!\[.*\]\(.*\)\]/.test(readmeContent);
    
    const score = [hasInstallation, hasUsage, hasApi, hasBadges].filter(Boolean).length;
    
    if (score >= 2) {
      return {
        name: 'Technical Documentation',
        currentLevel: Math.min(5, score + 1),
        targetLevel: 5,
        importance: 7,
        category: 'soft_skill',
        confidence: 0.8,
        description: `Well-documented project with ${score}/4 documentation elements`,
        recommendations: [
          'Add more code examples',
          'Include troubleshooting section',
          'Document API endpoints thoroughly'
        ],
      };
    }
    
    return null;
  }

  /**
   * Get language-specific recommendations
   */
  private getLanguageRecommendations(language: string, level: number): string[] {
    const recommendations: Record<string, string[]> = {
      'JavaScript': [
        'Master ES6+ features (async/await, destructuring, modules)',
        'Learn functional programming concepts',
        'Practice writing clean, maintainable code'
      ],
      'TypeScript': [
        'Explore advanced types (generics, conditional types)',
        'Use strict mode for better type safety',
        'Learn type inference best practices'
      ],
      'Python': [
        'Master data structures and algorithms',
        'Learn async programming with asyncio',
        'Practice writing Pythonic code'
      ],
      'Java': [
        'Master OOP principles',
        'Learn Spring framework',
        'Practice design patterns'
      ],
      'Go': [
        'Master concurrency with goroutines',
        'Learn Go idioms and best practices',
        'Build microservices with Go'
      ],
    };

    return recommendations[language] || [
      `Deepen your ${language} expertise`,
      `Contribute to open source ${language} projects`,
      `Learn ${language} best practices and design patterns`
    ];
  }

  /**
   * Generate assessment summary
   */
  private generateAssessmentSummary(
    skills: any[],
    repoInfo: any,
    languageData: Record<string, number>
  ): string {
    const primaryLanguage = Object.keys(languageData).sort((a, b) => 
      languageData[b] - languageData[a]
    )[0] || 'Unknown';

    const frameworkSkills = skills.filter(s => s.category === 'framework');
    const testingSkills = skills.filter(s => s.category === 'testing');
    
    let summary = `Repository demonstrates ${primaryLanguage} proficiency`;
    
    if (frameworkSkills.length > 0) {
      const frameworkNames = frameworkSkills.map(s => s.name).join(', ');
      summary += ` with ${frameworkNames} framework experience`;
    }
    
    if (testingSkills.length > 0) {
      summary += `. Testing infrastructure in place`;
    }
    
    if (repoInfo?.stargazers_count > 50) {
      summary += `. Popular repository with ${repoInfo.stargazers_count} stars shows community validation`;
    }

    summary += `.`;
    
    return summary;
  }

  /**
   * Generate skill recommendations
   */
  private generateSkillRecommendations(
    skills: any[],
    languageData: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing testing
    const hasTestingSkills = skills.some(s => s.category === 'testing');
    if (!hasTestingSkills) {
      recommendations.push('Add testing framework (Jest, Vitest, or Playwright) to improve code quality');
    }

    // Check for documentation
    const hasDocSkills = skills.some(s => s.name.includes('Documentation'));
    if (!hasDocSkills) {
      recommendations.push('Improve documentation with comprehensive README and code comments');
    }

    // Check for TypeScript
    const hasTypeScript = 'TypeScript' in languageData;
    const hasJavaScript = 'JavaScript' in languageData;
    if (hasJavaScript && !hasTypeScript) {
      recommendations.push('Consider migrating to TypeScript for better type safety and maintainability');
    }

    // Check for CI/CD
    recommendations.push('Set up CI/CD pipeline for automated testing and deployment');

    // General recommendations
    recommendations.push('Implement code quality tools (ESLint, Prettier) for consistency');
    recommendations.push('Add performance monitoring and error tracking');

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * List available MCP tools
   *
   * @returns List of available tools from the GitHub MCP server
   */
  async listTools(): Promise<any[]> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const result = await this.mcpClient.listTools();
      return result.tools;
    } catch (error) {
      throw this.handleError(error, 'list_tools');
    }
  }

  /**
   * Create a new issue in a repository
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param title - Issue title
   * @param body - Issue body (Markdown)
   * @param options - Additional options (labels, assignees, milestone)
   * @returns Created issue
   *
   * @example
   * const issue = await client.createIssue('user', 'repo', 'Add tests', 'Need unit tests for auth', {
   *   labels: ['enhancement', 'testing'],
   *   assignees: ['username']
   * });
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body?: string,
    options?: Omit<CreateIssueOptions, 'owner' | 'repo' | 'title' | 'body'>
  ): Promise<GitHubIssue> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const args: Record<string, unknown> = {
      owner,
      repo,
      title,
      body: body || '',
      ...options,
    };

    try {
      const result = await this.callMcpTool('create_issue', args);

      const responseText = this.extractTextFromResponse(result);
      return JSON.parse(responseText);
    } catch (error) {
      throw this.handleError(error, 'create_issue');
    }
  }

  /**
   * Create a new pull request
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param title - Pull request title
   * @param body - Pull request body (Markdown)
   * @param head - Head branch name
   * @param base - Base branch name
   * @returns Created pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const args: Record<string, unknown> = {
      owner,
      repo,
      title,
      body,
      head,
      base,
    };

    try {
      const result = await this.callMcpTool('create_pull_request', args);

      const responseText = this.extractTextFromResponse(result);
      return JSON.parse(responseText);
    } catch (error) {
      throw this.handleError(error, 'create_pull_request');
    }
  }

  /**
   * Update an existing issue
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue number
   * @param updates - Updates to apply
   * @returns Updated issue
   */
  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<GitHubIssue> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const args: Record<string, unknown> = {
      owner,
      repo,
      issue_number: issueNumber,
      ...updates,
    };

    try {
      const result = await this.callMcpTool('update_issue', args);

      const responseText = this.extractTextFromResponse(result);
      return JSON.parse(responseText);
    } catch (error) {
      throw this.handleError(error, 'update_issue');
    }
  }

  /**
   * Add a comment to an issue or pull request
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue/PR number
   * @param body - Comment body (Markdown)
   * @returns Created comment
   */
  async addComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<any> {
    if (!this.mcpClient) {
      throw new Error('Client not connected. Call connect() first.');
    }

    const args: Record<string, unknown> = {
      owner,
      repo,
      issue_number: issueNumber,
      body,
    };

    try {
      const result = await this.callMcpTool('add_issue_comment', args);

      const responseText = this.extractTextFromResponse(result);
      return JSON.parse(responseText);
    } catch (error) {
      throw this.handleError(error, 'add_issue_comment');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract text from MCP tool response
   */
  private extractTextFromResponse(result: any): string {
    if (!result) {
      throw new Error('Invalid response from MCP server: empty response');
    }

    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      for (const item of result.content) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        if (item.type === 'text' && typeof item.text === 'string') {
          return item.text;
        }

        if ((item.type === 'json' || item.type === 'application/json') && item.json !== undefined) {
          try {
            return typeof item.json === 'string' ? item.json : JSON.stringify(item.json);
          } catch {
            /* ignore and continue */
          }
        }

        if (typeof item === 'string') {
          return item;
        }
      }
    }

    if (typeof result === 'string') {
      return result;
    }

    if (result.body && typeof result.body === 'string') {
      return result.body;
    }

    if (typeof result === 'object') {
      try {
        return JSON.stringify(result);
      } catch (error) {
        console.warn('[GitHub MCP] Unable to stringify MCP response object:', error);
      }
    }

    console.warn('[GitHub MCP] Unrecognized MCP response structure:', result);
    throw new Error('Invalid or unparseable response from MCP server');
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, toolName: string): Error {
    console.error(`GitHub MCP Error (${toolName}):`, error);

    if (error instanceof Error) {
      return error;
    }

    return new Error(`GitHub MCP tool '${toolName}' failed: ${String(error)}`);
  }
}

// ============================================================================
// Singleton Instance (Optional)
// ============================================================================

let githubMCPClient: GitHubMCPClient | null = null;

/**
 * Get or create a singleton GitHub MCP client instance
 */
export async function getGitHubMCPClient(
  config?: GitHubMCPClientConfig
): Promise<GitHubMCPClient> {
  if (!githubMCPClient) {
    githubMCPClient = new GitHubMCPClient(config);
    await githubMCPClient.connect();
  }
  return githubMCPClient;
}

/**
 * Close the singleton GitHub MCP client instance
 */
export async function closeGitHubMCPClient(): Promise<void> {
  if (githubMCPClient) {
    await githubMCPClient.disconnect();
    githubMCPClient = null;
  }
}
