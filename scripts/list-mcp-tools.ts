import { GitHubMCPClient } from '../lib/mcp/github';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  const bearer = process.env.GITHUB_MCP_BEARER;
  if (!bearer) {
    throw new Error('Set GITHUB_MCP_BEARER to your GitHub MCP token');
  }

  const client = new GitHubMCPClient({
    headers: {
      Authorization: `Bearer ${bearer.replace(/^Bearer\s+/i, '')}`,
    },
  });
  await client.connect();
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  console.log('\nTool names:\n' + tools.map((tool: any) => tool?.name ?? '').filter(Boolean).join('\n'));
  await client.disconnect();
}

main().catch((error) => {
  console.error('Failed to list MCP tools:', error);
  process.exit(1);
});
