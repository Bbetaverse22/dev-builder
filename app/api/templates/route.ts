import { NextRequest, NextResponse } from 'next/server';

// Use your hosted MCP template generator service
const MCP_TEMPLATE_SERVICE_URL = process.env.MCP_TEMPLATE_SERVICE_URL || 'https://your-mcp-template-service.vercel.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const exampleUrl = typeof body.exampleUrl === 'string' ? body.exampleUrl.trim() : '';

    if (!exampleUrl) {
      return NextResponse.json({ error: 'exampleUrl is required' }, { status: 400 });
    }

    const action = body.action === 'create-pr' ? 'create-pr' : 'preview';

    // Forward request to your hosted MCP template service
    const mcpResponse = await fetch(`${MCP_TEMPLATE_SERVICE_URL}/api/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exampleUrl,
        featureName: body.featureName,
        skillName: body.skillName,
        repositoryUrl: body.repositoryUrl,
        action,
        pullRequestTitle: body.pullRequestTitle,
        pullRequestBody: body.pullRequestBody,
      }),
    });

    if (!mcpResponse.ok) {
      const errorData = await mcpResponse.json().catch(() => ({ message: 'MCP service error' }));
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || 'Failed to connect to template service',
        },
        { status: mcpResponse.status }
      );
    }

    const result = await mcpResponse.json();
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[Template Generator API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate template example',
      },
      { status: 500 }
    );
  }
}
