/**
 * GitHub MCP Client
 *
 * Client wrapper for the GitHub MCP server.
 * Supports both HTTP transport (production) and stdio transport (development with Docker).
 *
 * Official Server: https://github.com/github/github-mcp-server
 */

import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  GitHubRepository,
  SearchRepositoriesOptions,
  SearchRepositoriesResponse,
  MinimalRepository,
  GetFileContentsOptions,
  FileContent,
  DecodedFileContent,
  CreateIssueOptions,
  GitHubIssue,
  GitHubMCPClientConfig,
  MCPToolResponse,
} from './types.js';

export class GitHubMCPClient {
  private mcpClient: any = null;
  private transport: 'stdio' | 'http';
  private config: GitHubMCPClientConfig;

  constructor(config?: GitHubMCPClientConfig) {
    this.config = {
      githubToken: config?.githubToken || process.env.GITHUB_TOKEN,
      serverUrl: config?.serverUrl || process.env.GITHUB_MCP_SERVER_URL,
      transport: config?.transport,
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
      toolsets: config?.toolsets || ['repos', 'issues', 'pull_requests'],
    };
    
    // Auto-detect: use HTTP if server URL provided, otherwise stdio (Docker)
    this.transport = this.config.transport || 
      (this.config.serverUrl ? 'http' : 'stdio');
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

    if (this.transport === 'http') {
      // Production: HTTP transport to /api/github-mcp
      const url = new URL(
        this.config.serverUrl || 'http://localhost:3000/api/github-mcp'
      );
      
      this.mcpClient = await createMCPClient({
        transport: new StreamableHTTPClientTransport(url, {
          sessionId: `skillbridge-${Date.now()}`,
        }),
      });
      
      console.log(`[GitHub MCP] Connected via HTTP: ${url.toString()}`);
    } else {
      // Development: stdio transport to Docker
      this.mcpClient = await createMCPClient({
        transport: new StdioClientTransport({
          command: 'docker',
          args: [
            'run', '-i', '--rm',
            '-e', `GITHUB_PERSONAL_ACCESS_TOKEN=${this.config.githubToken}`,
            'ghcr.io/github/github-mcp-server',
          ],
        }),
      });
      
      console.log('[GitHub MCP] Connected via stdio (Docker)');
    }
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
      const result = await this.mcpClient.callTool({
        name: 'search_repositories',
        arguments: args,
      });

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
      const result = await this.mcpClient.callTool({
        name: 'get_file_contents',
        arguments: args,
      });

      const responseText = this.extractTextFromResponse(result);

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
      const result = await this.mcpClient.callTool({
        name: 'create_issue',
        args,
      });

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
      const result = await this.mcpClient.callTool({
        name: 'create_pull_request',
        args,
      });

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
      const result = await this.mcpClient.callTool({
        name: 'update_issue',
        args,
      });

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
      const result = await this.mcpClient.callTool({
        name: 'add_comment',
        args,
      });

      const responseText = this.extractTextFromResponse(result);
      return JSON.parse(responseText);
    } catch (error) {
      throw this.handleError(error, 'add_comment');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract text from MCP tool response
   */
  private extractTextFromResponse(result: any): string {
    if (!result || !result.content || result.content.length === 0) {
      throw new Error('Invalid response from MCP server: no content');
    }

    const content = result.content[0];
    if (content.type !== 'text' || !content.text) {
      throw new Error('Invalid response from MCP server: no text content');
    }

    return content.text;
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