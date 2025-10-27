/**
 * HTTP-based MCP Server
 *
 * This creates a standalone HTTP server that can be hosted anywhere
 * (Railway, Render, Fly.io, etc.) and called remotely from your Next.js app.
 */

import express from 'express';
import cors from 'cors';
import { ServerlessTemplateCreatorClient } from './serverless-client';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize template creator
const templateCreator = new ServerlessTemplateCreatorClient();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'template-creator-mcp',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Analyze repository structure
app.post('/api/analyze', async (req, res) => {
  try {
    const { repoUrl, depth = 3 } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        error: 'repoUrl is required'
      });
    }

    console.log(`[MCP Server] Analyzing repository: ${repoUrl}`);

    const analysis = await templateCreator.analyzeStructure(repoUrl, depth);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('[MCP Server] Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Extract template from repository
app.post('/api/extract', async (req, res) => {
  try {
    const { repoUrl, filePatterns, options = {} } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        error: 'repoUrl is required'
      });
    }

    if (!filePatterns || !Array.isArray(filePatterns)) {
      return res.status(400).json({
        error: 'filePatterns must be an array'
      });
    }

    console.log(`[MCP Server] Extracting template from: ${repoUrl}`);

    const template = await templateCreator.extractTemplate(
      repoUrl,
      filePatterns,
      options
    );

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('[MCP Server] Extraction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Complete workflow: analyze + extract
app.post('/api/create-template', async (req, res) => {
  try {
    const { repoUrl, options = {} } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        error: 'repoUrl is required'
      });
    }

    console.log(`[MCP Server] Creating template from: ${repoUrl}`);

    // Step 1: Analyze
    const analysis = await templateCreator.analyzeStructure(repoUrl);

    // Step 2: Extract using recommended patterns
    const template = await templateCreator.extractTemplate(
      repoUrl,
      analysis.recommendedPatterns,
      options
    );

    res.json({
      success: true,
      data: {
        analysis,
        template
      }
    });
  } catch (error) {
    console.error('[MCP Server] Template creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[MCP Server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Template Creator MCP Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API endpoints:`);
  console.log(`   POST /api/analyze - Analyze repository structure`);
  console.log(`   POST /api/extract - Extract template from repository`);
  console.log(`   POST /api/create-template - Complete workflow`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
