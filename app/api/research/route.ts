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

    // Prepare input state
    const input: ResearchState = {
      userId: body.userId || 'anonymous',
      skillGap: body.skillGap,
      detectedLanguage: body.detectedLanguage || 'unknown',
      userContext: body.userContext || '',
      targetRole: body.targetRole,
      targetIndustry: body.targetIndustry,
      professionalGoals: body.professionalGoals,
      domainKeywords: body.domainKeywords,
      focusSkills: body.focusSkills || [],
      learningObjectives: body.learningObjectives || [],
      iterationCount: 0,
    };

    // Run the research agent
    const result = await graph.invoke(input as any) as ResearchState;

    console.log("[Research Agent] Workflow complete");
    console.log(`  Resources: ${result.searchResults?.length || 0}`);
    console.log(`  Examples: ${result.examples?.length || 0}`);
    console.log(`  Recommendations: ${result.recommendations?.length || 0}`);
    console.log(`  Confidence: ${((result.confidence || 0) * 100).toFixed(0)}%`);

    // Return results
    return NextResponse.json({
      success: true,
      resources: result.evaluatedResults || result.searchResults || [],
      examples: result.examples || [],
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0,
      queries: result.queries || [],
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
