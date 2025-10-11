/**
 * GitHub API Client using native fetch
 * Provides GitHub integration functionality for the SkillBridge.ai agents
 */

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || '';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SkillBridge.ai-Agents/1.0.0',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GitHub API request failed:', error);
      throw error;
    }
  }

  /**
   * Get user information by username
   */
  async getUser(username: string): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>(`/users/${username}`);
  }

  /**
   * Get user repositories
   */
  async getUserRepositories(username: string, options: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/users/${username}/repos${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GitHubRepository[]>(endpoint);
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/repos/${owner}/${repo}`);
  }

  /**
   * Get repository issues
   */
  async getRepositoryIssues(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubIssue[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/repos/${owner}/${repo}/issues${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GitHubIssue[]>(endpoint);
  }

  /**
   * Get repository pull requests
   */
  async getRepositoryPullRequests(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams();1
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/repos/${owner}/${repo}/pulls${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<GitHubPullRequest[]>(endpoint);
  }

  /**
   * Search repositories
   */
  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{ total_count: number; items: GitHubRepository[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/search/repositories?${queryString}`;
    
    return this.makeRequest<{ total_count: number; items: GitHubRepository[] }>(endpoint);
  }

  /**
   * Search issues across GitHub
   */
  async searchIssues(query: string, options: {
    sort?: 'created' | 'updated' | 'comments';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{ total_count: number; items: GitHubIssue[] }> {
    const params = new URLSearchParams();
    params.append('q', query);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/search/issues?${queryString}`;
    
    return this.makeRequest<{ total_count: number; items: GitHubIssue[] }>(endpoint);
  }

  /**
   * Get repository contents
   */
  async getRepositoryContents(owner: string, repo: string, path: string = ''): Promise<any> {
    return this.makeRequest<any>(`/repos/${owner}/${repo}/contents/${path}`);
  }

  /**
   * Get repository README
   */
  async getRepositoryReadme(owner: string, repo: string): Promise<{ content: string; encoding: string }> {
    return this.makeRequest<{ content: string; encoding: string }>(`/repos/${owner}/${repo}/readme`);
  }

  /**
   * Create an issue in a repository
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    options?: {
      labels?: string[];
      assignees?: string[];
      milestone?: number;
    }
  ): Promise<GitHubIssue> {
    const issueData: any = {
      title,
      body,
    };

    if (options?.labels) {
      issueData.labels = options.labels;
    }

    if (options?.assignees) {
      issueData.assignees = options.assignees;
    }

    if (options?.milestone) {
      issueData.milestone = options.milestone;
    }

    return this.makeRequest<GitHubIssue>(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData),
    });
  }

  /**
   * Check if a file exists in the repository
   */
  async fileExists(owner: string, repo: string, path: string): Promise<boolean> {
    try {
      await this.getRepositoryContents(owner, repo, path);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a default instance
export const githubClient = new GitHubClient();

