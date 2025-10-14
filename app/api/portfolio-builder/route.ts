/**
 * Portfolio Builder API Endpoint
 * Analyzes repository quality and creates GitHub issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortfolioBuilderAgent } from '@/lib/agents/portfolio-builder';
import type { PortfolioRecommendation, ResearchResults } from '@/lib/agents/portfolio-builder';

function convertActionRecommendations(
  recommendations: any[] | undefined,
  existing: PortfolioRecommendation[]
): PortfolioRecommendation[] {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  const actions = recommendations.filter((item) => item?.type === 'action');
  const usedIds = new Set<string>();
  const existingTitles = new Set(
    existing.map((rec) => rec.title?.toLowerCase().trim()).filter(Boolean)
  );

  return actions.slice(0, 3).map((action, index) => {
    const normalizedTitle =
      typeof action.title === 'string' ? action.title.toLowerCase().trim() : '';
    if (normalizedTitle && existingTitles.has(normalizedTitle)) {
      return null;
    }

    const priority = action.priority === 'high' ? 'high' : action.priority === 'medium' ? 'medium' : 'low';
    const severity = priority;
    const effort = priority === 'high' ? 'medium' : priority === 'medium' ? 'medium' : 'low';
    const slug = typeof action.title === 'string'
      ? action.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : `action-${index}`;
    let id = `action-${slug || index}`;
    while (usedIds.has(id)) {
      id = `${id}-${index}`;
    }
    usedIds.add(id);

    const description = typeof action.description === 'string'
      ? action.description
      : 'Complete this action to apply new knowledge.';

    const actionItems: string[] = [description];
    if (typeof action.url === 'string') {
      actionItems.push(`Follow the instructions here: ${action.url}`);
    }

    const weakness = {
      id,
      type: 'skill' as const,
      severity,
      title: action.title ?? 'Practice Action',
      description,
      impact: 'Hands-on task derived from the AI research agent to reinforce this skill gap.',
      optional: false,
    };

    return {
      id,
      weakness,
      title: action.title ?? 'Practice Action',
      description,
      actionItems,
      estimatedEffort: effort,
      priority: priority === 'high' ? 9 : priority === 'medium' ? 7 : 5,
    };
  }).filter(Boolean) as PortfolioRecommendation[];
}

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

    const includeOptionalImprovements = Boolean(body.includeOptionalImprovements);

    // Step 1: Analyze portfolio quality
    console.log('[Portfolio Builder API] Analyzing portfolio quality...');
    const qualityAnalysis = await portfolioBuilder.analyzePortfolioQuality(body.repoUrl, {
      skillAssessment: body.skillAssessment,
    });

    console.log(
      `[Portfolio Builder API] Quality: ${qualityAnalysis.overallQuality}%, Weaknesses: ${qualityAnalysis.weaknesses.length}`
    );

    // Step 2: Enrich recommendations with research results (if provided)
    let enrichedRecommendations = qualityAnalysis.recommendations;
    if (body.researchResults) {
      console.log('[Portfolio Builder API] Enriching recommendations with research results...');
      enrichedRecommendations = await portfolioBuilder.enrichRecommendationsWithResearch(
        qualityAnalysis.recommendations,
        body.researchResults as ResearchResults
      );
    }

    const actionRecommendations = convertActionRecommendations(
      body.researchResults?.recommendations,
      enrichedRecommendations
    );
    const allRecommendations = [...enrichedRecommendations, ...actionRecommendations];

    let filteredRecommendations = allRecommendations;
    if (Array.isArray(body.recommendationIds) && body.recommendationIds.length > 0) {
      const idSet = new Set<string>(body.recommendationIds);
      filteredRecommendations = allRecommendations.filter((rec) => idSet.has(rec.id));
    }

    // Step 3: Create GitHub issues (if requested and token available)
    let issueResults = null;
    if (body.createIssues && process.env.GITHUB_TOKEN) {
      const recommendationsForIssues = includeOptionalImprovements
        ? filteredRecommendations
        : filteredRecommendations.filter((rec) => !rec.weakness.optional);

      if (recommendationsForIssues.length === 0) {
        console.log(
          '[Portfolio Builder API] No non-optional recommendations selected for issue creation.'
        );
        issueResults = [];
      } else {
        console.log(
          `[Portfolio Builder API] Creating ${recommendationsForIssues.length} GitHub issues...`
        );

        issueResults = await portfolioBuilder.createImprovementIssues(
          qualityAnalysis.owner,
          qualityAnalysis.repo,
          recommendationsForIssues,
          {
            includeOptional: includeOptionalImprovements,
          }
        );

        const successCount = issueResults.filter((r) => r.success).length;
        console.log(
          `[Portfolio Builder API] Created ${successCount}/${issueResults.length} issues successfully`
        );
      }
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
        recommendations: allRecommendations,
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
