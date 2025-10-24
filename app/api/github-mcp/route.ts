import { NextRequest } from 'next/server';

// Use separate upstream URL to avoid circular reference when using local proxy
const UPSTREAM_URL = process.env.GITHUB_MCP_UPSTREAM_URL || process.env.GITHUB_MCP_SERVER_URL;

function buildUpstreamHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra ?? {});

  const bearer = process.env.GITHUB_MCP_BEARER;
  if (bearer && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${bearer.replace(/^Bearer\s+/i, '')}`);
  }

  const toolsets = process.env.GITHUB_MCP_TOOLSETS;
  if (toolsets && !headers.has('X-MCP-Toolsets')) {
    headers.set('X-MCP-Toolsets', toolsets);
  }

  const readOnlyRaw = process.env.GITHUB_MCP_READONLY;
  if (readOnlyRaw !== undefined && !headers.has('X-MCP-Readonly')) {
    const normalized = readOnlyRaw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
      headers.set('X-MCP-Readonly', 'true');
    }
  }

  return headers;
}

export async function POST(req: NextRequest) {
  if (!UPSTREAM_URL) {
    return Response.json(
      { error: 'GITHUB_MCP_SERVER_URL is not configured' },
      { status: 500 },
    );
  }

  const body = await req.text();
  const upstreamHeaders = buildUpstreamHeaders({
    'Content-Type': 'application/json',
  });

  const upstreamResponse = await fetch(UPSTREAM_URL, {
    method: 'POST',
    headers: upstreamHeaders,
    body,
    cache: 'no-store',
  });

  const responseBody = await upstreamResponse.text();
  const responseHeaders = new Headers(upstreamResponse.headers);

  if (!upstreamResponse.ok) {
    console.error('[GitHub MCP Proxy] Upstream error', {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      body: responseBody,
    });
  }

  return new Response(responseBody, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  if (!UPSTREAM_URL) {
    return Response.json(
      { error: 'GITHUB_MCP_SERVER_URL is not configured' },
      { status: 500 },
    );
  }

  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/event-stream')) {
    const upstreamHeaders = buildUpstreamHeaders({
      Accept: 'text/event-stream',
    });

    const upstreamResponse = await fetch(UPSTREAM_URL, {
      method: 'GET',
      headers: upstreamHeaders,
      cache: 'no-store',
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    });
  }

  return Response.json({
    status: 'ok',
    upstream: UPSTREAM_URL,
    timestamp: new Date().toISOString(),
  });
}
