/**
 * GitHub MCP Server - Next.js API Route
 * 
 * Implements MCP protocol for GitHub operations (create_issue, create_pull_request)
 * Uses Octokit to interact with GitHub API
 */

import { NextRequest } from 'next/server';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ 
  auth: process.env.GITHUB_TOKEN 
});

const JSON_RPC_VERSION = '2.0';

const jsonRpcSuccess = (id: string | number | null | undefined, result: unknown, init?: ResponseInit) =>
  Response.json(
    {
      jsonrpc: JSON_RPC_VERSION,
      id: id ?? null,
      result,
    },
    init,
  );

const jsonRpcError = (
  id: string | number | null | undefined,
  code: number,
  message: string,
  init?: ResponseInit,
) =>
  Response.json(
    {
      jsonrpc: JSON_RPC_VERSION,
      id: id ?? null,
      error: {
        code,
        message,
      },
    },
    init,
  );

// MCP protocol handler
export async function POST(req: NextRequest) {
  try {
    const request = await req.json();
    
    console.log('[GitHub MCP] Received request:', JSON.stringify(request));
    const { id, method, params } = request;
    
    // Handle MCP protocol requests
    if (method === 'initialize') {
      return jsonRpcSuccess(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'github-mcp-server',
          version: '1.0.0',
        },
      });
    }
    
    if (method === 'tools/list') {
      return jsonRpcSuccess(id, {
        tools: [
          {
            name: 'create_issue',
            description: 'Create a GitHub issue',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                title: { type: 'string', description: 'Issue title' },
                body: { type: 'string', description: 'Issue body (Markdown)' },
                labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' },
                assignees: { type: 'array', items: { type: 'string' }, description: 'Issue assignees' },
              },
              required: ['owner', 'repo', 'title'],
            },
          },
          {
            name: 'create_pull_request',
            description: 'Create a GitHub pull request',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                title: { type: 'string', description: 'Pull request title' },
                body: { type: 'string', description: 'Pull request body (Markdown)' },
                head: { type: 'string', description: 'Head branch name' },
                base: { type: 'string', description: 'Base branch name' },
              },
              required: ['owner', 'repo', 'title', 'head', 'base'],
            },
          },
          {
            name: 'update_issue',
            description: 'Update an existing GitHub issue',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                issue_number: { type: 'number', description: 'Issue number' },
                title: { type: 'string', description: 'New issue title' },
                body: { type: 'string', description: 'New issue body' },
                state: { type: 'string', enum: ['open', 'closed'], description: 'Issue state' },
                labels: { type: 'array', items: { type: 'string' }, description: 'Issue labels' },
                assignees: { type: 'array', items: { type: 'string' }, description: 'Issue assignees' },
              },
              required: ['owner', 'repo', 'issue_number'],
            },
          },
          {
            name: 'add_comment',
            description: 'Add a comment to a GitHub issue or pull request',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                issue_number: { type: 'number', description: 'Issue/PR number' },
                body: { type: 'string', description: 'Comment body (Markdown)' },
              },
              required: ['owner', 'repo', 'issue_number', 'body'],
            },
          },
          {
            name: 'get_repository',
            description: 'Get metadata for a GitHub repository',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
              },
              required: ['owner', 'repo'],
            },
          },
          {
            name: 'get_repository_languages',
            description: 'Get language usage for a GitHub repository',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
              },
              required: ['owner', 'repo'],
            },
          },
          {
            name: 'list_repository_contents',
            description: 'List directory contents for a GitHub repository path',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                path: { type: 'string', description: 'Directory path (default: root)' },
                ref: { type: 'string', description: 'Branch, tag, or commit SHA' },
              },
              required: ['owner', 'repo'],
            },
          },
          {
            name: 'get_file_contents',
            description: 'Fetch the contents of a file in a GitHub repository',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                path: { type: 'string', description: 'File path in the repository' },
                ref: { type: 'string', description: 'Branch, tag, or commit SHA' },
              },
              required: ['owner', 'repo', 'path'],
            },
          },
          {
            name: 'get_repository_readme',
            description: 'Fetch the README for a GitHub repository',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string', description: 'Repository owner' },
                repo: { type: 'string', description: 'Repository name' },
                ref: { type: 'string', description: 'Branch, tag, or commit SHA' },
              },
              required: ['owner', 'repo'],
            },
          },
        ],
      });
    }
    
    if (method === 'notifications/initialized') {
      return new Response(null, { status: 204 });
    }
    
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};
      if (!toolName) {
        return jsonRpcError(id, -32602, 'Tool name is required for tools/call');
      }

      if (typeof args !== 'object' || args === null) {
        return jsonRpcError(id, -32602, 'Tool arguments must be an object');
      }

      console.log(`[GitHub MCP] Calling tool: ${toolName}`, args);
      
      if (toolName === 'create_issue') {
        const issue = await octokit.issues.create({
          owner: args.owner,
          repo: args.repo,
          title: args.title,
          body: args.body || '',
          labels: args.labels || [],
          assignees: args.assignees || [],
        });
        
        console.log(`[GitHub MCP] Issue created: ${issue.data.html_url}`);
        
        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(issue.data) }
          ],
        });
      }
      
      if (toolName === 'create_pull_request') {
        const { owner, repo, title, head, base } = args;
        if (!owner || !repo || !title || !head || !base) {
          return jsonRpcError(
            id,
            -32602,
            'create_pull_request requires owner, repo, title, head, and base',
          );
        }

        const pr = await octokit.pulls.create({
          owner,
          repo,
          title,
          body: args.body || '',
          head,
          base,
        });
        
        console.log(`[GitHub MCP] Pull request created: ${pr.data.html_url}`);
        
        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(pr.data) }
          ],
        });
      }
      
      if (toolName === 'update_issue') {
        const updateData: any = {
          owner: args.owner,
          repo: args.repo,
          issue_number: args.issue_number,
        };
        
        if (args.title) updateData.title = args.title;
        if (args.body) updateData.body = args.body;
        if (args.state) updateData.state = args.state;
        if (args.labels) updateData.labels = args.labels;
        if (args.assignees) updateData.assignees = args.assignees;
        
        const issue = await octokit.issues.update(updateData);
        
        console.log(`[GitHub MCP] Issue updated: ${issue.data.html_url}`);
        
        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(issue.data) }
          ],
        });
      }
      
      if (toolName === 'add_comment') {
        const comment = await octokit.issues.createComment({
          owner: args.owner,
          repo: args.repo,
          issue_number: args.issue_number,
          body: args.body,
        });
        
        console.log(`[GitHub MCP] Comment added: ${comment.data.html_url}`);
        
        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(comment.data) }
          ],
        });
      }
      
      if (toolName === 'get_repository') {
        if (!args.owner || !args.repo) {
          return jsonRpcError(id, -32602, 'get_repository requires owner and repo');
        }

        const repo = await octokit.repos.get({
          owner: args.owner,
          repo: args.repo,
        });

        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(repo.data) }
          ],
        });
      }

      if (toolName === 'get_repository_languages') {
        if (!args.owner || !args.repo) {
          return jsonRpcError(id, -32602, 'get_repository_languages requires owner and repo');
        }

        const languages = await octokit.repos.listLanguages({
          owner: args.owner,
          repo: args.repo,
        });

        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(languages.data) }
          ],
        });
      }

      if (toolName === 'list_repository_contents') {
        if (!args.owner || !args.repo) {
          return jsonRpcError(id, -32602, 'list_repository_contents requires owner and repo');
        }

        const path = typeof args.path === 'string' ? args.path : '';
        try {
          const response = await octokit.repos.getContent({
            owner: args.owner,
            repo: args.repo,
            path,
            ...(args.ref ? { ref: args.ref } : {}),
          });

          return jsonRpcSuccess(id, {
            content: [
              { type: 'text', text: JSON.stringify(response.data) }
            ],
          });
        } catch (error) {
          const status = typeof error === 'object' && error && 'status' in error ? (error as any).status : undefined;
          if (status === 404) {
            return jsonRpcSuccess(id, {
              content: [
                { type: 'text', text: JSON.stringify([]) }
              ],
            });
          }
          throw error;
        }
      }

      if (toolName === 'get_file_contents') {
        if (!args.owner || !args.repo || !args.path) {
          return jsonRpcError(id, -32602, 'get_file_contents requires owner, repo, and path');
        }

        const file = await octokit.repos.getContent({
          owner: args.owner,
          repo: args.repo,
          path: args.path,
          ...(args.ref ? { ref: args.ref } : {}),
        });

        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(file.data) }
          ],
        });
      }

      if (toolName === 'get_repository_readme') {
        if (!args.owner || !args.repo) {
          return jsonRpcError(id, -32602, 'get_repository_readme requires owner and repo');
        }

        const readme = await octokit.repos.getReadme({
          owner: args.owner,
          repo: args.repo,
          ...(args.ref ? { ref: args.ref } : {}),
        });

        return jsonRpcSuccess(id, {
          content: [
            { type: 'text', text: JSON.stringify(readme.data) }
          ],
        });
      }
      
      return jsonRpcError(id, -32601, `Unknown tool: ${toolName}`);
    }
    
    return jsonRpcError(id, -32601, `Unknown method: ${method}`);
    
  } catch (error) {
    console.error('[GitHub MCP] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return jsonRpcError(undefined, -32603, errorMessage, { status: 500 });
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  const acceptHeader = req.headers.get('accept') || '';
  if (acceptHeader.includes('text/event-stream')) {
    return new Response(null, { status: 405 });
  }

  return Response.json({
    status: 'ok',
    service: 'github-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    tools: ['create_issue', 'create_pull_request', 'update_issue', 'add_comment'],
  });
}
