import { NextRequest, NextResponse } from "next/server";
import { skillGapStorage } from "@/lib/storage/skill-gap-storage";
import type { GapAnalysisResult, GitHubAnalysis, ResearchContext } from "@/lib/agents/gap-analyzer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, githubAnalysis, skillAssessment, context } = body as {
      userId?: string;
      githubAnalysis?: GitHubAnalysis;
      skillAssessment?: GapAnalysisResult;
      context?: ResearchContext;
    };

    console.log('📥 Received skill gap storage request:', {
      userId,
      hasGithubAnalysis: !!githubAnalysis,
      hasSkillAssessment: !!skillAssessment,
      hasContext: !!context,
    });

    if (!userId || !githubAnalysis || !skillAssessment) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const storageId = await skillGapStorage.storeSkillGap(
      userId,
      githubAnalysis,
      skillAssessment,
      context
    );

    console.log('✅ Skill gap stored successfully:', storageId);

    return NextResponse.json({
      success: true,
      storageId,
      message: "Skill gap analysis stored successfully",
    });
  } catch (error) {
    console.error("❌ Error storing skill gap:", error);
    return NextResponse.json(
      { 
        error: "Failed to store skill gap analysis",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "user_123";

    const summary = skillGapStorage.getSkillGapSummary(userId);

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          message: "No skill gap analysis found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error retrieving skill gap:", error);
    return NextResponse.json(
      { error: "Failed to retrieve skill gap analysis" },
      { status: 500 }
    );
  }
}
