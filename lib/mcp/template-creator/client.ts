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

  /**
   * Connect to the Template Creator MCP server
   */
  async connect(): Promise<void> {
    if (this.client) {
      return; // Already connected
    }

    // Use tsx to run TypeScript directly (no build needed)
    // Fix: Use absolute path instead of require.resolve to avoid [project] placeholder issues
    const serverPath = join(process.cwd(), 'lib', 'mcp', 'template-creator', 'server.ts');

    this.transport = new StdioClientTransport({
      command: 'npx',
      args: [
        'tsx',
        serverPath,
      ],
    });

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

    const result = await this.client.callTool({
      name: 'extract_template',
      arguments: {
        repoUrl,
        filePatterns,
        options: options || {},
      },
    });

    const responseText = ((result.content as any)[0] as any).text;
    return JSON.parse(responseText);
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

    const result = await this.client.callTool({
      name: 'analyze_structure',
      arguments: {
        repoUrl,
        depth,
      },
    });

    const responseText = ((result.content as any)[0] as any).text;
    return JSON.parse(responseText);
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

    const result = await this.client.callTool({
      name: 'generate_boilerplate',
      arguments: {
        technology,
        features,
        typescript,
      },
    });

    const responseText = ((result.content as any)[0] as any).text;
    return JSON.parse(responseText);
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
