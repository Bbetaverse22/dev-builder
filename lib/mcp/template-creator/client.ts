/**
 * Template Creator MCP Client
 *
 * Client wrapper for the custom Template Creator MCP server.
 * Provides easy-to-use methods for extracting templates from GitHub repositories.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'path';

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

interface Boilerplate {
  technology: string;
  features: string[];
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  setupInstructions: string[];
}

export class TemplateCreatorClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnecting = false;

  /**
   * Connect to the Template Creator MCP server
   */
  async connect(): Promise<void> {
    if (this.client || this.isConnecting) {
      return; // Already connected or connection in progress
    }

    // Use tsx to run TypeScript directly (no build needed)
    // Fix: Use absolute path instead of require.resolve to avoid [project] placeholder issues
    const serverPath = join(process.cwd(), 'lib', 'mcp', 'template-creator', 'server.ts');

    this.isConnecting = true;
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: [
        'tsx',
        serverPath,
      ],
    });

    try {
      this.client = new Client(
        {
          name: 'skillbridge-template-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await this.client.connect(this.transport);
    } catch (error) {
      // Reset state so the next call can retry
      if (this.transport) {
        try {
          await this.transport.close();
        } catch {
          // ignore
        }
      }
      this.client = null;
      this.transport = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }

  /**
   * Extract a clean template from a GitHub repository
   *
   * @param repoUrl - GitHub repository URL
   * @param filePatterns - File patterns to include (e.g., ["*.ts", "package.json"])
   * @param options - Extraction options
   * @returns Extracted template with placeholders
   */
  async extractTemplate(
    repoUrl: string,
    filePatterns: string[],
    options?: TemplateExtractionOptions
  ): Promise<ExtractedTemplate> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    return this.callToolWithRetry(
      {
        name: 'extract_template',
        arguments: {
          repoUrl,
          filePatterns,
          options: options || {},
        },
      },
      (result) => {
        const responseText = ((result.content as any)[0] as any).text;
        return JSON.parse(responseText);
      }
    );
  }

  /**
   * Analyze repository structure to identify template-worthy files
   *
   * @param repoUrl - GitHub repository URL
   * @param depth - Directory depth to analyze (default: 3)
   * @returns Structure analysis with recommendations
   */
  async analyzeStructure(
    repoUrl: string,
    depth: number = 3
  ): Promise<StructureAnalysis> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    return this.callToolWithRetry(
      {
        name: 'analyze_structure',
        arguments: {
          repoUrl,
          depth,
        },
      },
      (result) => {
        const responseText = ((result.content as any)[0] as any).text;
        return JSON.parse(responseText);
      }
    );
  }

  /**
   * Generate boilerplate code based on technology and features
   *
   * @param technology - Technology/framework (e.g., "react", "nextjs")
   * @param features - Features to include (e.g., ["authentication", "database"])
   * @param typescript - Use TypeScript (default: true)
   * @returns Generated boilerplate code
   */
  async generateBoilerplate(
    technology: string,
    features: string[],
    typescript: boolean = true
  ): Promise<Boilerplate> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    return this.callToolWithRetry(
      {
        name: 'generate_boilerplate',
        arguments: {
          technology,
          features,
          typescript,
        },
      },
      (result) => {
        const responseText = ((result.content as any)[0] as any).text;
        return JSON.parse(responseText);
      }
    );
  }

  /**
   * High-level method: Complete template creation workflow
   *
   * 1. Analyze repository structure
   * 2. Extract template with recommended patterns
   * 3. Return clean template ready for use
   */
  async createTemplateFromRepo(
    repoUrl: string,
    options?: TemplateExtractionOptions
  ): Promise<{
    analysis: StructureAnalysis;
    template: ExtractedTemplate;
  }> {
    // Step 1: Analyze structure
    const analysis = await this.analyzeStructure(repoUrl);

    // Step 2: Extract template using recommended patterns
    const template = await this.extractTemplate(
      repoUrl,
      analysis.recommendedPatterns,
      options
    );

    return { analysis, template };
  }

  private async callToolWithRetry<T>(
    request: {
      name: string;
      arguments: Record<string, unknown>;
    },
    parser: (result: any) => T,
    attempt = 0
  ): Promise<T> {
    await this.connect();

    if (!this.client) {
      throw new Error('Template Creator MCP client not available');
    }

    try {
      const result = await this.client.callTool(request);

      if ((result as any).isError) {
        const responseText = ((result.content as any)[0] as any)?.text ?? '{}';
        let message = `Template Creator MCP returned an error for tool "${request.name}"`;
        try {
          const payload = JSON.parse(responseText);
          message = payload.error ?? message;
        } catch {
          // Ignore JSON parse errors - fallback to default message
        }
        throw new Error(message);
      }

      return parser(result);
    } catch (error) {
      if (this.shouldRetry(error) && attempt === 0) {
        await this.resetConnection();
        return this.callToolWithRetry(request, parser, attempt + 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message || '';
    const connectionClosed =
      message.includes('Not connected') ||
      message.includes('Connection closed') ||
      message.includes('EPIPE') ||
      message.includes('ECONNRESET');

    const code = (error as any).code;
    return connectionClosed || code === -32000;
  }

  private async resetConnection(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }
}

// Export singleton instance for easy use
let templateCreatorClient: TemplateCreatorClient | null = null;

export async function getTemplateCreatorClient(): Promise<TemplateCreatorClient> {
  if (!templateCreatorClient) {
    templateCreatorClient = new TemplateCreatorClient();
    await templateCreatorClient.connect();
  }
  return templateCreatorClient;
}

export async function closeTemplateCreatorClient(): Promise<void> {
  if (templateCreatorClient) {
    await templateCreatorClient.disconnect();
    templateCreatorClient = null;
  }
}