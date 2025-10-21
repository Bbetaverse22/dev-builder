import { NextRequest, NextResponse } from 'next/server';
import { GapAnalyzerAgent, Skill, GapAnalysisResult, GitHubAnalysis } from '@/lib/agents/gap-analyzer';

export async function POST(request: NextRequest) {
  try {
    const { action, skills, repositoryUrl, deepAnalysis, readmeContent, userContext } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const gapAnalyzer = new GapAnalyzerAgent();

    switch (action) {
      case 'analyze-skills':
        if (!skills || !Array.isArray(skills)) {
          return NextResponse.json(
            { error: 'Skills array is required for skill analysis' },
            { status: 400 }
          );
        }

        const analysisResult: GapAnalysisResult = gapAnalyzer.analyzeSkillGaps(skills);
        
        return NextResponse.json({
          success: true,
          result: analysisResult
        });

      case 'analyze-github':
        if (!repositoryUrl) {
          return NextResponse.json(
            { error: 'Repository URL is required for GitHub analysis' },
            { status: 400 }
          );
        }

        const githubAnalysis: GitHubAnalysis = await gapAnalyzer.analyzeGitHubRepository(repositoryUrl);
        
        return NextResponse.json({
          success: true,
          result: githubAnalysis
        });

      case 'analyze-github-agentic':
        // NEW: AI-powered deep analysis using AI SDK with fallback
        if (!repositoryUrl) {
          return NextResponse.json(
            { error: 'Repository URL is required for GitHub analysis' },
            { status: 400 }
          );
        }

        console.log(`[API] Starting agentic analysis for ${repositoryUrl}, deepAnalysis=${deepAnalysis ?? true}`);
        
        const agenticAnalysis = await gapAnalyzer.analyzeGitHubRepositoryAgentic(repositoryUrl, {
          deepAnalysis: deepAnalysis ?? true // Default to deep analysis
        });
        
        // Check analysis mode for proper response
        const analysisMode = agenticAnalysis.analysisMode || 'agentic';
        const usedFallback = analysisMode === 'fallback';
        
        // If deep analysis was performed, generate AI recommendations
        if (agenticAnalysis.agenticAnalysis) {
          const aiRecommendations = await gapAnalyzer.generateAgenticRecommendations(
            agenticAnalysis,
            agenticAnalysis.agenticAnalysis,
            agenticAnalysis.readmeAnalysis,
            userContext
          );
          agenticAnalysis.recommendations = aiRecommendations;
        }
        
        // Build response with clear status
        const response: any = {
          success: true,
          result: agenticAnalysis,
          isAgentic: true,
          hasDeepAnalysis: !!agenticAnalysis.agenticAnalysis,
          analysisMode,
          usedFallback
        };

        // Add fallback information if applicable
        if (usedFallback && agenticAnalysis.fallbackReason) {
          response.fallbackReason = agenticAnalysis.fallbackReason;
          response.message = `Analysis completed using fallback mode. ${agenticAnalysis.fallbackReason}`;
          console.warn(`[API] ⚠️ Agentic analysis used fallback: ${agenticAnalysis.fallbackReason}`);
        } else {
          console.log(`[API] ✅ Agentic analysis completed successfully (mode: ${analysisMode})`);
        }
        
        return NextResponse.json(response);

      case 'analyze-readme':
        // NEW: Standalone README quality analysis
        if (!readmeContent) {
          return NextResponse.json(
            { error: 'README content is required for README analysis' },
            { status: 400 }
          );
        }

        console.log(`[API] Analyzing README quality with AI (${readmeContent.length} chars)`);
        
        const readmeAnalysis = await gapAnalyzer.analyzeReadmeQualityAgentic(readmeContent);
        
        return NextResponse.json({
          success: true,
          result: readmeAnalysis
        });

      case 'get-categories':
        const categories = gapAnalyzer.getDefaultSkillCategories();
        
        return NextResponse.json({
          success: true,
          result: categories
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: analyze-skills, analyze-github, analyze-github-agentic, analyze-readme, get-categories' },
          { status: 400 }
        );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Gap analysis API error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const gapAnalyzer = new GapAnalyzerAgent();
    const categories = gapAnalyzer.getDefaultSkillCategories();

    return NextResponse.json({
      success: true,
      result: categories
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Gap analysis API error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
