/**
 * Research Agent API Endpoint
 * Runs the LangGraph research agent workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { graph } from "@/lib/agents/langgraph/research-agent";
import type { ResearchState } from "@/lib/agents/langgraph/research-agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.skillGap) {
      return NextResponse.json(
        { error: "skillGap is required" },
        { status: 400 }
      );
    }

    console.log("[Research Agent] Starting workflow for:", body.skillGap);
    console.log("[Research Agent] User skill level:", body.userSkillLevel || 'intermediate');
    console.log("[Research Agent] Skill gap:", body.skillGapValue || 2, `(${body.skillCurrentLevel || 2}/5 → ${body.skillTargetLevel || 4}/5)`);
    console.log("[Research Agent] Force refresh:", body.forceRefresh ?? false);
    console.log("[Research Agent] Environment summary:", {
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasFirecrawlKey: Boolean(process.env.FIRECRAWL_API_KEY),
      researchModel: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini",
    });

    // Prepare input state
    const input: ResearchState = {
      userId: body.userId || 'anonymous',
      skillGap: body.skillGap,
      detectedLanguage: body.detectedLanguage || 'unknown',
      userContext: body.userContext || '',
      targetRole: body.targetRole,
      targetIndustry: body.targetIndustry,
      professionalGoals: body.professionalGoals,
      focusSkills: body.focusSkills || [],
      learningObjectives: body.learningObjectives || [],
      iterationCount: 0,
      forceRefresh: body.forceRefresh ?? true, // Default to true to ensure fresh research
      // Adaptive learning fields
      userSkillLevel: body.userSkillLevel || 'intermediate',
      skillCurrentLevel: body.skillCurrentLevel || 2,
      skillTargetLevel: body.skillTargetLevel || 4,
      skillGapValue: body.skillGapValue || 2,
    };

    // Run the research agent
    const result = (await graph.invoke(input as any)) as ResearchState;

    console.log("[Research Agent] Workflow complete");
    console.log(`  Resources: ${result.searchResults?.length || 0}`);
    console.log(`  Examples: ${result.examples?.length || 0}`);
    console.log(`  Recommendations: ${result.recommendations?.length || 0}`);
    console.log(`  Confidence: ${((result.confidence || 0) * 100).toFixed(0)}%`);

    const resourcePayload = result.evaluatedResults || result.searchResults || [];
    const diagnostics = {
      resourceCount: resourcePayload.length,
      exampleCount: result.examples?.length ?? 0,
      recommendationCount: result.recommendations?.length ?? 0,
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      hasFirecrawlKey: Boolean(process.env.FIRECRAWL_API_KEY),
      researchModel: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini",
      usedCachedState: Boolean(result.loadedFromStorage),
    };

    if (resourcePayload.length === 0) {
      console.warn("[Research Agent] No learning resources returned. Diagnostics:", diagnostics);
    }

    // Return results
    return NextResponse.json({
      success: true,
      resources: resourcePayload,
      scrapedResources: result.scrapedResources || [],
      examples: result.examples || [],
      recommendations: result.recommendations || [],
      comparativeInsights: result.comparativeInsights || [],
      learningPath: result.learningPath || [],
      confidence: result.confidence || 0,
      confidenceBreakdown: result.confidenceBreakdown || null,
      queries: result.queries || [],
      iterationCount: result.iterationCount ?? 0,
      searchIterations: result.searchIterations || [],
      searchNotes: result.searchNotes || [],
      searchSources: result.searchSources || [],
      searchQuery: result.searchQuery,
      diagnostics,
    }, { status: 200 });

  } catch (error) {
    console.error("[Research Agent] Error:", error);
    return NextResponse.json(
      {
        error: "Research agent failed",
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}
