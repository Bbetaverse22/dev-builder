/**
 * GitHub Agent for SkillBridge.ai
 * Provides GitHub integration capabilities for skill assessment and analysis
 */

import { githubClient, type GitHubRepository, type GitHubUser, type GitHubIssue, type GitHubPullRequest } from '@/lib/github/github-client';
import { tool, jsonSchema } from 'ai';

export class GitHubAgent {
  private client = githubClient;

  /**
   * Get GitHub tools for the AI SDK
   */
  getTools() {
    return {
      github_user_profile: tool({
        description: 'Get GitHub user profile information including repositories, followers, and activity',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            username: { type: 'string', description: 'GitHub username to fetch profile for' },
          },
          required: ['username'],
        }) as any,
        execute: async ({ username }: { username: string }) => {
          try {
            const user = await this.client.getUser(username);
            return {
              success: true,
              data: {
                user,
                summary: `GitHub profile for ${user.login}: ${user.public_repos} public repos, ${user.followers} followers, ${user.following} following. Joined ${new Date(user.created_at).toLocaleDateString()}.`
              }
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch GitHub profile for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),

      github_user_repositories: tool({
        description: 'Get repositories for a GitHub user with filtering and sorting options',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            username: { type: 'string', description: 'GitHub username' },
            type: { type: 'string', enum: ['all', 'owner', 'public', 'private', 'member'], description: 'Repository type filter' },
            sort: { type: 'string', enum: ['created', 'updated', 'pushed', 'full_name'], description: 'Sort order' },
            direction: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
            limit: { type: 'number', minimum: 1, maximum: 100, description: 'Number of repositories to return (max 100)' },
          },
          required: ['username'],
        }) as any,
        execute: async ({ username, type = 'public', sort = 'updated', direction = 'desc', limit = 10 }: {
          username: string;
          type?: 'all' | 'owner' | 'public' | 'private' | 'member';
          sort?: 'created' | 'updated' | 'pushed' | 'full_name';
          direction?: 'asc' | 'desc';
          limit?: number;
        }) => {
          try {
            const repos = await this.client.getUserRepositories(username, {
              type,
              sort,
              direction,
              per_page: limit,
            });

            const summary = repos.map(repo => ({
              name: repo.name,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              url: repo.html_url,
              updated: repo.updated_at,
            }));

            return {
              success: true,
              data: {
                repositories: summary,
                total: repos.length,
                summary: `Found ${repos.length} repositories for ${username}. Top languages: ${this.getTopLanguages(repos).join(', ')}`
              }
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to fetch repositories for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),

      github_repository_analysis: tool({
        description: 'Analyze a specific GitHub repository for skill assessment',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner (username or organization)' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        }) as any,
        execute: async ({ owner, repo }: { owner: string; repo: string }) => {
          try {
            const [repository, issues, pullRequests] = await Promise.all([
              this.client.getRepository(owner, repo),
              this.client.getRepositoryIssues(owner, repo, { state: 'open', per_page: 10 }),
              this.client.getRepositoryPullRequests(owner, repo, { state: 'open', per_page: 10 }),
            ]);

            const analysis = {
              repository: {
                name: repository.name,
                full_name: repository.full_name,
                description: repository.description,
                language: repository.language,
                stars: repository.stargazers_count,
                forks: repository.forks_count,
                created: repository.created_at,
                updated: repository.updated_at,
                url: repository.html_url,
              },
              activity: {
                open_issues: issues.length,
                open_pull_requests: pullRequests.length,
                recent_issues: issues.slice(0, 5).map(issue => ({
                  number: issue.number,
                  title: issue.title,
                  state: issue.state,
                  created: issue.created_at,
                })),
                recent_pull_requests: pullRequests.slice(0, 5).map(pr => ({
                  number: pr.number,
                  title: pr.title,
                  state: pr.state,
                  created: pr.created_at,
                })),
              },
              skill_indicators: {
                primary_language: repository.language,
                project_maturity: this.assessProjectMaturity(repository),
                community_engagement: this.assessCommunityEngagement(repository, issues, pullRequests),
                code_quality_indicators: {
                  has_readme: true, // We could check for README existence
                  has_issues: issues.length > 0,
                  has_pull_requests: pullRequests.length > 0,
                  recent_activity: this.isRecentlyActive(repository.updated_at),
                }
              }
            };

            return {
              success: true,
              data: analysis
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to analyze repository ${owner}/${repo}: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),

      github_search_repositories: tool({
        description: 'Search GitHub repositories by query with filtering options',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g., "language:javascript react")' },
            sort: { type: 'string', enum: ['stars', 'forks', 'help-wanted-issues', 'updated'], description: 'Sort order' },
            order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
            limit: { type: 'number', minimum: 1, maximum: 100, description: 'Number of results to return (max 100)' },
          },
          required: ['query'],
        }) as any,
        execute: async ({ query, sort = 'stars', order = 'desc', limit = 10 }: {
          query: string;
          sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
          order?: 'asc' | 'desc';
          limit?: number;
        }) => {
          try {
            const results = await this.client.searchRepositories(query, {
              sort,
              order,
              per_page: limit,
            });

            const repositories = results.items.map(repo => ({
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              url: repo.html_url,
              created: repo.created_at,
              updated: repo.updated_at,
            }));

            return {
              success: true,
              data: {
                repositories,
                total_count: results.total_count,
                summary: `Found ${results.total_count} repositories matching "${query}". Showing top ${repositories.length} by ${sort}.`
              }
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to search repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),

      github_skill_assessment: tool({
        description: 'Assess technical skills based on GitHub activity and repositories',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            username: { type: 'string', description: 'GitHub username to assess' },
            focus_areas: { type: 'array', items: { type: 'string' }, description: 'Specific skill areas to focus on (e.g., ["javascript", "python", "react"])' },
          },
          required: ['username'],
        }) as any,
        execute: async ({ username, focus_areas = [] }: { username: string; focus_areas?: string[] }) => {
          try {
            const [user, repositories] = await Promise.all([
              this.client.getUser(username),
              this.client.getUserRepositories(username, { type: 'public', sort: 'updated', per_page: 50 }),
            ]);

            const skillAnalysis = this.analyzeSkills(repositories, focus_areas);
            const activityMetrics = this.calculateActivityMetrics(repositories);

            const assessment = {
              user: {
                username: user.login,
                name: user.name,
                bio: user.bio,
                public_repos: user.public_repos,
                followers: user.followers,
                following: user.following,
                account_age: this.calculateAccountAge(user.created_at),
              },
              skill_analysis: skillAnalysis,
              activity_metrics: activityMetrics,
              recommendations: this.generateRecommendations(skillAnalysis, activityMetrics),
            };

            return {
              success: true,
              data: assessment
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to assess skills for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),

      github_search_practice_issues: tool({
        description: 'Search for GitHub issues suitable for practicing specific skills. Helps find beginner-friendly, good first issues, or issues related to specific technologies for hands-on learning.',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            skills: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Skills or technologies to practice (e.g., ["react", "typescript", "python"])' 
            },
            difficulty: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'any'],
              description: 'Difficulty level for practice issues'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 50,
              description: 'Number of issues to return (max 50)'
            },
          },
          required: ['skills'],
        }) as any,
        execute: async ({ skills, difficulty = 'beginner', limit = 10 }: {
          skills: string[];
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'any';
          limit?: number;
        }) => {
          try {
            // Use a single skill for better results, or combine with more flexible logic
            const primarySkill = skills[0].toLowerCase();
            
            // Build a simpler, more flexible query
            let labelQuery = '';
            if (difficulty === 'beginner' || difficulty === 'any') {
              labelQuery = 'label:"good first issue"';
            } else if (difficulty === 'intermediate') {
              labelQuery = 'label:"help wanted"';
            } else if (difficulty === 'advanced') {
              labelQuery = 'label:"help wanted"';
            }
            
            // Simple query: language + label + issue state
            const query = `${primarySkill} ${labelQuery} is:open is:issue`;
            
            const results = await this.client.searchIssues(query, {
              sort: 'updated',
              order: 'desc',
              per_page: limit,
            });

            const issues = results.items.map(issue => ({
              title: issue.title,
              url: issue.html_url,
              repository: issue.html_url.split('/').slice(3, 5).join('/'),
              created: issue.created_at,
              updated: issue.updated_at,
              author: issue.user.login,
            }));

            return {
              success: true,
              data: {
                issues,
                total_count: results.total_count,
                skills_searched: skills,
                difficulty,
                summary: `Found ${results.total_count} practice issues for ${skills.join(', ')} at ${difficulty} level. Showing top ${issues.length} by engagement.`
              }
            };
          } catch (error) {
            return {
              success: false,
              error: `Failed to search practice issues: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        },
      }),
    };
  }

  private getTopLanguages(repositories: GitHubRepository[]): string[] {
    const languageCounts = repositories.reduce((acc, repo) => {
      if (repo.language) {
        acc[repo.language] = (acc[repo.language] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([language]) => language);
  }

  private assessProjectMaturity(repository: GitHubRepository): string {
    const ageInDays = (Date.now() - new Date(repository.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const stars = repository.stargazers_count;
    const forks = repository.forks_count;

    if (ageInDays > 365 && stars > 100) return 'mature';
    if (ageInDays > 180 && stars > 50) return 'established';
    if (ageInDays > 90 && stars > 10) return 'growing';
    return 'early-stage';
  }

  private assessCommunityEngagement(repository: GitHubRepository, issues: GitHubIssue[], pullRequests: GitHubPullRequest[]): string {
    const totalEngagement = issues.length + pullRequests.length;
    const stars = repository.stargazers_count;

    if (totalEngagement > 20 && stars > 100) return 'high';
    if (totalEngagement > 10 && stars > 50) return 'medium';
    if (totalEngagement > 5 && stars > 10) return 'low';
    return 'minimal';
  }

  private isRecentlyActive(updatedAt: string): boolean {
    const daysSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate < 30;
  }

  private analyzeSkills(repositories: GitHubRepository[], focusAreas: string[]) {
    const languageSkills = this.getTopLanguages(repositories);
    const totalRepos = repositories.length;
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);

    const skillLevels = languageSkills.map(language => {
      const languageRepos = repositories.filter(repo => repo.language === language);
      const languageStars = languageRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      
      let level = 'beginner';
      if (languageRepos.length > 10 && languageStars > 50) level = 'expert';
      else if (languageRepos.length > 5 && languageStars > 20) level = 'intermediate';
      else if (languageRepos.length > 2) level = 'beginner';

      return { language, level, repositories: languageRepos.length, stars: languageStars };
    });

    return {
      primary_languages: skillLevels,
      project_metrics: {
        total_repositories: totalRepos,
        total_stars: totalStars,
        total_forks: totalForks,
        average_stars_per_repo: totalStars / totalRepos,
      },
      focus_area_analysis: focusAreas.map(area => ({
        area,
        found: languageSkills.some(lang => lang.toLowerCase().includes(area.toLowerCase())),
        related_repos: repositories.filter(repo => 
          repo.language?.toLowerCase().includes(area.toLowerCase()) ||
          repo.name.toLowerCase().includes(area.toLowerCase()) ||
          repo.description?.toLowerCase().includes(area.toLowerCase())
        ).length,
      })),
    };
  }

  private calculateActivityMetrics(repositories: GitHubRepository[]) {
    const now = Date.now();
    const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60 * 1000);
    
    const recentRepos = repositories.filter(repo => 
      new Date(repo.updated_at).getTime() > sixMonthsAgo
    );

    return {
      total_repositories: repositories.length,
      recently_active_repositories: recentRepos.length,
      activity_score: Math.min(100, (recentRepos.length / repositories.length) * 100),
      most_active_language: this.getTopLanguages(repositories)[0] || 'unknown',
    };
  }

  private calculateAccountAge(createdAt: string): number {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24 * 365)); // years
  }

  private generateRecommendations(skillAnalysis: any, activityMetrics: any): string[] {
    const recommendations = [];

    if (activityMetrics.activity_score < 30) {
      recommendations.push('Consider contributing to more open source projects to increase activity');
    }

    if (skillAnalysis.primary_languages.length < 3) {
      recommendations.push('Explore additional programming languages to broaden your skill set');
    }

    if (skillAnalysis.project_metrics.average_stars_per_repo < 5) {
      recommendations.push('Focus on creating higher-quality projects that attract community interest');
    }

    const expertLanguages = skillAnalysis.primary_languages.filter((skill: any) => skill.level === 'expert');
    if (expertLanguages.length === 0) {
      recommendations.push('Deepen expertise in your primary programming languages');
    }

    return recommendations;
  }
}
