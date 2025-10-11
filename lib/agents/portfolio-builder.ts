/**
 * Portfolio Builder Agent
 * Analyzes repositories, identifies weaknesses, and creates actionable GitHub issues
 * Integrates with Research Agent results to provide learning resources
 * Integrates with Template Creator MCP to provide ready-to-use code templates
 */

import { GitHubClient } from '@/lib/github/github-client';
import { getTemplateCreatorClient, closeTemplateCreatorClient } from '@/lib/mcp/template-creator/client';
import type { GitHubAnalysis } from './gap-analyzer';

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
  type: 'readme' | 'documentation' | 'testing' | 'cicd' | 'security' | 'structure';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
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

  constructor(githubToken?: string) {
    this.githubClient = new GitHubClient(githubToken);
  }

  /**
   * Analyze repository quality and identify improvement opportunities
   */
  async analyzePortfolioQuality(repoUrl: string): Promise<PortfolioQualityAnalysis> {
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
        this.checkReadmeQuality(owner, cleanRepo),
        this.checkTestingCoverage(owner, cleanRepo, contents),
        this.checkCICDSetup(owner, cleanRepo, contents),
        this.checkDocumentation(owner, cleanRepo, contents),
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
            ? 'README exists but lacks key sections (setup, usage, features)'
            : 'No README file found in the repository',
          impact: 'Makes it difficult for others to understand and use your project',
        });
      }

      if (!hasTests.exists) {
        weaknesses.push({
          id: 'testing',
          type: 'testing',
          severity: 'high',
          title: 'No Test Coverage',
          description: 'No testing framework or test files detected',
          impact: 'Reduces confidence in code quality and makes refactoring risky',
        });
      }

      if (!hasCICD) {
        weaknesses.push({
          id: 'cicd',
          type: 'cicd',
          severity: 'medium',
          title: 'No CI/CD Pipeline',
          description: 'No automated testing or deployment pipeline configured',
          impact: 'Manual testing and deployment increases errors and slows development',
        });
      }

      if (!hasDocumentation) {
        weaknesses.push({
          id: 'documentation',
          type: 'documentation',
          severity: 'medium',
          title: 'Limited Documentation',
          description: 'No /docs folder or comprehensive API documentation found',
          impact: 'Makes it harder for contributors to understand the codebase',
        });
      }

      // Check for additional quality indicators
      const hasLicense = await this.githubClient.fileExists(owner, cleanRepo, 'LICENSE');
      if (!hasLicense) {
        weaknesses.push({
          id: 'license',
          type: 'structure',
          severity: 'low',
          title: 'No License File',
          description: 'No LICENSE file found',
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
        cicd: hasCICD ? 20 : 0,
        documentation: hasDocumentation ? 15 : 0,
        license: hasLicense ? 10 : 0,
        description: repoData.description ? 5 : 0,
      };

      const overallQuality = Object.values(qualityFactors).reduce((sum, val) => sum + val, 0);

      // Generate recommendations (without research results for now)
      const recommendations = this.generateBasicRecommendations(weaknesses);

      return {
        repository: repoUrl,
        owner,
        repo: cleanRepo,
        overallQuality,
        weaknesses,
        strengths,
        recommendations,
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
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const enrichedRec = { ...rec };

        // Add research resources to recommendations
        if (researchResults.resources && researchResults.resources.length > 0) {
          enrichedRec.resources = researchResults.resources.slice(0, 3);
        }

        // Add GitHub examples
        if (researchResults.examples && researchResults.examples.length > 0) {
          enrichedRec.examples = researchResults.examples.slice(0, 3);

          // Extract templates from top GitHub examples using Template Creator MCP
          try {
            const templates = await this.extractTemplatesFromExamples(
              enrichedRec.examples,
              rec.weakness.type
            );
            if (templates.length > 0) {
              enrichedRec.templates = templates;
              console.log(
                `[Portfolio Builder] Extracted ${templates.length} templates for ${rec.weakness.type}`
              );
            }
          } catch (error) {
            console.error(
              `[Portfolio Builder] Failed to extract templates for ${rec.weakness.type}:`,
              error
            );
            // Continue without templates - not critical
          }
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
    weaknessType: string
  ): Promise<ExtractedTemplate[]> {
    const templates: ExtractedTemplate[] = [];

    try {
      // Get Template Creator MCP client
      const templateClient = await getTemplateCreatorClient();

      // Only extract templates from the top 2 examples to avoid long wait times
      const topExamples = examples.slice(0, 2);

      for (const example of topExamples) {
        try {
          console.log(
            `[Portfolio Builder] Analyzing template worthiness for ${example.name}...`
          );

          // Step 1: Analyze structure to check if it's worth extracting
          const analysis = await templateClient.analyzeStructure(example.url);

          // Only extract if template worthiness is >= 0.7 (70%)
          if (analysis.templateWorthiness >= 0.7) {
            console.log(
              `[Portfolio Builder] Extracting template from ${example.name} (worthiness: ${analysis.templateWorthiness})...`
            );

            // Step 2: Extract template with recommended patterns
            const template = await templateClient.extractTemplate(
              example.url,
              analysis.recommendedPatterns || this.getFilePatternsByWeaknessType(weaknessType),
              {
                preserveStructure: true,
                keepComments: true,
                includeTypes: true,
                removeBusinessLogic: true,
              }
            );

            templates.push({
              sourceRepo: example.url,
              ...template,
            });

            console.log(
              `[Portfolio Builder] ✅ Successfully extracted template from ${example.name}`
            );
          } else {
            console.log(
              `[Portfolio Builder] ⏭️  Skipped ${example.name} (worthiness: ${analysis.templateWorthiness} < 0.7)`
            );
          }
        } catch (error) {
          console.error(
            `[Portfolio Builder] Failed to extract template from ${example.name}:`,
            error
          );
          // Continue with other examples
        }
      }
    } catch (error) {
      console.error('[Portfolio Builder] Template extraction failed:', error);
    }

    return templates;
  }

  /**
   * Get file patterns based on weakness type for template extraction
   */
  private getFilePatternsByWeaknessType(weaknessType: string): string[] {
    switch (weaknessType) {
      case 'readme':
        return ['README.md', 'docs/**/*.md'];
      case 'testing':
        return [
          '**/*.test.*',
          '**/*.spec.*',
          '__tests__/**/*',
          'jest.config.*',
          'vitest.config.*',
          'pytest.ini',
        ];
      case 'cicd':
        return ['.github/workflows/**/*.yml', '.github/workflows/**/*.yaml'];
      case 'documentation':
        return ['docs/**/*', '*.md', 'api/**/*'];
      case 'security':
        return ['.github/dependabot.yml', '.github/security.md', 'SECURITY.md'];
      default:
        return ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', 'package.json'];
    }
  }

  /**
   * Create GitHub issues from recommendations
   */
  async createImprovementIssues(
    owner: string,
    repo: string,
    recommendations: PortfolioRecommendation[]
  ): Promise<IssueCreationResult[]> {
    const results: IssueCreationResult[] = [];

    for (const recommendation of recommendations) {
      try {
        const issueBody = this.generateIssueBody(recommendation);
        const labels = this.getLabelsForRecommendation(recommendation);

        console.log(`[Portfolio Builder] Creating issue: ${recommendation.title}`);

        const issue = await this.githubClient.createIssue(owner, repo, recommendation.title, issueBody, {
          labels,
        });

        results.push({
          success: true,
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          title: recommendation.title,
        });

        console.log(`[Portfolio Builder] ✅ Created issue #${issue.number}: ${issue.html_url}`);
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
   * Generate issue body with research findings
   */
  private generateIssueBody(recommendation: PortfolioRecommendation): string {
    let body = `## 📋 Description\n\n${recommendation.description}\n\n`;

    body += `## 🎯 Impact\n\n${recommendation.weakness.impact}\n\n`;

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

      body += `> 🤖 Templates automatically extracted and cleaned by SkillBridge.ai Template Creator MCP\n\n`;
    }

    body += `## 🔖 Metadata\n\n`;
    body += `- **Priority**: ${recommendation.priority}/10\n`;
    body += `- **Estimated Effort**: ${recommendation.estimatedEffort}\n`;
    body += `- **Category**: ${recommendation.weakness.type}\n\n`;

    body += `---\n\n`;
    body += `🤖 Generated with [SkillBridge.ai](https://github.com/Bbetaverse22/skillbridge-agents) - AI-Powered Developer Career Growth\n`;

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
          description = 'Create a comprehensive README that helps others understand and use your project effectively.';
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
          description = 'Implement a test suite to improve code quality and confidence in your changes.';
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
          description = 'Set up automated CI/CD to catch bugs early and streamline deployments.';
          actionItems = [
            'Create GitHub Actions workflow file (.github/workflows/ci.yml)',
            'Configure automated test runs on pull requests',
            'Add linting and code quality checks',
            'Set up automated deployments (optional)',
            'Add build status badge to README',
          ];
          break;

        case 'documentation':
          description = 'Improve project documentation to help contributors and users understand the codebase.';
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
   * Check for CI/CD setup
   */
  private async checkCICDSetup(owner: string, repo: string, contents: any): Promise<boolean> {
    try {
      // Check for .github/workflows directory
      const hasGithubActions = await this.githubClient.fileExists(owner, repo, '.github/workflows');
      if (hasGithubActions) return true;

      // Check for other CI config files
      if (!Array.isArray(contents)) return false;

      const fileNames = contents.map((file: any) => file.name.toLowerCase());
      const ciFiles = [
        '.travis.yml',
        'circle.yml',
        '.circleci',
        'jenkins',
        '.gitlab-ci.yml',
        'azure-pipelines.yml',
      ];

      return fileNames.some((name) => ciFiles.some((ci) => name.includes(ci)));
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for documentation
   */
  private async checkDocumentation(owner: string, repo: string, contents: any): Promise<boolean> {
    try {
      // Check for /docs folder
      const hasDocs = await this.githubClient.fileExists(owner, repo, 'docs');
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
}
