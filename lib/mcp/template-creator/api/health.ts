/**
 * Vercel Serverless Function: Health Check
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    service: 'template-creator-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    platform: 'vercel'
  });
}
