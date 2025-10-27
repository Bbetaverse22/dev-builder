/**
 * TypeScript types for GitHub MCP Server
 *
 * Based on official GitHub MCP server tools:
 * https://github.com/github/github-mcp-server
 */

// ============================================================================
// Repository Types
// ============================================================================

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
    description: string | null;
    private: boolean;
    html_url: string;
    url: string;
    stargazers_count: number;
    watchers_count: number;
    forks_count: number;
    language: string | null;
    topics: string[];
    created_at: string;
    updated_at: string;
    pushed_at: string;
    size: number;
    default_branch: string;
    open_issues_count: number;
    has_issues: boolean;
    has_projects: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_downloads: boolean;
    archived: boolean;
    disabled: boolean;
    license: {
      key: string;
      name: string;
      spdx_id: string;
      url: string | null;
    } | null;
  }
  
export interface SearchRepositoriesOptions {
    query: string;
    per_page?: number;
    page?: number;
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    minimal_output?: boolean;
    [key: string]: unknown;
}
  
export interface SearchRepositoriesResponse {
    total_count: number;
    incomplete_results: boolean;
    items: GitHubRepository[];
}

// Simplified repository for minimal_output=true
export interface MinimalRepository {
    name: string;
    full_name: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
    topics: string[];
}

export interface RepositoryLanguages {
    [language: string]: number;
}
  
  // ============================================================================
  // File Content Types
  // ============================================================================
  
export interface GetFileContentsOptions {
    owner: string;
    repo: string;
    path: string;
    ref?: string; // branch, tag, or commit SHA
    [key: string]: unknown;
}
  
export interface FileContent {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string | null;
    type: 'file' | 'dir' | 'submodule' | 'symlink';
    content?: string; // base64 encoded
    encoding?: string;
    _links: {
      self: string;
      git: string;
      html: string;
    };
}

export interface DecodedFileContent extends FileContent {
    decodedContent: string; // UTF-8 decoded content
}

export type RepositoryContent = FileContent | FileContent[];
  
  // ============================================================================
  // Issue Types
  // ============================================================================
  
export interface CreateIssueOptions {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    assignees?: string[];
    milestone?: number;
    labels?: string[];
    [key: string]: unknown;
}
  
export interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    user: {
      login: string;
      id: number;
      avatar_url: string;
      type: string;
    };
    body: string | null;
    labels: Array<{
      id: number;
      name: string;
      color: string;
      description: string | null;
    }>;
    assignees: Array<{
      login: string;
      id: number;
      avatar_url: string;
    }>;
    milestone: {
      id: number;
      number: number;
      title: string;
      description: string | null;
      state: 'open' | 'closed';
    } | null;
    locked: boolean;
    comments: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    html_url: string;
    url: string;
}
  
  // ============================================================================
  // MCP Tool Response Types
  // ============================================================================
  
export interface MCPToolResponse {
    content: Array<{
      type: 'text';
      text: string;
    }>;
    isError?: boolean;
}
  
  // ============================================================================
  // Error Types
  // ============================================================================
  
export interface GitHubMCPError extends Error {
    code?: string;
    status?: number;
    response?: {
      message: string;
      documentation_url?: string;
    };
}
  
  // ============================================================================
  // Client Configuration
  // ============================================================================
  
export interface GitHubMCPClientConfig {
  githubToken?: string;
  timeout?: number;
  retryAttempts?: number;
  toolsets?: string[]; // e.g., ['repos', 'issues', 'pull_requests']
  serverUrl?: string; // Server URL for HTTP transport (e.g., https://your-app.vercel.app/api/github-mcp)
  readOnly?: boolean;
  headers?: Record<string, string>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SortOrder = 'asc' | 'desc';
export type RepositorySort = 'stars' | 'forks' | 'help-wanted-issues' | 'updated';

// For LangGraph integration
export interface GitHubExample {
  name: string;
  url: string;
  stars: number;
  description: string;
  language: string;
  topics?: string[];
}

export interface GitHubSkillAssessment {
  summary?: string;
  recommendations?: string[];
  skills?: Array<{
    name: string;
    level?: number | string;
    current_level?: number;
    currentLevel?: number;
    target_level?: number;
    targetLevel?: number;
    importance?: number;
    category?: string;
    confidence?: number;
    description?: string;
    recommendations?: string[];
  }>;
  skill_gaps?: Array<Record<string, unknown>>;
  skillGaps?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
