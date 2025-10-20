/**
 * Remote MCP Client
 *
 * Calls the hosted MCP server via HTTP
 */

export interface TemplateExtractionOptions {
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

export interface ExtractedTemplate {
  files: TemplateFile[];
  structure: string;
  instructions: string[];
  placeholders: Record<string, string>;
  metadata?: TemplateMetadata;
}

export interface TemplateFile {
  path: string;
  content: string;
  description: string;
  placeholders: string[];
}

export interface StructureAnalysis {
  repoUrl: string;
  mainLanguage: string;
  framework: string;
  keyFiles: string[];
  directories: string[];
  recommendedPatterns: string[];
  templateWorthiness: number;
  insights: string[];
}

export interface TemplateMetadata {
  modeUsed: 'skeleton' | 'copier';
  redactedFunctions: number;
  droppedFiles: string[];
  totalFilesConsidered: number;
  warnings?: string[];
  fallbackReason?: string;
  notes?: string[];
}

export class RemoteTemplateCreatorClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout: number = 60000) {
    this.baseUrl = baseUrl || process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.timeout = timeout;
  }

  /**
   * Analyze repository structure
   */
  async analyzeStructure(repoUrl: string, depth: number = 3): Promise<StructureAnalysis> {
    const response = await this.makeRequest('/api/analyze', {
      repoUrl,
      depth,
    });

    return response.data;
  }

  /**
   * Extract template from repository
   */
  async extractTemplate(
    repoUrl: string,
    filePatterns: string[],
    options?: TemplateExtractionOptions
  ): Promise<ExtractedTemplate> {
    const response = await this.makeRequest('/api/extract', {
      repoUrl,
      filePatterns,
      options,
    });

    return response.data;
  }

  /**
   * Complete template creation workflow (analyze + extract)
   */
  async createTemplateFromRepo(
    repoUrl: string,
    options?: TemplateExtractionOptions
  ): Promise<{
    analysis: StructureAnalysis;
    template: ExtractedTemplate;
  }> {
    const response = await this.makeRequest('/api/create-template', {
      repoUrl,
      options,
    });

    return response.data;
  }

  /**
   * Check if MCP server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('[Remote MCP Client] Health check failed:', error);
      return false;
    }
  }

  /**
   * Make HTTP request to MCP server
   */
  private async makeRequest(endpoint: string, body: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: any = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`MCP Server error: ${error.error || response.statusText}`);
      }

      const result: any = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'MCP Server returned unsuccessful response');
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`MCP Server request timed out after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * No-op methods for API compatibility
   */
  async connect(): Promise<void> {
    // Remote client doesn't need connection
  }

  async disconnect(): Promise<void> {
    // Remote client doesn't need disconnection
  }
}

// Singleton instance
let remoteClient: RemoteTemplateCreatorClient | null = null;

export function getRemoteTemplateCreatorClient(baseUrl?: string): RemoteTemplateCreatorClient {
  if (!remoteClient || (baseUrl && remoteClient['baseUrl'] !== baseUrl)) {
    remoteClient = new RemoteTemplateCreatorClient(baseUrl);
  }
  return remoteClient;
}
