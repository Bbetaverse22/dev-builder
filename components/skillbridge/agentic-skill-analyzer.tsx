"use client";

/**
 * V1 Agentic Skill Analyzer
 * Single-page agentic workflow with AI-powered Portfolio Builder
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';
import { StickyAgentStatus } from './sticky-agent-status';
import { InteractiveSkillCard } from './interactive-skill-card';
import { LandingExplanation } from './landing-explanation';
import { AnimatedHero } from './animated-hero';
import { AnimatedFeatures } from './animated-features';
import { AnimatedHowItWorks } from './animated-how-it-works';
import { useAnalysis } from '@/lib/contexts/analysis-context';
import {
  Github,
  Brain,
  Rocket,
  Target,
  TrendingUp,
  Code,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  GitPullRequest,
  FileText,
  Activity,
  Zap,
  Search,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

type AgentStatus = 'IDLE' | 'ANALYZING' | 'RESEARCHING' | 'PLANNING' | 'ACTING' | 'MONITORING' | 'COMPLETE' | 'ERROR';

interface ActionLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  icon?: React.ReactNode;
}

interface PortfolioTask {
  id: string;
  title: string;
  type: 'issue' | 'readme' | 'documentation' | 'test' | 'skill';
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  optional?: boolean;
  skillName?: string;
  description?: string;
  actionItems?: string[];
  estimatedEffort?: string;
  weakness?: {
    severity: 'high' | 'medium' | 'low';
    type: string;
    optional?: boolean;
  };
}

interface GeneratedTemplateSummary {
  sourceName: string;
  sourceUrl: string;
  templateDirectory: string;
  branchName: string;
  instructions: string[];
  analysisSummary: {
    framework: string;
    templateWorthiness: number;
    insights: string[];
  };
  pullRequestUrl?: string;
  pullRequestNumber?: number;
}

interface AgenticSkillAnalyzerProps {
  showMarketing?: boolean;
}

const MAX_DISPLAY_RESOURCES = 3;
const MAX_DISPLAY_EXAMPLES = 3;
export function AgenticSkillAnalyzer({ showMarketing = true }: AgenticSkillAnalyzerProps) {
  const { setAnalysisResults } = useAnalysis();
  const [githubUsername, setGithubUsername] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('IDLE');
  const [progress, setProgress] = useState(0);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [portfolioTasks, setPortfolioTasks] = useState<PortfolioTask[]>([]);
  const [careerInsights, setCareerInsights] = useState<any>(null);
  const [researchResults, setResearchResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [professionalGoals, setProfessionalGoals] = useState('');
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [isCreatingIssues, setIsCreatingIssues] = useState(false);
  const [createdIssues, setCreatedIssues] = useState<any[]>([]);
  const [skillAssessment, setSkillAssessment] = useState<any | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [examplesExpanded, setExamplesExpanded] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [generatedTemplates, setGeneratedTemplates] = useState<Record<string, GeneratedTemplateSummary>>({});
  const [templateGenerationLoading, setTemplateGenerationLoading] = useState<Record<string, boolean>>({});
  const [templateGenerationErrors, setTemplateGenerationErrors] = useState<Record<string, string>>({});
  const [templatePrLoading, setTemplatePrLoading] = useState<Record<string, boolean>>({});
  const [templatePrErrors, setTemplatePrErrors] = useState<Record<string, string>>({});
  const [customTemplateRepo, setCustomTemplateRepo] = useState('');
  const [customTemplateFeature, setCustomTemplateFeature] = useState('');
  const [customTemplateError, setCustomTemplateError] = useState('');

  const groupedResearchRecommendations = useMemo(() => {
    const recs = Array.isArray(researchResults?.recommendations)
      ? researchResults.recommendations
      : [];
    const resource: any[] = [];
    const example: any[] = [];
    const action: any[] = [];

    recs.forEach((rec: any) => {
      if (!rec || typeof rec !== 'object') return;
      if (rec.type === 'resource') {
        resource.push(rec);
      } else if (rec.type === 'example') {
        example.push(rec);
      } else if (rec.type === 'action') {
        action.push(rec);
      }
    });

    return {
      resource,
      example,
      action,
      total: resource.length + example.length + action.length,
    };
  }, [researchResults]);

  const normalizedCustomRepo = customTemplateRepo.trim();
  const customTemplateLoading = normalizedCustomRepo ? templateGenerationLoading[normalizedCustomRepo] : false;
  const customTemplateFailure = normalizedCustomRepo ? templateGenerationErrors[normalizedCustomRepo] : '';
  const customTemplateSuccess = normalizedCustomRepo ? generatedTemplates[normalizedCustomRepo] : undefined;
  const customTemplatePrLoading = normalizedCustomRepo ? templatePrLoading[normalizedCustomRepo] : false;
  const customTemplatePrError = normalizedCustomRepo ? templatePrErrors[normalizedCustomRepo] : '';

  useEffect(() => {
    setResourcesExpanded(false);
    setExamplesExpanded(false);
  }, [researchResults]);

  useEffect(() => {
    setExpandedTasks({});
  }, [portfolioTasks.length]);

  const toggleRecommendationSelection = (id: string, checked: boolean) => {
    setSelectedRecommendations((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return Array.from(next);
    });
  };


  const selectAllRecommendations = (items: any[], checked: boolean) => {
    if (!items || items.length === 0) {
      setSelectedRecommendations([]);
      return;
    }
    if (checked) {
      const ids = items.map((item) => item.id);
      setSelectedRecommendations(ids);
    } else {
      setSelectedRecommendations([]);
    }
  };

  const generateTemplateFromExample = async (example: any) => {
    if (!example?.url) {
      return;
    }

    const url: string = example.url;
    setTemplateGenerationErrors((prev) => ({ ...prev, [url]: '' }));
    setTemplateGenerationLoading((prev) => ({ ...prev, [url]: true }));
    setTemplatePrErrors((prev) => ({ ...prev, [url]: '' }));

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          exampleUrl: url,
          featureName: example.name,
          skillName: skillGaps[0]?.name,
          repositoryUrl: repoUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        setGeneratedTemplates((prev) => ({
          ...prev,
          [url]: {
            sourceName: data.sourceName ?? example.name ?? url,
            sourceUrl: data.sourceUrl ?? url,
            templateDirectory: data.templateDirectory,
            branchName: data.branchName,
            instructions: data.instructions ?? [],
            analysisSummary: data.analysisSummary ?? {
              framework: 'unknown',
              templateWorthiness: 0,
              insights: [],
            },
            pullRequestUrl: undefined,
            pullRequestNumber: undefined,
          },
        }));
        addLog(
          'success',
          `Generated template example from ${example.name ?? url}. Saved to ${data.templateDirectory}.`,
          <Sparkles className="h-4 w-4" />
        );
      } else {
        const message = data?.message ?? 'Template generation failed';
        setTemplateGenerationErrors((prev) => ({ ...prev, [url]: message }));
        addLog('warning', message, <AlertCircle className="h-4 w-4" />);
      }
    } catch (error) {
      console.error('Template generation error:', error);
      setTemplateGenerationErrors((prev) => ({
        ...prev,
        [url]: 'Unexpected error while generating template.',
      }));
      addLog('error', 'Unexpected error while generating template example', <AlertCircle className="h-4 w-4" />);
    } finally {
      setTemplateGenerationLoading((prev) => ({ ...prev, [url]: false }));
    }
  };

  const handleManualTemplateGeneration = async () => {
    const url = customTemplateRepo.trim();
    if (!url) {
      setCustomTemplateError('Enter a GitHub repository URL');
      return;
    }

    if (!/^https?:\/\/github\.com\/[^\/]+\/[^\/]+/i.test(url)) {
      setCustomTemplateError('Enter a valid GitHub repository URL');
      return;
    }

    setCustomTemplateError('');
    await generateTemplateFromExample({
      url,
      name: customTemplateFeature || url,
    });
  };

  const createTemplatePullRequest = async (example: any) => {
    if (!example?.url) {
      return;
    }
    if (!repoUrl) {
      addLog('warning', 'Run the analyzer on a repository before creating a template PR.', <AlertCircle className="h-4 w-4" />);
      setTemplatePrErrors((prev) => ({
        ...prev,
        [example.url]: 'Run the analyzer on a repository before creating a template PR.',
      }));
      return;
    }

    const url: string = example.url;
    setTemplatePrErrors((prev) => ({ ...prev, [url]: '' }));
    setTemplatePrLoading((prev) => ({ ...prev, [url]: true }));

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-pr',
          exampleUrl: url,
          featureName: example.name,
          skillName: skillGaps[0]?.name,
          repositoryUrl: repoUrl,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.success && data.pullRequest) {
        setGeneratedTemplates((prev) => {
          const existing = prev[url];
          if (!existing) {
            return prev;
          }
          return {
            ...prev,
            [url]: {
              ...existing,
              pullRequestUrl: data.pullRequest.pullRequestUrl,
              pullRequestNumber: data.pullRequest.number,
              branchName: data.branchName ?? existing.branchName,
            },
          };
        });
        setTemplatePrErrors((prev) => ({ ...prev, [url]: '' }));

        addLog(
          'success',
          `Created pull request ${data.pullRequest.pullRequestUrl}`,
          <GitPullRequest className="h-4 w-4" />
        );
      } else {
        const message = data?.message ?? 'Failed to create pull request';
        setTemplatePrErrors((prev) => ({ ...prev, [url]: message }));
        addLog('warning', message, <AlertCircle className="h-4 w-4" />);
      }
    } catch (error) {
      console.error('Template PR creation error:', error);
      setTemplatePrErrors((prev) => ({
        ...prev,
        [url]: 'Unexpected error while creating pull request.',
      }));
      addLog('error', 'Unexpected error while creating template pull request', <AlertCircle className="h-4 w-4" />);
    } finally {
      setTemplatePrLoading((prev) => ({ ...prev, [url]: false }));
    }
  };

  const gapAnalyzer = useMemo(() => new GapAnalyzerAgent(), []);

  const addLog = (type: ActionLog['type'], message: string, icon?: React.ReactNode) => {
    const log: ActionLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      icon
    };
    setActionLogs(prev => [log, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const getCurrentTaskMessage = (status: AgentStatus): string => {
    switch (status) {
      case 'ANALYZING':
        return 'Analyzing GitHub profile and repositories...';
      case 'RESEARCHING':
        return 'Conducting deep market research on job requirements...';
      case 'PLANNING':
        return 'Analyzing portfolio quality and generating improvement plan...';
      case 'ACTING':
        return 'Creating GitHub issues and improvement tasks...';
      case 'MONITORING':
        return 'Setting up progress tracking and monitoring...';
      case 'COMPLETE':
        return 'Analysis complete! Review your results below.';
      case 'ERROR':
        return 'An error occurred during analysis.';
      default:
        return 'Ready to start analysis';
    }
  };

  const runAgenticWorkflow = async () => {
    const username = githubUsername.trim();
    const directRepoUrl = repoUrlInput.trim();

    if (!username && !directRepoUrl) {
      setError('Please enter a GitHub username or repository URL');
      return;
    }

    setError(null);
    setAgentStatus('ANALYZING');
    setProgress(0);
    setActionLogs([]);
    setSkillGaps([]);
    setPortfolioTasks([]);
    setCareerInsights(null);
    setResearchResults(null);
    setPortfolioData(null);
    setRepoUrl(null);
    setCreatedIssues([]);
    setSelectedRecommendations([]);
    setGeneratedTemplates({});
    setTemplateGenerationLoading({});
    setTemplateGenerationErrors({});
    setTemplatePrLoading({});
    setTemplatePrErrors({});

    try {
      // Phase 1: REAL GitHub Analysis (using existing tool integrations)
      let repoUrl: string | null = null;

      // Priority 1: Use direct repository URL if provided
      if (directRepoUrl) {
        const repoMatch = directRepoUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\/|$)/i);
        if (repoMatch) {
          const [, owner, repo] = repoMatch;
          repoUrl = `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
          addLog('info', `Analyzing repository: ${owner}/${repo}`, <Code className="h-4 w-4" />);
          setProgress(20);
        } else {
          throw new Error('Invalid GitHub repository URL format');
        }
      }
      // Priority 2: Fetch latest repo from username if no direct URL provided
      else if (username) {
        addLog('info', 'Starting GitHub profile analysis...', <Github className="h-4 w-4" />);
        setProgress(10);

        addLog('info', `Fetching repositories for @${username}`, <Search className="h-4 w-4" />);
        setProgress(15);

        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=1`);

        if (!reposResponse.ok) {
          if (reposResponse.status === 404) {
            throw new Error(`GitHub user "${username}" not found`);
          } else if (reposResponse.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Please try again in a few minutes.');
          } else {
            throw new Error(`Failed to fetch GitHub profile (Status: ${reposResponse.status})`);
          }
        }

        const repos = await reposResponse.json();
        if (!repos || repos.length === 0) {
          throw new Error(`No public repositories found for user "${username}"`);
        }

        repoUrl = repos[0].html_url;
        addLog('success', `Found repository: ${repos[0].name}`, <CheckCircle2 className="h-4 w-4" />);
        setProgress(25);

        addLog('info', 'Analyzing repository tech stack...', <Code className="h-4 w-4" />);
        setProgress(30);
      }

      // Ensure we have a repository before proceeding
      if (!repoUrl) {
        throw new Error('Unable to determine a repository to analyze. Please provide a GitHub username or repository URL.');
      }

      // Store repo URL for later use
      setRepoUrl(repoUrl);

      // Use REAL GitHub analysis
      const githubAnalysis = await gapAnalyzer.analyzeGitHubRepository(repoUrl);
      
      addLog('success', `Detected languages: ${githubAnalysis.languages.join(', ')}`, <CheckCircle2 className="h-4 w-4" />);
      if (githubAnalysis.frameworks.length > 0) {
        addLog('info', `Frameworks: ${githubAnalysis.frameworks.join(', ')}`, <Code className="h-4 w-4" />);
      }
      setProgress(40);

      // Generate REAL skill assessment
      addLog('info', 'Generating skill gap analysis...', <Target className="h-4 w-4" />);
      setProgress(50);
      
      const gapAnalysis = await gapAnalyzer.generateAutomaticSkillAssessment(githubAnalysis);

      addLog('success', `Overall skill score: ${gapAnalysis.overallScore}%`, <CheckCircle2 className="h-4 w-4" />);
      addLog('info', `Identified ${gapAnalysis.skillGaps.length} skill gaps`, <Target className="h-4 w-4" />);
      setProgress(55);
      setSkillAssessment(gapAnalysis);

      // Store results on server
      try {
        const contextPayload = {
          targetRole: targetRole || undefined,
          targetIndustry: targetIndustry || undefined,
          professionalGoals: professionalGoals || undefined,
        };

        if (contextPayload.targetRole || contextPayload.targetIndustry || contextPayload.professionalGoals) {
          addLog(
            'info',
            `Captured career focus${contextPayload.targetRole ? `: ${contextPayload.targetRole}` : ''}${contextPayload.targetIndustry ? ` (${contextPayload.targetIndustry})` : ''}`,
            <TrendingUp className="h-4 w-4" />
          );
        }

        await fetch('/api/skill-gaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user_123',
            githubAnalysis: githubAnalysis,
            skillAssessment: gapAnalysis,
            context: contextPayload,
          }),
        });
        addLog('success', 'Skill analysis stored for future reference', <CheckCircle2 className="h-4 w-4" />);
      } catch (storeError) {
        addLog('warning', 'Could not store analysis data', <AlertCircle className="h-4 w-4" />);
      }

      // Set REAL skill gaps
      const topGaps = gapAnalysis.skillGaps.slice(0, 5).map(sg => ({
        id: sg.skill.id,
        name: sg.skill.name,
        currentLevel: sg.skill.currentLevel,
        targetLevel: sg.skill.targetLevel,
        priority: Math.round(sg.priority),
        gap: sg.gap,
        guidance: sg.guidance,
        recommendations: sg.guidance?.recommendedSteps?.length
          ? sg.guidance.recommendedSteps
          : sg.recommendations,
      }));
      setSkillGaps(topGaps);
      setProgress(60);

      // Phase 2: REAL Research Agent (LangGraph)
      setAgentStatus('RESEARCHING');
      addLog('info', 'Activating LangGraph Research Agent...', <Brain className="h-4 w-4" />);
      setProgress(60);

      try {
        // Run research agent for each skill gap
        addLog('info', `Researching ${topGaps.length} skill gaps...`, <Search className="h-4 w-4" />);

        const researchResponse = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user_123',
            skillGap: topGaps[0]?.name || gapAnalysis.skillGaps[0]?.skill.name,
            detectedLanguage: githubAnalysis.languages[0] || 'unknown',
            userContext: professionalGoals || `Learning ${topGaps[0]?.name || 'new skills'}`,
            targetRole,
            targetIndustry,
            focusSkills: topGaps.map(g => ({
              name: g.name,
              gap: g.gap,
              priority: g.priority
            })),
            learningObjectives: gapAnalysis.recommendations?.slice(0, 3) || [],
          }),
        });

        if (researchResponse.ok) {
          const researchData = await researchResponse.json();

          // Store research results for display
          setResearchResults(researchData);

          addLog('success', `Found ${researchData.resources?.length || 0} learning resources`, <CheckCircle2 className="h-4 w-4" />);
          addLog('success', `Found ${researchData.examples?.length || 0} GitHub examples`, <CheckCircle2 className="h-4 w-4" />);
          addLog('success', `Generated ${researchData.recommendations?.length || 0} personalized recommendations`, <CheckCircle2 className="h-4 w-4" />);
          setProgress(65);
        } else {
          addLog('warning', 'Research agent returned no results, continuing...', <AlertCircle className="h-4 w-4" />);
        }
      } catch (researchError) {
        addLog('warning', 'Research agent failed, using fallback data', <AlertCircle className="h-4 w-4" />);
        console.error('Research error:', researchError);
      }

      setProgress(70);

      // Phase 3: REAL Portfolio Builder Agent
      setAgentStatus('PLANNING');
      addLog('info', 'Portfolio Builder Agent activated', <Rocket className="h-4 w-4" />);
      setProgress(70);

      let portfolioDataForContext: any = null;
      let portfolioTasksForContext: PortfolioTask[] = [];

      try {
        // Analyze repository quality
        addLog('info', 'Analyzing portfolio quality and completeness...', <Activity className="h-4 w-4" />);
        setProgress(75);

        const portfolioResponse = await fetch('/api/portfolio-builder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl: repoUrl,
            researchResults: researchResults, // Pass research results to enrich recommendations
            skillAssessment: gapAnalysis,
            createIssues: false, // Don't create issues automatically (can be enabled later)
          }),
        });

          if (portfolioResponse.ok) {
            const portfolioDataResult = await portfolioResponse.json();

            console.log('[Portfolio API Response]', portfolioDataResult);

            // Store portfolio data for later use
            setPortfolioData(portfolioDataResult);
            portfolioDataForContext = portfolioDataResult; // Keep reference for context

            const defaultSelected = (portfolioDataResult.recommendations || [])
              .filter((rec: any) => !rec.weakness?.optional)
              .map((rec: any) => rec.id);
            if (defaultSelected.length === 0 && (portfolioDataResult.recommendations || []).length > 0) {
              defaultSelected.push(portfolioDataResult.recommendations[0].id);
            }
            setSelectedRecommendations(defaultSelected);

            // Log findings
            addLog('success', `Portfolio quality: ${portfolioDataResult.analysis.overallQuality}%`, <CheckCircle2 className="h-4 w-4" />);

          if (portfolioDataResult.analysis.weaknesses.length > 0) {
            portfolioDataResult.analysis.weaknesses.forEach((weakness: any) => {
              addLog('warning', weakness.title, <AlertCircle className="h-4 w-4" />);
            });
          }

          addLog('info', `Generated ${portfolioDataResult.recommendations.length} improvement recommendations`, <Sparkles className="h-4 w-4" />);
          setProgress(80);

          // Phase 4: Show improvement tasks (GitHub issues will be created on demand)
          setAgentStatus('ACTING');
          addLog('info', 'Generating portfolio improvement tasks...', <GitPullRequest className="h-4 w-4" />);
          setProgress(85);

          // Convert recommendations to portfolio tasks for display
          const tasks: PortfolioTask[] = portfolioDataResult.recommendations.map((rec: any, index: number) => ({
            id: rec.id,
            title: rec.title,
            type: rec.weakness.type === 'testing' ? 'test' :
                  rec.weakness.type === 'readme' ? 'readme' :
                  rec.weakness.type === 'skill' ? 'skill' :
                  rec.weakness.type === 'cicd' ? 'issue' : 'documentation',
            status: 'pending' as const,
            priority: rec.weakness.severity as 'high' | 'medium' | 'low',
            optional: rec.weakness.optional,
            skillName: rec.skillGap?.skill?.name,
            description: rec.description,
            actionItems: rec.actionItems ?? [],
            estimatedEffort: rec.estimatedEffort,
            weakness: rec.weakness,
          }));

          setPortfolioTasks(tasks);
          portfolioTasksForContext = tasks; // Keep reference for context

          addLog('success', `Generated ${tasks.length} improvement tasks (awaiting your approval to create GitHub issues)`, <CheckCircle2 className="h-4 w-4" />);
          const skillTaskCount = portfolioDataResult.recommendations.filter((rec: any) => rec.weakness?.type === 'skill').length;
          if (skillTaskCount > 0) {
            addLog('success', `Mapped ${skillTaskCount} tasks directly to your top skill gaps`, <Sparkles className="h-4 w-4" />);
          }
          addLog('info', 'Use the checkboxes in Portfolio Builder to choose which tasks become GitHub issues.', <GitPullRequest className="h-4 w-4" />);
          setProgress(90);
        } else {
          addLog('warning', 'Portfolio analysis returned no results, continuing...', <AlertCircle className="h-4 w-4" />);
          setProgress(85);
        }
      } catch (portfolioError) {
        addLog('warning', 'Portfolio Builder failed, skipping...', <AlertCircle className="h-4 w-4" />);
        console.error('Portfolio Builder error:', portfolioError);
        setProgress(85);
      }

      // Phase 5: Career Insights
      addLog('info', 'Generating personalized career insights...', <TrendingUp className="h-4 w-4" />);
      setProgress(95);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use real research results for career insights
      if (researchResults?.recommendations) {
        const topResourceRecs = researchResults.recommendations
          .filter((r: any) => r.type === 'resource')
          .slice(0, 3)
          .map((r: any) => r.title);

        const careerInsightsData = {
          targetRole: targetRole || 'Senior Full-Stack Engineer',
          targetIndustry: targetIndustry || 'Technology',
          avgSalary: '$135,000 - $180,000',
          topCompanies: ['Google', 'Meta', 'Stripe', 'Vercel', 'Netflix'],
          timeToReady: '3-6 months',
          recommendedCourses: topResourceRecs.length > 0 ? topResourceRecs : [
            'Kubernetes for Developers (Udemy)',
            'System Design Interview Prep (Frontend Masters)',
            'Testing JavaScript (Kent C. Dodds)'
          ],
          researchData: researchResults // Store full research data
        };
        setCareerInsights(careerInsightsData);
      }
      addLog('success', 'Career research complete', <CheckCircle2 className="h-4 w-4" />);

      // Complete
      setProgress(100);
      setAgentStatus('COMPLETE');
      addLog('success', '✅ Agentic analysis complete! Ready to level up.', <Sparkles className="h-4 w-4" />);

      // Save results to context for other pages to access
      if (repoUrl) {
        const agentLogsForContext = actionLogs.map(log => ({
          agent: 'Skill Analyzer',
          status: log.type,
          message: log.message,
          timestamp: new Date()
        }));

        console.log('[Context] Setting analysis results with portfolioData:', portfolioDataForContext);
        console.log('[Context] portfolioTasks:', portfolioTasksForContext);
        console.log('[Context] researchResults:', researchResults);
        console.log('[Context] Learning resources count:', researchResults?.resources?.length || 0);
        console.log('[Context] GitHub examples count:', researchResults?.examples?.length || 0);

        setAnalysisResults({
          repoUrl,
          portfolioQuality: portfolioDataForContext?.analysis ? {
            overallScore: portfolioDataForContext.analysis.overallQuality,
            strengths: portfolioDataForContext.analysis.strengths || [],
            weaknesses: portfolioDataForContext.analysis.weaknesses || [],
            recommendations: portfolioDataForContext.recommendations || []
          } : null,
          skillGaps: skillGaps.map(gap => ({
            skill: gap.name,
            importance: String(gap.priority),
            reasoning: gap.guidance?.reasoning || gap.gap
          })),
          portfolioActions: portfolioTasksForContext.length > 0 ? portfolioTasksForContext.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            estimatedTime: task.estimatedEffort || 'Unknown',
            category: task.type
          })) : [],
          researchResults: researchResults?.resources?.map((resource: any) => ({
            title: resource.title,
            url: resource.url,
            description: resource.description,
            type: 'article' as const,
            relevance: resource.score ? `${(resource.score * 100).toFixed(0)}%` : undefined
          })) || [],
          githubExamples: researchResults?.examples?.map((example: any) => ({
            name: example.name,
            url: example.url,
            description: example.description,
            stars: example.stars,
            language: example.language
          })) || [],
          templates: [],
          agentLogs: agentLogsForContext
        });
      }

    } catch (err) {
      setAgentStatus('ERROR');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      addLog('error', `Analysis failed: ${errorMessage}`, <AlertCircle className="h-4 w-4" />);
    }
  };

  const handleCreateGitHubIssues = async () => {
    if (!repoUrl || !portfolioData) {
      console.error('Missing repo URL or portfolio data');
      return;
    }

    const selectedRecs = (portfolioData.recommendations || []).filter((rec: any) =>
      selectedRecommendations.includes(rec.id)
    );

    if (selectedRecs.length === 0) {
      addLog('warning', 'Select at least one recommendation before creating GitHub issues.', <AlertCircle className="h-4 w-4" />);
      return;
    }

    setCreatedIssues([]);
    setIsCreatingIssues(true);
    addLog('info', `User selected ${selectedRecs.length} improvement${selectedRecs.length > 1 ? 's' : ''} for issue creation...`, <GitPullRequest className="h-4 w-4" />);

    try {
      const optionalSkippedCount = (portfolioData.recommendations || []).filter(
        (rec: any) => rec.weakness?.optional && !selectedRecommendations.includes(rec.id)
      ).length;
      if (optionalSkippedCount > 0) {
        addLog('info', `Skipping ${optionalSkippedCount} optional improvement${optionalSkippedCount > 1 ? 's' : ''}. Select them in the Portfolio Builder checklist to include.`, <AlertCircle className="h-4 w-4" />);
      }

      const createIssuesResponse = await fetch('/api/portfolio-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl,
          researchResults: researchResults,
          skillAssessment: skillAssessment,
          recommendationIds: selectedRecs.map((rec: any) => rec.id),
          includeOptionalImprovements: selectedRecs.some((rec: any) => rec.weakness?.optional),
          createIssues: true,
        }),
      });

      if (createIssuesResponse.ok) {
        const result = await createIssuesResponse.json();

        if (result.issues) {
          const successfulIssues = result.issues.filter((issue: any) => issue.success);
          setCreatedIssues(successfulIssues);

          addLog('success', `✅ Successfully created ${successfulIssues.length} GitHub issue${successfulIssues.length === 1 ? '' : 's'}!`, <CheckCircle2 className="h-4 w-4" />);

          successfulIssues.forEach((issue: any) => {
            addLog('success', `Created: ${issue.title}`, <GitPullRequest className="h-4 w-4" />);
          });
        }
      } else {
        addLog('error', 'Failed to create GitHub issues', <AlertCircle className="h-4 w-4" />);
      }
    } catch (error) {
      console.error('Error creating issues:', error);
      addLog('error', 'Error creating GitHub issues', <AlertCircle className="h-4 w-4" />);
    } finally {
      setIsCreatingIssues(false);
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'IDLE': return 'text-muted-foreground';
      case 'ANALYZING': return 'text-blue-600';
      case 'RESEARCHING': return 'text-purple-600';
      case 'PLANNING': return 'text-orange-600';
      case 'ACTING': return 'text-green-600';
      case 'MONITORING': return 'text-yellow-600';
      case 'COMPLETE': return 'text-green-600';
      case 'ERROR': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'IDLE': return <Clock className="h-5 w-5" />;
      case 'ANALYZING': return <Search className="h-5 w-5 animate-pulse" />;
      case 'RESEARCHING': return <Brain className="h-5 w-5 animate-pulse" />;
      case 'PLANNING': return <Target className="h-5 w-5 animate-pulse" />;
      case 'ACTING': return <Rocket className="h-5 w-5 animate-pulse" />;
      case 'MONITORING': return <Activity className="h-5 w-5 animate-pulse" />;
      case 'COMPLETE': return <CheckCircle2 className="h-5 w-5" />;
      case 'ERROR': return <AlertCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const canEditInputs = agentStatus === 'IDLE' || agentStatus === 'ERROR' || agentStatus === 'COMPLETE';

  return (
    <div className="space-y-6">
      {/* Sticky Agent Status Bar */}
      <StickyAgentStatus
        status={agentStatus}
        progress={progress}
        currentTask={getCurrentTaskMessage(agentStatus)}
        estimatedTimeRemaining="2 min"
        onViewLogs={() => {
          const logElement = document.getElementById('activity-log');
          if (logElement) {
            logElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      {showMarketing && (
        <>
          {/* Animated Hero Section */}
          <AnimatedHero />

          {/* Animated Features Section */}
          <div id="features">
            <AnimatedFeatures />
          </div>

          {/* Animated How It Works Section */}
          <AnimatedHowItWorks />
        </>
      )}

      {/* Analysis Input Section */}
      <div id="demo" className="scroll-mt-20">
        <Card className="border-2 border-purple-400/40 bg-gradient-to-br from-purple-700/40 via-purple-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(168,85,247,0.25)] backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/10">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center space-x-2">
                  <span className="text-white">Agentic Skill Analyzer</span>
                </CardTitle>
                <CardDescription className="text-base text-white/80 leading-relaxed mt-1">
                  Drop a GitHub username or repository URL and let autonomous agents audit your work, map skill gaps, and build a market-aligned learning plan.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-100/90 tracking-wide">GitHub Username</label>
                <Input
                  placeholder="e.g. octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (githubUsername.trim() || repoUrlInput.trim()) && canEditInputs) {
                      runAgenticWorkflow();
                    }
                  }}
                  className="h-14 text-xl bg-purple-200/10 border-purple-300/30 text-white placeholder:text-purple-200/70 focus-visible:ring-purple-200/40 rounded-xl px-5"
                  disabled={!canEditInputs}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-100/90 tracking-wide">Repository URL (Optional)</label>
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (githubUsername.trim() || repoUrlInput.trim()) && canEditInputs) {
                      runAgenticWorkflow();
                    }
                  }}
                  className="h-14 text-xl bg-purple-200/10 border-purple-300/30 text-white placeholder:text-purple-200/70 focus-visible:ring-purple-200/40 rounded-xl px-5"
                  disabled={!canEditInputs}
                />
              </div>
            </div>
            <Button
              size="lg"
              onClick={runAgenticWorkflow}
              disabled={(!githubUsername.trim() && !repoUrlInput.trim()) || !canEditInputs}
              className="w-full h-14 text-xl font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition-all"
            >
              {!canEditInputs ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Activate Agent
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border border-purple-300/20 bg-purple-900/40 p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-white">Career Goals & Focus</p>
                <p className="text-sm text-white/75">
                  Guide the research agent toward the roles and industries you care about.
                </p>
              </div>
              <Badge variant="secondary" className="uppercase text-[11px] tracking-wide">
                Optional
              </Badge>
            </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-purple-200/80 tracking-widest">Target Role</label>
                <Input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  disabled={!canEditInputs}
                  className="bg-purple-200/10 border-purple-300/25 text-white placeholder:text-purple-200/60 focus-visible:ring-purple-200/40 text-2xl rounded-lg px-5 py-4"
                />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase text-purple-200/80 tracking-widest">Target Industry</label>
                <Input
                  value={targetIndustry}
                  onChange={(event) => setTargetIndustry(event.target.value)}
                  placeholder="e.g. Healthcare, Fintech, Climate"
                  disabled={!canEditInputs}
                  className="bg-purple-200/10 border-purple-300/25 text-white placeholder:text-purple-200/60 focus-visible:ring-purple-200/40 text-2xl rounded-lg px-5 py-4"
                />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase text-purple-200/80 tracking-widest">Professional Goals</label>
                <Textarea
                  value={professionalGoals}
                  onChange={(event) => setProfessionalGoals(event.target.value)}
                  placeholder="Describe what you want to achieve in the next 6-12 months"
                  rows={3}
                  disabled={!canEditInputs}
                  className="bg-purple-200/10 border-purple-300/25 text-white placeholder:text-purple-200/60 focus-visible:ring-purple-200/40 text-2xl rounded-lg px-5 py-4"
                />
              </div>
            </div>

          {progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 text-base font-semibold ${getStatusColor(agentStatus)}`}>
                  {getStatusIcon(agentStatus)}
                  <span>Agent Status: {agentStatus}</span>
                </div>
                <span className="text-sm text-muted-foreground font-medium">{progress}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Agent Activity */}
      {(progress > 0 || actionLogs.length > 0) && (
        <Card id="activity-log" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Agent Activity</span>
            </CardTitle>
            <CardDescription>
              Real-time agent actions and decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                {actionLogs.length > 0 ? (
                  actionLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`w-full rounded-xl border p-4 text-sm transition-all duration-300 ${
                        log.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : log.type === 'error'
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                            : log.type === 'warning'
                              ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {log.icon}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                            Step {index + 1}
                          </div>
                          <p className="break-words font-medium text-slate-800 dark:text-slate-100">
                            {log.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {log.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full rounded-xl border border-blue-200/60 bg-blue-50/70 p-4 text-sm text-blue-900">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />
                      <span>Agent initializing...</span>
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {agentStatus === 'COMPLETE' && (
        <>
          {/* Overall Skill Score Card */}
          {skillAssessment && (
            <Card className="mb-6 border-2 border-blue-400/40 bg-gradient-to-br from-blue-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(59,130,246,0.25)] backdrop-blur-md">
              <CardContent className="pt-8">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="transform -rotate-90" viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgba(59, 130, 246, 0.2)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgb(59, 130, 246)"
                          strokeWidth="8"
                          strokeDasharray={`${2.827 * skillAssessment.overallScore} ${282.7}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className={`text-5xl font-bold ${
                          skillAssessment.overallScore >= 80 ? 'text-emerald-300' :
                          skillAssessment.overallScore >= 60 ? 'text-yellow-300' :
                          'text-red-300'
                        }`}>
                          {skillAssessment.overallScore}%
                        </div>
                        <p className="text-sm text-blue-200/70 mt-1">Overall Ready</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">Your Skill Assessment</h3>
                    <p className="text-blue-100/70 text-base">
                      {skillAssessment.overallScore >= 80 ? 'You are excellent shape to pursue your target role!' :
                       skillAssessment.overallScore >= 60 ? 'You have a solid foundation. Focus on closing skill gaps to accelerate your growth.' :
                       'Start with the skill gaps below to build the foundation needed for your target role.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card id="skill-gaps-card" className="mb-6 border-2 border-blue-400/40 bg-gradient-to-br from-blue-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(59,130,246,0.25)] backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Target className="h-5 w-5" />
                <span>Skill Gaps Identified</span>
              </CardTitle>
              <CardDescription className="text-white/80">
                Based on market research and job requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {skillGaps.length > 0 ? (
                <div className="space-y-3">
                  {skillGaps.map((gap, index) => (
                    <InteractiveSkillCard
                      key={index}
                      skill={gap}
                      onStartLearning={(skillName) => {
                        console.log('Starting learning path for:', skillName);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Skill gaps will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation CTA to Portfolio and Learning Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Link href="/agentic/portfolio">
              <Card className="h-full border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md hover:shadow-[0_0_50px_rgba(16,185,129,0.35)] transition-all cursor-pointer">
                <CardContent className="pt-8">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
                        <Rocket className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">Portfolio Builder</h3>
                    <p className="text-emerald-100/70 text-sm">
                      Review your portfolio quality and create GitHub issues for improvements
                    </p>
                    <div className="flex items-center justify-center gap-2 text-emerald-300">
                      <span className="text-sm font-medium">Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/agentic/learning">
              <Card className="h-full border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-md hover:shadow-[0_0_50px_rgba(99,102,241,0.35)] transition-all cursor-pointer">
                <CardContent className="pt-8">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">Learning Resources</h3>
                    <p className="text-indigo-100/70 text-sm">
                      Access AI-curated learning materials tailored to your skill gaps
                    </p>
                    <div className="flex items-center justify-center gap-2 text-indigo-300">
                      <span className="text-sm font-medium">Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
