import { NextRequest, NextResponse } from 'next/server';
import { TemplateExampleGenerator } from '@/lib/agents/template-example-generator';

const generator = new TemplateExampleGenerator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const exampleUrl = typeof body.exampleUrl === 'string' ? body.exampleUrl.trim() : '';

    if (!exampleUrl) {
      return NextResponse.json({ error: 'exampleUrl is required' }, { status: 400 });
    }

    const action = body.action === 'create-pr' ? 'create-pr' : 'preview';

    const result = await generator.generate({
      exampleUrl,
      featureName: body.featureName,
      skillName: body.skillName,
      repositoryUrl: body.repositoryUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.reason,
        },
        { status: 422 }
      );
    }

    if (action === 'create-pr') {
      try {
        const pr = await generator.createPullRequest(result, {
          exampleUrl,
          featureName: body.featureName,
          skillName: body.skillName,
          repositoryUrl: body.repositoryUrl,
          pullRequestTitle: body.pullRequestTitle,
          pullRequestBody: body.pullRequestBody,
        });

        return NextResponse.json(
          {
            success: true,
            templateDirectory: result.templateDirectory,
            branchName: pr.branchName,
            instructions: result.instructions,
            analysisSummary: result.analysisSummary,
            sourceUrl: result.sourceUrl,
            sourceName: result.sourceName,
            pullRequest: pr,
          },
          { status: 200 }
        );
      } catch (prError) {
        console.error('[Template Generator API] PR creation error:', prError);
        return NextResponse.json(
          {
            success: false,
            message: prError instanceof Error ? prError.message : 'Failed to create pull request',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        templateDirectory: result.templateDirectory,
        branchName: result.branchName,
        instructions: result.instructions,
        analysisSummary: result.analysisSummary,
        sourceUrl: result.sourceUrl,
        sourceName: result.sourceName,
        files: result.files.map((file) => ({
          path: file.path,
          description: file.description,
          placeholders: file.placeholders,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Template Generator API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate template example',
      },
      { status: 500 }
    );
  }
}
