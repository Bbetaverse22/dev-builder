/**
 * Skill Gaps API - Now using Prisma database storage
 * Issue #33: Update API routes to use Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { skillGapStoragePrisma } from "@/lib/storage/skill-gap-storage-prisma";
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

    console.log('📥 [Prisma] Received skill gap storage request:', {
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

    // Use Prisma storage instead of file system
    const storageId = await skillGapStoragePrisma.storeSkillGap(
      userId,
      githubAnalysis,
      skillAssessment,
      context
    );

    console.log('✅ [Prisma] Skill gap stored successfully in database:', storageId);

    return NextResponse.json({
      success: true,
      storageId,
      message: "Skill gap analysis stored successfully in database",
    });
  } catch (error) {
    console.error("❌ [Prisma] Error storing skill gap:", error);
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

    console.log('🔍 [Prisma] Retrieving skill gap summary for:', userId);

    // Use Prisma storage instead of file system
    const summary = await skillGapStoragePrisma.getSkillGapSummary(userId);

    if (!summary) {
      console.log('❌ [Prisma] No skill gap found for user:', userId);
      return NextResponse.json(
        {
          success: false,
          message: "No skill gap analysis found",
        },
        { status: 404 }
      );
    }

    console.log('✅ [Prisma] Skill gap summary retrieved from database');

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("❌ [Prisma] Error retrieving skill gap:", error);
    return NextResponse.json(
      { error: "Failed to retrieve skill gap analysis" },
      { status: 500 }
    );
  }
}
