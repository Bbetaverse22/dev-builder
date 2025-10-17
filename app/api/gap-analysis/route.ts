import { NextRequest, NextResponse } from 'next/server';
import { GapAnalyzerAgent, Skill, GapAnalysisResult, GitHubAnalysis } from '@/lib/agents/gap-analyzer';

export async function POST(request: NextRequest) {
  try {
    const { action, skills, repositoryUrl } = await request.json();

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

      case 'get-categories':
        const categories = gapAnalyzer.getDefaultSkillCategories();
        
        return NextResponse.json({
          success: true,
          result: categories
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: analyze-skills, analyze-github, get-categories' },
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
