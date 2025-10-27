"use client";

/**
 * V1 Agentic Skill Analyzer
 * Single-page agentic workflow with AI-powered Portfolio Builder
 */

import { useState, useMemo, useEffect, useRef } from 'react';
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
  ChevronDown
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

interface AgenticSkillAnalyzerProps {
  showMarketing?: boolean;
}

const MAX_DISPLAY_RESOURCES = 3;
const MAX_DISPLAY_EXAMPLES = 3;

type NormalizedMcpSkill = {
  name: string;
  current?: number | string;
  target?: number | string;
  importance?: number;
  confidence?: number;
  description?: string;
  recommendations: string[];
};

function normalizeMcpSkillList(assessment: any): NormalizedMcpSkill[] {
  if (!assessment || typeof assessment !== 'object') {
    return [];
  }

  const rawSkills = Array.isArray(assessment.skills)
    ? assessment.skills
    : Array.isArray(assessment.skillGaps)
      ? assessment.skillGaps
      : Array.isArray(assessment.skill_gaps)
        ? assessment.skill_gaps
        : [];

  return rawSkills
    .filter((skill: any) => skill && typeof skill === 'object')
    .map((skill: any, index: number) => {
      const name = skill.name || skill.skill || `Skill ${index + 1}`;
      const current = skill.currentLevel ?? skill.current_level ?? skill.level;
      const target = skill.targetLevel ?? skill.target_level;
      const recs = Array.isArray(skill.recommendations)
        ? skill.recommendations.filter((rec: any) => typeof rec === 'string')
        : [];

      return {
        name,
        current,
        target,
        importance: typeof skill.importance === 'number' ? skill.importance : undefined,
        confidence: typeof skill.confidence === 'number' ? skill.confidence : undefined,
        description: typeof skill.description === 'string' ? skill.description : undefined,
        recommendations: recs,
      };
    });
}
export function AgenticSkillAnalyzer({ showMarketing = true }: AgenticSkillAnalyzerProps) {
  const { analysisResults, setAnalysisResults } = useAnalysis();
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
  const [mcpSkillAssessment, setMcpSkillAssessment] = useState<any | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [examplesExpanded, setExamplesExpanded] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hasLoadedFromContext, setHasLoadedFromContext] = useState(false);
  
  const activityLogRef = useRef<HTMLDivElement>(null);
  const activityLogContainerRef = useRef<HTMLDivElement>(null);

  // Log external assessments when available for MCP debugging
  useEffect(() => {
    if (analysisResults?.externalAssessments) {
      console.log('[AgenticSkillAnalyzer] External assessments loaded:', analysisResults.externalAssessments);
    }
  }, [analysisResults]);

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

  const normalizedMcpSkills = useMemo<NormalizedMcpSkill[]>(() => normalizeMcpSkillList(mcpSkillAssessment), [mcpSkillAssessment]);

  useEffect(() => {
    setResourcesExpanded(false);
    setExamplesExpanded(false);
  }, [researchResults]);

  useEffect(() => {
    setExpandedTasks({});
  }, [portfolioTasks.length]);

  // Load existing results from context on mount
  useEffect(() => {
    if (!hasLoadedFromContext && analysisResults && analysisResults.skillGaps.length > 0) {
      
      // Helper function to filter AI insights by skill relevance (for context loading - TECHNICAL ONLY)
      const getSkillSpecificInsightsFromContext = (skillName: string) => {
    if (!analysisResults.githubAnalysis?.agenticAnalysis && !analysisResults.githubAnalysis?.readmeAnalysis) {
      return undefined;
    }

        const skillLower = skillName.toLowerCase();
        const agenticAnalysis = analysisResults.githubAnalysis.agenticAnalysis;
        const readmeAnalysis = analysisResults.githubAnalysis.readmeAnalysis;

        // SKIP GENERIC SOFT SKILLS (but keep documentation-related skills)
        const softSkills = ['teamwork', 'time management', 'leadership', 'collaboration'];
        const isDocumentationSkill = skillLower.includes('documentation') || skillLower.includes('technical writing');
        
        if (!isDocumentationSkill && softSkills.some(soft => skillLower.includes(soft))) {
          return undefined;
        }

        const relevantArchitecture = skillLower.includes('architecture') || skillLower.includes('design')
          ? agenticAnalysis?.architecturePatterns || []
          : [];

        const relevantSmells = (agenticAnalysis?.codeSmells || []).filter((smell: any) => {
          const smellText = `${smell.type} ${smell.description}`.toLowerCase();
          if (skillLower.includes('test') || skillLower.includes('qa')) {
            return smellText.includes('test') || smellText.includes('coverage') || smellText.includes('assertion');
          }
          if (skillLower.includes('framework') || skillLower.includes('librar')) {
            return smellText.includes('import') || smellText.includes('dependency') || smellText.includes('package');
          }
          if (skillLower.includes('javascript') || skillLower.includes('typescript') || skillLower.includes('python') || skillLower.includes('java')) {
            return true;
          }
          if (skillLower.includes('architecture') || skillLower.includes('design')) {
            return smellText.includes('coupling') || smellText.includes('architecture') || smellText.includes('pattern');
          }
          return true;
        });

        const baseSkillToken = skillLower.split(/\s+/)[0] ?? '';
        const relevantRecommendations = (agenticAnalysis?.recommendations || []).filter((recommendation: string) => {
          const recLower = recommendation.toLowerCase();
          if (skillLower.includes('test') || skillLower.includes('qa')) {
            return recLower.includes('test') || recLower.includes('qa') || recLower.includes('coverage') || recLower.includes('automation');
          }
          if (isDocumentationSkill) {
            return recLower.includes('doc') || recLower.includes('readme') || recLower.includes('documentation');
          }
          if (skillLower.includes('framework') || skillLower.includes('librar')) {
            return recLower.includes('framework') || recLower.includes('library') || recLower.includes('package');
          }
          if (skillLower.includes('architecture') || skillLower.includes('design')) {
            return recLower.includes('architecture') || recLower.includes('design') || recLower.includes('pattern');
          }
          if (skillLower.includes('typescript') || skillLower.includes('javascript') || skillLower.includes('python') || skillLower.includes('java')) {
            return recLower.includes(baseSkillToken) || recLower.includes('code') || recLower.includes('refactor');
          }
          return true;
        });

        // Show README quality only for documentation-focused skills
        const showReadme = isDocumentationSkill && readmeAnalysis?.qualityScore !== undefined;
        
        // Show code quality only for programming language skills
        const isProgrammingLanguage = skillLower.includes('javascript') || skillLower.includes('typescript') || 
                                      skillLower.includes('python') || skillLower.includes('java') || 
                                      skillLower.includes('c++') || skillLower.includes('go') || 
                                      skillLower.includes('rust') || skillLower.includes('ruby') ||
                                      skillLower.includes('php') || skillLower.includes('swift') ||
                                      skillLower.includes('kotlin');
        const showCodeQuality = isProgrammingLanguage && agenticAnalysis?.overallQuality !== undefined;

        return {
          codeQuality: showCodeQuality ? agenticAnalysis?.overallQuality : undefined,
          architecturePatterns: relevantArchitecture,
          relatedCodeSmells: relevantSmells.slice(0, 2),
          recommendations: relevantRecommendations.length > 0 ? relevantRecommendations.slice(0, 3) : undefined,
          readmeQuality: showReadme ? readmeAnalysis.qualityScore : undefined,
        };
      };

      // Convert context data back to local state format (filter out generic soft skills, keep documentation)
      const contextMcpSkills = normalizeMcpSkillList(
        analysisResults.externalAssessments?.githubMcp ?? analysisResults.githubAnalysis?.mcpSkillAssessment
      );
      
      const contextMcpAssessment = analysisResults.externalAssessments?.githubMcp ?? analysisResults.githubAnalysis?.mcpSkillAssessment;

      // Helper: Map general MCP recommendations to specific skills (context loading)
      const mapMcpRecommendationsToSkillFromContext = (skillName: string): string[] => {
        if (!contextMcpAssessment || !Array.isArray(contextMcpAssessment.recommendations)) {
          return [];
        }
        
        const skillLower = skillName.toLowerCase();
        const relevantRecs: string[] = [];
        
        contextMcpAssessment.recommendations.forEach((rec: string) => {
          const recLower = rec.toLowerCase();
          
          // Testing-related skills
          if (skillLower.includes('test') || skillLower.includes('qa') || skillLower.includes('quality assurance')) {
            if (recLower.includes('test') || recLower.includes('jest') || recLower.includes('vitest') || 
                recLower.includes('playwright') || recLower.includes('cypress')) {
              relevantRecs.push(rec);
            }
          }
          
          // Documentation skills
          if (skillLower.includes('documentation') || skillLower.includes('technical writing')) {
            if (recLower.includes('documentation') || recLower.includes('readme') || recLower.includes('comment')) {
              relevantRecs.push(rec);
            }
          }
          
          // DevOps/CI-CD skills
          if (skillLower.includes('devops') || skillLower.includes('ci') || skillLower.includes('cd') || 
              skillLower.includes('deployment') || skillLower.includes('pipeline')) {
            if (recLower.includes('ci/cd') || recLower.includes('pipeline') || recLower.includes('deployment') ||
                recLower.includes('automated testing')) {
              relevantRecs.push(rec);
            }
          }
          
          // Code quality / Linting skills
          if (skillLower.includes('code quality') || skillLower.includes('linting') || skillLower.includes('eslint') ||
              skillLower.includes('prettier') || skillLower.includes('formatting')) {
            if (recLower.includes('eslint') || recLower.includes('prettier') || recLower.includes('code quality')) {
              relevantRecs.push(rec);
            }
          }
          
          // Performance / Monitoring skills
          if (skillLower.includes('performance') || skillLower.includes('monitoring') || skillLower.includes('observability')) {
            if (recLower.includes('performance') || recLower.includes('monitoring') || recLower.includes('error tracking')) {
              relevantRecs.push(rec);
            }
          }
          
          // For programming languages, show general code quality recommendations
          const programmingLanguages = ['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin'];
          if (programmingLanguages.some(lang => skillLower.includes(lang))) {
            if (recLower.includes('code quality') || recLower.includes('eslint') || recLower.includes('prettier')) {
              relevantRecs.push(rec);
            }
          }
        });
        
        return relevantRecs;
      };

      const convertedSkillGaps = analysisResults.skillGaps
        .filter(gap => {
          const skillLower = gap.skill.toLowerCase();
          const softSkills = ['teamwork', 'time management', 'leadership', 'collaboration'];
          const isDocumentationSkill = skillLower.includes('documentation') || skillLower.includes('technical writing');
          return isDocumentationSkill || !softSkills.some(soft => skillLower.includes(soft));
        })
        .map((gap) => {
        const priority = parseInt(gap.importance) || 80;
        
        // Use saved numeric values if available, otherwise estimate
        const currentLevel = gap.currentLevel ?? (priority >= 85 ? 2 : priority >= 70 ? 3 : 4);
        const targetLevel = gap.targetLevel ?? 5;
        const gapSize = gap.gap ?? (targetLevel - currentLevel);
        const gapSkillLower = gap.skill.toLowerCase();
        const mcpMatch = contextMcpSkills.find((skill) =>
          skill.name.toLowerCase() === gapSkillLower || skill.name.toLowerCase().includes(gapSkillLower) || gapSkillLower.includes(skill.name.toLowerCase())
        );
        
        // Get relevant MCP recommendations for this skill
        const relevantMcpRecs = mapMcpRecommendationsToSkillFromContext(gap.skill);
        
        // Build MCP insights
        const mcpInsights = mcpMatch || relevantMcpRecs.length > 0
          ? {
              current: mcpMatch?.current,
              target: mcpMatch?.target,
              importance: mcpMatch?.importance,
              confidence: mcpMatch?.confidence,
              description: mcpMatch?.description || (relevantMcpRecs.length > 0 ? `MCP detected ${relevantMcpRecs.length} relevant improvement areas for this skill.` : undefined),
              recommendations: [
                ...(mcpMatch?.recommendations || []),
                ...relevantMcpRecs
              ].filter((rec, idx, arr) => arr.indexOf(rec) === idx) // Remove duplicates
            }
          : undefined;
        
        return {
          id: gap.skill,
          name: gap.skill,
          currentLevel,
          targetLevel,
          priority,
          gap: gapSize,
          guidance: {
            reasoning: gap.reasoning,
            recommendedSteps: [],
          },
          recommendations: [],
          // Restore skill-specific AI insights
          aiInsights: getSkillSpecificInsightsFromContext(gap.skill),
          mcpInsights: mcpInsights?.recommendations?.length ? mcpInsights : undefined,
        };
      });

      setSkillGaps(convertedSkillGaps);
      setRepoUrl(analysisResults.repoUrl);
      
      // Create skillAssessment from stored data with the CORRECT overall score
      const mockAssessment = {
        overallScore: analysisResults.skillAssessmentScore || 70, // Use saved skill score (76%), not portfolio score!
        skillGaps: convertedSkillGaps.map(sg => ({
          skill: { 
            id: sg.id || sg.name, 
            name: sg.name, 
            currentLevel: sg.currentLevel, 
            targetLevel: sg.targetLevel 
          },
          gap: sg.gap,
          priority: sg.priority,
          guidance: sg.guidance as any
        }))
      };
      setSkillAssessment(mockAssessment);
      setMcpSkillAssessment(
        analysisResults.externalAssessments?.githubMcp ?? analysisResults.githubAnalysis?.mcpSkillAssessment ?? null
      );
      
      // Mark as complete if we have data
      setAgentStatus('COMPLETE');
      setProgress(100);
      setHasLoadedFromContext(true);
      
      // Add a log entry to indicate results were loaded from previous analysis
      const log = {
        timestamp: new Date().toLocaleTimeString(),
        type: 'info' as const,
        message: 'Loaded results from previous analysis',
        icon: <CheckCircle2 className="h-4 w-4" />
      };
      setActionLogs([log]);
    }
  }, [analysisResults, hasLoadedFromContext]);

  // Auto-scroll to activity log when agent starts running
  useEffect(() => {
    if (agentStatus !== 'IDLE' && agentStatus !== 'COMPLETE' && agentStatus !== 'ERROR' && activityLogRef.current) {
      setTimeout(() => {
        activityLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
    
    // Scroll to results when complete
    if (agentStatus === 'COMPLETE') {
      setTimeout(() => {
        const skillGapsCard = document.getElementById('skill-gaps-card');
        if (skillGapsCard) {
          skillGapsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [agentStatus]);

  // Auto-scroll to bottom of activity log when new logs are added
  useEffect(() => {
    if (activityLogContainerRef.current && actionLogs.length > 0) {
      const container = activityLogContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [actionLogs]);

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

  const gapAnalyzer = useMemo(() => new GapAnalyzerAgent(), []);

  const handleClearResults = () => {
    // Clear all state
    setAnalysisResults(null);
    setRepoUrlInput('');
    setAgentStatus('IDLE');
    setProgress(0);
    setActionLogs([]);
    setSkillGaps([]);
    setPortfolioTasks([]);
    setCareerInsights(null);
    setResearchResults(null);
    setError(null);
    setTargetRole('');
    setTargetIndustry('');
    setProfessionalGoals('');
    setPortfolioData(null);
    setRepoUrl(null);
    setCreatedIssues([]);
    setSkillAssessment(null);
    setMcpSkillAssessment(null);
    setSelectedRecommendations([]);
    setShowClearConfirm(false);
    setHasLoadedFromContext(false);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addLog = (type: ActionLog['type'], message: string, icon?: React.ReactNode) => {
    const log: ActionLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      icon
    };
    setActionLogs(prev => [...prev, log].slice(-50)); // Keep last 50 logs, newest at bottom
  };

  const getCurrentTaskMessage = (status: AgentStatus): string => {
    switch (status) {
      case 'ANALYZING':
        return 'Analyzing repository...';
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
    const directRepoUrl = repoUrlInput.trim();

    if (!directRepoUrl) {
      setError('Please enter a GitHub repository URL');
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
    setHasLoadedFromContext(false);

    try {
      let repoUrl: string | null = null;

      const repoMatch = directRepoUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\/?$|\/?#.*$|\/?\?.*$)/i);
      if (repoMatch) {
        const [, owner, repo] = repoMatch;
        repoUrl = `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
        addLog('info', `Analyzing repository: ${owner}/${repo}`, <Code className="h-4 w-4" />);
        setProgress(20);
      } else {
        throw new Error('Invalid GitHub repository URL format');
      }

      if (!repoUrl) {
        throw new Error('Unable to determine a repository to analyze. Please provide a valid GitHub repository URL.');
      }

      setRepoUrl(repoUrl);

      // NEW: Call agentic API endpoint for AI-powered analysis
      addLog('info', '🤖 Starting AI-powered agentic analysis...', <Brain className="h-4 w-4" />);
      
      const agenticResponse = await fetch('/api/gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze-github-agentic',
          repositoryUrl: repoUrl,
          deepAnalysis: true, // Enable AI analysis
          userContext: {
            targetRole: targetRole || undefined,
            targetIndustry: targetIndustry || undefined,
            professionalGoals: professionalGoals || undefined,
          }
        }),
      });

      if (!agenticResponse.ok) {
        throw new Error('Failed to analyze repository with agentic analyzer');
      }

      const agenticData = await agenticResponse.json();
      const githubAnalysis = agenticData.result;
      const initialExternalAssessment = githubAnalysis?.mcpSkillAssessment
        ?? githubAnalysis?.externalAssessments?.githubMcp
        ?? agenticData?.externalAssessments?.githubMcp
        ?? null;
      setMcpSkillAssessment(initialExternalAssessment);
      
      // Show analysis mode
      if (agenticData.analysisMode === 'agentic' && !agenticData.usedFallback) {
        addLog('success', '✨ AI-powered analysis complete!', <CheckCircle2 className="h-4 w-4" />);
      } else if (agenticData.usedFallback) {
        addLog('warning', `⚠️ Using fallback mode: ${agenticData.fallbackReason}`, <AlertCircle className="h-4 w-4" />);
      }
      
      addLog('success', `Detected languages: ${githubAnalysis.languages.join(', ')}`, <CheckCircle2 className="h-4 w-4" />);
      if (githubAnalysis.frameworks.length > 0) {
        addLog('info', `Frameworks: ${githubAnalysis.frameworks.join(', ')}`, <Code className="h-4 w-4" />);
      }

      // Show AI insights if available
      if (githubAnalysis.agenticAnalysis) {
        addLog('success', `🎯 Code Quality: ${githubAnalysis.agenticAnalysis.overallQuality}/100 (Confidence: ${(githubAnalysis.agenticAnalysis.confidence * 100).toFixed(0)}%)`, <CheckCircle2 className="h-4 w-4" />);
        
        if (githubAnalysis.agenticAnalysis.architecturePatterns.length > 0) {
          addLog('info', `🏗️ Architecture: ${githubAnalysis.agenticAnalysis.architecturePatterns.join(', ')}`, <Code className="h-4 w-4" />);
        }
        
        if (githubAnalysis.agenticAnalysis.codeSmells.length > 0) {
          addLog('warning', `⚠️ Found ${githubAnalysis.agenticAnalysis.codeSmells.length} code smell(s)`, <AlertCircle className="h-4 w-4" />);
        }
      }

      if (githubAnalysis.readmeAnalysis) {
        addLog('info', `📝 README Quality: ${githubAnalysis.readmeAnalysis.qualityScore}/100`, <Code className="h-4 w-4" />);
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
      const gapExternalAssessment = gapAnalysis.externalAssessments?.githubMcp ?? null;
      const combinedExternalAssessment = gapExternalAssessment ?? initialExternalAssessment ?? null;
      setMcpSkillAssessment(combinedExternalAssessment);

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
            externalAssessments: gapAnalysis.externalAssessments ?? undefined,
            context: contextPayload,
          }),
        });
        addLog('success', 'Skill analysis stored for future reference', <CheckCircle2 className="h-4 w-4" />);
      } catch (storeError) {
        addLog('warning', 'Could not store analysis data', <AlertCircle className="h-4 w-4" />);
      }

      // Helper function to filter AI insights by skill relevance (TECHNICAL SKILLS ONLY)
      const getSkillSpecificInsights = (skillName: string) => {
        if (!githubAnalysis.agenticAnalysis && !githubAnalysis.readmeAnalysis) {
          return undefined;
        }

        const skillLower = skillName.toLowerCase();
        const agenticAnalysis = githubAnalysis.agenticAnalysis;
        const readmeAnalysis = githubAnalysis.readmeAnalysis;

        // SKIP GENERIC SOFT SKILLS (but keep documentation-related skills for README insights)
        const softSkills = ['teamwork', 'time management', 'leadership', 'collaboration'];
        const isDocumentationSkill = skillLower.includes('documentation') || skillLower.includes('technical writing');
        
        if (!isDocumentationSkill && softSkills.some(soft => skillLower.includes(soft))) {
          return undefined;
        }

        // For technical skills, always show code quality + relevant details
        const relevantArchitecture = skillLower.includes('architecture') || skillLower.includes('design')
          ? agenticAnalysis?.architecturePatterns || []
          : [];

        // More lenient filtering - show smells if they're somewhat related
        const relevantSmells = (agenticAnalysis?.codeSmells || []).filter((smell: any) => {
          const smellText = `${smell.type} ${smell.description}`.toLowerCase();
          
          // Show for testing-related skills
          if (skillLower.includes('test') || skillLower.includes('qa')) {
            return smellText.includes('test') || smellText.includes('coverage') || smellText.includes('assertion');
          }
          // Show for framework/library skills
          if (skillLower.includes('framework') || skillLower.includes('librar')) {
            return smellText.includes('import') || smellText.includes('dependency') || smellText.includes('package');
          }
          // Show for any programming language skill
          if (skillLower.includes('javascript') || skillLower.includes('typescript') || skillLower.includes('python') || skillLower.includes('java')) {
            return true; // Show all smells for language skills
          }
          // Show for architecture
          if (skillLower.includes('architecture') || skillLower.includes('design')) {
            return smellText.includes('coupling') || smellText.includes('architecture') || smellText.includes('pattern');
          }
          
          return true; // Default: show smell (less restrictive)
        });

        // Strict best practices filtering - only show when highly relevant to the specific skill
        const baseSkillToken = skillLower.split(/\s+/)[0] ?? '';
        const relevantRecommendations = (agenticAnalysis?.recommendations || []).filter((recommendation: string) => {
          const recLower = recommendation.toLowerCase();
          
          if (skillLower.includes('test') || skillLower.includes('qa')) {
            return recLower.includes('test') || recLower.includes('qa') || recLower.includes('coverage') || recLower.includes('automation');
          }
          if (isDocumentationSkill) {
            return recLower.includes('doc') || recLower.includes('readme') || recLower.includes('documentation');
          }
          if (skillLower.includes('framework') || skillLower.includes('librar')) {
            return recLower.includes('framework') || recLower.includes('library') || recLower.includes('package');
          }
          if (skillLower.includes('architecture') || skillLower.includes('design')) {
            return recLower.includes('architecture') || recLower.includes('design') || recLower.includes('pattern');
          }
          if (skillLower.includes('typescript') || skillLower.includes('javascript') || skillLower.includes('python') || skillLower.includes('java')) {
            return recLower.includes(baseSkillToken) || recLower.includes('code') || recLower.includes('refactor');
          }
          
          return true;
        });

        // Show README quality only for documentation-focused skills
        const showReadme = isDocumentationSkill && readmeAnalysis?.qualityScore !== undefined;
        
        // Show code quality only for programming language skills
        const isProgrammingLanguage = skillLower.includes('javascript') || skillLower.includes('typescript') || 
                                      skillLower.includes('python') || skillLower.includes('java') || 
                                      skillLower.includes('c++') || skillLower.includes('go') || 
                                      skillLower.includes('rust') || skillLower.includes('ruby') ||
                                      skillLower.includes('php') || skillLower.includes('swift') ||
                                      skillLower.includes('kotlin');
        const showCodeQuality = isProgrammingLanguage && agenticAnalysis?.overallQuality !== undefined;

        return {
          codeQuality: showCodeQuality ? agenticAnalysis?.overallQuality : undefined,
          architecturePatterns: relevantArchitecture,
          relatedCodeSmells: relevantSmells.slice(0, 2), // Max 2 smells per skill
          recommendations: relevantRecommendations.length > 0 ? relevantRecommendations.slice(0, 3) : undefined, // Only show if relevant
          readmeQuality: showReadme ? readmeAnalysis.qualityScore : undefined,
        };
      };

      // Filter out generic soft skills but keep documentation-related skills
      const technicalSkillGaps = gapAnalysis.skillGaps.filter(sg => {
        const skillLower = sg.skill.name.toLowerCase();
        const softSkills = ['teamwork', 'time management', 'leadership', 'collaboration'];
        const isDocumentationSkill = skillLower.includes('documentation') || skillLower.includes('technical writing');
        return isDocumentationSkill || !softSkills.some(soft => skillLower.includes(soft));
      });

      // Group skill gaps by category and select top 5 from each
      const skillGapsByCategory = new Map<string, any[]>();
      
      technicalSkillGaps.forEach(sg => {
        const category = sg.skill.category || 'technical'; // Default to technical if no category
        if (!skillGapsByCategory.has(category)) {
          skillGapsByCategory.set(category, []);
        }
        skillGapsByCategory.get(category)!.push(sg);
      });

      // Select top 5 from each category based on priority
      const topGapsByCategory: any[] = [];
      skillGapsByCategory.forEach((gaps, category) => {
        const sortedGaps = gaps.sort((a, b) => b.priority - a.priority);
        const top5FromCategory = sortedGaps.slice(0, 5);
        topGapsByCategory.push(...top5FromCategory);
      });

      // Helper: Map general MCP recommendations to specific skills
      const mapMcpRecommendationsToSkill = (skillName: string): string[] => {
        if (!mcpSkillAssessment || !Array.isArray(mcpSkillAssessment.recommendations)) {
          return [];
        }
        
        const skillLower = skillName.toLowerCase();
        const relevantRecs: string[] = [];
        
        mcpSkillAssessment.recommendations.forEach((rec: string) => {
          const recLower = rec.toLowerCase();
          
          // Testing-related skills
          if (skillLower.includes('test') || skillLower.includes('qa') || skillLower.includes('quality assurance')) {
            if (recLower.includes('test') || recLower.includes('jest') || recLower.includes('vitest') || 
                recLower.includes('playwright') || recLower.includes('cypress')) {
              relevantRecs.push(rec);
            }
          }
          
          // Documentation skills
          if (skillLower.includes('documentation') || skillLower.includes('technical writing')) {
            if (recLower.includes('documentation') || recLower.includes('readme') || recLower.includes('comment')) {
              relevantRecs.push(rec);
            }
          }
          
          // DevOps/CI-CD skills
          if (skillLower.includes('devops') || skillLower.includes('ci') || skillLower.includes('cd') || 
              skillLower.includes('deployment') || skillLower.includes('pipeline')) {
            if (recLower.includes('ci/cd') || recLower.includes('pipeline') || recLower.includes('deployment') ||
                recLower.includes('automated testing')) {
              relevantRecs.push(rec);
            }
          }
          
          // Code quality / Linting skills
          if (skillLower.includes('code quality') || skillLower.includes('linting') || skillLower.includes('eslint') ||
              skillLower.includes('prettier') || skillLower.includes('formatting')) {
            if (recLower.includes('eslint') || recLower.includes('prettier') || recLower.includes('code quality')) {
              relevantRecs.push(rec);
            }
          }
          
          // Performance / Monitoring skills
          if (skillLower.includes('performance') || skillLower.includes('monitoring') || skillLower.includes('observability')) {
            if (recLower.includes('performance') || recLower.includes('monitoring') || recLower.includes('error tracking')) {
              relevantRecs.push(rec);
            }
          }
          
          // For programming languages, show general code quality recommendations
          const programmingLanguages = ['javascript', 'typescript', 'python', 'java', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin'];
          if (programmingLanguages.some(lang => skillLower.includes(lang))) {
            if (recLower.includes('code quality') || recLower.includes('eslint') || recLower.includes('prettier')) {
              relevantRecs.push(rec);
            }
          }
        });
        
        return relevantRecs;
      };

      // Set REAL skill gaps with skill-specific AI insights and MCP data
      const topGaps = topGapsByCategory.map(sg => {
        const gapSkillLower = sg.skill.name.toLowerCase();
        
        // Try to match with specific MCP skills
        const mcpMatch = normalizedMcpSkills.find((skill) => {
          const mcpName = skill.name.toLowerCase();
          return mcpName === gapSkillLower || mcpName.includes(gapSkillLower) || gapSkillLower.includes(mcpName);
        });

        // Get relevant MCP recommendations for this skill
        const relevantMcpRecs = mapMcpRecommendationsToSkill(sg.skill.name);
        
        // Build MCP insights
        const mcpInsights = mcpMatch || relevantMcpRecs.length > 0
          ? {
              current: mcpMatch?.current,
              target: mcpMatch?.target,
              importance: mcpMatch?.importance,
              confidence: mcpMatch?.confidence,
              description: mcpMatch?.description || (relevantMcpRecs.length > 0 ? `MCP detected ${relevantMcpRecs.length} relevant improvement areas for this skill.` : undefined),
              recommendations: [
                ...(mcpMatch?.recommendations || []),
                ...relevantMcpRecs
              ].filter((rec, idx, arr) => arr.indexOf(rec) === idx) // Remove duplicates
            }
          : undefined;

        return {
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
        category: sg.skill.category || 'technical',
        // Add skill-specific AI insights
        aiInsights: getSkillSpecificInsights(sg.skill.name),
        mcpInsights: mcpInsights?.recommendations?.length ? mcpInsights : undefined,
      };
      });
      setSkillGaps(topGaps);
      setProgress(60);

      // Phase 2: REAL Research Agent (LangGraph)
      setAgentStatus('RESEARCHING');
      addLog('info', 'Activating LangGraph Research Agent...', <Brain className="h-4 w-4" />);
      setProgress(60);

      let researchDataForContext: any = null;

      try {
        // Run research agent for each skill gap
        const categorySummary = Array.from(skillGapsByCategory.entries())
          .map(([category, gaps]) => `${category}: ${Math.min(gaps.length, 5)} gaps`)
          .join(', ');
        addLog('info', `Researching top 5 skill gaps per category (${categorySummary})`, <Search className="h-4 w-4" />);

        // Research all skill gaps in parallel
        const researchPromises = topGaps.map(async (gap, index) => {
          addLog('info', `Researching ${gap.category} skill gap ${index + 1}/${topGaps.length}: ${gap.name}`, <Search className="h-4 w-4" />);
          
          const researchResponse = await fetch('/api/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'user_123',
              skillGap: gap.name,
              detectedLanguage: githubAnalysis.languages[0] || 'unknown',
              userContext: professionalGoals || `Learning ${gap.name}`,
              targetRole,
              targetIndustry,
              focusSkills: [{
                name: gap.name,
                gap: gap.gap,
                priority: gap.priority
              }],
              learningObjectives: gapAnalysis.recommendations?.slice(0, 3) || [],
              // Adaptive learning fields
              userSkillLevel: githubAnalysis.skillLevel || 'intermediate',
              skillCurrentLevel: gap.currentLevel,
              skillTargetLevel: gap.targetLevel,
              skillGapValue: gap.gap,
            }),
          });

          if (researchResponse.ok) {
            const researchData = await researchResponse.json();
            return { gap, researchData };
          } else {
            console.error(`Research failed for ${gap.name}:`, researchResponse.statusText);
            return { gap, researchData: null };
          }
        });

        // Wait for all research to complete
        const researchResults = await Promise.all(researchPromises);
        
        // Combine all research results
        const combinedResearchData = {
          resources: [] as any[],
          examples: [] as any[],
          scrapedResources: [] as any[],
          recommendations: [] as any[],
          comparativeInsights: [] as any[],
          learningPath: [] as any[],
          confidence: 0,
          skillGapResults: researchResults.filter(r => r.researchData !== null)
        };

        // Helper: Normalize URL for deduplication
        const normalizeUrl = (url: string): string => {
          try {
            const parsed = new URL(url);
            // Remove trailing slashes, anchors, and common tracking params
            let normalized = parsed.origin + parsed.pathname;
            normalized = normalized.replace(/\/+$/, ''); // Remove trailing slashes
            return normalized.toLowerCase();
          } catch {
            return url.toLowerCase().replace(/\/+$/, '');
          }
        };

        // Helper: Check if two titles are similar (fuzzy match)
        const areTitlesSimilar = (title1: string, title2: string): boolean => {
          const t1 = title1.toLowerCase().trim();
          const t2 = title2.toLowerCase().trim();
          // Exact match
          if (t1 === t2) return true;
          // One contains the other (with some length threshold)
          if (t1.length > 15 && t2.length > 15) {
            if (t1.includes(t2) || t2.includes(t1)) return true;
          }
          return false;
        };

        // Aggregate results with deduplication
        const seenResourceUrls = new Map<string, any>(); // normalized URL -> resource
        const seenExampleUrls = new Map<string, any>();
        const seenScrapedUrls = new Map<string, any>();
        const seenRecommendationTitles = new Set<string>();
        const seenInsightTitles = new Set<string>();
        
        let learningPathCreated = false;
        researchResults.forEach(({ gap, researchData }, index) => {
          if (researchData) {
            // Deduplicate resources by URL
            if (researchData.resources) {
              researchData.resources.forEach((resource: any) => {
                const normalizedUrl = normalizeUrl(resource.url || '');
                const existing = seenResourceUrls.get(normalizedUrl);
                
                if (!existing) {
                  // New resource
                  seenResourceUrls.set(normalizedUrl, resource);
                } else {
                  // Duplicate URL - keep the one with more info (longer description or higher score)
                  const existingScore = existing.score || 0;
                  const newScore = resource.score || 0;
                  const existingDescLength = (existing.description || '').length;
                  const newDescLength = (resource.description || '').length;
                  
                  if (newScore > existingScore || (newScore === existingScore && newDescLength > existingDescLength)) {
                    seenResourceUrls.set(normalizedUrl, resource);
                  }
                }
              });
            }
            
            // Deduplicate GitHub examples by URL
            if (researchData.examples) {
              researchData.examples.forEach((example: any) => {
                const normalizedUrl = normalizeUrl(example.url || '');
                const existing = seenExampleUrls.get(normalizedUrl);
                
                if (!existing) {
                  seenExampleUrls.set(normalizedUrl, example);
                } else {
                  // Keep the one with more stars
                  if ((example.stars || 0) > (existing.stars || 0)) {
                    seenExampleUrls.set(normalizedUrl, example);
                  }
                }
              });
            }
            
            // Deduplicate scraped resources by URL
            if (researchData.scrapedResources) {
              researchData.scrapedResources.forEach((scraped: any) => {
                const normalizedUrl = normalizeUrl(scraped.url || '');
                if (!seenScrapedUrls.has(normalizedUrl)) {
                  seenScrapedUrls.set(normalizedUrl, scraped);
                }
              });
            }
            
            // Deduplicate recommendations by title (fuzzy match)
            if (researchData.recommendations) {
              researchData.recommendations.forEach((rec: any) => {
                const recTitle = (rec.title || '').toLowerCase().trim();
                let isDuplicate = false;
                
                for (const seenTitle of seenRecommendationTitles) {
                  if (areTitlesSimilar(recTitle, seenTitle)) {
                    isDuplicate = true;
                    break;
                  }
                }
                
                if (!isDuplicate && recTitle.length > 0) {
                  seenRecommendationTitles.add(recTitle);
                  combinedResearchData.recommendations.push(rec);
                }
              });
            }
            
            // Deduplicate comparative insights by title
            if (researchData.comparativeInsights) {
              researchData.comparativeInsights.forEach((insight: any) => {
                const insightTitle = (insight.title || '').toLowerCase().trim();
                if (!seenInsightTitles.has(insightTitle) && insightTitle.length > 0) {
                  seenInsightTitles.add(insightTitle);
                  combinedResearchData.comparativeInsights.push(insight);
                }
              });
            }
            
            // For learning path, create a unified path instead of concatenating all paths
            // Use only the first valid learning path (from highest priority skill) and customize it
            if (researchData.learningPath && researchData.learningPath.length > 0 && !learningPathCreated) {
              const customizedPath = researchData.learningPath.map((step: any, stepIndex: number) => ({
                ...step,
                title: step.title.includes(':') ? step.title : `${step.title}`,
                order: stepIndex + 1,
              }));
              combinedResearchData.learningPath = customizedPath;
              learningPathCreated = true;
            }
            
            combinedResearchData.confidence = Math.max(combinedResearchData.confidence, researchData.confidence || 0);
          }
        });

        // Convert Maps back to arrays
        combinedResearchData.resources = Array.from(seenResourceUrls.values());
        combinedResearchData.examples = Array.from(seenExampleUrls.values());
        combinedResearchData.scrapedResources = Array.from(seenScrapedUrls.values());

        // Store research results for display AND context
        setResearchResults(combinedResearchData);
        researchDataForContext = combinedResearchData; // Capture for context saving

        const resourceCount = combinedResearchData.resources?.length || 0;
        const exampleCount = combinedResearchData.examples?.length || 0;
        const successfulResearches = researchResults.filter(r => r.researchData !== null).length;

        addLog('success', `Successfully researched ${successfulResearches}/${topGaps.length} skill gaps`, <CheckCircle2 className="h-4 w-4" />);

        if (resourceCount === 0 && exampleCount === 0) {
          addLog('warning', 'Research Agent found no learning resources or GitHub examples', <AlertCircle className="h-4 w-4" />);
          addLog('info', 'Learning Resources and Templates pages will show empty. This may happen for niche skills or specific tech stacks.', <AlertCircle className="h-4 w-4" />);
        } else {
          addLog('success', `Found ${resourceCount} unique learning resources (duplicates removed)`, <CheckCircle2 className="h-4 w-4" />);
          addLog('success', `Scraped ${combinedResearchData.scrapedResources?.length || 0} detailed sources`, <CheckCircle2 className="h-4 w-4" />);
          addLog('success', `Found ${exampleCount} unique GitHub examples`, <CheckCircle2 className="h-4 w-4" />);
          addLog('success', `Generated ${combinedResearchData.recommendations?.length || 0} personalized recommendations`, <CheckCircle2 className="h-4 w-4" />);
        }

        if (combinedResearchData.comparativeInsights?.length) {
          addLog('info', `Comparative insights generated`, <Brain className="h-4 w-4" />);
        }
        if (combinedResearchData.learningPath?.length) {
          addLog('info', `Learning path with ${combinedResearchData.learningPath.length} steps ready`, <BookOpen className="h-4 w-4" />);
        }
        
        setProgress(65);
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

            // Log findings (portfolio is repository quality, separate from skill assessment)
            addLog('info', `Repository quality: ${portfolioDataResult.analysis.overallQuality}% (for GitHub issues)`, <CheckCircle2 className="h-4 w-4" />);

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

        const externalAssessmentsPayload: Record<string, unknown> = {
          ...(gapAnalysis.externalAssessments ?? {}),
        };
        if (combinedExternalAssessment) {
          externalAssessmentsPayload.githubMcp = combinedExternalAssessment;
        }
        const hasExternalAssessments = Object.keys(externalAssessmentsPayload).length > 0;

        setAnalysisResults({
          repoUrl,
          githubAnalysis: githubAnalysis, // Store the full GitHub analysis including AI insights
          skillAssessmentScore: gapAnalysis.overallScore, // Store the ACTUAL skill score (e.g., 76%)
          portfolioQuality: portfolioDataForContext?.analysis ? {
            overallScore: portfolioDataForContext.analysis.overallQuality, // This is portfolio quality (e.g., 15%)
            strengths: portfolioDataForContext.analysis.strengths || [],
            weaknesses: portfolioDataForContext.analysis.weaknesses || [],
            recommendations: portfolioDataForContext.recommendations || []
          } : null,
          skillGaps: topGaps.map(gap => ({
            skill: gap.name,
            importance: String(gap.priority),
            reasoning: (gap.guidance as any)?.reasoning || gap.gap || '',
            currentLevel: gap.currentLevel,
            targetLevel: gap.targetLevel,
            gap: gap.gap
          })),
          portfolioActions: portfolioTasksForContext.length > 0 ? portfolioTasksForContext.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            estimatedTime: task.estimatedEffort || 'Unknown',
            category: task.type,
            optional: task.optional
          })) : [],
          researchResults: researchDataForContext?.resources?.map((resource: any) => ({
            title: resource.title,
            url: resource.url,
            description: resource.description,
            type: 'article' as const,
            relevance: resource.score ? `${(resource.score * 100).toFixed(0)}%` : undefined,
            summary: resource.summary,
            keyPoints: resource.keyPoints,
            recommendedAudience: resource.recommendedAudience,
          })) || [],
          githubExamples: researchDataForContext?.examples?.map((example: any) => ({
            name: example.name,
            url: example.url,
            description: example.description,
            stars: example.stars,
            language: example.language
          })) || [],
          comparativeInsights: researchDataForContext?.comparativeInsights || [],
          learningPath: researchDataForContext?.learningPath || [],
          confidenceBreakdown: researchDataForContext?.confidenceBreakdown || null,
          templates: (portfolioDataForContext?.recommendations || [])
            .flatMap((rec: any) => rec.templates || [])
            .filter((template: any) => template && Object.keys(template).length > 0)
            .slice(0, 10), // Limit to 10 templates
          agentLogs: agentLogsForContext,
          externalAssessments: hasExternalAssessments ? externalAssessmentsPayload : undefined,
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
                  Drop a GitHub repository URL and let autonomous agents audit your work, map skill gaps, and build a market-aligned learning plan.
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-purple-100/90 tracking-wide">GitHub Repository URL</label>
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrlInput}
                onChange={(e) => {
                  console.log('[Input] Changed:', e.target.value);
                  setRepoUrlInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && repoUrlInput.trim() && canEditInputs) {
                    runAgenticWorkflow();
                  }
                }}
                className="h-14 text-xl bg-purple-200/10 border-purple-300/30 text-white placeholder:text-purple-200/70 focus-visible:ring-purple-200/40 rounded-xl px-5"
                disabled={!canEditInputs}
              />
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={runAgenticWorkflow}
                disabled={!repoUrlInput.trim() || !canEditInputs}
                className="flex-1 h-14 text-xl font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition-all"
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
              
              {agentStatus === 'COMPLETE' && (
                <Button
                  size="lg"
                  onClick={() => setShowClearConfirm(true)}
                  variant="outline"
                  className="h-14 px-6 text-lg font-semibold rounded-xl border-2 border-purple-400/40 bg-purple-900/20 hover:bg-purple-900/40 text-white transition-all"
                >
                  New Analysis
                </Button>
              )}
            </div>
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

      {/* Clear Results Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-2 border-purple-400/40 bg-gradient-to-br from-purple-700/40 via-purple-900/30 to-slate-950/90 shadow-[0_0_60px_rgba(168,85,247,0.4)] backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white text-xl">Clear Analysis Results?</CardTitle>
              <CardDescription className="text-purple-100/80">
                This will clear all analysis data from all pages (Portfolio Builder, Learning Resources, Templates) and reset the form. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Button
                  onClick={handleClearResults}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
                  Clear All Results
                </Button>
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  className="flex-1 border-purple-400/40 bg-purple-900/20 hover:bg-purple-900/40 text-white"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Activity */}
      {(progress > 0 || actionLogs.length > 0) && (
        <Card id="activity-log" ref={activityLogRef} className="mb-6">
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
            <div ref={activityLogContainerRef} className="max-h-80 overflow-y-auto space-y-3 pr-2">
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
          {/* AI-Powered Analysis is now shown inline within each skill gap card */}

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

          {/* MCP insights are now fully integrated into individual skill cards */}

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
        </>
      )}
    </div>
  );
}
