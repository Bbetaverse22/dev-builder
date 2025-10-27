import { promises as fs } from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import { getTemplateCreatorClient, type TemplateMetadata } from '@/lib/mcp/template-creator';

interface TemplateGenerationOptions {
  exampleUrl: string;
  featureName?: string;
  skillName?: string;
  repositoryUrl?: string;
}

interface GeneratedTemplateFile {
  path: string;
  description?: string;
  placeholders?: string[];
  content: string;
}

interface TemplateGenerationResult {
  success: true;
  templateDirectory: string;
  branchName: string;
  files: GeneratedTemplateFile[];
  analysisSummary: {
    framework: string;
    templateWorthiness: number;
    insights: string[];
  };
  instructions: string[];
  sourceUrl: string;
  sourceName: string;
  metadata?: TemplateMetadata;
}

interface TemplateGenerationFailure {
  success: false;
  reason: string;
}

export type TemplateGenerationResponse = TemplateGenerationResult | TemplateGenerationFailure;

interface TemplatePullRequestResult {
  pullRequestUrl: string;
  branchName: string;
  commitSha: string;
  number: number;
}

const toSlug = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'template';
};

export class TemplateExampleGenerator {
  private readonly examplesRoot = path.join(process.cwd(), 'examples', 'generated');
  private octokit: Octokit | null = null;

  async generate(options: TemplateGenerationOptions): Promise<TemplateGenerationResponse> {
    const client = await getTemplateCreatorClient();
    const exampleUrl = options.exampleUrl.trim();

    const analysis = await client.analyzeStructure(exampleUrl, 4);
    if (!analysis || analysis.templateWorthiness < 0.4) {
      return {
        success: false,
        reason: 'Template Creator determined the example repository is not template-worthy.',
      };
    }

    const featureSlug = toSlug(
      `${options.featureName ?? analysis.recommendedPatterns?.[0] ?? analysis.framework ?? 'feature'}`
    );
    const repoSlug = options.repositoryUrl ? toSlug(options.repositoryUrl.split('/').pop() || '') : 'current';
    const templateSlug = `${repoSlug}-${featureSlug}`.replace(/-+/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `template/${templateSlug}-${timestamp.slice(0, 10)}`;

    const templateDir = path.join(this.examplesRoot, `${templateSlug}-${timestamp}`);
    await fs.mkdir(templateDir, { recursive: true });

    const patternSet = new Set<string>(
      (analysis.recommendedPatterns ?? []).filter((pattern): pattern is string => Boolean(pattern?.trim()))
    );

    [
      'src/**/*',
      'app/**/*',
      'lib/**/*',
      'backend/**/*',
      'services/**/*',
      'server/**/*',
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rb',
      '**/*.php',
      '**/*.cs',
    ].forEach((pattern) => patternSet.add(pattern));

    const patterns = Array.from(patternSet);

    const template = await client.extractTemplate(exampleUrl, patterns, {
      preserveStructure: true,
      keepComments: true,
      includeTypes: true,
      removeBusinessLogic: false,
    });

    const writtenFiles: GeneratedTemplateFile[] = [];
    const sourceName = options.featureName ?? analysis.framework ?? analysis.mainLanguage ?? 'template example';

    for (const file of template.files) {
      const sanitizedPath = file.path.replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
      const targetPath = path.join(templateDir, sanitizedPath);
      const resolved = path.resolve(targetPath);

      if (!resolved.startsWith(templateDir)) {
        throw new Error(`Rejected unsafe template file path: ${file.path}`);
      }

      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, file.content, 'utf8');

      writtenFiles.push({
        path: path.relative(process.cwd(), resolved),
        description: file.description,
        placeholders: file.placeholders,
        content: file.content,
      });
    }

    const relativeDir = path.relative(process.cwd(), templateDir);
    const metadata = template.metadata;
    if (metadata?.modeUsed === 'skeleton') {
      analysis.insights = [
        'Skeleton mode removed business logic; TODO comments mark the gaps you need to fill.',
        ...(analysis.insights ?? []),
      ];
    } else if (metadata?.fallbackReason) {
      analysis.insights = [
        `Skeleton fallback reason: ${metadata.fallbackReason}`,
        ...(analysis.insights ?? []),
      ];
    }

    const instructions = [
      `git checkout -b ${branchName}`,
      `git add ${relativeDir}`,
      `git commit -m "Add generated template example for ${options.skillName ?? featureSlug}"`,
      `git push origin ${branchName}`,
      'Open a pull request with the generated template example.',
    ];

    return {
      success: true,
      templateDirectory: relativeDir,
      branchName,
      files: writtenFiles,
      sourceUrl: exampleUrl,
      sourceName,
      instructions,
      analysisSummary: {
        framework: analysis.framework,
        templateWorthiness: analysis.templateWorthiness,
        insights: analysis.insights ?? [],
      },
      metadata,
    };
  }

  async createPullRequest(
    generation: TemplateGenerationResult,
    options: TemplateGenerationOptions & {
      pullRequestTitle?: string;
      pullRequestBody?: string;
    }
  ): Promise<TemplatePullRequestResult> {
    if (!options.repositoryUrl) {
      throw new Error('Repository URL is required to create a pull request.');
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN must be set to create template pull requests.');
    }

    const octokit = this.getOctokit(token);
    const { owner, repo } = this.parseRepositoryUrl(options.repositoryUrl);

    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const baseBranch = repoData.default_branch ?? 'main';

    const baseRef = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
    const baseSha = baseRef.data.object.sha;

    let branchName = generation.branchName;
    let refName = `refs/heads/${branchName}`;

    try {
      await octokit.git.createRef({ owner, repo, ref: refName, sha: baseSha });
    } catch (error) {
      if ((error as any)?.status === 422) {
        branchName = `${branchName}-${Date.now()}`;
        refName = `refs/heads/${branchName}`;
        await octokit.git.createRef({ owner, repo, ref: refName, sha: baseSha });
      } else {
        throw error;
      }
    }

    const blobs = await Promise.all(
      generation.files.map((file) =>
        octokit.git.createBlob({
          owner,
          repo,
          content: file.content,
          encoding: 'utf-8',
        })
      )
    );

    const fileTree = generation.files.map((file, index) => ({
      path: file.path.split(path.sep).join('/'),
      mode: '100644' as const,
      type: 'blob' as const,
      sha: blobs[index].data.sha,
    }));

    const tree = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseSha,
      tree: fileTree,
    });

    const commitMessage = `Add template example for ${options.featureName ?? generation.sourceName}`;

    const commit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.data.sha,
      parents: [baseSha],
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commit.data.sha,
    });

    const prTitle = options.pullRequestTitle
      ? options.pullRequestTitle
      : `Add generated template example for ${options.featureName ?? generation.sourceName}`;

    const insightLines = generation.analysisSummary.insights.slice(0, 5).map((insight) => `- ${insight}`);
    const prBodySections: string[] = [];
    if (options.pullRequestBody) {
      prBodySections.push(options.pullRequestBody);
    }
    prBodySections.push(`Generated from ${generation.sourceUrl}`);
    if (insightLines.length > 0) {
      prBodySections.push('', 'Highlights:', ...insightLines);
    }

    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: prTitle,
      head: branchName,
      base: baseBranch,
      body: prBodySections.join('\n'),
    });

    return {
      pullRequestUrl: pr.data.html_url,
      branchName,
      commitSha: commit.data.sha,
      number: pr.data.number,
    };
  }

  private parseRepositoryUrl(repoUrl: string): { owner: string; repo: string } {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/i);
    if (!match) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }
    return {
      owner: match[1],
      repo: match[2],
    };
  }

  private getOctokit(token: string): Octokit {
    if (!this.octokit) {
      this.octokit = new Octokit({ auth: token });
    }
    return this.octokit;
  }
}
