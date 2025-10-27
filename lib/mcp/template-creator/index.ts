/**
 * Template Creator Client - Unified Interface
 *
 * Automatically selects the appropriate implementation based on environment:
 * - MCP_SERVER_URL set: Uses remote HTTP server
 * - No MCP_SERVER_URL: Uses local serverless client
 */

import { ServerlessTemplateCreatorClient } from './serverless-client';
import { RemoteTemplateCreatorClient } from './remote-client';

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

export interface TemplateMetadata {
  modeUsed: 'skeleton' | 'copier';
  redactedFunctions: number;
  droppedFiles: string[];
  totalFilesConsidered: number;
  warnings?: string[];
  fallbackReason?: string;
  notes?: string[];
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

/**
 * Unified Template Creator Client
 * Automatically chooses between local and remote implementation
 */
export class TemplateCreatorClient {
  private client: ServerlessTemplateCreatorClient | RemoteTemplateCreatorClient;
  private useRemote: boolean;

  constructor() {
    const mcpServerUrl = process.env.MCP_SERVER_URL;
    this.useRemote = !!mcpServerUrl;

    if (this.useRemote) {
      console.log(`[Template Creator] Using remote MCP server: ${mcpServerUrl}`);
      this.client = new RemoteTemplateCreatorClient(mcpServerUrl);
    } else {
      console.log('[Template Creator] Using local serverless client');
      this.client = new ServerlessTemplateCreatorClient();
    }
  }

  /**
   * Analyze repository structure
   */
  async analyzeStructure(repoUrl: string, depth: number = 3): Promise<StructureAnalysis> {
    return this.client.analyzeStructure(repoUrl, depth);
  }

  /**
   * Extract template from repository
   */
  async extractTemplate(
    repoUrl: string,
    filePatterns: string[],
    options?: TemplateExtractionOptions
  ): Promise<ExtractedTemplate> {
    return this.client.extractTemplate(repoUrl, filePatterns, options);
  }

  /**
   * Complete template creation workflow
   */
  async createTemplateFromRepo(
    repoUrl: string,
    options?: TemplateExtractionOptions
  ): Promise<{
    analysis: StructureAnalysis;
    template: ExtractedTemplate;
  }> {
    const analysis = await this.analyzeStructure(repoUrl);
    const template = await this.extractTemplate(
      repoUrl,
      analysis.recommendedPatterns,
      options
    );
    return { analysis, template };
  }

  /**
   * Check if using remote server
   */
  isRemote(): boolean {
    return this.useRemote;
  }

  /**
   * Health check (only works for remote)
   */
  async healthCheck(): Promise<boolean> {
    if (this.useRemote && this.client instanceof RemoteTemplateCreatorClient) {
      return this.client.healthCheck();
    }
    return true; // Local client is always "healthy"
  }

  /**
   * No-op connect method for API compatibility
   */
  async connect(): Promise<void> {
    // Neither client needs connection
  }

  /**
   * No-op disconnect method for API compatibility
   */
  async disconnect(): Promise<void> {
    // Neither client needs disconnection
  }
}

// Singleton instance
let templateCreatorClient: TemplateCreatorClient | null = null;

/**
 * Get or create the template creator client instance
 */
export async function getTemplateCreatorClient(): Promise<TemplateCreatorClient> {
  if (!templateCreatorClient) {
    templateCreatorClient = new TemplateCreatorClient();
  }
  return templateCreatorClient;
}

/**
 * Close the template creator client (no-op for serverless)
 */
export async function closeTemplateCreatorClient(): Promise<void> {
  templateCreatorClient = null;
}

// Note: Types are already exported above via interfaces, no need to re-export
