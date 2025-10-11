/**
 * Portfolio Builder API Endpoint
 * Analyzes repository quality and creates GitHub issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortfolioBuilderAgent } from '@/lib/agents/portfolio-builder';
import type { ResearchResults } from '@/lib/agents/portfolio-builder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    console.log('[Portfolio Builder API] Starting analysis for:', body.repoUrl);

    // Initialize agent (uses GITHUB_TOKEN from environment)
    const portfolioBuilder = new PortfolioBuilderAgent();

    // Step 1: Analyze portfolio quality
    console.log('[Portfolio Builder API] Analyzing portfolio quality...');
    const qualityAnalysis = await portfolioBuilder.analyzePortfolioQuality(body.repoUrl);

    console.log(
      `[Portfolio Builder API] Quality: ${qualityAnalysis.overallQuality}%, Weaknesses: ${qualityAnalysis.weaknesses.length}`
    );

    // Step 2: Enrich recommendations with research results (if provided)
    let enrichedRecommendations = qualityAnalysis.recommendations;
    if (body.researchResults) {
      console.log('[Portfolio Builder API] Enriching recommendations with research results...');
      console.log('[Portfolio Builder API] Extracting templates from GitHub examples using Template Creator MCP...');
      enrichedRecommendations = await portfolioBuilder.enrichRecommendationsWithResearch(
        qualityAnalysis.recommendations,
        body.researchResults as ResearchResults
      );
    }

    // Step 3: Create GitHub issues (if requested and token available)
    let issueResults = null;
    if (body.createIssues && process.env.GITHUB_TOKEN) {
      console.log(
        `[Portfolio Builder API] Creating ${enrichedRecommendations.length} GitHub issues...`
      );

      issueResults = await portfolioBuilder.createImprovementIssues(
        qualityAnalysis.owner,
        qualityAnalysis.repo,
        enrichedRecommendations
      );

      const successCount = issueResults.filter((r) => r.success).length;
      console.log(
        `[Portfolio Builder API] Created ${successCount}/${issueResults.length} issues successfully`
      );
    }

    // Return results
    return NextResponse.json(
      {
        success: true,
        analysis: {
          repository: qualityAnalysis.repository,
          overallQuality: qualityAnalysis.overallQuality,
          weaknesses: qualityAnalysis.weaknesses,
          strengths: qualityAnalysis.strengths,
        },
        recommendations: enrichedRecommendations,
        issues: issueResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Portfolio Builder API] Error:', error);
    return NextResponse.json(
      {
        error: 'Portfolio builder failed',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
