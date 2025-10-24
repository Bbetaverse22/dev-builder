import { buildFrameworkSkillPlan } from '@/lib/analysis/framework-skill-plan';
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { GitHubMCPClient, type GitHubSkillAssessment } from '@/lib/mcp/github';

export interface SkillCategory {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Skill {
  id: string;
  name: string;
  currentLevel: number; // 1-5 scale
  targetLevel: number; // 1-5 scale
  importance: number; // 1-5 scale
  category: string;
}

export interface SkillGuidance {
  currentState: string;
  careerImpact: string;
  marketContext: string;
  recommendedSteps: string[];
  highlightedFrameworks?: string[];
}

export type SkillGapConfidence = 'low' | 'medium' | 'high';

export interface SkillGap {
  skill: Skill;
  gap: number; // targetLevel - currentLevel
  priority: number; // calculated based on gap and importance
  recommendations: string[];
  guidance: SkillGuidance;
  confidence: SkillGapConfidence;
  aiInsights?: {
    readmeQuality?: number;
    codeQuality?: number;
    architecturePatterns?: string[];
    bestPractices?: string[];
  };
}

export interface GitHubRepoMetadata {
  starCount: number;
  forkCount: number;
  watcherCount: number;
  repoSizeKb: number;
  lastPushedAt?: string | null;
  lastPushedAtDays?: number | null;
  rootFileCount: number;
  defaultBranch?: string | null;
  openIssuesCount: number;
  license?: string | null;
  activityScore: number;
}

export interface QualityMetrics {
  readmeQuality: {
    score: number; // 0-100
    confidence: number; // 0-100
    insights: string[];
    improvements: string[];
  };
  codeQuality: {
    score: number; // 0-100
    confidence: number; // 0-100
    insights: string[];
    improvements: string[];
  };
  overallQuality: {
    score: number; // 0-100
    confidence: number; // 0-100
    strengths: string[];
    weaknesses: string[];
  };
}

export interface AIAnalysisInsights {
  problemSolvingApproach: string[];
  frameworks: string[];
  patterns: string[];
  bestPractices: string[];
  antiPatterns: string[];
  recommendations: string[];
}

export interface GitHubAnalysis {
  repository: string;
  technologies: string[];
  frameworks: string[];
  languages: string[];
  tools: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  recommendations: string[];
  metadata?: GitHubRepoMetadata;
  specialties?: string[];
  qualityMetrics?: QualityMetrics;
  aiInsights?: AIAnalysisInsights;
  mcpSkillAssessment?: GitHubSkillAssessment | null;
}

export interface GapAnalysisResult {
  overallScore: number;
  skillGaps: SkillGap[];
  categories: SkillCategory[];
  recommendations: string[];
  learningPath: string[];
  githubAnalysis?: GitHubAnalysis;
  chatAnalysis?: any;
  analysisType?: 'github' | 'ai-chat';
  externalAssessments?: Record<string, unknown>;
}

export interface ResearchContext {
  targetRole?: string;
  targetIndustry?: string;
  professionalGoals?: string;
}

// Agentic analysis interfaces
export interface AgenticCodeAnalysis {
  overallQuality: number; // 0-100
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  architecturePatterns: string[];
  codeSmells: CodeSmell[];
  bestPractices: BestPractice[];
  recommendations: string[];
  confidence: number; // 0-1
}

export interface CodeSmell {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  location?: string;
  suggestion: string;
}

export interface BestPractice {
  name: string;
  implemented: boolean;
  importance: 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface ReadmeAnalysis {
  qualityScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  hasInstallation: boolean;
  hasUsageExamples: boolean;
  hasDocumentation: boolean;
  clarity: number; // 0-100
  completeness: number; // 0-100
}

export interface AgenticSkillAssessment {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  detectedSkills: DetectedSkill[];
  confidenceScore: number;
  reasoning: string;
  improvementAreas: string[];
}

export interface DetectedSkill {
  name: string;
  category: string;
  currentLevel: number; // 1-5
  evidence: string[];
  confidence: number; // 0-1
}

export class GapAnalyzerAgent {
  private githubMCPClient: GitHubMCPClient | null = null;
  private githubRepoContext: { owner: string; repo: string; defaultBranch?: string } | null = null;
  private githubMcpAvailableTools: Set<string> | null = null;

  private clampSkillLevel(level: number): number {
    if (Number.isNaN(level)) {
      return 1;
    }
    return Math.min(5, Math.max(1, Math.round(level * 10) / 10));
  }

  private shouldUseGitHubMCP(): boolean {
    return Boolean(process.env.GITHUB_MCP_SERVER_URL);
  }

  private async ensureGitHubMCPClient(): Promise<GitHubMCPClient | null> {
    if (!this.shouldUseGitHubMCP()) {
      return null;
    }

    if (this.githubMCPClient) {
      return this.githubMCPClient;
    }

    try {
      console.log('[GapAnalyzer] 🔌 Attempting to connect to GitHub MCP server...');
      console.log('[GapAnalyzer] MCP Server URL:', process.env.GITHUB_MCP_SERVER_URL || 'NOT SET');
      console.log('[GapAnalyzer] MCP Bearer Token:', process.env.GITHUB_MCP_BEARER ? 'SET' : 'NOT SET');
      
      const client = new GitHubMCPClient();
      await client.connect();
      this.githubMCPClient = client;
      await this.loadGitHubMcpTools(client);
      console.log('[GapAnalyzer] ✅ GitHub MCP client connected successfully');
      return this.githubMCPClient;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error && error.cause ? ` | Cause: ${error.cause}` : '';
      console.warn(`[GapAnalyzer] ⚠️ Failed to connect to GitHub MCP server${errorDetails}`);
      console.warn(`[GapAnalyzer] Error: ${errorMessage}`);
      console.log('[GapAnalyzer] 🔄 Using GitHub REST API fallback');
      this.githubMCPClient = null;
      return null;
    }
  }

  private setGitHubRepoContext(context: { owner: string; repo: string; defaultBranch?: string } | null) {
    this.githubRepoContext = context;
  }

  private async loadGitHubMcpTools(client: GitHubMCPClient): Promise<Set<string> | null> {
    try {
      const tools = await client.listTools();
      if (Array.isArray(tools)) {
        this.githubMcpAvailableTools = new Set(
          tools
            .map((tool: any) => (typeof tool === 'string' ? tool : tool?.name))
            .filter((name): name is string => Boolean(name))
        );
      } else {
        this.githubMcpAvailableTools = null;
      }
    } catch (error) {
      console.warn('[GapAnalyzer] ⚠️ Unable to list GitHub MCP tools:', error);
      this.githubMcpAvailableTools = null;
    }
    return this.githubMcpAvailableTools;
  }

  private async ensureMcpToolsLoaded(): Promise<Set<string> | null> {
    if (!this.githubMCPClient) {
      return null;
    }
    if (this.githubMcpAvailableTools) {
      return this.githubMcpAvailableTools;
    }
    return await this.loadGitHubMcpTools(this.githubMCPClient);
  }

  private async fetchGitHubSkillAssessment(owner: string, repo: string): Promise<GitHubSkillAssessment | null> {
    if (!this.githubMCPClient) {
      console.log('[GapAnalyzer] GitHub MCP client not available, skipping skill assessment');
      return null;
    }

    try {
      const defaultBranch = this.githubRepoContext?.defaultBranch;
      console.log(`[GapAnalyzer] Fetching MCP skill assessment for ${owner}/${repo}...`);
      const assessment = await this.githubMCPClient.getSkillAssessment(owner, repo, defaultBranch ? { ref: defaultBranch } : undefined);
      console.log(`[GapAnalyzer] ✅ MCP skill assessment received:`, assessment.summary);
      return assessment;
    } catch (error) {
      console.warn(`[GapAnalyzer] ⚠️ GitHub MCP skill assessment failed for ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Get realistic target level based on skill type and GitHub analysis
   */
  private getRealisticTargetLevel(skill: Skill, githubAnalysis?: GitHubAnalysis): number {
    // Base target levels by skill category
    const baseTargets: { [key: string]: number } = {
      'programming': 4,      // Most developers should aim for 4/5
      'frameworks': 4,       // Framework mastery is achievable
      'databases': 3,        // Database skills vary by role
      'cloud': 3,           // Cloud skills depend on role
      'devops': 3,          // DevOps is specialized
      'testing': 4,         // Testing is crucial
      'prompt-engineering': 3, // Newer skill, 3 is good
      'context-engineering': 3, // Newer skill, 3 is good
      'leadership': 3,       // Leadership varies by role
      'problem-solving': 4,  // Core skill
      'teamwork': 4,         // Important for collaboration
      'time-management': 4,  // Important for productivity
      'industry': 3,         // Industry knowledge varies
      'business': 3,         // Business acumen varies
      'architecture': 4,     // Architecture is important
      'security': 3,         // Security is specialized
    };

    let targetLevel = baseTargets[skill.id] || 3;

    // Adjust based on GitHub analysis
    if (githubAnalysis) {
      const skillLevel = githubAnalysis.skillLevel;
      if (skillLevel === 'beginner') {
        targetLevel = Math.min(targetLevel + 1, 5); // Aim higher if beginner
      } else if (skillLevel === 'advanced') {
        targetLevel = Math.max(targetLevel - 0.5, 2); // Already advanced, lower target
      }
    }

    return this.clampSkillLevel(targetLevel);
  }

  /**
   * Get default skills with realistic current levels based on GitHub analysis
   */
  private getDefaultSkillsWithRealisticLevels(githubAnalysis: GitHubAnalysis): Skill[] {
    const skills: Skill[] = [];
    const baseLevel = this.getBaseLevelFromSkillLevel(githubAnalysis.skillLevel);
    
    // Technical skills
    skills.push({
      id: 'programming',
      name: 'Programming Languages',
      currentLevel: this.clampSkillLevel(baseLevel + 0.5), // Slightly higher than base
      targetLevel: 4,
      importance: 5,
      category: 'technical'
    });

    skills.push({
      id: 'frameworks',
      name: 'Frameworks & Libraries',
      currentLevel: this.clampSkillLevel(baseLevel),
      targetLevel: 4,
      importance: 5,
      category: 'technical'
    });

    skills.push({
      id: 'version-control',
      name: 'Version Control (Git)',
      currentLevel: this.clampSkillLevel(baseLevel + 0.3), // Most developers know Git
      targetLevel: 4,
      importance: 5,
      category: 'technical'
    });

    skills.push({
      id: 'testing',
      name: 'Testing & QA',
      currentLevel: this.clampSkillLevel(baseLevel - 0.5), // Often underdeveloped
      targetLevel: 4,
      importance: 4,
      category: 'technical'
    });

    skills.push({
      id: 'debugging',
      name: 'Debugging & Troubleshooting',
      currentLevel: this.clampSkillLevel(baseLevel + 0.2),
      targetLevel: 4,
      importance: 4,
      category: 'technical'
    });

    skills.push({
      id: 'databases',
      name: 'Database Management',
      currentLevel: this.clampSkillLevel(baseLevel - 0.3),
      targetLevel: 3,
      importance: 4,
      category: 'technical'
    });

    skills.push({
      id: 'cloud',
      name: 'Cloud Platforms',
      currentLevel: this.clampSkillLevel(baseLevel - 0.7), // Often a gap
      targetLevel: 3,
      importance: 4,
      category: 'technical'
    });

    skills.push({
      id: 'devops',
      name: 'DevOps & CI/CD',
      currentLevel: this.clampSkillLevel(baseLevel - 0.8), // Common gap
      targetLevel: 3,
      importance: 3,
      category: 'technical'
    });

    skills.push({
      id: 'api-design',
      name: 'API Design & Development',
      currentLevel: this.clampSkillLevel(baseLevel - 0.2),
      targetLevel: 3,
      importance: 4,
      category: 'technical'
    });

    skills.push({
      id: 'performance',
      name: 'Performance Optimization',
      currentLevel: this.clampSkillLevel(baseLevel - 0.6),
      targetLevel: 3,
      importance: 3,
      category: 'technical'
    });

    // Calculate documentation level from README quality if available
    let documentationLevel = this.clampSkillLevel(baseLevel - 0.4);
    if ((githubAnalysis as any).readmeAnalysis?.qualityScore) {
      const readmeScore = (githubAnalysis as any).readmeAnalysis.qualityScore;
      // Convert 0-100 score to 1-5 scale
      documentationLevel = Math.max(1, Math.min(5, Math.round((readmeScore / 100) * 5)));
    }
    
    skills.push({
      id: 'documentation',
      name: 'Technical Documentation',
      currentLevel: documentationLevel,
      targetLevel: 4, // Higher target since docs are important
      importance: 4, // Higher importance for professional projects
      category: 'technical'
    });

    // Soft skills (generally lower than technical)
    skills.push({
      id: 'problem-solving',
      name: 'Problem Solving',
      currentLevel: this.clampSkillLevel(baseLevel + 0.1),
      targetLevel: 4,
      importance: 5,
      category: 'soft'
    });

    skills.push({
      id: 'teamwork',
      name: 'Teamwork',
      currentLevel: this.clampSkillLevel(baseLevel - 0.1),
      targetLevel: 4,
      importance: 4,
      category: 'soft'
    });

    skills.push({
      id: 'time-management',
      name: 'Time Management',
      currentLevel: this.clampSkillLevel(baseLevel - 0.3),
      targetLevel: 4,
      importance: 4,
      category: 'soft'
    });

    // Domain knowledge
    skills.push({
      id: 'architecture',
      name: 'System Architecture',
      currentLevel: this.clampSkillLevel(baseLevel - 0.5),
      targetLevel: 4,
      importance: 4,
      category: 'domain'
    });

    skills.push({
      id: 'security',
      name: 'Security Best Practices',
      currentLevel: this.clampSkillLevel(baseLevel - 0.7),
      targetLevel: 3,
      importance: 4,
      category: 'domain'
    });

    skills.push({
      id: 'data-structures',
      name: 'Data Structures & Algorithms',
      currentLevel: this.clampSkillLevel(baseLevel - 0.4),
      targetLevel: 3,
      importance: 4,
      category: 'domain'
    });

    return skills;
  }

  /**
   * Generate common skill gaps that are often overlooked
   */
  private generateCommonSkillGaps(githubAnalysis?: GitHubAnalysis): SkillGap[] {
    const commonGaps: SkillGap[] = [];
    const baseLevel = githubAnalysis ? this.getBaseLevelFromSkillLevel(githubAnalysis.skillLevel) : 2;
    const isAdvancedRepo = githubAnalysis?.skillLevel === 'advanced';
    const metadata = githubAnalysis?.metadata;
    const highActivityRepo = metadata ? metadata.activityScore >= 7 : false;
    const recencyLowConfidence = metadata?.lastPushedAtDays != null && metadata.lastPushedAtDays > 180;
    const tinyRepo = metadata?.repoSizeKb != null && metadata.repoSizeKb < 200;

    // Common gaps that most developers have
    const commonSkills = [
      {
        id: 'testing',
        name: 'Testing & QA',
        currentLevel: Math.max(1, baseLevel - 0.8),
        targetLevel: 4,
        importance: 4,
        category: 'technical'
      },
      {
        id: 'cloud',
        name: 'Cloud Platforms',
        currentLevel: Math.max(1, baseLevel - 1.0),
        targetLevel: 3,
        importance: 4,
        category: 'technical'
      },
      {
        id: 'devops',
        name: 'DevOps & CI/CD',
        currentLevel: Math.max(1, baseLevel - 1.2),
        targetLevel: 3,
        importance: 3,
        category: 'technical'
      },
      {
        id: 'security',
        name: 'Security Best Practices',
        currentLevel: Math.max(1, baseLevel - 1.0),
        targetLevel: 3,
        importance: 4,
        category: 'domain'
      },
      {
        id: 'performance',
        name: 'Performance Optimization',
        currentLevel: Math.max(1, baseLevel - 0.8),
        targetLevel: 3,
        importance: 3,
        category: 'technical'
      },
      {
        id: 'documentation',
        name: 'Technical Documentation',
        currentLevel: Math.max(1, baseLevel - 0.6),
        targetLevel: 3,
        importance: 3,
        category: 'technical'
      },
      {
        id: 'code-review',
        name: 'Code Review Practices',
        currentLevel: Math.max(1, baseLevel - 0.4),
        targetLevel: 3,
        importance: 3,
        category: 'technical'
      },
      {
        id: 'architecture',
        name: 'System Architecture',
        currentLevel: Math.max(1, baseLevel - 0.7),
        targetLevel: 4,
        importance: 4,
        category: 'domain'
      },
      {
        id: 'data-structures',
        name: 'Data Structures & Algorithms',
        currentLevel: Math.max(1, baseLevel - 0.6),
        targetLevel: 3,
        importance: 4,
        category: 'domain'
      }
    ];

    commonSkills.forEach(skill => {
      const gap = Math.max(0, skill.targetLevel - skill.currentLevel);
      if (gap < 0.5) {
        return;
      }

      if ((isAdvancedRepo && skill.currentLevel >= skill.targetLevel - 0.3) || highActivityRepo) {
        return;
      }

      const guidance = this.getSkillGuidance(skill, gap, { githubAnalysis });
      commonGaps.push({
        skill,
        gap,
        priority: gap * skill.importance,
        recommendations: guidance.recommendedSteps,
        guidance,
        confidence: recencyLowConfidence || tinyRepo
          ? 'low'
          : this.estimateSkillGapConfidence(skill, gap, githubAnalysis),
      });
    });

    return commonGaps.slice(0, 5); // Limit to top 5 common gaps
  }

  private skillCategories: SkillCategory[] = [
    {
      id: 'technical',
      name: 'Technical Skills',
      skills: [
        { id: 'programming', name: 'Programming Languages', currentLevel: 1, targetLevel: 4, importance: 5, category: 'technical' },
        { id: 'frameworks', name: 'Frameworks & Libraries', currentLevel: 1, targetLevel: 4, importance: 5, category: 'technical' },
        { id: 'databases', name: 'Database Management', currentLevel: 1, targetLevel: 3, importance: 4, category: 'technical' },
        { id: 'cloud', name: 'Cloud Platforms', currentLevel: 1, targetLevel: 3, importance: 4, category: 'technical' },
        { id: 'devops', name: 'DevOps & CI/CD', currentLevel: 1, targetLevel: 3, importance: 3, category: 'technical' },
        { id: 'testing', name: 'Testing & QA', currentLevel: 1, targetLevel: 4, importance: 4, category: 'technical' },
        { id: 'prompt-engineering', name: 'Prompt Engineering', currentLevel: 1, targetLevel: 3, importance: 4, category: 'technical' },
        { id: 'context-engineering', name: 'Context & Retrieval Practices', currentLevel: 1, targetLevel: 3, importance: 3, category: 'technical' },
        { id: 'version-control', name: 'Version Control (Git)', currentLevel: 1, targetLevel: 4, importance: 5, category: 'technical' },
        { id: 'api-design', name: 'API Design & Development', currentLevel: 1, targetLevel: 3, importance: 4, category: 'technical' },
        { id: 'performance', name: 'Performance Optimization', currentLevel: 1, targetLevel: 3, importance: 3, category: 'technical' },
        { id: 'debugging', name: 'Debugging & Troubleshooting', currentLevel: 1, targetLevel: 4, importance: 4, category: 'technical' },
        { id: 'code-review', name: 'Code Review Practices', currentLevel: 1, targetLevel: 3, importance: 3, category: 'technical' },
        { id: 'documentation', name: 'Technical Documentation', currentLevel: 1, targetLevel: 3, importance: 3, category: 'technical' },
      ]
    },
    {
      id: 'soft',
      name: 'Soft Skills',
      skills: [
        { id: 'leadership', name: 'Leadership', currentLevel: 1, targetLevel: 3, importance: 4, category: 'soft' },
        { id: 'problem-solving', name: 'Problem Solving', currentLevel: 1, targetLevel: 4, importance: 5, category: 'soft' },
        { id: 'teamwork', name: 'Teamwork', currentLevel: 1, targetLevel: 4, importance: 4, category: 'soft' },
        { id: 'time-management', name: 'Time Management', currentLevel: 1, targetLevel: 4, importance: 4, category: 'soft' },
        { id: 'mentoring', name: 'Mentoring & Teaching', currentLevel: 1, targetLevel: 3, importance: 3, category: 'soft' },
        { id: 'adaptability', name: 'Adaptability', currentLevel: 1, targetLevel: 4, importance: 4, category: 'soft' },
        { id: 'critical-thinking', name: 'Critical Thinking', currentLevel: 1, targetLevel: 4, importance: 4, category: 'soft' },
      ]
    },
    {
      id: 'domain',
      name: 'Domain Knowledge',
      skills: [
        { id: 'industry', name: 'Industry Knowledge', currentLevel: 1, targetLevel: 3, importance: 4, category: 'domain' },
        { id: 'business', name: 'Business Acumen', currentLevel: 1, targetLevel: 3, importance: 3, category: 'domain' },
        { id: 'architecture', name: 'System Architecture', currentLevel: 1, targetLevel: 4, importance: 4, category: 'domain' },
        { id: 'security', name: 'Security Best Practices', currentLevel: 1, targetLevel: 3, importance: 4, category: 'domain' },
        { id: 'scalability', name: 'Scalability & Performance', currentLevel: 1, targetLevel: 3, importance: 3, category: 'domain' },
        { id: 'data-structures', name: 'Data Structures & Algorithms', currentLevel: 1, targetLevel: 3, importance: 4, category: 'domain' },
        { id: 'design-patterns', name: 'Design Patterns', currentLevel: 1, targetLevel: 3, importance: 3, category: 'domain' },
        { id: 'project-management', name: 'Project Management', currentLevel: 1, targetLevel: 3, importance: 3, category: 'domain' },
      ]
    }
  ];

  /**
   * Analyze skill gaps based on current and target skill levels
   */
  analyzeSkillGaps(
    skills: Skill[],
    options: { includeCategories?: string[]; githubAnalysis?: GitHubAnalysis; minGapThreshold?: number } = {}
  ): GapAnalysisResult {
    const includeSet = options.includeCategories?.length
      ? new Set(options.includeCategories)
      : null;
    const minGapThreshold = options.minGapThreshold ?? 0.1; // Show gaps >= 0.1

    const skillsToProcess = (() => {
      if (!includeSet) return skills;
      const filtered = skills.filter((skill) => includeSet.has(skill.category));
      return filtered.length > 0 ? filtered : skills;
    })();

    const aggregated = new Map<string, SkillGap>();

    skillsToProcess.forEach((skill) => {
      const normalizedSkill: Skill = {
        ...skill,
        currentLevel: this.clampSkillLevel(skill.currentLevel),
        targetLevel: this.clampSkillLevel(skill.targetLevel ?? this.getRealisticTargetLevel(skill, options.githubAnalysis)),
      };

      const gap = Math.max(0, normalizedSkill.targetLevel - normalizedSkill.currentLevel);
      
      // Skip skills with gaps below threshold
      if (gap < minGapThreshold) {
        return;
      }
      
      const guidance = this.getSkillGuidance(normalizedSkill, gap, {
        githubAnalysis: options.githubAnalysis,
      });
      const recommendations = guidance.recommendedSteps;

      const existing = aggregated.get(normalizedSkill.id);

      if (existing) {
        const mergedSkill: Skill = {
          ...existing.skill,
          currentLevel: this.clampSkillLevel(
            Math.min(existing.skill.currentLevel, normalizedSkill.currentLevel)
          ),
          targetLevel: this.clampSkillLevel(
            Math.max(existing.skill.targetLevel, normalizedSkill.targetLevel)
          ),
        };

        const mergedGap = Math.max(0, mergedSkill.targetLevel - mergedSkill.currentLevel);
        const mergedPriority = mergedGap * mergedSkill.importance;
        const mergedGuidance = this.mergeGuidance(existing.guidance, guidance);

        aggregated.set(normalizedSkill.id, {
          skill: mergedSkill,
          gap: mergedGap,
          priority: mergedPriority,
          recommendations: mergedGuidance.recommendedSteps,
          guidance: mergedGuidance,
          confidence: this.estimateSkillGapConfidence(mergedSkill, mergedGap, options.githubAnalysis),
          aiInsights: this.getQualityInsightsForSkill(mergedSkill, options.githubAnalysis),
        });
      } else {
        aggregated.set(normalizedSkill.id, {
          skill: normalizedSkill,
          gap,
          priority: gap * normalizedSkill.importance,
          recommendations,
          guidance,
          confidence: this.estimateSkillGapConfidence(normalizedSkill, gap, options.githubAnalysis),
          aiInsights: this.getQualityInsightsForSkill(normalizedSkill, options.githubAnalysis),
        });
      }
    });

    const skillGaps = Array.from(aggregated.values());
    
    // Filter out very small gaps and add more comprehensive analysis
    const meaningfulGaps = skillGaps.filter(gap => gap.gap >= minGapThreshold);
    
    // If we have very few gaps, lower the threshold and try again
    if (meaningfulGaps.length < 3 && minGapThreshold > 0.05) {
      return this.analyzeSkillGaps(skills, { ...options, minGapThreshold: 0.05 });
    }
    
    // If still too few gaps, add some common gaps that are often overlooked
    if (meaningfulGaps.length < 3) {
      const additionalGaps = this.generateCommonSkillGaps(options.githubAnalysis);
      additionalGaps.forEach(gap => {
        if (!aggregated.has(gap.skill.id)) {
          aggregated.set(gap.skill.id, gap);
        }
      });
    }
    
    const finalSkillGaps = Array.from(aggregated.values())
      .filter(gap => gap.gap >= 0.05)
      .map(gap => ({
        ...gap,
        confidence: this.estimateSkillGapConfidence(gap.skill, gap.gap, options.githubAnalysis),
      }));
    
    let totalAchieved = 0;
    let totalTarget = 0;

    finalSkillGaps.forEach((gap) => {
      totalAchieved += gap.skill.currentLevel * gap.skill.importance;
      totalTarget += gap.skill.targetLevel * gap.skill.importance;
    });

    const overallScore = totalTarget > 0
      ? Math.round(
          Math.min(1, Math.max(0, totalAchieved / totalTarget)) * 100
        )
      : 100;

    // Sort gaps by priority
    finalSkillGaps.sort((a, b) => b.priority - a.priority);

    // Generate general recommendations
    const recommendations = this.generateGeneralRecommendations(finalSkillGaps);
    const learningPath = this.generateLearningPath(finalSkillGaps);

    const categoryList = includeSet
      ? this.skillCategories
          .filter((category) => includeSet.has(category.id))
          .map((category) => ({
            ...category,
            skills: category.skills.filter((skill) => includeSet.has(skill.category)),
          }))
      : this.skillCategories;

    const uniqueSkillGaps = finalSkillGaps.reduce<SkillGap[]>((acc, gap) => {
      if (!acc.some((existing) => existing.skill.id === gap.skill.id)) {
        acc.push(gap);
      }
      return acc;
    }, []);

    return {
      overallScore,
      skillGaps: uniqueSkillGaps,
      categories: categoryList,
      recommendations,
      learningPath
    };
  }

  /**
   * Analyze GitHub repository for skills and technologies
   */
  async analyzeGitHubRepository(repoUrl: string): Promise<GitHubAnalysis> {
    let usingMCP = false;
    let mcpSkillAssessment: GitHubSkillAssessment | null = null;
    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present

      console.log(`[GapAnalyzer] Analyzing repository: ${owner}/${cleanRepo}`);

      // Fetch repository data (prefer MCP when available)
      let repoData: any;
      let languagesData: any;
      let contentsData: any;

      const mcpClient = await this.ensureGitHubMCPClient();

      if (mcpClient) {
        try {
          repoData = await mcpClient.getRepository(owner, cleanRepo);
          languagesData = await mcpClient.getRepositoryLanguages(owner, cleanRepo);
          contentsData = await mcpClient.listRepositoryContents(owner, cleanRepo);
          usingMCP = true;
          this.setGitHubRepoContext({
            owner,
            repo: cleanRepo,
            defaultBranch: repoData?.default_branch ?? 'main',
          });
          console.log('[GapAnalyzer] Repository data fetched via GitHub MCP');
        } catch (mcpError) {
          console.warn('[GapAnalyzer] MCP data fetch failed, falling back to REST API:', mcpError);
          usingMCP = false;
          this.setGitHubRepoContext(null);
        }
      }

      if (!repoData || !languagesData || !contentsData) {
        try {
          [repoData, languagesData, contentsData] = await Promise.all([
            this.fetchGitHubData(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
              resourceLabel: `${owner}/${cleanRepo}`,
            }),
            this.fetchGitHubData(`https://api.github.com/repos/${owner}/${cleanRepo}/languages`, {
              resourceLabel: `${owner}/${cleanRepo} languages`,
            }),
            this.fetchGitHubData(`https://api.github.com/repos/${owner}/${cleanRepo}/contents`, {
              resourceLabel: `${owner}/${cleanRepo} contents`,
            })
          ]);
          console.log('[GapAnalyzer] Repository data fetched via GitHub REST API');
          this.setGitHubRepoContext({
            owner,
            repo: cleanRepo,
            defaultBranch: repoData?.default_branch ?? 'main',
          });
        } catch (apiError) {
          console.error('[GapAnalyzer] GitHub API error:', apiError);
          throw apiError;
        }
      }

      console.log(`[GapAnalyzer] Repository data fetched successfully`);

      mcpSkillAssessment = await this.fetchGitHubSkillAssessment(owner, cleanRepo);

      // Extract technologies and frameworks
      const technologies = this.extractTechnologies(repoData, languagesData, contentsData);
      const frameworks = this.extractFrameworks(contentsData, languagesData);
      const languages = Object.keys(languagesData).sort((a, b) => languagesData[b] - languagesData[a]);
      const tools = this.extractTools(contentsData);

      console.log(`[GapAnalyzer] Extracted - Languages: ${languages.join(', ')}, Frameworks: ${frameworks.join(', ')}`);

      // Determine skill level based on repository complexity
      const skillLevel = this.determineSkillLevel(repoData, languagesData, contentsData);

      // Generate recommendations based on actual technologies found
      const recommendations = this.generateTechnologyRecommendations(languages, frameworks, technologies);

      console.log(`[GapAnalyzer] Analysis complete - Skill level: ${skillLevel}`);

      const metadata = this.buildRepoMetadata(repoData, contentsData);

      // Analyze quality metrics
      const qualityMetrics = await this.analyzeQualityMetrics(repoData, contentsData);
      
      // Generate AI insights
      const aiInsights = await this.generateAIAnalysisInsights(repoData, contentsData, technologies, frameworks);

      return {
        repository: repoUrl,
        technologies,
        frameworks,
        languages,
        tools,
        skillLevel,
        recommendations,
        metadata,
        qualityMetrics,
        aiInsights,
        mcpSkillAssessment,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GapAnalyzer] GitHub analysis error:', errorMessage);

      let guidance = '';
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('resource not found')) {
          guidance =
            'Ensure the repository URL is correct. For private repositories, provide a personal access token with the "repo" scope via the GITHUB_TOKEN environment variable.';
        } else if (message.includes('unauthorized')) {
          guidance =
            'Check that your GITHUB_TOKEN environment variable is set and includes the "repo" scope for private repositories.';
        } else if (message.includes('rate limit')) {
          guidance =
            'GitHub rate limits were exceeded. Add a personal access token to GITHUB_TOKEN or wait before retrying.';
        }
      }

      const detailedMessage = guidance
        ? `Failed to analyze repository: ${errorMessage} ${guidance}`
        : `Failed to analyze repository: ${errorMessage}`;

      throw new Error(detailedMessage);
    } finally {
      this.setGitHubRepoContext(null);
    }
  }

  /**
   * Automatically generate skill assessment from GitHub analysis
   */
  async generateAutomaticSkillAssessment(
    githubAnalysis: GitHubAnalysis,
    options: { includeCategories?: string[] } = {}
  ): Promise<GapAnalysisResult> {
    // Create skills based on discovered technologies
    const skills = this.createSkillsFromTechnologies(githubAnalysis);
    
    // Analyze skill gaps automatically
    const analysisResult = this.analyzeSkillGaps(skills, {
      ...options,
      githubAnalysis,
    });
    
    // Enhance recommendations with GitHub-specific insights
    analysisResult.recommendations = [
      ...analysisResult.recommendations,
      ...this.generateGitHubSpecificRecommendations(githubAnalysis)
    ];

    // Include the GitHub analysis in the result for storage
    analysisResult.githubAnalysis = githubAnalysis;
    analysisResult.externalAssessments = analysisResult.externalAssessments ?? {};

    if (githubAnalysis.mcpSkillAssessment) {
      this.integrateExternalSkillAssessment(analysisResult, githubAnalysis.mcpSkillAssessment);
    }

    return analysisResult;
  }

  /**
   * Create skill objects from discovered technologies
   */
  private createSkillsFromTechnologies(githubAnalysis: GitHubAnalysis): Skill[] {
    const skills: Skill[] = [];
    
    // First, add all default skills with realistic current levels
    const defaultSkills = this.getDefaultSkillsWithRealisticLevels(githubAnalysis);
    skills.push(...defaultSkills);
    
    // Map technologies to skill categories and levels
    const technologySkillMap = this.getTechnologySkillMap();
    
    // Process languages
    githubAnalysis.languages.forEach(language => {
      const skillInfo = technologySkillMap[language.toLowerCase()];
      if (skillInfo) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferSkillLevel(githubAnalysis, language),
          targetLevel: this.getTargetLevelForTechnology(language),
          importance: skillInfo.importance,
          category: skillInfo.category
        });
      }
    });

    // Process frameworks
    githubAnalysis.frameworks.forEach(framework => {
      const skillInfo = technologySkillMap[framework.toLowerCase()];
      if (skillInfo) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferSkillLevel(githubAnalysis, framework),
          targetLevel: this.getTargetLevelForTechnology(framework),
          importance: skillInfo.importance,
          category: skillInfo.category
        });
      }
    });

    githubAnalysis.technologies.forEach((tech) => {
      const skillInfo = technologySkillMap[tech.toLowerCase()];
      if (skillInfo && !skills.some((existing) => existing.id === skillInfo.id)) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferSkillLevel(githubAnalysis, tech),
          targetLevel: this.getTargetLevelForTechnology(tech),
          importance: skillInfo.importance,
          category: skillInfo.category,
        });
      }
    });

    githubAnalysis.tools.forEach(tool => {
      const skillInfo = technologySkillMap[tool.toLowerCase()];
      if (skillInfo) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferToolingSkillLevel(githubAnalysis, tool),
          targetLevel: this.getTargetLevelForTechnology(tool),
          importance: skillInfo.importance,
          category: skillInfo.category,
        });
      }
    });

    // Add general technical skills based on repository complexity
    skills.push({
      id: 'frameworks',
      name: 'Frameworks & Libraries',
      currentLevel: this.inferFrameworkLevel(githubAnalysis),
      targetLevel: 5,
      importance: 5,
      category: 'technical'
    });

    const specialties: string[] = [];
    const mlSpecialtyIds = ['ml-python', 'ml-pytorch', 'ml-tensorflow', 'ml-scikit', 'ml-nlp'];
    if (skills.some((skill) => mlSpecialtyIds.includes(skill.id)) && !skills.some((skill) => skill.id === 'ai-ml-specialization')) {
      specialties.push('ai-ml-specialization');
      skills.push({
        id: 'ai-ml-specialization',
        name: 'AI & Machine Learning',
        currentLevel: this.inferSpecialtyLevel(skills, mlSpecialtyIds),
        targetLevel: 5,
        importance: 5,
        category: 'technical',
      });
    }

    const dataSpecialtyIds = ['data-spark', 'data-hadoop', 'data-kafka', 'data-airflow', 'data-snowflake', 'data-databricks'];
    if (skills.some((skill) => dataSpecialtyIds.includes(skill.id)) && !skills.some((skill) => skill.id === 'data-engineering-specialization')) {
      specialties.push('data-engineering-specialization');
      skills.push({
        id: 'data-engineering-specialization',
        name: 'Data Engineering & Pipelines',
        currentLevel: this.inferSpecialtyLevel(skills, dataSpecialtyIds),
        targetLevel: 5,
        importance: 5,
        category: 'technical',
      });
    }

    if (specialties.length > 0) {
      githubAnalysis.specialties = [...new Set([...(githubAnalysis.specialties ?? []), ...specialties])];
    }

    return skills;
  }

  /**
   * Infer skill level based on repository analysis
   */
  private inferSkillLevel(githubAnalysis: GitHubAnalysis, technology: string): number {
    const baseLevel = this.getBaseLevelFromSkillLevel(githubAnalysis.skillLevel);
    
    // Adjust based on technology complexity and usage
    const complexityMultiplier = this.getTechnologyComplexity(technology);
    const usageMultiplier = this.getTechnologyUsage(githubAnalysis, technology);
    
    return this.clampSkillLevel(
      baseLevel * complexityMultiplier * usageMultiplier
    );
  }

  /**
   * Get base level from skill level string
   */
  private getBaseLevelFromSkillLevel(skillLevel: string): number {
    switch (skillLevel) {
      case 'beginner': return 2;
      case 'intermediate': return 3;
      case 'advanced': return 4;
      default: return 2;
    }
  }

  /**
   * Get technology complexity multiplier
   */
  private getTechnologyComplexity(technology: string): number {
    const complexityMap: { [key: string]: number } = {
      'javascript': 1.0,
      'html': 0.8,
      'css': 0.8,
      'python': 1.1,
      'java': 1.2,
      'typescript': 1.3,
      'react': 1.2,
      'vue': 1.2,
      'angular': 1.4,
      'node.js': 1.3,
      'spring': 1.4,
      'django': 1.2,
      'flask': 1.1,
      'express': 1.1,
      'mongodb': 1.1,
      'postgresql': 1.2,
      'mysql': 1.0,
      'docker': 1.2,
      'kubernetes': 1.5,
      'aws': 1.4,
      'azure': 1.4,
      'gcp': 1.4,
      'pytorch': 1.5,
      'tensorflow': 1.5,
      'scikit-learn': 1.3,
      'sklearn': 1.3,
      'pandas': 1.1,
      'numpy': 1.1,
      'huggingface': 1.3,
      'langchain': 1.2,
      'machine learning': 1.4,
      'machine-learning': 1.4,
      'deep learning': 1.5,
      'deep-learning': 1.5,
      'spark': 1.4,
      'apache spark': 1.4,
      'hadoop': 1.3,
      'kafka': 1.3,
      'airflow': 1.3,
      'databricks': 1.3,
      'snowflake': 1.3,
      'bigquery': 1.2,
      'terraform': 1.3,
      'ansible': 1.1,
      'jest': 1.0,
      'cypress': 1.1,
      'playwright': 1.2
    };
    
    return complexityMap[technology.toLowerCase()] || 1.0;
  }

  /**
   * Get technology usage multiplier based on repository
   */
  private getTechnologyUsage(githubAnalysis: GitHubAnalysis, technology: string): number {
    // If technology is in primary languages, give higher multiplier
    if (githubAnalysis.languages.includes(technology)) {
      return 1.2;
    }
    
    // If technology is in frameworks, give medium multiplier
    if (githubAnalysis.frameworks.includes(technology)) {
      return 1.1;
    }
    
    // If technology is in tools, give lower multiplier
    if (githubAnalysis.tools.includes(technology)) {
      return 1.0;
    }
    
    return 0.8;
  }

  /**
   * Get target level for technology
   */
  private getTargetLevelForTechnology(technology: string): number {
    return 5;
  }

  private buildRepoMetadata(repoData: any, contentsData: any): GitHubRepoMetadata {
    const pushedAt = repoData.pushed_at ? new Date(repoData.pushed_at) : null;
    const lastPushedAtDays = pushedAt ? Math.round((Date.now() - pushedAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const rootFileCount = Array.isArray(contentsData)
      ? contentsData.filter((item: any) => item.type === 'file').length
      : 0;

    const activityScore = this.calculateRepoActivityScore({
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      lastPushedAtDays,
      rootFileCount,
      repoSizeKb: repoData.size || 0,
    });

    return {
      starCount: repoData.stargazers_count || 0,
      forkCount: repoData.forks_count || 0,
      watcherCount: repoData.subscribers_count || 0,
      repoSizeKb: repoData.size || 0,
      lastPushedAt: repoData.pushed_at ?? null,
      lastPushedAtDays,
      rootFileCount,
      defaultBranch: repoData.default_branch ?? null,
      openIssuesCount: repoData.open_issues_count || 0,
      license: repoData.license?.spdx_id ?? repoData.license?.name ?? null,
      activityScore,
    };
  }

  private calculateRepoActivityScore(params: {
    stars: number;
    forks: number;
    lastPushedAtDays: number | null;
    rootFileCount: number;
    repoSizeKb: number;
  }): number {
    const starScore = Math.min(params.stars / 50, 10);
    const forkScore = Math.min(params.forks / 20, 10);
    const sizeScore = Math.min(params.repoSizeKb / 500, 10);
    const fileScore = Math.min(params.rootFileCount / 20, 10);
    const recencyScore = params.lastPushedAtDays != null
      ? Math.max(0, 10 - Math.min(params.lastPushedAtDays / 30, 10))
      : 5;

    const average = (starScore + forkScore + sizeScore + fileScore + recencyScore) / 5;
    return Math.round(average * 10) / 10;
  }

  private inferToolingSkillLevel(githubAnalysis: GitHubAnalysis, tool: string): number {
    const baseLevel = this.getBaseLevelFromSkillLevel(githubAnalysis.skillLevel);
    const isPrimaryTool = githubAnalysis.tools.includes(tool);
    const multiplier = isPrimaryTool ? 1.2 : 0.9;
    return this.clampSkillLevel(baseLevel * multiplier);
  }

  private estimateSkillGapConfidence(
    skill: Skill,
    gap: number,
    githubAnalysis?: GitHubAnalysis
  ): SkillGapConfidence {
    if (!githubAnalysis) {
      return gap >= 1 ? 'medium' : 'low';
    }

    let score = 45;

    if (githubAnalysis.metadata) {
      const { activityScore, lastPushedAtDays, repoSizeKb, rootFileCount } = githubAnalysis.metadata;

      if (activityScore >= 7) score += 20;
      else if (activityScore <= 3) score -= 15;

      if (typeof lastPushedAtDays === 'number') {
        if (lastPushedAtDays <= 30) score += 10;
        else if (lastPushedAtDays > 180) score -= 10;
      }

      if (repoSizeKb > 5000) score += 5;
      if (rootFileCount < 5) score -= 5;
    } else {
      score -= 10;
    }

    if (githubAnalysis.skillLevel === 'advanced') score += 5;
    if (githubAnalysis.skillLevel === 'beginner') score -= 5;

    if (gap >= 2) score += 5;
    if (skill.importance >= 4) score += 5;

    if (skill.currentLevel >= skill.targetLevel - 0.25) score -= 15;

    const normalized = Math.max(0, Math.min(100, score));

    if (normalized >= 70) return 'high';
    if (normalized >= 45) return 'medium';
    return 'low';
  }

  /**
   * Get technology to skill mapping
   */
  private getTechnologySkillMap(): { [key: string]: any } {
    return {
      'javascript': { id: 'tech-javascript', name: 'JavaScript', importance: 5, category: 'technical' },
      'typescript': { id: 'tech-typescript', name: 'TypeScript', importance: 5, category: 'technical' },
      'python': { id: 'tech-python', name: 'Python', importance: 5, category: 'technical' },
      'java': { id: 'tech-java', name: 'Java', importance: 5, category: 'technical' },
      'react': { id: 'framework-react', name: 'React', importance: 5, category: 'technical' },
      'vue': { id: 'framework-vue', name: 'Vue.js', importance: 4, category: 'technical' },
      'angular': { id: 'framework-angular', name: 'Angular', importance: 4, category: 'technical' },
      'node.js': { id: 'framework-nodejs', name: 'Node.js', importance: 5, category: 'technical' },
      'spring': { id: 'framework-spring', name: 'Spring Framework', importance: 5, category: 'technical' },
      'django': { id: 'framework-django', name: 'Django', importance: 4, category: 'technical' },
      'flask': { id: 'framework-flask', name: 'Flask', importance: 3, category: 'technical' },
      'express': { id: 'framework-express', name: 'Express.js', importance: 4, category: 'technical' },
      'mongodb': { id: 'database-mongodb', name: 'MongoDB', importance: 4, category: 'technical' },
      'postgresql': { id: 'database-postgresql', name: 'PostgreSQL', importance: 4, category: 'technical' },
      'mysql': { id: 'database-mysql', name: 'MySQL', importance: 3, category: 'technical' },
      'docker': { id: 'devops-docker', name: 'Docker', importance: 4, category: 'technical' },
      'kubernetes': { id: 'devops-kubernetes', name: 'Kubernetes', importance: 5, category: 'technical' },
      'aws': { id: 'cloud-aws', name: 'AWS', importance: 5, category: 'technical' },
      'azure': { id: 'cloud-azure', name: 'Azure', importance: 4, category: 'technical' },
      'gcp': { id: 'cloud-gcp', name: 'Google Cloud', importance: 4, category: 'technical' },
      'terraform': { id: 'devops-terraform', name: 'Terraform', importance: 4, category: 'technical' },
      'ansible': { id: 'devops-ansible', name: 'Ansible', importance: 3, category: 'technical' },
      'jest': { id: 'testing-jest', name: 'Jest', importance: 3, category: 'technical' },
      'cypress': { id: 'testing-cypress', name: 'Cypress', importance: 3, category: 'technical' },
      'playwright': { id: 'testing-playwright', name: 'Playwright', importance: 3, category: 'technical' },
      'pytorch': { id: 'ml-pytorch', name: 'PyTorch', importance: 5, category: 'technical' },
      'tensorflow': { id: 'ml-tensorflow', name: 'TensorFlow', importance: 5, category: 'technical' },
      'scikit-learn': { id: 'ml-scikit', name: 'scikit-learn', importance: 4, category: 'technical' },
      'sklearn': { id: 'ml-scikit', name: 'scikit-learn', importance: 4, category: 'technical' },
      'pandas': { id: 'ml-python', name: 'Pandas', importance: 4, category: 'technical' },
      'numpy': { id: 'ml-python', name: 'NumPy', importance: 4, category: 'technical' },
      'huggingface': { id: 'ml-nlp', name: 'Hugging Face Transformers', importance: 4, category: 'technical' },
      'transformers': { id: 'ml-nlp', name: 'Transformers', importance: 4, category: 'technical' },
      'langchain': { id: 'ml-langchain', name: 'LangChain', importance: 3, category: 'technical' },
      'machine learning': { id: 'ml-foundations', name: 'Machine Learning Foundations', importance: 5, category: 'technical' },
      'machine-learning': { id: 'ml-foundations', name: 'Machine Learning Foundations', importance: 5, category: 'technical' },
      'deep learning': { id: 'ml-nlp', name: 'Deep Learning', importance: 5, category: 'technical' },
      'deep-learning': { id: 'ml-nlp', name: 'Deep Learning', importance: 5, category: 'technical' },
      'mlops': { id: 'mlops', name: 'MLOps Practices', importance: 4, category: 'technical' },
      'spark': { id: 'data-spark', name: 'Apache Spark', importance: 5, category: 'technical' },
      'apache spark': { id: 'data-spark', name: 'Apache Spark', importance: 5, category: 'technical' },
      'hadoop': { id: 'data-hadoop', name: 'Apache Hadoop', importance: 4, category: 'technical' },
      'kafka': { id: 'data-kafka', name: 'Apache Kafka', importance: 4, category: 'technical' },
      'airflow': { id: 'data-airflow', name: 'Apache Airflow', importance: 4, category: 'technical' },
      'databricks': { id: 'data-databricks', name: 'Databricks', importance: 4, category: 'technical' },
      'snowflake': { id: 'data-snowflake', name: 'Snowflake', importance: 4, category: 'technical' },
      'bigquery': { id: 'data-bigquery', name: 'BigQuery', importance: 4, category: 'technical' }
    };
  }

  /**
   * Infer general programming level
   */
  private inferGeneralProgrammingLevel(githubAnalysis: GitHubAnalysis): number {
    const languageCount = githubAnalysis.languages.length;
    const frameworkCount = githubAnalysis.frameworks.length;
    const toolCount = githubAnalysis.tools.length;
    
    // More languages and frameworks = higher programming level
    const complexityScore = (languageCount * 0.4) + (frameworkCount * 0.3) + (toolCount * 0.3);
    
    let level = 1;
    if (complexityScore >= 8) level = 5;
    else if (complexityScore >= 5) level = 4;
    else if (complexityScore >= 2) level = 3;
    else if (complexityScore >= 1) level = 2;
    return this.clampSkillLevel(level);
  }

  /**
   * Infer framework level
   */
  private inferFrameworkLevel(githubAnalysis: GitHubAnalysis): number {
    const frameworkCount = githubAnalysis.frameworks.length;
    const hasAdvancedFrameworks = githubAnalysis.frameworks.some(f => 
      ['react', 'angular', 'vue', 'spring', 'django'].includes(f.toLowerCase())
    );
    
    let level = 1;
    if (frameworkCount >= 3 && hasAdvancedFrameworks) level = 5;
    else if (frameworkCount >= 2) level = 4;
    else if (frameworkCount >= 1) level = 3;
    else if (frameworkCount > 0) level = 2;
    return this.clampSkillLevel(level);
  }

  private inferToolingLevel(githubAnalysis: GitHubAnalysis): number {
    const toolCount = githubAnalysis.tools.length;
    const hasAdvancedTools = githubAnalysis.tools.some((tool) =>
      ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'spark', 'hadoop', 'kafka', 'airflow', 'databricks', 'snowflake', 'bigquery'].includes(tool.toLowerCase())
    );

    let level = 1;
    if (toolCount >= 4 && hasAdvancedTools) level = 5;
    else if (toolCount >= 3) level = 4;
    else if (toolCount >= 2) level = 3;
    else if (toolCount > 0) level = 2;
    return this.clampSkillLevel(level);
  }

  private inferStackBreadth(githubAnalysis: GitHubAnalysis): number {
    const languageLevel = this.inferGeneralProgrammingLevel(githubAnalysis);
    const frameworkLevel = this.inferFrameworkLevel(githubAnalysis);
    const toolingLevel = this.inferToolingLevel(githubAnalysis);

    const average = (languageLevel + frameworkLevel + toolingLevel) / 3;
    return this.clampSkillLevel(Math.round(average));
  }

  private inferSpecialtyLevel(skills: Skill[], specialtyIds: string[]): number {
    const relevant = skills.filter((skill) => specialtyIds.includes(skill.id));
    if (relevant.length === 0) {
      return 1;
    }
    const averageLevel = relevant.reduce((sum, skill) => sum + skill.currentLevel, 0) / relevant.length;
    const averageImportance = relevant.reduce((sum, skill) => sum + skill.importance, 0) / relevant.length;
    return this.clampSkillLevel(Math.round((averageLevel * 0.7) + (averageImportance * 0.3)));
  }

  /**
   * Generate GitHub-specific recommendations
   */
  private generateGitHubSpecificRecommendations(githubAnalysis: GitHubAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (githubAnalysis.skillLevel === 'beginner') {
      recommendations.push('Focus on mastering the fundamentals of your primary programming language');
      recommendations.push('Practice with smaller, simpler projects before tackling complex ones');
    } else if (githubAnalysis.skillLevel === 'intermediate') {
      recommendations.push('Explore advanced features and patterns in your current technology stack');
      recommendations.push('Consider contributing to open source projects to gain real-world experience');
    } else if (githubAnalysis.skillLevel === 'advanced') {
      recommendations.push('Share your knowledge by mentoring others or writing technical content');
      recommendations.push('Consider exploring emerging technologies and architectural patterns');
    }
    
    if (githubAnalysis.tools.includes('Docker')) {
      recommendations.push('Learn container orchestration with Kubernetes for production deployments');
    }
    
    if (githubAnalysis.frameworks.some(f => ['react', 'vue', 'angular'].includes(f.toLowerCase()))) {
      recommendations.push('Explore state management solutions and advanced frontend patterns');
    }

    return recommendations;
  }

  private integrateExternalSkillAssessment(result: GapAnalysisResult, assessment: GitHubSkillAssessment): void {
    if (!assessment) {
      return;
    }

    result.externalAssessments = {
      ...(result.externalAssessments ?? {}),
      githubMcp: assessment,
    };

    const externalSkillGaps = this.extractSkillGapsFromExternalAssessment(assessment);
    if (externalSkillGaps.length > 0) {
      externalSkillGaps.forEach((gap) => this.mergeExternalSkillGap(result, gap));
    }

    const additionalRecommendations: string[] = [];
    if (assessment.summary && typeof assessment.summary === 'string') {
      additionalRecommendations.push(assessment.summary.trim());
    }
    if (Array.isArray(assessment.recommendations)) {
      assessment.recommendations
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .forEach((rec) => additionalRecommendations.push(rec.trim()));
    }

    if (additionalRecommendations.length > 0) {
      this.appendUniqueRecommendations(result.recommendations, additionalRecommendations);
    }
  }

  private extractSkillGapsFromExternalAssessment(assessment: GitHubSkillAssessment): SkillGap[] {
    const entries: Record<string, unknown>[] = [];

    if (Array.isArray(assessment.skill_gaps)) {
      entries.push(...assessment.skill_gaps);
    }
    if (Array.isArray(assessment.skillGaps)) {
      entries.push(...assessment.skillGaps);
    }
    if (Array.isArray(assessment.skills)) {
      entries.push(...assessment.skills);
    }

    const converted: SkillGap[] = [];
    for (const entry of entries) {
      if (entry && typeof entry === 'object') {
        const gap = this.convertExternalSkillGap(entry as Record<string, unknown>);
        if (gap) {
          converted.push(gap);
        }
      }
    }

    return converted;
  }

  private convertExternalSkillGap(entry: Record<string, unknown>): SkillGap | null {
    const name = this.extractSkillName(entry);
    if (!name) {
      return null;
    }

    const currentRaw = entry.current_level ?? entry.currentLevel ?? entry.level ?? entry.proficiency ?? entry.score ?? 0;
    const targetRaw = entry.target_level ?? entry.targetLevel ?? entry.desired_level ?? entry.goal_level ?? (typeof currentRaw === 'number' ? currentRaw + 1 : currentRaw);
    const importanceRaw = entry.importance ?? entry.weight ?? 3;
    const category = typeof entry.category === 'string' && entry.category.trim().length > 0
      ? entry.category
      : 'technical';

    const currentLevel = this.normalizeExternalLevel(currentRaw);
    const targetLevel = Math.max(currentLevel, this.normalizeExternalLevel(targetRaw));
    const gapValue = Math.max(0, targetLevel - currentLevel);
    const importance = this.normalizeExternalLevel(importanceRaw, 1, 5);
    const recommendations = this.extractEntryRecommendations(entry);
    const description = this.extractEntryDescription(entry, name);
    const guidanceSteps = recommendations.length > 0 ? [...recommendations] : [`Practice ${name} to increase proficiency.`];
    const confidenceValue = typeof entry.confidence === 'number' ? entry.confidence : undefined;

    const guidance: SkillGuidance = {
      currentState: typeof entry.current_state === 'string' ? entry.current_state : `Current proficiency at ${currentLevel}/5`,
      careerImpact: typeof entry.career_impact === 'string'
        ? entry.career_impact
        : typeof entry.impact === 'string'
          ? entry.impact
          : `Improving ${name} will strengthen your portfolio and project delivery.`,
      marketContext: typeof entry.market_context === 'string' ? entry.market_context : '',
      recommendedSteps: guidanceSteps,
    };

    const slug = this.generateSkillId(name);
    const confidence: SkillGapConfidence = confidenceValue !== undefined
      ? (confidenceValue >= 0.75 ? 'high' : confidenceValue >= 0.4 ? 'medium' : 'low')
      : 'medium';

    return {
      skill: {
        id: `mcp-${slug}`,
        name,
        currentLevel,
        targetLevel,
        importance,
        category,
      },
      gap: parseFloat(gapValue.toFixed(1)),
      priority: Math.max(1, Math.round(gapValue * 10 + importance * 2)),
      recommendations: recommendations.length > 0 ? recommendations : [`Improve your ${name} skill through focused practice and projects.`],
      guidance,
      confidence,
      aiInsights: undefined,
    };
  }

  private extractSkillName(entry: Record<string, unknown>): string | null {
    const nameCandidates = [entry.name, entry.skill, entry.skill_name, entry.title, entry.area];
    for (const candidate of nameCandidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return null;
  }

  private normalizeExternalLevel(value: unknown, min: number = 1, max: number = 5): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 1 && value <= 5) {
        return this.clampSkillLevel(value);
      }
      // Normalize from 0-1 scale if detected
      if (value >= 0 && value <= 1) {
        return this.clampSkillLevel(min + (max - min) * value);
      }
      return this.clampSkillLevel(value);
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      const mapping: Record<string, number> = {
        novice: 1,
        beginner: 1,
        'beginner+': 2,
        junior: 2,
        intermediate: 3,
        proficient: 4,
        senior: 4,
        advanced: 4,
        expert: 5,
        master: 5,
      };
      if (mapping[normalized] !== undefined) {
        return mapping[normalized];
      }
      const numeric = Number.parseFloat(value);
      if (!Number.isNaN(numeric)) {
        return this.normalizeExternalLevel(numeric, min, max);
      }
    }

    return min;
  }

  private generateSkillId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private extractEntryRecommendations(entry: Record<string, unknown>): string[] {
    const recommendations: string[] = [];
    const fields = [entry.recommendations, entry.next_steps, entry.nextSteps, entry.actions];

    for (const field of fields) {
      if (Array.isArray(field)) {
        field
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .forEach((item) => recommendations.push(item.trim()));
      } else if (typeof field === 'string' && field.trim().length > 0) {
        recommendations.push(field.trim());
      }
    }

    return this.mergeUniqueStrings([], recommendations);
  }

  private extractEntryDescription(entry: Record<string, unknown>, skillName: string): string {
    const fields = [entry.description, entry.summary, entry.detail, entry.details];
    for (const field of fields) {
      if (typeof field === 'string' && field.trim().length > 0) {
        return field.trim();
      }
    }
    return `Improve your ${skillName} proficiency to unlock more advanced opportunities.`;
  }

  private mergeExternalSkillGap(result: GapAnalysisResult, newGap: SkillGap): void {
    const existingIndex = result.skillGaps.findIndex((gap) =>
      gap.skill.id === newGap.skill.id || gap.skill.name.toLowerCase() === newGap.skill.name.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = result.skillGaps[existingIndex];
      existing.skill.currentLevel = Math.min(existing.skill.currentLevel, newGap.skill.currentLevel);
      existing.skill.targetLevel = Math.max(existing.skill.targetLevel, newGap.skill.targetLevel);
      existing.gap = parseFloat((existing.skill.targetLevel - existing.skill.currentLevel).toFixed(1));
      existing.recommendations = this.mergeUniqueStrings(existing.recommendations, newGap.recommendations);
      existing.guidance.recommendedSteps = this.mergeUniqueStrings(existing.guidance.recommendedSteps, newGap.guidance.recommendedSteps);
      if (newGap.guidance.currentState) {
        existing.guidance.currentState = newGap.guidance.currentState;
      }
      if (newGap.guidance.careerImpact) {
        existing.guidance.careerImpact = newGap.guidance.careerImpact;
      }
      if (newGap.guidance.marketContext) {
        existing.guidance.marketContext = newGap.guidance.marketContext;
      }
      existing.priority = Math.max(existing.priority, newGap.priority);
      existing.confidence = this.mergeConfidence(existing.confidence, newGap.confidence);
      if (newGap.aiInsights) {
        existing.aiInsights = {
          ...existing.aiInsights,
          ...newGap.aiInsights,
        };
      }
    } else {
      result.skillGaps.push(newGap);
    }

    const headline = newGap.recommendations[0];
    if (headline) {
      this.appendUniqueRecommendations(result.recommendations, [`Focus on ${newGap.skill.name}: ${headline}`]);
    }
  }

  private mergeUniqueStrings(existing: string[], additions: string[]): string[] {
    const seen = new Set<string>();
    const combined: string[] = [];
    [...existing, ...additions].forEach((item) => {
      const trimmed = item.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        combined.push(trimmed);
      }
    });
    return combined;
  }

  private appendUniqueRecommendations(existing: string[], additions: string[]): void {
    additions.forEach((addition) => {
      const trimmed = addition.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (!existing.includes(trimmed)) {
        existing.push(trimmed);
      }
    });
  }

  private mergeConfidence(current: SkillGapConfidence, incoming: SkillGapConfidence): SkillGapConfidence {
    const order: Record<SkillGapConfidence, number> = { low: 0, medium: 1, high: 2 };
    return order[incoming] > order[current] ? incoming : current;
  }


  /**
   * Fetch data from GitHub API
   */
  private async fetchGitHubData(
    url: string,
    options?: {
      allow404?: boolean;
      resourceLabel?: string;
      raw?: boolean;
    }
  ): Promise<any> {
    if (this.githubMCPClient && this.githubRepoContext) {
      try {
        const mcpResult = await this.fetchGitHubDataViaMCP(url, options);
        if (typeof mcpResult !== 'undefined') {
          return mcpResult;
        }
      } catch (mcpError) {
        console.warn(`[GapAnalyzer] MCP fetch failed for ${options?.resourceLabel ?? url}, falling back to REST:`, mcpError);
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SkillBridge.ai-Agents'
    };
    
    // Add authentication if token is available
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `token ${token}`;
      console.log('[GapAnalyzer] ✅ Using authenticated GitHub API request');
    } else {
      console.warn('[GapAnalyzer] ⚠️ No GITHUB_TOKEN found, using unauthenticated requests (60 req/hour limit)');
    }
    
    const response = await fetch(url, { headers });
    const label = options?.resourceLabel ?? url;

    if (!response.ok) {
      if (response.status === 404) {
        if (options?.allow404) {
          return null;
        }
        throw new Error(
          `GitHub resource not found (${label}). The repository may be private or the path does not exist.`
        );
      }
      if (response.status === 403) {
        throw new Error(
          `GitHub API rate limit exceeded while requesting ${label}. ${
            token
              ? 'Ensure your personal access token has sufficient quota or scope.'
              : 'Add a personal access token to the GITHUB_TOKEN environment variable to increase limits.'
          }`
        );
      }
      if (response.status === 401) {
        throw new Error(
          `Unauthorized access to ${label}. Check that your GITHUB_TOKEN is valid and includes the "repo" scope for private repositories.`
        );
      }
      throw new Error(`GitHub API error: ${response.status} - ${response.statusText} while requesting ${label}`);
    }

    if (options?.raw) {
      return response.text();
    }

    return response.json();
  }

  private async fetchGitHubDataViaMCP(
    url: string,
    options?: {
      allow404?: boolean;
      resourceLabel?: string;
      raw?: boolean;
    }
  ): Promise<any | undefined> {
    if (!this.githubMCPClient || !this.githubRepoContext) {
      return undefined;
    }

    try {
      const parsedUrl = new URL(url);
      const { owner, repo, defaultBranch } = this.githubRepoContext;

      if (parsedUrl.hostname === 'api.github.com') {
        const segments = parsedUrl.pathname.split('/').filter(Boolean);
        if (segments.length >= 3 && segments[0] === 'repos' && segments[1] === owner && segments[2] === repo) {
          const endpoint = segments.slice(3);

          if (endpoint.length === 0) {
            return await this.githubMCPClient.getRepository(owner, repo);
          }

          if (endpoint[0] === 'languages') {
            return await this.githubMCPClient.getRepositoryLanguages(owner, repo);
          }

          if (endpoint[0] === 'readme') {
            const ref = parsedUrl.searchParams.get('ref') ?? defaultBranch;
            const readme = await this.githubMCPClient.getRepositoryReadme(owner, repo, ref || undefined);
            return {
              ...readme,
              content: readme.content,
              encoding: readme.encoding,
            };
          }

          if (endpoint[0] === 'contents') {
            const ref = parsedUrl.searchParams.get('ref') ?? undefined;
            const path = endpoint.slice(1).join('/');
            const contents = await this.githubMCPClient.listRepositoryContents(owner, repo, path || undefined, ref);
            return contents;
          }
        }
      }

      if (parsedUrl.hostname === 'raw.githubusercontent.com') {
        const parts = parsedUrl.pathname.split('/').filter(Boolean);
        if (parts.length >= 4) {
          const [rawOwner, rawRepo, ref, ...pathParts] = parts;
          if (rawOwner === owner && rawRepo === repo) {
            const path = pathParts.join('/');
            const file = await this.githubMCPClient.getFileContents(owner, repo, path, ref);
            return options?.raw ? file.decodedContent : file;
          }
        }
      }

      return undefined;
    } catch (error) {
      if (options?.allow404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Extract technologies from repository data
   */
  private extractTechnologies(repoData: any, languagesData: any, contentsData: any): string[] {
    const technologies: string[] = [];
    
    // Add primary languages
    const primaryLanguages = Object.keys(languagesData).slice(0, 5);
    technologies.push(...primaryLanguages);

    // Check for common technologies in repository description and topics
    const description = (repoData.description || '').toLowerCase();
    const topics = repoData.topics || [];
    
    const techKeywords = [
      'react', 'vue', 'angular', 'svelte',
      'nodejs', 'express', 'fastapi', 'django', 'spring',
      'mongodb', 'postgresql', 'mysql', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'typescript', 'javascript', 'python', 'java', 'c#', 'go', 'rust',
      'nextjs', 'nuxt', 'sveltekit', 'gatsby',
      'tailwind', 'bootstrap', 'material-ui', 'chakra',
      'pytorch', 'tensorflow', 'scikit-learn', 'sklearn', 'huggingface', 'transformers', 'langchain',
      'machine learning', 'machine-learning', 'deep learning', 'deep-learning', 'mlops', 'ai', 'artificial intelligence',
      'apache spark', 'spark', 'hadoop', 'kafka', 'airflow', 'databricks', 'snowflake', 'bigquery', 'data engineering', 'data-engineering'
    ];

    techKeywords.forEach(tech => {
      if (description.includes(tech) || topics.includes(tech)) {
        technologies.push(tech);
      }
    });

    return [...new Set(technologies)]; // Remove duplicates
  }

  /**
   * Extract frameworks from repository contents
   */
  private extractFrameworks(contentsData: any, languagesData: any): string[] {
    const frameworks: string[] = [];
    
    if (!Array.isArray(contentsData)) return frameworks;

    // Look for configuration files to detect frameworks
    const configFiles = contentsData.map((file: any) => file.name);
    const languages = Object.keys(languagesData);
    
    // JavaScript/TypeScript frameworks
    if (languages.includes('JavaScript') || languages.includes('TypeScript')) {
      frameworks.push('Node.js');
      if (languages.includes('TypeScript')) {
        frameworks.push('TypeScript');
      }
      
      // Check for specific JS frameworks
      if (configFiles.some((file: string) => file.includes('react'))) {
        frameworks.push('React');
      }
      if (configFiles.some((file: string) => file.includes('vue'))) {
        frameworks.push('Vue.js');
      }
      if (configFiles.some((file: string) => file.includes('angular'))) {
        frameworks.push('Angular');
      }
      if (configFiles.some((file: string) => file.includes('next'))) {
        frameworks.push('Next.js');
      }
    }
    
    // Java frameworks
    if (languages.includes('Java')) {
      // Check for Spring Boot indicators
      if (configFiles.includes('pom.xml') || configFiles.includes('build.gradle')) {
        frameworks.push('Spring Framework');
        frameworks.push('Spring Boot');
      }
      
      // Check for other Java frameworks
      if (configFiles.some((file: string) => file.includes('hibernate'))) {
        frameworks.push('Hibernate');
      }
      if (configFiles.some((file: string) => file.includes('maven'))) {
        frameworks.push('Maven');
      }
      if (configFiles.some((file: string) => file.includes('gradle'))) {
        frameworks.push('Gradle');
      }
    }
    
    // Python frameworks
    if (languages.includes('Python')) {
      frameworks.push('Python');
      
      if (configFiles.includes('requirements.txt')) {
        frameworks.push('pip');
      }
      if (configFiles.some((file: string) => file.includes('django'))) {
        frameworks.push('Django');
      }
      if (configFiles.some((file: string) => file.includes('flask'))) {
        frameworks.push('Flask');
      }
      if (configFiles.some((file: string) => file.includes('fastapi'))) {
        frameworks.push('FastAPI');
      }
    }
    
    // Go frameworks
    if (languages.includes('Go')) {
      frameworks.push('Go');
      if (configFiles.includes('go.mod')) {
        frameworks.push('Go Modules');
      }
    }
    
    // Rust frameworks
    if (languages.includes('Rust')) {
      frameworks.push('Rust');
      if (configFiles.includes('Cargo.toml')) {
        frameworks.push('Cargo');
      }
    }

    return [...new Set(frameworks)]; // Remove duplicates
  }

  /**
   * Extract tools from repository contents
   */
  private extractTools(contentsData: any): string[] {
    const tools: string[] = [];
    
    if (!Array.isArray(contentsData)) return tools;

    // Look for common tool configuration files
    const toolFiles = contentsData.map((file: any) => file.name);
    
    if (toolFiles.includes('docker-compose.yml') || toolFiles.includes('Dockerfile')) {
      tools.push('docker');
    }
    
    if (toolFiles.includes('.github')) {
      tools.push('github actions');
    }
    
    if (toolFiles.includes('jest.config.js') || toolFiles.includes('vitest.config.ts')) {
      tools.push('jest');
    }
    
    if (toolFiles.includes('eslint.config.js') || toolFiles.includes('.eslintrc')) {
      tools.push('eslint');
    }
    
    if (toolFiles.includes('prettier.config.js') || toolFiles.includes('.prettierrc')) {
      tools.push('prettier');
    }

    const fileNamesLower = toolFiles.map((file: string) => file.toLowerCase());

    if (fileNamesLower.some((name) => name.includes('airflow'))) {
      tools.push('airflow');
    }

    if (fileNamesLower.some((name) => name.includes('spark'))) {
      tools.push('spark');
    }

    if (fileNamesLower.some((name) => name.includes('hadoop'))) {
      tools.push('hadoop');
    }

    if (fileNamesLower.some((name) => name.includes('kafka'))) {
      tools.push('kafka');
    }

    if (fileNamesLower.some((name) => name.includes('databricks'))) {
      tools.push('databricks');
    }

    if (fileNamesLower.some((name) => name.includes('snowflake'))) {
      tools.push('snowflake');
    }

    if (fileNamesLower.some((name) => name.includes('bigquery'))) {
      tools.push('bigquery');
    }

    if (fileNamesLower.some((name) => name.includes('terraform'))) {
      tools.push('terraform');
    }

    if (fileNamesLower.some((name) => name.includes('ansible'))) {
      tools.push('ansible');
    }

    return [...new Set(tools)];
  }

  /**
   * Determine skill level based on repository complexity
   */
  private determineSkillLevel(repoData: any, languagesData: any, contentsData: any): 'beginner' | 'intermediate' | 'advanced' {
    const languageCount = Object.keys(languagesData).length;
    const fileCount = Array.isArray(contentsData) ? contentsData.length : 0;
    const stars = repoData.stargazers_count || 0;
    const forks = repoData.forks_count || 0;
    
    // Simple heuristic based on repository metrics
    if (languageCount >= 5 || fileCount >= 100 || stars >= 100) {
      return 'advanced';
    } else if (languageCount >= 3 || fileCount >= 50 || stars >= 10) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Generate technology-specific recommendations
   */
  private generateTechnologyRecommendations(languages: string[], frameworks: string[], technologies: string[]): string[] {
    const recommendations: string[] = [];
    
    // Language-specific recommendations
    if (languages.includes('Java')) {
      recommendations.push('Master Spring Boot and Spring Security for enterprise development');
      recommendations.push('Learn Maven or Gradle for dependency management');
      recommendations.push('Practice design patterns and SOLID principles');
    }
    
    if (languages.includes('Python')) {
      recommendations.push('Explore Django or FastAPI for web development');
      recommendations.push('Learn pandas and numpy for data science');
      recommendations.push('Practice with virtual environments and pip');
    }
    
    if (languages.includes('JavaScript') || languages.includes('TypeScript')) {
      recommendations.push('Master modern ES6+ features and async programming');
      recommendations.push('Learn a frontend framework like React, Vue, or Angular');
      recommendations.push('Understand Node.js and server-side JavaScript');
    }
    
    if (languages.includes('Go')) {
      recommendations.push('Learn Go modules and package management');
      recommendations.push('Master goroutines and channels for concurrency');
      recommendations.push('Explore popular Go frameworks like Gin or Echo');
    }
    
    if (languages.includes('Rust')) {
      recommendations.push('Master ownership and borrowing concepts');
      recommendations.push('Learn Cargo and the Rust ecosystem');
      recommendations.push('Practice with async programming in Rust');
    }

    // Framework-specific recommendations
    if (frameworks.includes('Spring Framework')) {
      recommendations.push('Learn Spring Boot auto-configuration and starters');
      recommendations.push('Master Spring Data JPA for database operations');
      recommendations.push('Understand Spring Security for authentication');
    }

    if (frameworks.includes('React')) {
      recommendations.push('Explore advanced React patterns like hooks and context');
      recommendations.push('Learn performance optimization techniques (memoization, lazy loading)');
      recommendations.push('Practice testing React components with React Testing Library or Cypress');
    }

    if (technologies.includes('pytorch')) {
      recommendations.push('Build end-to-end experiments with PyTorch Lightning or similar frameworks');
      recommendations.push('Learn model serving with TorchServe, BentoML, or FastAPI integrations');
      recommendations.push('Explore optimization techniques (mixed precision, distributed training)');
    }

    if (technologies.includes('tensorflow')) {
      recommendations.push('Build production-ready models with TensorFlow Extended (TFX)');
      recommendations.push('Practice model deployment using TensorFlow Serving or Vertex AI');
      recommendations.push('Learn TensorFlow Lite for edge deployment scenarios');
    }

    if (technologies.includes('airflow')) {
      recommendations.push('Design resilient DAGs with modular operators and clear retries');
      recommendations.push('Implement data quality checks using Airflow sensors or Great Expectations');
      recommendations.push('Automate environment provisioning with Terraform or Helm');
    }

    if (technologies.includes('spark')) {
      recommendations.push('Optimize Spark jobs with partitioning, caching, and Catalyst tuning');
      recommendations.push('Explore streaming workloads with Spark Structured Streaming');
      recommendations.push('Deploy Spark on managed services like Databricks or EMR');
    }

    if (technologies.includes('terraform')) {
      recommendations.push('Create reusable Terraform modules and enforce code review policies');
      recommendations.push('Use Terraform Cloud or Atlantis for collaborative workflows');
      recommendations.push('Integrate Terraform with CI/CD pipelines for infrastructure automation');
    }

    if (technologies.includes('kubernetes')) {
      recommendations.push('Learn advanced Kubernetes concepts (Operators, StatefulSets, RBAC)');
      recommendations.push('Improve observability with Prometheus, Grafana, or OpenTelemetry');
      recommendations.push('Automate delivery with GitOps tools like ArgoCD or Flux');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Focus on mastering the primary programming language');
      recommendations.push('Learn version control best practices with Git');
      recommendations.push('Practice writing clean, maintainable code');
      recommendations.push('Explore testing frameworks and write unit tests');
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private getSkillGuidance(
    skill: Skill,
    gap: number,
    context: { githubAnalysis?: GitHubAnalysis } = {}
  ): SkillGuidance {
    const roundLevel = (value: number) => Math.round(value * 10) / 10;
    const formattedCurrent = roundLevel(skill.currentLevel);
    const formattedTarget = roundLevel(skill.targetLevel);
    const formattedGap = roundLevel(gap);
    const priorityScore = gap * skill.importance;
    const isHighPriority = priorityScore >= 12;
    const isMediumPriority = priorityScore >= 7;
    const isLargeGap = gap >= 2;
    const isMediumGap = gap >= 1;

    const recommendedSteps = new Set<string>();
    let highlightedFrameworks: string[] | undefined;

    let currentState = `Currently at ${formattedCurrent}/5 with a ${formattedGap}-level gap to reach ${formattedTarget}/5.`;
    let careerImpact = `Closing this ${formattedGap}-level gap strengthens your ability to contribute on ${skill.category} projects.`;
    let marketContext = `While not always required, ${skill.name} proficiency is a common expectation in modern development environments.`;

    if (skill.id === 'frameworks') {
      const plan = buildFrameworkSkillPlan({
        frameworks: context.githubAnalysis?.frameworks,
        languages: context.githubAnalysis?.languages,
      });
      const levelSummary = `Currently at ${formattedCurrent}/5 with a ${formattedGap}-level gap to reach ${formattedTarget}/5.`;
      currentState = `${levelSummary} ${plan.description}`.trim();

      const severityAddendum = isHighPriority
        ? ' Because this gap tops your priority list, shipping production patterns here unlocks senior scope faster.'
        : isMediumPriority
          ? ' Addressing it next keeps you competitive for cross-functional delivery work.'
          : ' Strengthening framework depth rounds out your technical toolkit.';
      careerImpact = `${plan.impact}${severityAddendum}`;

      if (plan.usedFrameworks.length > 0) {
        highlightedFrameworks = plan.usedFrameworks;
        const frameworksSummary = this.formatList(plan.usedFrameworks);
        const primaryLanguage = context.githubAnalysis?.languages?.[0];
        marketContext = `${frameworksSummary} experience appears in most ${primaryLanguage ?? 'modern development'} job descriptions; demonstrating advanced usage eases hiring concerns.`;
      } else if (context.githubAnalysis?.languages?.length) {
        const languageSummary = this.formatList(context.githubAnalysis.languages);
        marketContext = `Teams hiring for ${languageSummary} roles expect production-grade framework skills to accelerate onboarding and delivery.`;
      } else {
        marketContext = 'Modern engineering teams expect hands-on experience with mainstream frameworks to deliver features quickly and safely.';
      }

      plan.actionItems.forEach((item) => recommendedSteps.add(item));
      if (gap >= 0.5 && recommendedSteps.size === 0) {
        this.getDefaultRecommendations(skill).forEach((rec) => recommendedSteps.add(rec));
      }
    } else {
      if (isHighPriority && isLargeGap) {
        currentState = `You're currently at ${formattedCurrent}/5 proficiency, but the market expects ${formattedTarget}/5 for competitive roles.`;
        careerImpact = `This ${formattedGap}-level gap is blocking access to senior positions and higher-paying opportunities.`;
        marketContext = `${skill.name} is a core requirement in 70-85% of relevant job postings, with expertise directly correlating to salary bands.`;
      } else if (isHighPriority && isMediumGap) {
        currentState = `Your ${formattedCurrent}/5 proficiency is solid, but advancing to ${formattedTarget}/5 is crucial for career progression.`;
        careerImpact = `Closing this ${formattedGap}-level gap unlocks leadership roles, technical decision-making authority, and competitive compensation.`;
        marketContext = `Advanced ${skill.name} skills differentiate candidates in competitive hiring processes and enable you to mentor others.`;
      } else if (isMediumPriority && isMediumGap) {
        currentState = `You have ${formattedCurrent}/5 proficiency, but reaching ${formattedTarget}/5 enhances your versatility and market value.`;
        careerImpact = `Addressing this ${formattedGap}-level gap broadens your project opportunities and makes you more competitive for cross-functional roles.`;
        marketContext = `${skill.name} appears in 40-60% of relevant job descriptions and is increasingly valued as teams adopt modern practices.`;
      } else {
        currentState = `You're at ${formattedCurrent}/5, and improving to ${formattedTarget}/5 strengthens your technical foundation.`;
        careerImpact = `This ${formattedGap}-level improvement ensures you can confidently work on diverse projects and contribute to team success.`;
        marketContext = `While not always required, ${skill.name} proficiency is a common expectation in modern development environments.`;
      }

      if (gap >= 0.5) {
        this.getDefaultRecommendations(skill).forEach((rec) => recommendedSteps.add(rec));
      }
    }

    const recommendationsArray = Array.from(recommendedSteps).slice(0, 8);

    return {
      currentState,
      careerImpact,
      marketContext,
      recommendedSteps: recommendationsArray,
      highlightedFrameworks,
    };
  }

  private mergeGuidance(existing: SkillGuidance, incoming: SkillGuidance): SkillGuidance {
    if (!existing) {
      return incoming;
    }

    const combinedRecommendations = Array.from(
      new Set([...existing.recommendedSteps, ...incoming.recommendedSteps])
    );

    return {
      currentState: incoming.currentState || existing.currentState,
      careerImpact: incoming.careerImpact || existing.careerImpact,
      marketContext: incoming.marketContext || existing.marketContext,
      recommendedSteps: combinedRecommendations.slice(0, 8),
      highlightedFrameworks: incoming.highlightedFrameworks?.length
        ? incoming.highlightedFrameworks
        : existing.highlightedFrameworks,
    };
  }

  private getDefaultRecommendations(skill: Skill): string[] {
    switch (skill.id) {
      case 'frameworks':
        return [
          'Follow official documentation and tutorials',
          'Build a complete project using the framework',
          'Join community forums and attend meetups',
        ];
      case 'leadership':
        return [
          'Take on mentoring opportunities',
          'Lead small projects or initiatives',
          'Read leadership books and apply concepts',
        ];
      default:
        return [
          `Set a focused improvement goal for ${skill.name}`,
          'Design a mini-project to exercise this skill in context',
          'Review feedback or code reviews related to this area',
        ];
    }
  }

  private formatList(items: string[], max = 3): string {
    if (items.length === 0) {
      return '';
    }
    const limited = items.slice(0, max);
    if (limited.length === 1) {
      return limited[0];
    }
    if (limited.length === 2) {
      return `${limited[0]} and ${limited[1]}`;
    }
    return `${limited.slice(0, -1).join(', ')}, and ${limited[limited.length - 1]}`;
  }

  /**
   * Generate general recommendations based on skill gaps
   */
  private generateGeneralRecommendations(skillGaps: SkillGap[]): string[] {
    const recommendations: string[] = [];
    const impactfulGaps = skillGaps
      .filter((gap) => gap.gap >= 1)
      .sort((a, b) => b.priority - a.priority);

    const topGaps = impactfulGaps.slice(0, 3);

    if (topGaps.length > 0) {
      recommendations.push(`Focus on your top 3 skill gaps: ${topGaps.map(gap => gap.skill.name).join(', ')}`);
    }

    const technicalGaps = impactfulGaps.filter(gap => gap.skill.category === 'technical');
    if (technicalGaps.length > 0) {
      recommendations.push('Invest time in advanced technical training or certifications');
      recommendations.push('Create a project roadmap to apply the targeted technologies');
    }

    const softSkillGaps = impactfulGaps.filter(gap => gap.skill.category === 'soft');
    if (softSkillGaps.length > 0) {
      recommendations.push('Practice soft skills through mentorship, coaching, or peer feedback sessions');
    }

    if (impactfulGaps.length > 0) {
      recommendations.push('Set a focused learning plan with milestones for the identified gaps');
    }

    return recommendations;
  }

  /**
   * Generate a structured learning path
   */
  private generateLearningPath(skillGaps: SkillGap[]): string[] {
    const learningPath: string[] = [];
    const priorityGaps = skillGaps.filter(gap => gap.priority > 10).slice(0, 5);

    learningPath.push('Phase 1: Foundation (Weeks 1-4)');
    priorityGaps.slice(0, 2).forEach(gap => {
      learningPath.push(`- Focus on ${gap.skill.name}: ${gap.recommendations[0]}`);
    });

    if (priorityGaps.length > 2) {
      learningPath.push('Phase 2: Development (Weeks 5-8)');
      priorityGaps.slice(2, 4).forEach(gap => {
        learningPath.push(`- Develop ${gap.skill.name}: ${gap.recommendations[0]}`);
      });
    }

    if (priorityGaps.length > 4) {
      learningPath.push('Phase 3: Mastery (Weeks 9-12)');
      priorityGaps.slice(4).forEach(gap => {
        learningPath.push(`- Master ${gap.skill.name}: ${gap.recommendations[0]}`);
      });
    }

    learningPath.push('Phase 4: Application (Ongoing)');
    learningPath.push('- Apply skills in real-world projects');
    learningPath.push('- Seek feedback and continue learning');

    return learningPath;
  }

  /**
   * Get default skill categories for initial assessment
   */
  getDefaultSkillCategories(): SkillCategory[] {
    return this.skillCategories.map(category => ({
      ...category,
      skills: category.skills.map(skill => ({
        ...skill,
        currentLevel: 1,
        targetLevel: skill.targetLevel
      }))
    }));
  }

  /**
   * Update skill levels based on user input
   */
  updateSkillLevel(skillId: string, currentLevel: number, targetLevel?: number): void {
    this.skillCategories.forEach(category => {
      const skill = category.skills.find(s => s.id === skillId);
      if (skill) {
        skill.currentLevel = Math.max(1, Math.min(5, currentLevel));
        if (targetLevel !== undefined) {
          skill.targetLevel = Math.max(1, Math.min(5, targetLevel));
        }
      }
    });
  }

  // ============================================================================
  // AGENTIC ANALYSIS METHODS (Using AI SDK)
  // ============================================================================

  /**
   * Analyze GitHub repository using AI for deep code understanding
   * This is the main entry point for agentic analysis
   * ALWAYS falls back to heuristic analysis if AI fails
   */
  async analyzeGitHubRepositoryAgentic(
    repoUrl: string,
    options: { deepAnalysis?: boolean } = {}
  ): Promise<GitHubAnalysis & { 
    agenticAnalysis?: AgenticCodeAnalysis; 
    readmeAnalysis?: ReadmeAnalysis;
    analysisMode?: 'fast' | 'agentic' | 'fallback';
    fallbackReason?: string;
  }> {
    console.log(`[GapAnalyzer Agentic] Starting analysis for ${repoUrl}`);
    
    // FALLBACK LAYER 1: Always run heuristic analysis first
    let basicAnalysis: GitHubAnalysis;
    try {
      basicAnalysis = await this.analyzeGitHubRepository(repoUrl);
      console.log(`[GapAnalyzer Agentic] ✅ Heuristic analysis complete`);
    } catch (error) {
      console.error('[GapAnalyzer Agentic] ❌ CRITICAL: Heuristic analysis failed:', error);
      throw error; // Can't fallback if even basic analysis fails
    }
    
    // Fast mode - return heuristic results immediately
    if (!options.deepAnalysis) {
      console.log(`[GapAnalyzer Agentic] Fast mode - returning heuristic results`);
      return { ...basicAnalysis, analysisMode: 'fast' };
    }

    // Deep mode - attempt AI analysis with comprehensive fallback
    console.log(`[GapAnalyzer Agentic] Deep mode - attempting AI analysis...`);
    
    let agenticAnalysis: AgenticCodeAnalysis | undefined;
    let readmeAnalysis: ReadmeAnalysis | undefined;
    let fallbackReason: string | undefined;
    let analysisMode: 'agentic' | 'fallback' = 'agentic';

    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL format');
      }
      
      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      // FALLBACK LAYER 2: README analysis (independent, won't fail entire analysis)
      try {
        console.log(`[GapAnalyzer Agentic] Fetching README...`);
        const readmeContent = await this.fetchReadmeContent(owner, cleanRepo);
        readmeAnalysis = await this.analyzeReadmeQualityAgentic(readmeContent);
        console.log(`[GapAnalyzer Agentic] ✅ README analysis: ${readmeAnalysis.qualityScore}/100`);
      } catch (readmeError) {
        console.warn('[GapAnalyzer Agentic] ⚠️ README analysis failed:', 
          readmeError instanceof Error ? readmeError.message : 'Unknown error');
        // Don't fail entire analysis if README fails
      }

      // FALLBACK LAYER 3: Code file selection (independent)
      let keyFiles: Array<{ path: string; content: string; language: string }> = [];
      try {
        console.log(`[GapAnalyzer Agentic] Selecting code files...`);
        keyFiles = await this.selectKeyFilesForAnalysis(owner, cleanRepo, basicAnalysis.languages);
        console.log(`[GapAnalyzer Agentic] Selected ${keyFiles.length} files`);
      } catch (fileError) {
        console.warn('[GapAnalyzer Agentic] ⚠️ File selection failed:', 
          fileError instanceof Error ? fileError.message : 'Unknown error');
      }

      // FALLBACK LAYER 4: AI code analysis (optional)
      if (keyFiles.length > 0) {
        try {
          console.log(`[GapAnalyzer Agentic] Running AI code analysis...`);
          agenticAnalysis = await this.analyzeCodeQualityAgentic(keyFiles, basicAnalysis);
          console.log(`[GapAnalyzer Agentic] ✅ Code quality: ${agenticAnalysis.overallQuality}/100 (confidence: ${agenticAnalysis.confidence})`);

          // Update skill level only if AI is confident
          if (agenticAnalysis.confidence > 0.7) {
            const oldLevel = basicAnalysis.skillLevel;
            basicAnalysis.skillLevel = agenticAnalysis.skillLevel;
            console.log(`[GapAnalyzer Agentic] Updated skill level: ${oldLevel} → ${agenticAnalysis.skillLevel}`);
          }

          // Merge recommendations (AI first, then heuristic)
          basicAnalysis.recommendations = [
            ...agenticAnalysis.recommendations,
            ...basicAnalysis.recommendations
          ].slice(0, 10);

        } catch (aiError) {
          console.warn('[GapAnalyzer Agentic] ⚠️ AI code analysis failed:', 
            aiError instanceof Error ? aiError.message : 'Unknown error');
          analysisMode = 'fallback';
          fallbackReason = aiError instanceof Error ? aiError.message : 'AI analysis error';
        }
      } else {
        console.warn('[GapAnalyzer Agentic] ⚠️ No code files available for AI analysis');
        analysisMode = 'fallback';
        fallbackReason = 'No code files found';
      }

      // Return results (either full agentic or partial with fallback)
      const result = {
        ...basicAnalysis,
        agenticAnalysis,
        readmeAnalysis,
        analysisMode,
        fallbackReason
      };

      if (analysisMode === 'fallback') {
        console.log(`[GapAnalyzer Agentic] ⚠️ Returning fallback results: ${fallbackReason}`);
      } else {
        console.log(`[GapAnalyzer Agentic] ✅ Full agentic analysis complete`);
      }

      return result;

    } catch (error) {
      // FINAL FALLBACK: Return heuristic analysis with error context
      console.error('[GapAnalyzer Agentic] ❌ Deep analysis failed, using heuristic fallback:', error);
      return {
        ...basicAnalysis,
        analysisMode: 'fallback',
        fallbackReason: error instanceof Error ? error.message : 'Unknown error during AI analysis'
      };
    }
  }

  /**
   * Select key files for AI analysis (avoid overwhelming the LLM)
   */
  private async selectKeyFilesForAnalysis(
    owner: string,
    repo: string,
    primaryLanguages: string[]
  ): Promise<Array<{ path: string; content: string; language: string }>> {
    try {
      const files: Array<{ path: string; content: string; language: string }> = [];
      
      // Determine file extensions to look for based on detected languages
      const extensionMap: Record<string, string[]> = {
        'TypeScript': ['.ts', '.tsx'],
        'JavaScript': ['.js', '.jsx'],
        'Python': ['.py'],
        'Java': ['.java'],
        'Go': ['.go'],
        'Rust': ['.rs'],
        'C++': ['.cpp', '.hpp', '.cc'],
        'C#': ['.cs'],
        'Ruby': ['.rb'],
        'PHP': ['.php'],
        'Swift': ['.swift'],
        'Kotlin': ['.kt']
      };

      const targetExtensions = primaryLanguages.flatMap(lang => extensionMap[lang] || []);
      if (targetExtensions.length === 0) {
        targetExtensions.push('.js', '.ts', '.py'); // Default fallback
      }

      // Fetch root directory contents
      console.log(`[GapAnalyzer Agentic] Fetching root directory for ${owner}/${repo}`);
      const contentsData = await this.fetchGitHubData(
        `https://api.github.com/repos/${owner}/${repo}/contents`
      );
      console.log(`[GapAnalyzer Agentic] Root directory has ${Array.isArray(contentsData) ? contentsData.length : 0} items`);

      // Look for important files in common directories
      const importantPaths = [
        'src/index',
        'src/main',
        'src/app',
        'app/page',           // Next.js 13+ App Router
        'app/layout',         // Next.js 13+ Layout
        'pages/index',        // Next.js Pages Router
        'pages/_app',         // Next.js App Component
        'lib/index',
        'lib/main',
        'index',
        'main',
        'app',
        'server',
        'api'
      ];

      // Try to fetch a few key files
      console.log(`[GapAnalyzer Agentic] Looking for files with extensions: ${targetExtensions.join(', ')}`);
      for (const basePath of importantPaths) {
        for (const ext of targetExtensions) {
          const filePath = `${basePath}${ext}`;
          try {
            const fileData = await this.fetchGitHubData(
              `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
            );
            
            if (fileData.content && fileData.encoding === 'base64') {
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              
              // Limit file size (max 15000 chars per file, truncate if larger)
              const MAX_FILE_SIZE = 15000;
              if (content.length <= MAX_FILE_SIZE) {
                files.push({
                  path: filePath,
                  content,
                  language: primaryLanguages[0] || 'Unknown'
                });
                console.log(`[GapAnalyzer Agentic] ✓ Found file: ${filePath} (${content.length} chars)`);
              } else {
                // Truncate large files instead of skipping them
                const truncated = content.substring(0, MAX_FILE_SIZE);
                files.push({
                  path: filePath,
                  content: truncated,
                  language: primaryLanguages[0] || 'Unknown'
                });
                console.log(`[GapAnalyzer Agentic] ✓ Found file (truncated): ${filePath} (${content.length} → ${MAX_FILE_SIZE} chars)`);
              }
            }
          } catch (error) {
            // File doesn't exist, continue (this is expected for most paths)
          }

          if (files.length >= 3) break; // Max 3 files to analyze
        }
        if (files.length >= 3) break;
      }
      
      console.log(`[GapAnalyzer Agentic] Found ${files.length} files from important paths`);

      // If no files found in standard locations, explore common code directories
      if (files.length === 0 && Array.isArray(contentsData)) {
        console.log(`[GapAnalyzer Agentic] No files in standard paths, checking root directory...`);
        
        // First, check if there are common code directories
        const codeDirectories = ['src', 'cmd', 'pkg', 'lib', 'app', 'internal'];
        const foundDirs = contentsData.filter(item => 
          item.type === 'dir' && codeDirectories.includes(item.name.toLowerCase())
        );
        
        // If we found common code directories, explore them (limit to avoid too many requests)
        if (foundDirs.length > 0) {
          console.log(`[GapAnalyzer Agentic] Found code directories: ${foundDirs.map(d => d.name).join(', ')}`);
          
          for (const dir of foundDirs.slice(0, 2)) { // Max 2 directories to explore
            try {
              const dirData = await this.fetchGitHubData(
                `https://api.github.com/repos/${owner}/${repo}/contents/${dir.name}`
              );
              
              if (Array.isArray(dirData)) {
                const codeFiles = dirData.filter(item => 
                  item.type === 'file' && targetExtensions.some(ext => item.name.endsWith(ext))
                );
                
                console.log(`[GapAnalyzer Agentic] Found ${codeFiles.length} code files in ${dir.name}/`);
                
                // Take first code file from this directory
                for (const file of codeFiles.slice(0, 2)) {
                  try {
                    const fileData = await this.fetchGitHubData(
                      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`
                    );
                    
                    if (fileData.content && fileData.encoding === 'base64') {
                      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                      const MAX_FILE_SIZE = 15000;
                      
                      files.push({
                        path: file.path,
                        content: content.length <= MAX_FILE_SIZE ? content : content.substring(0, MAX_FILE_SIZE),
                        language: primaryLanguages[0] || 'Unknown'
                      });
                      console.log(`[GapAnalyzer Agentic] ✓ Found file in ${dir.name}: ${file.name} (${content.length} chars)`);
                      
                      if (files.length >= 3) break;
                    }
                  } catch (error) {
                    // Skip files that can't be fetched
                  }
                }
                
                // If no files found directly in this directory, check subdirectories (one level deeper)
                if (codeFiles.length === 0 && files.length < 3) {
                  const subDirs = dirData.filter(item => item.type === 'dir').slice(0, 3); // Check up to 3 subdirectories
                  console.log(`[GapAnalyzer Agentic] No files in ${dir.name}/, checking ${subDirs.length} subdirectories...`);
                  
                  for (const subDir of subDirs) {
                    if (files.length >= 3) break;
                    
                    try {
                      const subDirData = await this.fetchGitHubData(
                        `https://api.github.com/repos/${owner}/${repo}/contents/${subDir.path}`
                      );
                      
                      if (Array.isArray(subDirData)) {
                        const subDirCodeFiles = subDirData.filter(item => 
                          item.type === 'file' && targetExtensions.some(ext => item.name.endsWith(ext))
                        );
                        
                        console.log(`[GapAnalyzer Agentic] Found ${subDirCodeFiles.length} code files in ${subDir.path}/`);
                        
                        // Take first code file from this subdirectory
                        for (const file of subDirCodeFiles.slice(0, 1)) { // Only 1 file per subdir
                          try {
                            const fileData = await this.fetchGitHubData(
                              `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`
                            );
                            
                            if (fileData.content && fileData.encoding === 'base64') {
                              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                              const MAX_FILE_SIZE = 15000;
                              
                              files.push({
                                path: file.path,
                                content: content.length <= MAX_FILE_SIZE ? content : content.substring(0, MAX_FILE_SIZE),
                                language: primaryLanguages[0] || 'Unknown'
                              });
                              console.log(`[GapAnalyzer Agentic] ✓ Found file in ${subDir.path}: ${file.name} (${content.length} chars)`);
                              
                              if (files.length >= 3) break;
                            }
                          } catch (error) {
                            // Skip files that can't be fetched
                          }
                        }
                      }
                    } catch (error) {
                      // Skip subdirectories that can't be explored
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`[GapAnalyzer Agentic] Could not explore directory: ${dir.name}`);
            }
            
            if (files.length >= 3) break;
          }
        }
        
        // If still no files, check root directory for code files
      if (files.length === 0) {
        const rootCodeFiles = contentsData.filter(item => 
          item.type === 'file' && targetExtensions.some(ext => item.name.endsWith(ext))
        );
        console.log(`[GapAnalyzer Agentic] Found ${rootCodeFiles.length} code files in root`);
        
          for (const item of rootCodeFiles) {
            try {
              const fileData = await this.fetchGitHubData(
                `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`
              );
              
              if (fileData.content && fileData.encoding === 'base64') {
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                const MAX_FILE_SIZE = 15000;
                
                if (content.length <= MAX_FILE_SIZE) {
                  files.push({
                    path: item.path,
                    content,
                    language: primaryLanguages[0] || 'Unknown'
                  });
                  console.log(`[GapAnalyzer Agentic] ✓ Found root file: ${item.path} (${content.length} chars)`);
                } else {
                  // Truncate large files instead of skipping them
                  const truncated = content.substring(0, MAX_FILE_SIZE);
                  files.push({
                    path: item.path,
                    content: truncated,
                    language: primaryLanguages[0] || 'Unknown'
                  });
                  console.log(`[GapAnalyzer Agentic] ✓ Found root file (truncated): ${item.path} (${content.length} → ${MAX_FILE_SIZE} chars)`);
                }
                
                if (files.length >= 3) break; // Get up to 3 files
              }
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      }

      if (files.length === 0) {
        console.log('[GapAnalyzer Agentic] Falling back to recursive search for deeply nested code files...');
        const fallbackRepoData = { html_url: `https://github.com/${owner}/${repo}` };
        const recursiveFiles = await this.findCodeFilesRecursively(
          fallbackRepoData,
          Array.isArray(contentsData) ? contentsData : []
        );

        for (const file of recursiveFiles.slice(0, 3)) {
          try {
            const fileData = await this.fetchGitHubData(file.download_url, {
              raw: true,
              resourceLabel: `${file.path} raw content`,
            });

            const content =
              typeof fileData === 'string'
                ? fileData
                : fileData?.content && fileData.encoding === 'base64'
                  ? Buffer.from(fileData.content, 'base64').toString('utf-8')
                  : '';

            if (content) {
              const MAX_FILE_SIZE = 15_000;
              files.push({
                path: file.path,
                content: content.length <= MAX_FILE_SIZE ? content : content.substring(0, MAX_FILE_SIZE),
                language: primaryLanguages[0] || 'Unknown',
              });
              console.log(`[GapAnalyzer Agentic] ✓ Fallback file selected: ${file.path} (${content.length} chars)`);
            }
          } catch (error) {
            console.log(`[GapAnalyzer Agentic] Could not fetch fallback file ${file.path}:`, error);
          }

          if (files.length >= 3) {
            break;
          }
        }
      }

      return files;
    } catch (error) {
      console.error('[GapAnalyzer Agentic] Error selecting files:', error);
      return [];
    }
  }

  /**
   * Fetch README content from GitHub
   */
  private async fetchReadmeContent(owner: string, repo: string): Promise<string> {
    try {
      const readmeData = await this.fetchGitHubData(
        `https://api.github.com/repos/${owner}/${repo}/readme`
      );
      
      if (readmeData.content && readmeData.encoding === 'base64') {
        return Buffer.from(readmeData.content, 'base64').toString('utf-8');
      }
      throw new Error('No README content found');
    } catch (error) {
      throw new Error('README not found');
    }
  }

  /**
   * Analyze code quality using AI (AI SDK)
   * Falls back to heuristic assessment if AI fails
   */
  private async analyzeCodeQualityAgentic(
    files: Array<{ path: string; content: string; language: string }>,
    basicAnalysis: GitHubAnalysis
  ): Promise<AgenticCodeAnalysis> {
    console.log(`[GapAnalyzer Agentic] Analyzing code quality with AI...`);

    try {
      // Validate inputs
      if (!files || files.length === 0) {
        throw new Error('No files provided for analysis');
      }

      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const codeContext = files.map(f => 
        `File: ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``
      ).join('\n\n');

      const prompt = `You are an expert code reviewer analyzing a ${basicAnalysis.languages.join(', ')} project.

Repository Technologies:
- Languages: ${basicAnalysis.languages.join(', ')}
- Frameworks: ${basicAnalysis.frameworks.join(', ') || 'None detected'}
- Tools: ${basicAnalysis.tools.join(', ') || 'None detected'}

Code Files to Analyze:
${codeContext}

Please analyze this code and provide:
1. Overall quality assessment (0-100)
2. Developer skill level (beginner/intermediate/advanced)
3. Architecture patterns used
4. Code smells and issues
5. Best practices (implemented or missing)
6. Specific recommendations for improvement
7. Confidence in your assessment (0-1)

Focus on: code organization, error handling, type safety, testing, documentation, security, and maintainability.`;

      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          overallQuality: z.number().min(0).max(100).describe('Overall code quality score'),
          skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('Developer skill level based on code'),
          architecturePatterns: z.array(z.string()).describe('Detected architecture patterns (e.g., MVC, microservices, clean architecture)'),
          codeSmells: z.array(z.object({
            type: z.string().describe('Type of code smell'),
            severity: z.enum(['high', 'medium', 'low']),
            description: z.string().describe('What the issue is'),
            location: z.string().optional().describe('File or function where found'),
            suggestion: z.string().describe('How to fix it')
          })).describe('Code smells and issues found'),
          bestPractices: z.array(z.object({
            name: z.string().describe('Best practice name'),
            implemented: z.boolean().describe('Whether it is implemented'),
            importance: z.enum(['high', 'medium', 'low']),
            suggestion: z.string().optional().describe('How to implement if missing')
          })).describe('Best practices evaluation'),
          recommendations: z.array(z.string()).describe('Top 5 actionable recommendations'),
          confidence: z.number().min(0).max(1).describe('Confidence in this assessment')
        }),
        prompt,
        maxRetries: 2 // Retry failed requests up to 2 times
      });

      console.log(`[GapAnalyzer Agentic] ✅ AI code analysis complete`);
      return object;

    } catch (error) {
      // Comprehensive error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[GapAnalyzer Agentic] ⚠️ AI code analysis failed: ${errorMessage}`);
      
      // Provide helpful error context
      if (errorMessage.includes('API key')) {
        console.warn('[GapAnalyzer Agentic] → Set OPENAI_API_KEY in environment variables');
      } else if (errorMessage.includes('rate limit')) {
        console.warn('[GapAnalyzer Agentic] → OpenAI rate limit reached, using fallback');
      } else if (errorMessage.includes('timeout')) {
        console.warn('[GapAnalyzer Agentic] → Request timeout, using fallback');
      }
      
      // Fallback to enhanced heuristic assessment based on basic analysis
      const heuristicQuality = this.calculateHeuristicQuality(basicAnalysis);
      
      return {
        overallQuality: heuristicQuality,
        skillLevel: basicAnalysis.skillLevel,
        architecturePatterns: [],
        codeSmells: [],
        bestPractices: [],
        recommendations: [
          'AI analysis unavailable - showing heuristic recommendations',
          ...basicAnalysis.recommendations.slice(0, 4)
        ],
        confidence: 0.3
      };
    }
  }

  /**
   * Calculate heuristic quality score as fallback
   */
  private calculateHeuristicQuality(analysis: GitHubAnalysis): number {
    let score = 50; // Base score

    // Add points based on heuristic indicators
    if (analysis.skillLevel === 'advanced') score += 20;
    else if (analysis.skillLevel === 'intermediate') score += 10;
    
    if (analysis.frameworks.length > 0) score += 10;
    if (analysis.languages.length > 1) score += 5;
    if (analysis.tools.includes('docker')) score += 5;
    if (analysis.tools.includes('typescript')) score += 5;
    
    if (analysis.metadata) {
      if (analysis.metadata.activityScore > 7) score += 10;
      if (analysis.metadata.starCount > 10) score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Analyze README quality using AI (AI SDK)
   * Falls back to heuristic analysis if AI fails
   */
  async analyzeReadmeQualityAgentic(readmeContent: string): Promise<ReadmeAnalysis> {
    console.log(`[GapAnalyzer Agentic] Analyzing README quality with AI...`);

    try {
      // Validate inputs
      if (!readmeContent || readmeContent.trim().length === 0) {
        throw new Error('README content is empty');
      }

      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Truncate README if too long (keep first 3000 chars)
      const truncatedReadme = readmeContent.slice(0, 3000);

      const prompt = `You are a technical documentation expert. Analyze this README and evaluate its quality.

README Content:
\`\`\`markdown
${truncatedReadme}
\`\`\`

Evaluate:
1. Overall quality score (0-100)
2. Strengths (what's done well)
3. Weaknesses (what's missing or unclear)
4. Specific suggestions for improvement
5. Whether it has installation instructions
6. Whether it has usage examples
7. Whether it has good documentation
8. Clarity score (how easy to understand)
9. Completeness score (how thorough it is)

Consider: structure, clarity, completeness, examples, getting started guide, API docs, contributing guidelines.`;

      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          qualityScore: z.number().min(0).max(100).describe('Overall README quality'),
          strengths: z.array(z.string()).describe('What the README does well (2-3 items)'),
          weaknesses: z.array(z.string()).describe('What the README is missing or could improve (2-3 items)'),
          suggestions: z.array(z.string()).describe('Specific actionable suggestions (3-5 items)'),
          hasInstallation: z.boolean().describe('Has clear installation instructions'),
          hasUsageExamples: z.boolean().describe('Has code examples showing usage'),
          hasDocumentation: z.boolean().describe('Has comprehensive documentation'),
          clarity: z.number().min(0).max(100).describe('How clear and easy to understand'),
          completeness: z.number().min(0).max(100).describe('How complete and thorough')
        }),
        prompt,
        maxRetries: 2
      });

      console.log(`[GapAnalyzer Agentic] ✅ README analysis complete - Score: ${object.qualityScore}/100`);
      return object;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[GapAnalyzer Agentic] ⚠️ README analysis failed: ${errorMessage}`);
      
      // Fallback to heuristic README analysis
      const heuristicAnalysis = this.analyzeReadmeHeuristically(readmeContent);
      console.log('[GapAnalyzer Agentic] Using heuristic README analysis');
      
      return heuristicAnalysis;
    }
  }

  /**
   * Heuristic README analysis as fallback
   */
  private analyzeReadmeHeuristically(content: string): ReadmeAnalysis {
    const lowerContent = content.toLowerCase();
    
    // Check for common sections
    const hasInstallation = /install|setup|getting started/i.test(content);
    const hasUsageExamples = /```|example|usage/i.test(content);
    const hasDocumentation = /api|documentation|reference/i.test(content);
    
    // Count sections (lines starting with #)
    const sections = (content.match(/^#+\s/gm) || []).length;
    
    // Calculate scores based on heuristics
    let qualityScore = 40; // Base score for having README
    if (content.length > 500) qualityScore += 10;
    if (content.length > 1500) qualityScore += 10;
    if (sections >= 3) qualityScore += 15;
    if (hasInstallation) qualityScore += 10;
    if (hasUsageExamples) qualityScore += 10;
    if (hasDocumentation) qualityScore += 5;
    
    const clarity = content.length > 200 ? 60 : 40;
    const completeness = Math.min(80, 40 + (sections * 5));
    
    return {
      qualityScore: Math.min(100, qualityScore),
      strengths: [
        'README file exists',
        content.length > 500 ? 'Substantial content' : 'Basic documentation',
        sections >= 3 ? 'Multiple sections' : 'Single section'
      ].filter(Boolean),
      weaknesses: [
        !hasInstallation && 'Missing installation instructions',
        !hasUsageExamples && 'No code examples',
        !hasDocumentation && 'Limited documentation',
        'AI analysis unavailable - showing heuristic results'
      ].filter(Boolean) as string[],
      suggestions: [
        !hasInstallation && 'Add installation/setup instructions',
        !hasUsageExamples && 'Include code examples',
        !hasDocumentation && 'Add API or usage documentation',
        'Consider adding badges, images, or diagrams'
      ].filter(Boolean) as string[],
      hasInstallation,
      hasUsageExamples,
      hasDocumentation,
      clarity,
      completeness
    };
  }

  /**
   * Generate personalized recommendations using AI
   * Falls back to basic recommendations if AI fails
   */
  async generateAgenticRecommendations(
    githubAnalysis: GitHubAnalysis,
    agenticAnalysis?: AgenticCodeAnalysis,
    readmeAnalysis?: ReadmeAnalysis,
    userContext?: ResearchContext
  ): Promise<string[]> {
    console.log(`[GapAnalyzer Agentic] Generating personalized recommendations with AI...`);

    try {
      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const contextDescription = `
Repository Analysis:
- Languages: ${githubAnalysis.languages.join(', ')}
- Frameworks: ${githubAnalysis.frameworks.join(', ') || 'None'}
- Skill Level: ${githubAnalysis.skillLevel}
${agenticAnalysis ? `- Code Quality: ${agenticAnalysis.overallQuality}/100` : ''}
${readmeAnalysis ? `- README Quality: ${readmeAnalysis.qualityScore}/100` : ''}

${agenticAnalysis?.codeSmells?.length ? `Code Issues Found:
${agenticAnalysis.codeSmells.slice(0, 3).map(cs => `- ${cs.type}: ${cs.description}`).join('\n')}` : ''}

${readmeAnalysis?.weaknesses?.length ? `README Weaknesses:
${readmeAnalysis.weaknesses.slice(0, 2).map(w => `- ${w}`).join('\n')}` : ''}

${userContext?.targetRole ? `Target Role: ${userContext.targetRole}` : ''}
${userContext?.professionalGoals ? `Goals: ${userContext.professionalGoals}` : ''}
`.trim();

      const prompt = `Based on this developer's GitHub repository analysis, generate 5-7 specific, actionable recommendations to improve their skills and portfolio.

${contextDescription}

Provide recommendations that are:
1. Specific and actionable (not generic advice)
2. Prioritized by impact
3. Tailored to their current skill level
4. Include concrete next steps
5. Consider both technical skills and portfolio presentation`;

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        maxRetries: 2
      });

      // Parse recommendations (assuming they're in a list format)
      const recommendations = text
        .split('\n')
        .filter(line => line.trim().match(/^[\d\-\*\.]+\s+/)) // Lines starting with numbers, bullets, etc.
        .map(line => line.replace(/^[\d\-\*\.]+\s+/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 7);

      console.log(`[GapAnalyzer Agentic] ✅ Generated ${recommendations.length} AI recommendations`);
      return recommendations.length > 0 ? recommendations : [text.slice(0, 200)]; // Fallback to first 200 chars

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[GapAnalyzer Agentic] ⚠️ AI recommendations failed: ${errorMessage}`);
      
      // Fallback to enhanced recommendations combining all available data
      const fallbackRecs = [
        ...githubAnalysis.recommendations,
        ...(agenticAnalysis?.recommendations || []),
        ...(readmeAnalysis?.suggestions || [])
      ]
        .filter((rec, index, self) => self.indexOf(rec) === index) // Remove duplicates
        .slice(0, 7);

      console.log('[GapAnalyzer Agentic] Using fallback recommendations');
      return fallbackRecs;
    }
  }

  /**
   * Analyze quality metrics for README and code quality
   */
  private async analyzeQualityMetrics(repoData: any, contentsData: any[]): Promise<QualityMetrics> {
    try {
      console.log('[GapAnalyzer] Analyzing quality metrics...');

      // Analyze README quality
      const readmeAnalysis = await this.analyzeReadmeQuality(repoData, contentsData);
      
      // Analyze code quality
      const codeAnalysis = await this.analyzeCodeQuality(repoData, contentsData);
      
      // Calculate overall quality
      const overallScore = Math.round((readmeAnalysis.score + codeAnalysis.score) / 2);
      const overallConfidence = Math.round((readmeAnalysis.confidence + codeAnalysis.confidence) / 2);

      return {
        readmeQuality: readmeAnalysis,
        codeQuality: codeAnalysis,
        overallQuality: {
          score: overallScore,
          confidence: overallConfidence,
          strengths: [
            ...readmeAnalysis.insights.filter(insight => insight.includes('good') || insight.includes('excellent')),
            ...codeAnalysis.insights.filter(insight => insight.includes('good') || insight.includes('excellent'))
          ].slice(0, 3),
          weaknesses: [
            ...readmeAnalysis.improvements,
            ...codeAnalysis.improvements
          ].slice(0, 3)
        }
      };
    } catch (error) {
      console.error('[GapAnalyzer] Quality analysis error:', error);
      // Return default metrics if analysis fails
      return {
        readmeQuality: { score: 50, confidence: 50, insights: ['Analysis unavailable'], improvements: ['Unable to analyze'] },
        codeQuality: { score: 50, confidence: 50, insights: ['Analysis unavailable'], improvements: ['Unable to analyze'] },
        overallQuality: { score: 50, confidence: 50, strengths: ['Analysis unavailable'], weaknesses: ['Unable to analyze'] }
      };
    }
  }

  /**
   * Analyze README quality
   */
  private async analyzeReadmeQuality(repoData: any, contentsData: any[]): Promise<{
    score: number;
    confidence: number;
    insights: string[];
    improvements: string[];
  }> {
    try {
      const repoFullName =
        typeof repoData?.full_name === 'string'
          ? repoData.full_name
          : (() => {
              const match =
                typeof repoData?.html_url === 'string'
                  ? repoData.html_url.match(/github\.com\/(.+)$/)
                  : null;
              return match ? match[1] : 'repository';
            })();

      // Find README file
      const readmeFile = contentsData.find(file => 
        file.name.toLowerCase().includes('readme') && 
        (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.txt'))
      );

      if (!readmeFile) {
        return {
          score: 20,
          confidence: 90,
          insights: ['No README file found'],
          improvements: ['Add a comprehensive README.md file']
        };
      }

      // Get README content
      const readmeResponse = await this.fetchGitHubData(readmeFile.download_url, {
        raw: true,
        resourceLabel: `${repoFullName} README raw content`,
      });
      const content =
        typeof readmeResponse === 'string'
          ? readmeResponse
          : readmeResponse?.content && readmeResponse.encoding === 'base64'
            ? Buffer.from(readmeResponse.content, 'base64').toString('utf-8')
            : '';

      if (!content) {
        throw new Error('No README content found');
      }

      const prompt = `Analyze this README file and provide quality metrics:

${content}

Rate the README quality on a scale of 0-100 based on:
1. Completeness (installation, usage, examples)
2. Clarity and organization
3. Professional presentation
4. Documentation depth
5. Code examples and screenshots

Provide:
- Score (0-100)
- Confidence (0-100)
- 3 key insights about what's good
- 3 specific improvements needed

Format as JSON:
{
  "score": number,
  "confidence": number,
  "insights": ["insight1", "insight2", "insight3"],
  "improvements": ["improvement1", "improvement2", "improvement3"]
}`;

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3,
      });

      // Clean the response text to extract JSON
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const analysis = JSON.parse(cleanedText);
      return analysis;
    } catch (error) {
      console.error('[GapAnalyzer] README analysis error:', error);
      return {
        score: 50,
        confidence: 50,
        insights: ['Unable to analyze README'],
        improvements: ['README analysis failed']
      };
    }
  }

  /**
   * Analyze code quality
   */
  private async analyzeCodeQuality(repoData: any, contentsData: any[]): Promise<{
    score: number;
    confidence: number;
    insights: string[];
    improvements: string[];
  }> {
    try {
      // Recursively find code files in the repository
      const codeFiles = await this.findCodeFilesRecursively(repoData, contentsData);

      if (codeFiles.length === 0) {
        return {
          score: 30,
          confidence: 90,
          insights: ['No code files found'],
          improvements: ['Add source code files']
        };
      }

      // Get content from first few files
      const fileContents = await Promise.all(
        codeFiles.slice(0, 3).map(async (file) => {
          try {
            const contentResponse = await this.fetchGitHubData(file.download_url, {
              raw: true,
              resourceLabel: `${file.path} raw content`,
            });
            return {
              name: file.name,
              content:
                (typeof contentResponse === 'string'
                  ? contentResponse
                  : contentResponse?.content && contentResponse.encoding === 'base64'
                    ? Buffer.from(contentResponse.content, 'base64').toString('utf-8')
                    : ''
                ).substring(0, 2000),
            };
          } catch {
            return { name: file.name, content: '' };
          }
        })
      );

      const prompt = `Analyze these code files and provide quality metrics:

${fileContents.map(f => `File: ${f.name}\n${f.content}\n---`).join('\n')}

Rate the code quality on a scale of 0-100 based on:
1. Code organization and structure
2. Naming conventions
3. Documentation and comments
4. Error handling
5. Best practices adherence

Provide:
- Score (0-100)
- Confidence (0-100)
- 3 key insights about what's good
- 3 specific improvements needed

Format as JSON:
{
  "score": number,
  "confidence": number,
  "insights": ["insight1", "insight2", "insight3"],
  "improvements": ["improvement1", "improvement2", "improvement3"]
}`;

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3,
      });

      // Clean the response text to extract JSON
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const analysis = JSON.parse(cleanedText);
      return analysis;
    } catch (error) {
      console.error('[GapAnalyzer] Code analysis error:', error);
      return {
        score: 50,
        confidence: 50,
        insights: ['Unable to analyze code'],
        improvements: ['Code analysis failed']
      };
    }
  }

  /**
   * Generate AI analysis insights with problem-solving frameworks
   */
  private async generateAIAnalysisInsights(
    repoData: any, 
    contentsData: any[], 
    technologies: string[], 
    frameworks: string[]
  ): Promise<AIAnalysisInsights> {
    try {
      console.log('[GapAnalyzer] Generating AI analysis insights...');

      const prompt = `Analyze this GitHub repository and provide comprehensive AI insights:

Repository: ${repoData.full_name}
Description: ${repoData.description || 'No description'}
Technologies: ${technologies.join(', ')}
Frameworks: ${frameworks.join(', ')}
Languages: ${Object.keys(repoData.languages || {}).join(', ')}
Stars: ${repoData.stargazers_count}
Forks: ${repoData.forks_count}

Provide insights in these categories:

1. Problem-Solving Approach (3-4 insights about how problems are solved)
2. Frameworks & Patterns (3-4 frameworks and design patterns used)
3. Code Patterns (3-4 specific code patterns observed)
4. Best Practices (3-4 best practices demonstrated)
5. Anti-Patterns (2-3 areas that could be improved)
6. Recommendations (3-4 specific recommendations for improvement)

Format as JSON:
{
  "problemSolvingApproach": ["approach1", "approach2", "approach3"],
  "frameworks": ["framework1", "framework2", "framework3"],
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "bestPractices": ["practice1", "practice2", "practice3"],
  "antiPatterns": ["antipattern1", "antipattern2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`;

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.4,
      });

      // Clean the response text to extract JSON
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const insights = JSON.parse(cleanedText);
      return insights;
    } catch (error) {
      console.error('[GapAnalyzer] AI insights generation error:', error);
      return {
        problemSolvingApproach: ['Analysis unavailable'],
        frameworks: ['Analysis unavailable'],
        patterns: ['Analysis unavailable'],
        bestPractices: ['Analysis unavailable'],
        antiPatterns: ['Analysis unavailable'],
        recommendations: ['Analysis unavailable']
      };
    }
  }

  /**
   * Get quality insights for a specific skill
   */
  private getQualityInsightsForSkill(skill: Skill, githubAnalysis?: GitHubAnalysis): any {
    if (!githubAnalysis?.qualityMetrics) {
      return null;
    }

    const qualityMetrics = githubAnalysis.qualityMetrics;
    
    // Map skills to relevant quality metrics
    const skillQualityMap: { [key: string]: any } = {
      'documentation': {
        readmeQuality: qualityMetrics.readmeQuality.score,
        codeQuality: qualityMetrics.codeQuality.score,
        architecturePatterns: githubAnalysis.aiInsights?.patterns || [],
        bestPractices: githubAnalysis.aiInsights?.bestPractices || [],
      },
      'readme': {
        readmeQuality: qualityMetrics.readmeQuality.score,
        codeQuality: qualityMetrics.codeQuality.score,
        architecturePatterns: githubAnalysis.aiInsights?.patterns || [],
        bestPractices: githubAnalysis.aiInsights?.bestPractices || [],
      },
      'testing': {
        codeQuality: qualityMetrics.codeQuality.score,
        architecturePatterns: githubAnalysis.aiInsights?.patterns || [],
        bestPractices: githubAnalysis.aiInsights?.bestPractices || [],
      },
      'code-quality': {
        codeQuality: qualityMetrics.codeQuality.score,
        architecturePatterns: githubAnalysis.aiInsights?.patterns || [],
        bestPractices: githubAnalysis.aiInsights?.bestPractices || [],
      },
      'software-architecture': {
        codeQuality: qualityMetrics.codeQuality.score,
        architecturePatterns: githubAnalysis.aiInsights?.patterns || [],
        bestPractices: githubAnalysis.aiInsights?.bestPractices || [],
      },
    };

    // Check if skill name or category matches any quality metrics
    const skillKey = Object.keys(skillQualityMap).find(key => 
      skill.name.toLowerCase().includes(key) || 
      skill.category.toLowerCase().includes(key)
    );

    return skillKey ? skillQualityMap[skillKey] : null;
  }

  /**
   * Recursively find code files in the repository
   */
  private async findCodeFilesRecursively(repoData: any, contentsData: any[]): Promise<any[]> {
    const codeFiles: any[] = [];
    const codeExtensions = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'cs', 'php', 'rb', 'swift', 'kt', 'scala'];
    
    // Extract owner and repo from URL
    const match = repoData.html_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return codeFiles;
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');
    
    const MAX_DEPTH = 8;

    const searchInDirectory = async (path: string = '', depth: number = 0): Promise<void> => {
      // Limit recursion depth to avoid infinite loops
      if (depth >= MAX_DEPTH) return;
      
      try {
        const url = `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${path}`;
        const dirContents = await this.fetchGitHubData(url, {
          resourceLabel: `${owner}/${cleanRepo}${path ? `/${path}` : ''}`,
          allow404: path !== '',
        });
        
        if (Array.isArray(dirContents)) {
          for (const item of dirContents) {
            if (item.type === 'file') {
              const ext = item.name.split('.').pop()?.toLowerCase();
              if (ext && codeExtensions.includes(ext)) {
                codeFiles.push(item);
              }
            } else if (item.type === 'dir' && !item.name.startsWith('.')) {
              // Skip hidden directories and common non-source directories
              const skipDirs = ['node_modules', 'vendor', 'target', 'build', 'dist', '.git', '.vscode', '.idea'];
              if (!skipDirs.includes(item.name)) {
                await searchInDirectory(item.path, depth + 1);
              }
            }
          }
        }
      } catch (error) {
        const directoryLabel = path ? `/${path}` : '/';
        if (error instanceof Error && error.message.includes('GitHub resource not found')) {
          console.log(`[GapAnalyzer] Directory ${directoryLabel} not found in ${owner}/${cleanRepo}, skipping.`);
        } else {
          console.log(`[GapAnalyzer] Could not access directory ${directoryLabel} in ${owner}/${cleanRepo}:`, error);
        }
      }
    };
    
    // Start searching from root and common source directories
    await searchInDirectory();
    
    // Also check common source directories directly
    const commonSourceDirs = ['src', 'app', 'lib', 'source', 'sources'];
    for (const dir of commonSourceDirs) {
      await searchInDirectory(dir);
    }
    
    return codeFiles.slice(0, 10); // Limit to 10 files for analysis
  }
}
