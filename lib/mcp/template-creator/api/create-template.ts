/**
 * Vercel Serverless Function: Complete Template Creation
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
    const { repoUrl, options = {} } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'repoUrl is required'
      });
    }

    console.log(`[MCP Vercel] Creating template from: ${repoUrl}`);

    // Step 1: Analyze
    const analysis = await templateCreator.analyzeStructure(repoUrl);

    // Step 2: Extract using recommended patterns
    const template = await templateCreator.extractTemplate(
      repoUrl,
      analysis.recommendedPatterns,
      options
    );

    return res.status(200).json({
      success: true,
      data: {
        analysis,
        template
      }
    });
  } catch (error) {
    console.error('[MCP Vercel] Template creation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
