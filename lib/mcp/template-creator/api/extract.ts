/**
 * Vercel Serverless Function: Extract Template
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
    const { repoUrl, filePatterns, options = {} } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'repoUrl is required'
      });
    }

    if (!filePatterns || !Array.isArray(filePatterns)) {
      return res.status(400).json({
        success: false,
        error: 'filePatterns must be an array'
      });
    }

    console.log(`[MCP Vercel] Extracting template from: ${repoUrl}`);

    const template = await templateCreator.extractTemplate(
      repoUrl,
      filePatterns,
      options
    );

    return res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[MCP Vercel] Extraction error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
