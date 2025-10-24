/**
 * Portfolio Builder Agent
 * Analyzes repositories, identifies weaknesses, and creates actionable GitHub issues
 * Integrates with Research Agent results to provide learning resources
 * Integrates with Template Creator MCP to provide ready-to-use code templates
 */

import { buildFrameworkSkillPlan } from '@/lib/analysis/framework-skill-plan';
import { GitHubClient } from '@/lib/github/github-client';
import { GitHubMCPClient } from '@/lib/mcp/github';
import type { GitHubAnalysis, GapAnalysisResult, SkillGap } from './gap-analyzer';
import { getTemplateCreatorClient, closeTemplateCreatorClient } from '@/lib/mcp/template-creator/client';

const LICENSE_FILE_BASENAMES = new Set([
  'license',
  'license.md',
  'license.txt',
  'licence',
  'licence.md',
  'licence.txt',
  'copying',
  'copying.md',
  'copying.txt',
  'copyright',
  'copyright.md',
  'copyright.txt',
  'unlicense',
  'unlicense.md',
  'unlicense.txt',
]);

const LICENSE_FILE_CANDIDATES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'license',
  'license.md',
  'license.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'licence',
  'licence.md',
  'licence.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
  'copying',
  'copying.md',
  'copying.txt',
  'COPYRIGHT',
  'COPYRIGHT.md',
  'COPYRIGHT.txt',
  'copyright',
  'copyright.md',
  'copyright.txt',
  'UNLICENSE',
  'UNLICENSE.md',
  'UNLICENSE.txt',
  'unlicense',
  'unlicense.md',
  'unlicense.txt',
];

export interface PortfolioQualityAnalysis {
  repository: string;
  owner: string;
  repo: string;
  overallQuality: number; // 0-100
  weaknesses: PortfolioWeakness[];
  strengths: string[];
  recommendations: PortfolioRecommendation[];
}

export interface PortfolioWeakness {
  id: string;
  type: 'readme' | 'documentation' | 'testing' | 'cicd' | 'security' | 'structure' | 'skill';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  optional?: boolean;
}

export interface PortfolioRecommendation {
  id: string;
  weakness: PortfolioWeakness;
  title: string;
  description: string;
  actionItems: string[];
  resources?: RecommendedResource[];
  examples?: GitHubExample[];
  templates?: ExtractedTemplate[]; // Templates from Template Creator MCP
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number;
  skillGap?: SkillGap;
}

export interface ExtractedTemplate {
  sourceRepo: string;
  files: TemplateFile[];
  structure: string;
  instructions: string[];
  placeholders: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  description: string;
  placeholders: string[];
}

export interface RecommendedResource {
  title: string;
  url: string;
  description: string;
  rating?: number;
  score?: number;
}

export interface GitHubExample {
  name: string;
  url: string;
  stars: number;
  description: string;
  language?: string;
}

export interface ResearchResults {
  resources?: RecommendedResource[];
  examples?: GitHubExample[];
  recommendations?: any[];
  confidence?: number;
  comparativeInsights?: any[];
  learningPath?: any[];
  confidenceBreakdown?: any;
}

export interface IssueCreationResult {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  title: string;
  error?: string;
}

export class PortfolioBuilderAgent {
  private githubClient: GitHubClient;
  private mcpClient: GitHubMCPClient | null = null;

  constructor(githubToken?: string) {
    this.githubClient = new GitHubClient(githubToken);
  }

  /**
   * Analyze repository quality and identify improvement opportunities
   */
  async analyzePortfolioQuality(
    repoUrl: string,
    options?: { skillAssessment?: GapAnalysisResult }
  ): Promise<PortfolioQualityAnalysis> {
    const skillAssessment = options?.skillAssessment;
    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      console.log(`[Portfolio Builder] Analyzing: ${owner}/${cleanRepo}`);

      // Fetch repository data
      const repoData = await this.githubClient.getRepository(owner, cleanRepo);
      const contents = await this.githubClient.getRepositoryContents(owner, cleanRepo);

      // Run checks in parallel
      const [hasReadme, hasTests, hasCICD, hasDocumentation] = await Promise.all([
        this.checkReadmeQuality(owner, cleanRepo).catch(() => ({ exists: false, isComprehensive: false })),
        this.checkTestingCoverage(owner, cleanRepo, contents).catch(() => ({ exists: false })),
        this.checkCICDSetup(owner, cleanRepo, contents).catch(() => false),
        this.checkDocumentation(owner, cleanRepo, contents).catch(() => false),
      ]);

      // Identify weaknesses
      const weaknesses: PortfolioWeakness[] = [];

      if (!hasReadme.exists || !hasReadme.isComprehensive) {
        weaknesses.push({
          id: 'readme',
          type: 'readme',
          severity: 'high',
          title: 'Missing or Incomplete README',
          description: hasReadme.exists
            ? 'Your README needs improvement. Add sections for installation, usage examples, and project features to help others understand your project quickly.'
            : 'Create a comprehensive README.md file to introduce your project, explain how to install and use it, and showcase its features.',
          impact: 'Makes it difficult for others to understand and use your project',
        });
      }

      if (!hasTests.exists) {
        weaknesses.push({
          id: 'testing',
          type: 'testing',
          severity: 'high',
          title: 'No Test Coverage',
          description: 'Add unit tests to verify your code works correctly. Start with testing core functions and gradually expand coverage to build confidence in your codebase.',
          impact: 'Reduces confidence in code quality and makes refactoring risky',
        });
      }

      if (!hasCICD) {
        weaknesses.push({
          id: 'cicd',
          type: 'cicd',
          severity: 'low',
          optional: true,
          title: 'No CI/CD Pipeline Detected (Optional)',
          description: 'Consider adding automated testing and deployment pipelines. This helps catch bugs early and makes collaboration easier, though it\'s optional for personal projects.',
          impact: 'Automating tests and deployments can help when collaborating or shipping to production, but it is not required for every personal project.',
        });
      }

      if (!hasDocumentation) {
        weaknesses.push({
          id: 'documentation',
          type: 'documentation',
          severity: 'medium',
          title: 'Limited Documentation',
          description: 'Create detailed documentation to help contributors understand your codebase. Add API docs, architecture overview, and contribution guidelines.',
          impact: 'Makes it harder for contributors to understand the codebase',
        });
      }

      // Check for additional quality indicators
      const hasLicense = await this.checkLicenseFile(owner, cleanRepo, contents);
      if (!hasLicense) {
        weaknesses.push({
          id: 'license',
          type: 'structure',
          severity: 'low',
          optional: true,
          title: 'No License File',
          description: 'Add a LICENSE file to clarify how others can use your code. Choose MIT, Apache, or GPL based on your preferences.',
          impact: 'Unclear legal status for using and contributing to the project',
        });
      }

      // Identify strengths
      const strengths: string[] = [];
      if (repoData.stargazers_count > 10) {
        strengths.push(`${repoData.stargazers_count} stars - Good community interest`);
      }
      if (repoData.description) {
        strengths.push('Clear repository description');
      }
      if (hasReadme.exists) {
        strengths.push('README file present');
      }
      if (hasTests.exists) {
        strengths.push('Test suite configured');
      }

      // Calculate overall quality score
      const qualityFactors = {
        readme: hasReadme.isComprehensive ? 25 : (hasReadme.exists ? 15 : 0),
        testing: hasTests.exists ? 25 : 0,
        cicd: hasCICD ? 10 : 0, // Lower weight because CI/CD is optional for many personal projects
        documentation: hasDocumentation ? 15 : 0,
        license: hasLicense ? 5 : 0,
        description: repoData.description ? 5 : 0,
      };

      const overallQuality = Object.values(qualityFactors).reduce((sum, val) => sum + val, 0);

      // Generate recommendations (without research results for now)
      const recommendations = this.generateBasicRecommendations(weaknesses);
      const skillGapRecommendations = skillAssessment
        ? this.generateSkillGapRecommendations(skillAssessment)
        : [];
      const combinedRecommendations = [...recommendations, ...skillGapRecommendations].sort(
        (a, b) => b.priority - a.priority
      );

      return {
        repository: repoUrl,
        owner,
        repo: cleanRepo,
        overallQuality,
        weaknesses,
        strengths,
        recommendations: combinedRecommendations,
      };
    } catch (error) {
      console.error('[Portfolio Builder] Analysis error:', error);
      throw new Error(
        `Failed to analyze portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Enhance recommendations with research results from LangGraph agent
   * Also extracts templates from GitHub examples using Template Creator MCP
   */
  async enrichRecommendationsWithResearch(
    recommendations: PortfolioRecommendation[],
    researchResults: ResearchResults
  ): Promise<PortfolioRecommendation[]> {
    const usedResourceUrls = new Set<string>();
    const usedExampleUrls = new Set<string>();

    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec, index) => {
        const enrichedRec = { ...rec };

        // Add research resources to recommendations
        if (researchResults.resources && researchResults.resources.length > 0) {
          const keywords = this.getRecommendationKeywords(rec);
          const filteredResources = researchResults.resources
            .filter((resource) => {
              if (!resource?.url || usedResourceUrls.has(resource.url)) {
                return false;
              }
              if (!keywords.length) {
                return true;
              }
              const haystack = `${resource.title ?? ''} ${resource.description ?? ''}`.toLowerCase();
              return keywords.some((keyword) => haystack.includes(keyword));
            })
            .slice(0, 2);

          // Fallback: allow generic resources for the first recommendation if none matched
          if (filteredResources.length === 0 && index === 0) {
            researchResults.resources.some((resource) => {
              if (!resource?.url || usedResourceUrls.has(resource.url)) {
                return false;
              }
              filteredResources.push(resource);
              return filteredResources.length >= 2;
            });
          }

          enrichedRec.resources = filteredResources;
          filteredResources.forEach((resource) => {
            if (resource?.url) usedResourceUrls.add(resource.url);
          });
        }

        // Add GitHub examples
        if (researchResults.examples && researchResults.examples.length > 0) {
          const keywords = this.getRecommendationKeywords(rec);
          const filteredExamples = researchResults.examples
            .filter((example) => {
              if (!example?.url || usedExampleUrls.has(example.url)) {
                return false;
              }
              if (!keywords.length) {
                return true;
              }
              const haystack = `${example.name ?? ''} ${example.description ?? ''}`.toLowerCase();
              return keywords.some((keyword) => haystack.includes(keyword));
            })
            .slice(0, 2);

          if (filteredExamples.length === 0 && index === 0) {
            researchResults.examples.some((example) => {
              if (!example?.url || usedExampleUrls.has(example.url)) {
                return false;
              }
              filteredExamples.push(example);
              return filteredExamples.length >= 2;
            });
          }

          enrichedRec.examples = filteredExamples;
          filteredExamples.forEach((example) => {
            if (example?.url) usedExampleUrls.add(example.url);
          });

          // Extract templates from GitHub examples using Template Creator MCP
          enrichedRec.templates = await this.extractTemplatesFromExamples(
            filteredExamples,
            enrichedRec
          );
        }

        return enrichedRec;
      })
    );

    return enrichedRecommendations;
  }

  /**
   * Extract templates from GitHub examples using Template Creator MCP
   */
  private async extractTemplatesFromExamples(
    examples: GitHubExample[],
    recommendation: PortfolioRecommendation
  ): Promise<ExtractedTemplate[]> {
    const templates: ExtractedTemplate[] = [];

    if (!examples || examples.length === 0) {
      return templates;
    }

    try {
      const client = await getTemplateCreatorClient();
      const filePatterns = this.buildExtractionPatterns(recommendation);

      console.log(
        `[Portfolio Builder] Extracting templates from ${examples.length} examples for "${recommendation.title}"`
      );

      for (const example of examples) {
        try {
          console.log(`[Portfolio Builder]   Extracting from: ${example.url}`);

          const extractedTemplate = await client.extractTemplate(
            example.url,
            filePatterns,
            {
              preserveStructure: true,
              keepComments: true,
              includeTypes: true,
              removeBusinessLogic: false,
            }
          );

          // Add source repo URL to the template
          const templateWithSource: ExtractedTemplate = {
            ...extractedTemplate,
            sourceRepo: example.url,
          };

          templates.push(templateWithSource);
          console.log(`[Portfolio Builder]   ✅ Template extracted: ${example.name}`);
        } catch (error) {
          console.warn(
            `[Portfolio Builder]   ⚠️  Failed to extract template from ${example.url}:`,
            error instanceof Error ? error.message : error
          );
          // Continue with next example on error
        }
      }

      console.log(
        `[Portfolio Builder] Successfully extracted ${templates.length}/${examples.length} templates`
      );
    } catch (error) {
      console.error(
        '[Portfolio Builder] Template extraction failed:',
        error instanceof Error ? error.message : error
      );
      // Return empty array on connection error, don't break the workflow
    }

    return templates;
  }

  /**
   * Get file patterns based on weakness type for template extraction
   */
  private getFilePatternsByWeaknessType(weaknessType: string): string[] {
    switch (weaknessType) {
      case 'readme':
        return ['README.md', '**/README.md', 'docs/**/*.md'];
      case 'testing':
        return [
          '**/*.test.*',
          '**/*.spec.*',
          '__tests__/**/*',
          'tests/**/*.ts',
          'tests/**/*.tsx',
          'tests/**/*.js',
          'tests/**/*.jsx',
          'tests/**/*.py',
          '**/tests/**/*.ts',
          '**/tests/**/*.tsx',
          '**/tests/**/*.js',
          '**/tests/**/*.jsx',
          '**/tests/**/*.py',
          '**/test_*.py',
          '**/test_*.ts',
          '**/test_*.tsx',
          '**/test_*.js',
          'jest.config.*',
          'vitest.config.*',
          'pytest.ini',
          'pytest.*',
          'tox.ini',
          'package.json',
        ];
      case 'cicd':
        return ['.github/workflows/**/*.yml', '.github/workflows/**/*.yaml'];
      case 'documentation':
        return ['docs/**/*', '**/docs/**/*.md', '*.md', '**/*.md', 'api/**/*'];
      case 'security':
        return ['.github/dependabot.yml', '.github/security.md', 'SECURITY.md'];
      case 'skill':
        return ['src/**/*.{ts,tsx,js,jsx,py,go}', '**/*.md'];
      default:
        return ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', 'package.json'];
    }
  }

  private buildExtractionPatterns(
    recommendation: PortfolioRecommendation,
    recommendedPatterns?: string[]
  ): string[] {
    const patternSet = new Set<string>(recommendedPatterns ?? []);
    const fallbackPatterns = recommendation.skillGap
      ? this.getFilePatternsForSkillGap(recommendation.skillGap)
      : this.getFilePatternsByWeaknessType(recommendation.weakness.type);

    fallbackPatterns.forEach((pattern) => patternSet.add(pattern));

    if (patternSet.size === 0) {
      patternSet.add('README.md');
    }

    return Array.from(patternSet);
  }

  private getRecommendationKeywords(recommendation: PortfolioRecommendation): string[] {
    const keywords = new Set<string>();
    const pushWords = (value?: string | null) => {
      if (!value) return;
      value
        .toLowerCase()
        .split(/[^a-z0-9+]+/)
        .filter(Boolean)
        .forEach((word) => {
          if (word.length >= 3) {
            keywords.add(word);
          }
        });
    };

    if (recommendation.skillGap) {
      pushWords(recommendation.skillGap.skill.name);
    } else {
      pushWords(recommendation.title);
    }

    switch (recommendation.weakness.type) {
      case 'testing':
        ['test', 'testing', 'qa', 'jest', 'pytest', 'junit'].forEach((k) => keywords.add(k));
        break;
      case 'readme':
      case 'documentation':
        ['documentation', 'docs', 'readme', 'guide'].forEach((k) => keywords.add(k));
        break;
      case 'cicd':
        ['ci', 'cd', 'deployment', 'pipeline', 'actions'].forEach((k) => keywords.add(k));
        break;
      case 'security':
        ['security', 'dependabot', 'codeql'].forEach((k) => keywords.add(k));
        break;
      default:
        break;
    }

    return Array.from(keywords);
  }

  private getFilePatternsForSkillGap(skillGap: SkillGap): string[] {
    const skillId = skillGap.skill.id;
    const name = skillGap.skill.name.toLowerCase();

    switch (skillId) {
      case 'testing':
        return [
          '**/*.test.*',
          '**/*.spec.*',
          '__tests__/**/*',
          'tests/**/*',
          'jest.config.*',
          'vitest.config.*',
          'pytest.ini',
          'pytest.*',
          'tox.ini',
        ];
      case 'devops':
        return [
          '.github/workflows/**/*.yml',
          '.github/workflows/**/*.yaml',
          'dockerfile',
          '**/Dockerfile',
          '**/*.dockerfile',
          '**/*.tf',
          'terraform/**/*',
          'infra/**/*',
          '**/k8s/**/*',
          '**/helm/**/*',
        ];
      case 'cloud':
        return [
          'infra/**/*',
          '**/cdk/**/*',
          '**/cloudformation/**/*',
          '**/serverless.*',
          '.github/workflows/deploy*.yml',
        ];
      case 'databases':
        return [
          'prisma/**/*',
          'migrations/**/*',
          '**/*.sql',
          '**/schema.prisma',
          '**/database/**/*',
        ];
      case 'frameworks':
        return [
          'src/app/**/*',
          'src/pages/**/*',
          'src/components/**/*',
          'app/**/*',
        ];
      case 'programming':
        return [
          'src/**/*.{ts,tsx,js,jsx,py,go,rs,java,cs}',
          'lib/**/*.{ts,tsx,js,jsx,py,go,rs,java,cs}',
        ];
      case 'prompt-engineering':
        return [
          '**/prompts/**/*',
          '**/*prompt*.{ts,tsx,js,jsx,py,md}',
          '**/*.prompt.*',
        ];
      case 'context-engineering':
        return [
          '**/context/**/*',
          '**/*rag*/**/*',
          '**/*embedding*.*',
          '**/*vector*.*',
        ];
      case 'security':
        return [
          '**/security/**/*',
          'SECURITY.md',
          '.github/dependabot.yml',
          '.github/codeql/**/*',
        ];
      case 'architecture':
        return [
          'docs/architecture/**/*',
          'docs/**/*.md',
          '**/diagram*.*',
          '**/design/**/*',
        ];
      default: {
        if (name.includes('testing')) {
          return this.getFilePatternsForSkillGap({ ...skillGap, skill: { ...skillGap.skill, id: 'testing' } });
        }
        if (name.includes('devops') || name.includes('ci/cd')) {
          return this.getFilePatternsForSkillGap({ ...skillGap, skill: { ...skillGap.skill, id: 'devops' } });
        }
        return ['src/**/*.{ts,tsx,js,jsx,py,go,rs}', '**/*.md'];
      }
    }
  }

  /**
   * Create GitHub issues from recommendations
   */
  async createImprovementIssues(
    owner: string,
    repo: string,
    recommendations: PortfolioRecommendation[],
    options?: { includeOptional?: boolean }
  ): Promise<IssueCreationResult[]> {
    const results: IssueCreationResult[] = [];
    const includeOptional = options?.includeOptional ?? false;
    const useMCP = !!process.env.GITHUB_MCP_SERVER_URL;

    // Initialize MCP client if available
    if (useMCP && !this.mcpClient) {
      try {
        this.mcpClient = new GitHubMCPClient();
        await this.mcpClient.connect();
        console.log('[Portfolio Builder] Connected to GitHub MCP server');
      } catch (error) {
        console.warn('[Portfolio Builder] Failed to connect to MCP server, using REST fallback:', error);
        this.mcpClient = null;
      }
    }

    for (const recommendation of recommendations) {
      if (!includeOptional && recommendation.weakness.optional) {
        continue;
      }
      try {
        const issueBody = this.generateIssueBody(recommendation);
        const labels = this.getLabelsForRecommendation(recommendation);

        console.log(`[Portfolio Builder] Creating issue: ${recommendation.title}`);

        let issue: any;

        if (useMCP && this.mcpClient) {
          try {
            // Use MCP to create issue
            const mcpIssue = await this.mcpClient.createIssue(owner, repo, recommendation.title, issueBody, {
              labels,
            });
            
            // Log raw MCP response
            console.log(`[Portfolio Builder] MCP raw response:`, mcpIssue);
            console.log(`[Portfolio Builder] MCP response keys:`, Object.keys(mcpIssue));
            
            // Normalize MCP response to match REST API format
            // MCP returns: { id, url } but we need: { number, html_url }
            issue = {
              ...mcpIssue,
              number: mcpIssue.number || this.extractIssueNumberFromUrl(mcpIssue.url),
              html_url: mcpIssue.html_url || mcpIssue.url,
            };
            
            console.log(`[Portfolio Builder] ✅ Created issue via MCP #${issue.number}: ${issue.html_url}`);
          } catch (mcpError) {
            console.warn(`[Portfolio Builder] MCP failed for ${recommendation.title}, falling back to REST:`, mcpError);
            // Fall through to REST fallback
            issue = await this.githubClient.createIssue(owner, repo, recommendation.title, issueBody, {
              labels,
            });
            console.log(`[Portfolio Builder] ✅ Created issue via REST #${issue.number}: ${issue.html_url}`);
          }
        } else {
          // Use REST API directly
          issue = await this.githubClient.createIssue(owner, repo, recommendation.title, issueBody, {
            labels,
          });
          console.log(`[Portfolio Builder] ✅ Created issue via REST #${issue.number}: ${issue.html_url}`);
        }

        // Log the normalized issue object for debugging
        console.log(`[Portfolio Builder] Normalized issue data: number=${issue.number}, html_url=${issue.html_url}`);
        
        results.push({
          success: true,
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          title: recommendation.title,
        });

      } catch (error) {
        console.error(`[Portfolio Builder] ❌ Failed to create issue for ${recommendation.title}:`, error);
        results.push({
          success: false,
          title: recommendation.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Extract issue number from GitHub issue URL
   * Example: "https://github.com/owner/repo/issues/123" -> 123
   */
  private extractIssueNumberFromUrl(url: string): number | undefined {
    if (!url) return undefined;
    
    try {
      const match = url.match(/\/issues\/(\d+)$/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    } catch (error) {
      console.warn('[Portfolio Builder] Failed to extract issue number from URL:', url);
    }
    
    return undefined;
  }

  /**
   * Generate issue body with research findings
   */
  private generateIssueBody(recommendation: PortfolioRecommendation): string {
    let body = `## 📋 Description\n\n${recommendation.description}\n\n`;

    body += `## 🎯 Impact\n\n${recommendation.weakness.impact}\n\n`;

    if (recommendation.skillGap) {
      const gap = recommendation.skillGap;
      body += `## 📊 Current vs Target\n\n`;
      body += `- Current Level: ${gap.skill.currentLevel}/5\n`;
      body += `- Target Level: ${gap.skill.targetLevel}/5\n`;
      body += `- Gap: ${gap.gap.toFixed(1)} levels\n\n`;
    }

    body += `## ✅ Action Items\n\n`;
    recommendation.actionItems.forEach((item, index) => {
      body += `${index + 1}. ${item}\n`;
    });
    body += '\n';

    // Add learning resources if available
    if (recommendation.resources && recommendation.resources.length > 0) {
      body += `## 📚 Learning Resources\n\n`;
      body += `Here are some curated resources to help you implement this improvement:\n\n`;
      recommendation.resources.forEach((resource) => {
        body += `- [${resource.title}](${resource.url})`;
        if (resource.description) {
          body += ` - ${resource.description}`;
        }
        if (resource.score) {
          body += ` (Quality Score: ${(resource.score * 100).toFixed(0)}%)`;
        }
        body += '\n';
      });
      body += '\n';
    }

    // Add GitHub examples if available
    if (recommendation.examples && recommendation.examples.length > 0) {
      body += `## 💡 Example Projects\n\n`;
      body += `Check out these well-structured examples for inspiration:\n\n`;
      recommendation.examples.forEach((example) => {
        body += `- [${example.name}](${example.url}) ⭐ ${example.stars}`;
        if (example.description) {
          body += ` - ${example.description}`;
        }
        if (example.language) {
          body += ` (${example.language})`;
        }
        body += '\n';
      });
      body += '\n';
    }

    // Add extracted templates if available (from Template Creator MCP)
    if (recommendation.templates && recommendation.templates.length > 0) {
      body += `## 🎨 Ready-to-Use Templates\n\n`;
      body += `We've extracted clean, ready-to-use templates from the example projects above:\n\n`;

      recommendation.templates.forEach((template, index) => {
        body += `### Template ${index + 1}: ${this.extractRepoName(template.sourceRepo)}\n\n`;
        body += `**Source**: [${template.sourceRepo}](${template.sourceRepo})\n\n`;

        // Show structure
        if (template.structure) {
          body += `**Structure**:\n\`\`\`\n${template.structure}\n\`\`\`\n\n`;
        }

        // Show key files
        if (template.files && template.files.length > 0) {
          body += `**Key Files** (${template.files.length} files extracted):\n\n`;
          template.files.slice(0, 3).forEach((file) => {
            body += `- \`${file.path}\` - ${file.description}\n`;
            if (file.placeholders.length > 0) {
              body += `  - Placeholders: ${file.placeholders.map((p) => `\`{{${p}}}\``).join(', ')}\n`;
            }
          });
          if (template.files.length > 3) {
            body += `- ... and ${template.files.length - 3} more files\n`;
          }
          body += '\n';
        }

        // Show setup instructions
        if (template.instructions && template.instructions.length > 0) {
          body += `**Setup Instructions**:\n`;
          template.instructions.forEach((instruction, i) => {
            body += `${i + 1}. ${instruction}\n`;
          });
          body += '\n';
        }

        // Show placeholders
        if (template.placeholders && Object.keys(template.placeholders).length > 0) {
          body += `**Placeholders to Replace**:\n`;
          Object.entries(template.placeholders).forEach(([key, description]) => {
            body += `- \`{{${key}}}\`: ${description}\n`;
          });
          body += '\n';
        }

        body += `<details>\n`;
        body += `<summary>📄 View Full Template Code</summary>\n\n`;
        // Show first file as example
        if (template.files && template.files.length > 0) {
          const firstFile = template.files[0];
          body += `**${firstFile.path}**:\n\n`;
          body += `\`\`\`\n${firstFile.content.substring(0, 500)}${firstFile.content.length > 500 ? '\n...\n(truncated)' : ''}\n\`\`\`\n\n`;
        }
        body += `</details>\n\n`;
      });

      body += `> 🤖 Templates automatically extracted and cleaned by Dev-Builder AI Template Creator MCP\n\n`;
    }

    body += `## 🔖 Metadata\n\n`;
    body += `- **Priority**: ${recommendation.priority}/10\n`;
    body += `- **Estimated Effort**: ${recommendation.estimatedEffort}\n`;
    body += `- **Category**: ${recommendation.weakness.type}\n\n`;

    body += `---\n\n`;
    body += `🤖 Generated with [Dev-Builder AI](https://github.com/Bbetaverse22/dev-builder) - AI-Powered Developer Career Growth\n`;

    return body;
  }

  /**
   * Extract repository name from GitHub URL
   */
  private extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return repoUrl;
  }

  /**
   * Get labels for recommendation based on type and severity
   */
  private getLabelsForRecommendation(recommendation: PortfolioRecommendation): string[] {
    const labels: string[] = ['portfolio-improvement', 'ai-generated'];

    // Add severity label
    labels.push(`priority-${recommendation.weakness.severity}`);

    // Add type label
    switch (recommendation.weakness.type) {
      case 'readme':
        labels.push('documentation');
        break;
      case 'testing':
        labels.push('testing');
        break;
      case 'cicd':
        labels.push('ci-cd');
        break;
      case 'documentation':
        labels.push('documentation');
        break;
      case 'security':
        labels.push('security');
        break;
      case 'structure':
        labels.push('enhancement');
        break;
      case 'skill':
        labels.push('skill-gap');
        break;
    }

    return labels;
  }

  /**
   * Generate basic recommendations without research results
   */
  private generateBasicRecommendations(weaknesses: PortfolioWeakness[]): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = [];

    weaknesses.forEach((weakness, index) => {
      let actionItems: string[] = [];
      let description = '';

      switch (weakness.type) {
        case 'readme':
          description = 'Create a comprehensive README that helps others understand and use your project effectively. A good README is like a storefront for your code - it should welcome visitors and guide them through your project.',
          actionItems = [
            'Add a clear project title and description',
            'Include installation instructions with all dependencies',
            'Provide usage examples with code snippets',
            'Document key features and functionality',
            'Add badges for build status, license, and version',
            'Include contribution guidelines (if open source)',
          ];
          break;

        case 'testing':
          description = 'Implement a test suite to improve code quality and confidence in your changes. Tests act as a safety net, catching bugs before they reach production and giving you confidence to refactor and improve your code.',
          actionItems = [
            'Choose a testing framework (Jest, Pytest, JUnit, etc.)',
            'Set up test directory structure',
            'Write unit tests for core functionality',
            'Aim for at least 70% code coverage',
            'Add test scripts to package.json or build configuration',
            'Document testing procedures in README',
          ];
          break;

        case 'cicd':
          description = 'Set up automated CI/CD to catch bugs early and streamline deployments. If you already use Vercel, Netlify, or similar platforms, they provide built-in CI/CD - you may just need to add status checks or testing workflows.';
          actionItems = [
            '✅ If using Vercel/Netlify: You already have deployment CI/CD! Consider adding a GitHub Actions workflow just for testing.',
            '🔧 If self-hosting: Create GitHub Actions workflow file (.github/workflows/ci.yml)',
            'Configure automated test runs on pull requests',
            'Add linting and code quality checks',
            'Add build status badge to README',
            'Consider adding a vercel.json or netlify.toml to make deployment config explicit',
          ];
          break;

        case 'documentation':
          description = 'Improve project documentation to help contributors and users understand the codebase. Good documentation is like a map - it helps people navigate your project and understand how everything fits together.',
          actionItems = [
            'Create a /docs folder for detailed documentation',
            'Document API endpoints or public interfaces',
            'Add architecture or design decision documentation',
            'Include troubleshooting and FAQ sections',
            'Consider using a documentation generator (JSDoc, Sphinx, etc.)',
          ];
          break;

        case 'structure':
          description = weakness.id === 'license'
            ? 'Add a license file to clarify how others can use your code.'
            : 'Improve project structure and organization.';
          actionItems =
            weakness.id === 'license'
              ? [
                  'Choose an appropriate open source license (MIT, Apache 2.0, GPL, etc.)',
                  'Add LICENSE file to repository root',
                  'Reference the license in README',
                  'Consider adding a CONTRIBUTING.md if accepting contributions',
                ]
              : [
                  'Organize code into clear modules or packages',
                  'Add .gitignore for build artifacts and dependencies',
                  'Create clear folder structure (src, tests, docs, etc.)',
                ];
          break;

        default:
          description = weakness.description;
          actionItems = [
            'Review best practices for this area',
            'Implement recommended changes',
            'Document your approach',
          ];
      }

      recommendations.push({
        id: weakness.id,
        weakness,
        title: weakness.title,
        description,
        actionItems,
        estimatedEffort: weakness.severity === 'high' ? 'medium' : weakness.severity === 'medium' ? 'low' : 'low',
        priority: weakness.severity === 'high' ? 10 : weakness.severity === 'medium' ? 7 : 5,
      });
    });

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private generateSkillGapRecommendations(
    skillAssessment: GapAnalysisResult,
    limit = 3
  ): PortfolioRecommendation[] {
    if (!skillAssessment?.skillGaps?.length) {
      return [];
    }

    const sortedGaps = [...skillAssessment.skillGaps]
      .filter((gap) => gap.gap > 0.1)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    return sortedGaps.map((gap) => {
      const priorityScore = Math.round(gap.priority);
      const severity: 'high' | 'medium' | 'low' = priorityScore >= 12
        ? 'high'
        : priorityScore >= 7
          ? 'medium'
          : 'low';

      const effort: 'low' | 'medium' | 'high' = severity === 'high'
        ? 'high'
        : severity === 'medium'
          ? 'medium'
          : 'low';

      const githubAnalysis = skillAssessment.githubAnalysis;

      let title = `Strengthen ${gap.skill.name}`;
      let description = `Close a ${gap.gap.toFixed(1)}-level gap in ${gap.skill.name}. Current level: ${gap.skill.currentLevel}/5, target level: ${gap.skill.targetLevel}/5.`;
      let impact = `Improving ${gap.skill.name} increases your readiness for ${gap.skill.category} tasks and aligns with your target role.`;

      let actionItems = (gap.recommendations?.length ? gap.recommendations : [
        `Identify a practice project focused on ${gap.skill.name}.`,
        `Schedule study or build time to progress from ${gap.skill.currentLevel} to ${gap.skill.targetLevel}.`,
        `Document learnings and add relevant examples to this repository.`,
      ]).slice(0, 5);

      if (gap.skill.id === 'frameworks' && githubAnalysis) {
        const frameworkPlan = buildFrameworkSkillPlan({
          frameworks: githubAnalysis.frameworks,
          languages: githubAnalysis.languages,
        });
        if (frameworkPlan.title) {
          title = frameworkPlan.title;
        }
        if (frameworkPlan.description) {
          description = frameworkPlan.description;
        }
        if (frameworkPlan.impact) {
          impact = frameworkPlan.impact;
        }
        if (frameworkPlan.actionItems.length > 0) {
          actionItems = frameworkPlan.actionItems;
        }
      }

      actionItems = actionItems.slice(0, 5);

      const weakness: PortfolioWeakness = {
        id: `skill-${gap.skill.id}`,
        type: 'skill',
        severity,
        title,
        description,
        impact,
      };

      return {
        id: weakness.id,
        weakness,
        title,
        description,
        actionItems,
        estimatedEffort: effort,
        priority: Math.max(priorityScore, 6),
        skillGap: gap,
      };
    });
  }

  /**
   * Check for a license file using common file name variants.
   */
  private async checkLicenseFile(owner: string, repo: string, contents: any): Promise<boolean> {
    if (Array.isArray(contents)) {
      const hasLicenseInRoot = contents.some((item: any) => {
        if (!item || typeof item.name !== 'string') {
          return false;
        }

        const normalized = item.name.toLowerCase();
        return LICENSE_FILE_BASENAMES.has(normalized);
      });

      if (hasLicenseInRoot) {
        return true;
      }
    }

    for (const candidate of LICENSE_FILE_CANDIDATES) {
      const exists = await this.githubClient.fileExists(owner, repo, candidate).catch(() => false);
      if (exists) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check README quality
   */
  private async checkReadmeQuality(
    owner: string,
    repo: string
  ): Promise<{ exists: boolean; isComprehensive: boolean }> {
    try {
      const readme = await this.githubClient.getRepositoryReadme(owner, repo);
      const content = Buffer.from(readme.content, 'base64').toString('utf-8').toLowerCase();

      // Check for key sections
      const hasInstallation = content.includes('install') || content.includes('setup');
      const hasUsage = content.includes('usage') || content.includes('example');
      const hasFeatures = content.includes('feature') || content.length > 500;

      const isComprehensive = hasInstallation && hasUsage && hasFeatures;

      return { exists: true, isComprehensive };
    } catch (error) {
      return { exists: false, isComprehensive: false };
    }
  }

  /**
   * Check for testing coverage
   */
  private async checkTestingCoverage(
    owner: string,
    repo: string,
    contents: any
  ): Promise<{ exists: boolean }> {
    if (!Array.isArray(contents)) {
      return { exists: false };
    }

    const fileNames = contents.map((file: any) => file.name.toLowerCase());

    // Check for test directories or files
    const hasTests =
      fileNames.some((name) =>
        ['test', 'tests', '__tests__', 'spec'].some((pattern) => name.includes(pattern))
      ) ||
      fileNames.some((name) =>
        ['jest.config', 'pytest.ini', 'vitest.config', '.rspec', 'phpunit.xml'].some((config) =>
          name.includes(config)
        )
      );

    return { exists: hasTests };
  }

  /**
   * Check for CI/CD setup or modern deployment platforms
   */
  private async checkCICDSetup(owner: string, repo: string, contents: any): Promise<boolean> {
    try {
      // Check for .github/workflows directory (GitHub Actions)
      let hasGithubActions = false;
      try {
        hasGithubActions = await this.githubClient.fileExists(owner, repo, '.github/workflows');
      } catch {
        hasGithubActions = false;
      }

      if (hasGithubActions) {
        console.log('[Portfolio Builder] ✅ Detected GitHub Actions CI/CD');
        return true;
      }

      // Check for deployment platform indicators in README and repo description
      const hasDeploymentLinks = await this.checkForDeploymentLinks(owner, repo);
      if (hasDeploymentLinks) {
        console.log('[Portfolio Builder] ✅ Detected deployment platform from links (built-in CI/CD) - skipping CI/CD recommendation');
        return true;
      }

      // Check for other traditional CI config files
      if (!Array.isArray(contents)) return false;

      const fileNames = contents.map((file: any) => file.name.toLowerCase());

      // Traditional CI/CD platforms
      const traditionalCIFiles = [
        '.travis.yml',
        'circle.yml',
        '.circleci',
        'jenkins',
        '.gitlab-ci.yml',
        'azure-pipelines.yml',
      ];

      // Modern deployment platforms (Vercel, Netlify, etc.) that provide built-in CI/CD
      const deploymentPlatformFiles = [
        'vercel.json',        // Vercel config
        '.vercel',            // Vercel project folder
        'netlify.toml',       // Netlify config
        '_redirects',         // Netlify redirects
        'netlify',            // Netlify folder
        'render.yaml',        // Render config
        'fly.toml',           // Fly.io config
        'railway.json',       // Railway config
        'railway.toml',       // Railway config
      ];

      // Check for traditional CI/CD
      const hasTraditionalCI = fileNames.some((name) =>
        traditionalCIFiles.some((ci) => name.includes(ci))
      );
      if (hasTraditionalCI) {
        console.log('[Portfolio Builder] ✅ Detected traditional CI/CD config');
        return true;
      }

      // Check for modern deployment platforms (they handle CI/CD automatically)
      const hasDeploymentPlatform = fileNames.some((name) =>
        deploymentPlatformFiles.some((platform) => name.includes(platform))
      );
      if (hasDeploymentPlatform) {
        console.log('[Portfolio Builder] ✅ Detected deployment platform config files (built-in CI/CD) - skipping CI/CD recommendation');
        return true; // Modern platforms include CI/CD automatically
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check README and repository description for deployment platform links
   */
  private async checkForDeploymentLinks(owner: string, repo: string): Promise<boolean> {
    try {
      // Get repository data for description
      const repoData = await this.githubClient.getRepository(owner, repo);
      const description = (repoData.description || '').toLowerCase();
      const homepage = (repoData.homepage || '').toLowerCase();

      // Deployment platform domains to check for
      const deploymentDomains = [
        'vercel.app',          // Vercel deployment
        'vercel.com',          // Vercel link
        'netlify.app',         // Netlify deployment
        'netlify.com',         // Netlify link
        'railway.app',         // Railway deployment
        'railway.com',         // Railway link
        'render.com',          // Render deployment
        'fly.dev',             // Fly.io deployment
        'fly.io',              // Fly.io link
        'herokuapp.com',       // Heroku deployment
        'pages.dev',           // Cloudflare Pages
        'surge.sh',            // Surge deployment
        'now.sh',              // Old Vercel domain
      ];

      // Check homepage URL
      if (homepage && deploymentDomains.some(domain => homepage.includes(domain))) {
        console.log(`[Portfolio Builder] 📍 Found deployment platform in homepage: ${homepage}`);
        return true;
      }

      // Check description
      if (description && deploymentDomains.some(domain => description.includes(domain))) {
        console.log(`[Portfolio Builder] 📍 Found deployment platform in description`);
        return true;
      }

      // Check README content
      try {
        const readme = await this.githubClient.getRepositoryReadme(owner, repo);
        const readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8').toLowerCase();

        if (deploymentDomains.some(domain => readmeContent.includes(domain))) {
          console.log(`[Portfolio Builder] 📍 Found deployment platform links in README`);
          return true;
        }
      } catch (error) {
        // README doesn't exist or couldn't be read, continue without it
      }

      return false;
    } catch (error) {
      console.error('[Portfolio Builder] Error checking deployment links:', error);
      return false;
    }
  }

  /**
   * Check for documentation
   */
  private async checkDocumentation(owner: string, repo: string, contents: any): Promise<boolean> {
    try {
      // Check for /docs folder
      let hasDocs = false;
      try {
        hasDocs = await this.githubClient.fileExists(owner, repo, 'docs');
      } catch {
        hasDocs = false;
      }
      if (hasDocs) return true;

      // Check for common documentation files
      if (!Array.isArray(contents)) return false;

      const fileNames = contents.map((file: any) => file.name.toLowerCase());
      const docFiles = ['contributing.md', 'changelog.md', 'api.md', 'wiki'];

      return fileNames.some((name) => docFiles.some((doc) => name.includes(doc)));
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup MCP client connection
   */
  async cleanup(): Promise<void> {
    if (this.mcpClient) {
      try {
        await this.mcpClient.disconnect();
        this.mcpClient = null;
        console.log('[Portfolio Builder] Disconnected from GitHub MCP server');
      } catch (error) {
        console.warn('[Portfolio Builder] Error disconnecting MCP client:', error);
      }
    }
  }
}
