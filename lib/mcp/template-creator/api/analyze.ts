/**
 * Vercel Serverless Function: Analyze Repository
 */

import { ServerlessTemplateCreatorClient } from '../serverless-client.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const templateCreator = new ServerlessTemplateCreatorClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoUrl, depth = 3 } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'repoUrl is required'
      });
    }

    console.log(`[MCP Vercel] Analyzing repository: ${repoUrl}`);

    const analysis = await templateCreator.analyzeStructure(repoUrl, depth);

    return res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('[MCP Vercel] Analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
