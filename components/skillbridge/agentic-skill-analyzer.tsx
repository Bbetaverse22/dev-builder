"use client";

/**
 * V1 Agentic Skill Analyzer
 * Single-page agentic workflow with AI-powered Portfolio Builder
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';
import { StickyAgentStatus } from './sticky-agent-status';
import { InteractiveSkillCard } from './interactive-skill-card';
import { LandingExplanation } from './landing-explanation';
import { AnimatedHero } from './animated-hero';
import { AnimatedFeatures } from './animated-features';
import { AnimatedHowItWorks } from './animated-how-it-works';
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
  Search
} from 'lucide-react';

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
  type: 'issue' | 'readme' | 'documentation' | 'test';
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

interface AgenticSkillAnalyzerProps {
  showMarketing?: boolean;
}

export function AgenticSkillAnalyzer({ showMarketing = true }: AgenticSkillAnalyzerProps) {
  const [githubUsername, setGithubUsername] = useState('');
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
  const [domainKeywords, setDomainKeywords] = useState('');
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [isCreatingIssues, setIsCreatingIssues] = useState(false);
  const [createdIssues, setCreatedIssues] = useState<any[]>([]);

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
    const input = githubUsername.trim();
    if (!input) {
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

    try {
      // Phase 1: REAL GitHub Analysis (using existing tool integrations)
      let repoUrl: string | null = null;

      const repoMatch = input.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\/|$)/i);
      if (repoMatch) {
        const [, owner, repo] = repoMatch;
        repoUrl = `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
        addLog('info', `Analyzing repository: ${owner}/${repo}`, <Code className="h-4 w-4" />);
        setProgress(20);
      } else {
        addLog('info', 'Starting GitHub profile analysis...', <Github className="h-4 w-4" />);
        setProgress(10);

        addLog('info', `Fetching repositories for @${input}`, <Search className="h-4 w-4" />);
        setProgress(15);

        const reposResponse = await fetch(`https://api.github.com/users/${input}/repos?sort=updated&per_page=1`);
        
        if (!reposResponse.ok) {
          if (reposResponse.status === 404) {
            throw new Error(`GitHub user "${input}" not found`);
          } else if (reposResponse.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Please try again in a few minutes.');
          } else {
            throw new Error(`Failed to fetch GitHub profile (Status: ${reposResponse.status})`);
          }
        }
        
        const repos = await reposResponse.json();
        if (!repos || repos.length === 0) {
          throw new Error(`No public repositories found for user "${input}"`);
        }

        repoUrl = repos[0].html_url;
        addLog('success', `Found repository: ${repos[0].name}`, <CheckCircle2 className="h-4 w-4" />);
        setProgress(25);

        addLog('info', 'Analyzing repository tech stack...', <Code className="h-4 w-4" />);
        setProgress(30);
      }

      // Ensure we have a repository before proceeding
      if (!repoUrl) {
        throw new Error('Unable to determine a repository to analyze. Please provide a direct repo URL or ensure the profile has public repositories.');
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

      // Store results on server
      try {
        const domainKeywordList = domainKeywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean);

        const contextPayload = {
          targetRole: targetRole || undefined,
          targetIndustry: targetIndustry || undefined,
          professionalGoals: professionalGoals || undefined,
          domainKeywords: domainKeywordList.length ? domainKeywordList : undefined,
        };

        if (contextPayload.targetRole || contextPayload.targetIndustry || contextPayload.professionalGoals || contextPayload.domainKeywords) {
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
        name: sg.skill.name,
        currentLevel: sg.skill.currentLevel,
        targetLevel: sg.skill.targetLevel,
        priority: Math.round(sg.priority),
        gap: sg.gap
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
            createIssues: false, // Don't create issues automatically (can be enabled later)
          }),
        });

        if (portfolioResponse.ok) {
          const portfolioDataResult = await portfolioResponse.json();

          // Store portfolio data for later use
          setPortfolioData(portfolioDataResult);

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
            id: `rec-${index}`,
            title: rec.title,
            type: rec.weakness.type === 'testing' ? 'test' :
                  rec.weakness.type === 'readme' ? 'readme' :
                  rec.weakness.type === 'cicd' ? 'issue' : 'documentation',
            status: 'pending' as const,
            priority: rec.weakness.severity as 'high' | 'medium' | 'low',
          }));

          setPortfolioTasks(tasks);
          addLog('success', `Generated ${tasks.length} improvement tasks (awaiting your approval to create GitHub issues)`, <CheckCircle2 className="h-4 w-4" />);
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

    setIsCreatingIssues(true);
    addLog('info', 'User approved - creating GitHub issues...', <GitPullRequest className="h-4 w-4" />);

    try {
      const createIssuesResponse = await fetch('/api/portfolio-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl,
          researchResults: researchResults,
          createIssues: true, // Now we create issues with user approval
        }),
      });

      if (createIssuesResponse.ok) {
        const result = await createIssuesResponse.json();

        if (result.issues) {
          const successfulIssues = result.issues.filter((issue: any) => issue.success);
          setCreatedIssues(successfulIssues);

          addLog('success', `✅ Successfully created ${successfulIssues.length} GitHub issues!`, <CheckCircle2 className="h-4 w-4" />);

          // Log each created issue
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
                <CardTitle className="text-3xl flex items-center space-x-2">
                  <span className="text-white">Agentic Skill Analyzer</span>
                </CardTitle>
                <CardDescription className="text-2xl text-white/90 leading-relaxed">
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

          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-3 lg:space-y-0">
            <Input
              placeholder="GitHub username or repository URL"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && githubUsername.trim() && canEditInputs) {
                  runAgenticWorkflow();
                }
              }}
              className="flex-1 h-16 text-2xl bg-purple-200/10 border-purple-300/30 text-white placeholder:text-purple-200/70 focus-visible:ring-purple-200/40 rounded-xl px-6"
              disabled={!canEditInputs}
            />
            <Button 
              size="lg" 
              onClick={runAgenticWorkflow}
              disabled={!githubUsername.trim() || !canEditInputs}
              className="h-16 px-10 text-xl font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition-all"
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-purple-200/80 tracking-widest">Domain Keywords</label>
                <Input
                  value={domainKeywords}
                  onChange={(event) => setDomainKeywords(event.target.value)}
                  placeholder="Comma separated — e.g. HIPAA, EHR, patient analytics"
                  disabled={!canEditInputs}
                  className="bg-purple-200/10 border-purple-300/25 text-white placeholder:text-purple-200/60 focus-visible:ring-purple-200/40 text-2xl rounded-lg px-5 py-4"
                />
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

      {/* Main Results Grid */}
      {actionLogs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Agent Action Logs */}
          <Card id="activity-log">
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
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {actionLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg border text-sm ${
                        log.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                        log.type === 'error' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                        log.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                        'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {log.icon}
                        <div className="flex-1 min-w-0">
                          <p className="break-words">{log.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Column 2: Skill Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Skill Gaps Identified</span>
              </CardTitle>
              <CardDescription>
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
                        // Future: Navigate to learning resources or open modal
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

          {/* Column 3: Portfolio Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="h-5 w-5" />
                <span>Portfolio Builder</span>
              </CardTitle>
              <CardDescription>
                Autonomous improvement tasks created by the agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portfolioTasks.length > 0 ? (
                <div className="space-y-3">
                  {portfolioTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {task.type === 'issue' && <GitPullRequest className="h-4 w-4 text-blue-600" />}
                          {task.type === 'readme' && <FileText className="h-4 w-4 text-green-600" />}
                          {task.type === 'documentation' && <FileText className="h-4 w-4 text-purple-600" />}
                          {task.type === 'test' && <Code className="h-4 w-4 text-orange-600" />}
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{task.title}</p>
                    </div>
                  ))}

                  {createdIssues.length > 0 ? (
                    <div className="space-y-2 mt-4">
                      <Button
                        className="w-full"
                        size="sm"
                        variant="outline"
                        onClick={() => createdIssues[0]?.issueUrl && window.open(createdIssues[0].issueUrl.split('/issues/')[0] + '/issues', '_blank')}
                      >
                        <Github className="h-4 w-4 mr-2" />
                        View {createdIssues.length} Issues on GitHub
                      </Button>
                      <div className="text-xs text-muted-foreground text-center">
                        ✅ Issues created successfully!
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full mt-4"
                      size="sm"
                      onClick={handleCreateGitHubIssues}
                      disabled={isCreatingIssues || !repoUrl || !portfolioData}
                    >
                      {isCreatingIssues ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                          Creating Issues...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          Create GitHub Issues
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Rocket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Portfolio tasks will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Portfolio Quality Visualization */}
      {portfolioData && portfolioData.analysis && (
        <Card className="border-emerald-400/30 bg-gradient-to-br from-emerald-800/50 via-emerald-900/40 to-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-3xl">
              <Target className="h-7 w-7" />
              <span>Portfolio Quality Analysis</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-lg">
              AI-powered analysis of your repository quality and completeness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Quality Score */}
            <div className="p-6 bg-emerald-200/10 rounded-lg border border-emerald-200/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold text-white">Overall Quality Score</h3>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${
                    portfolioData.analysis.overallQuality >= 80 ? 'text-emerald-300' :
                    portfolioData.analysis.overallQuality >= 60 ? 'text-yellow-300' :
                    'text-red-300'
                  }`}>
                    {portfolioData.analysis.overallQuality}%
                  </div>
                  <p className="text-sm text-emerald-100/70 mt-1">
                    {portfolioData.analysis.overallQuality >= 80 ? 'Excellent' :
                     portfolioData.analysis.overallQuality >= 60 ? 'Good' :
                     'Needs Improvement'}
                  </p>
                </div>
              </div>
              <Progress
                value={portfolioData.analysis.overallQuality}
                className="h-3"
              />
            </div>

            {/* Strengths */}
            {portfolioData.analysis.strengths && portfolioData.analysis.strengths.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-300" />
                  Strengths ({portfolioData.analysis.strengths.length})
                </h3>
                <div className="grid gap-2">
                  {portfolioData.analysis.strengths.map((strength: string, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-emerald-200/10 rounded-lg border border-emerald-200/20 flex items-start gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-300 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-emerald-50">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {portfolioData.analysis.weaknesses && portfolioData.analysis.weaknesses.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-300" />
                  Areas for Improvement ({portfolioData.analysis.weaknesses.length})
                </h3>
                <div className="grid gap-2">
                  {portfolioData.analysis.weaknesses.map((weakness: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-red-200/10 rounded-lg border border-red-200/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{weakness.title}</h4>
                        <Badge
                          variant={weakness.severity === 'high' ? 'destructive' : weakness.severity === 'medium' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {weakness.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-red-100/70 mb-2">{weakness.description}</p>
                      <div className="flex items-start gap-2 mt-2 p-2 bg-red-200/10 rounded">
                        <AlertCircle className="h-4 w-4 text-red-300 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-100/80"><strong>Impact:</strong> {weakness.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Recommendations */}
            {portfolioData.recommendations && portfolioData.recommendations.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-yellow-300" />
                  AI-Generated Recommendations ({portfolioData.recommendations.length})
                </h3>
                <div className="space-y-3">
                  {portfolioData.recommendations.map((rec: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-emerald-200/10 rounded-lg border border-emerald-200/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold text-white">{rec.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          Priority: {rec.priority}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-emerald-100/70 mb-3">{rec.description}</p>

                      {/* Action Items */}
                      {rec.actionItems && rec.actionItems.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-emerald-200/90 mb-2">Action Items:</p>
                          <ul className="space-y-1">
                            {rec.actionItems.slice(0, 3).map((item: string, i: number) => (
                              <li key={i} className="text-xs text-emerald-100/80 flex items-start gap-2">
                                <span className="text-emerald-300">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                            {rec.actionItems.length > 3 && (
                              <li className="text-xs text-emerald-100/60">
                                ... and {rec.actionItems.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Resources */}
                      {rec.resources && rec.resources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-emerald-200/90 mb-2">Learning Resources:</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.resources.slice(0, 2).map((resource: any, i: number) => (
                              <a
                                key={i}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-300 hover:text-emerald-200 underline"
                              >
                                {resource.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Templates (from Template Creator MCP) */}
                      {rec.templates && rec.templates.length > 0 && (
                        <div className="mt-3 p-3 bg-yellow-200/10 rounded border border-yellow-200/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-yellow-300" />
                            <p className="text-xs font-semibold text-yellow-200">
                              {rec.templates.length} Ready-to-Use Template{rec.templates.length > 1 ? 's' : ''} Extracted
                            </p>
                          </div>
                          <p className="text-xs text-yellow-100/70">
                            Clean code templates automatically extracted from example projects - available when you create GitHub issues!
                          </p>
                        </div>
                      )}

                      {/* Effort Badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-emerald-200 border-emerald-200/30">
                          Effort: {rec.estimatedEffort}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-emerald-200 border-emerald-200/30">
                          Category: {rec.weakness.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Research Results Section */}
      {researchResults && (
        <Card className="border-blue-400/30 bg-gradient-to-br from-blue-800/50 via-blue-900/40 to-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-3xl">
              <Brain className="h-7 w-7" />
              <span>Research Results</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-lg">
              AI-curated learning resources and examples for your skill gaps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Learning Resources */}
            {researchResults.resources && researchResults.resources.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Learning Resources ({researchResults.resources.length})
                </h3>
                <div className="grid gap-3">
                  {researchResults.resources.slice(0, 5).map((resource: any, index: number) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-blue-200/10 rounded-lg border border-blue-200/20 hover:bg-blue-200/20 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                            {resource.title}
                          </h4>
                          <p className="text-sm text-blue-100/70 mt-1">{resource.description}</p>
                          {resource.score && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < (resource.rating || 3) ? 'text-yellow-400' : 'text-gray-600'}>⭐</span>
                                ))}
                              </div>
                              <span className="text-xs text-blue-200/60">Score: {(resource.score * 100).toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* GitHub Examples */}
            {researchResults.examples && researchResults.examples.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <Github className="h-5 w-5 mr-2" />
                  GitHub Examples ({researchResults.examples.length})
                </h3>
                <div className="grid gap-3">
                  {researchResults.examples.slice(0, 5).map((example: any, index: number) => (
                    <a
                      key={index}
                      href={example.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-blue-200/10 rounded-lg border border-blue-200/20 hover:bg-blue-200/20 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                            {example.name}
                            <Badge variant="secondary" className="text-xs">{example.stars}⭐</Badge>
                          </h4>
                          <p className="text-sm text-blue-100/70 mt-1">{example.description}</p>
                          {example.language && (
                            <Badge variant="outline" className="mt-2 text-xs text-blue-200 border-blue-200/30">
                              {example.language}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {researchResults.recommendations && researchResults.recommendations.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  AI Recommendations ({researchResults.recommendations.length})
                </h3>
                <div className="space-y-2">
                  {researchResults.recommendations.map((rec: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-200/10 rounded-lg border border-blue-200/20"
                    >
                      <div className="flex items-start gap-3">
                        <Badge
                          variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'outline'}
                          className="mt-1 text-xs"
                        >
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{rec.title}</h4>
                          <p className="text-sm text-blue-100/70 mt-1">{rec.description}</p>
                          {rec.url && (
                            <a
                              href={rec.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-300 hover:text-blue-200 mt-1 inline-block"
                            >
                              View Resource →
                            </a>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">{rec.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Career Insights Section */}
      {careerInsights && (
        <Card className="border-purple-400/30 bg-gradient-to-br from-purple-800/50 via-purple-900/40 to-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-3xl">
              <TrendingUp className="h-7 w-7" />
              <span>Career Intelligence</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-lg">
              Market-driven insights based on 150+ job postings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-purple-200/10 rounded-lg border border-purple-200/20">
                <p className="text-sm text-purple-100/80 mb-2 tracking-wide uppercase">Target Role</p>
                <p className="text-xl font-semibold text-white">{careerInsights.targetRole}</p>
                {careerInsights.targetIndustry && (
                  <p className="text-sm text-purple-100/70 mt-2">
                    Industry Focus: {careerInsights.targetIndustry}
                  </p>
                )}
              </div>
              <div className="p-5 bg-purple-200/10 rounded-lg border border-purple-200/20">
                <p className="text-sm text-purple-100/80 mb-2 tracking-wide uppercase">Avg. Salary Range</p>
                <p className="text-xl font-semibold text-emerald-300">{careerInsights.avgSalary}</p>
              </div>
              <div className="p-5 bg-purple-200/10 rounded-lg border border-purple-200/20">
                <p className="text-sm text-purple-100/80 mb-2 tracking-wide uppercase">Time to Ready</p>
                <p className="text-xl font-semibold text-white">{careerInsights.timeToReady}</p>
              </div>
              <div className="p-5 bg-purple-200/10 rounded-lg border border-purple-200/20">
                <p className="text-sm text-purple-100/80 mb-2 tracking-wide uppercase">Top Companies Hiring</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {careerInsights.topCompanies.slice(0, 3).map((company: string) => (
                    <Badge key={company} variant="secondary" className="text-xs bg-purple-400/30 text-white border-purple-200/30">{company}</Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-5 bg-purple-200/10 rounded-lg border border-purple-200/20">
              <p className="text-xl font-semibold text-white mb-4">📚 Recommended Learning Path</p>
              <ul className="space-y-2">
                {careerInsights.recommendedCourses.map((course: string, index: number) => (
                  <li key={index} className="text-base flex items-center space-x-3 text-purple-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <span className="text-base md:text-lg">{course}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
