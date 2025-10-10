"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GitHubAnalysisComponent } from './github-analysis';
import { AIChatAnalysis } from './ai-chat-analysis';
import { SkillRadarChart } from './skill-radar-chart';
import {
  GitHubAnalysis,
  GapAnalyzerAgent,
  type GapAnalysisResult,
  type Skill,
} from '@/lib/agents/gap-analyzer';
import { 
  Github, 
  BarChart3, 
  Target, 
  CheckCircle,
  AlertCircle,
  Brain,
  TrendingUp,
  BookOpen
} from 'lucide-react';

export function AutomaticGapAnalysis() {
  const [githubAnalysis, setGitHubAnalysis] = useState<GitHubAnalysis | null>(null);
  const [aiChatAnalysis, setAIChatAnalysis] = useState<any>(null);
  const [skillAssessment, setSkillAssessment] = useState<GapAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'github' | 'ai-chat'>('github');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'technical',
    'soft',
    'domain',
  ]);
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [professionalGoals, setProfessionalGoals] = useState('');
  const [domainKeywords, setDomainKeywords] = useState('');
  const gapAnalyzer = useMemo(() => new GapAnalyzerAgent(), []);

  const normalizeLevel = useCallback((value: number) => {
    if (Number.isNaN(value)) {
      return 1;
    }
    return Math.min(5, Math.max(1, Math.round(value * 10) / 10));
  }, []);

  const CATEGORY_OPTIONS = useMemo(
    () => [
      { id: 'technical', label: 'Technical' },
      { id: 'soft', label: 'Soft Skills' },
      { id: 'domain', label: 'Domain Knowledge' },
    ],
    []
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  interface AssessmentOptions {
    sourceGithub?: GitHubAnalysis | null;
    sourceChat?: any;
    finalizeProcessing?: boolean;
  }

  const handleSkillAssessmentComplete = useCallback(
    async (assessment: GapAnalysisResult, options: AssessmentOptions = {}) => {
      const { sourceGithub, sourceChat, finalizeProcessing = true } = options;

      if (sourceGithub) {
        assessment.githubAnalysis = sourceGithub;
      }
      if (sourceChat) {
        assessment.chatAnalysis = sourceChat;
      }

      setSkillAssessment(assessment);

      if (finalizeProcessing) {
        setIsProcessing(false);
      }

      if (!finalizeProcessing) {
        return;
      }

      const analysisToStore = sourceGithub ?? assessment.githubAnalysis ?? null;
      if (analysisToStore) {
        const userId = 'user_123';
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

          // Store on the server via API call
          const response = await fetch('/api/skill-gaps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              githubAnalysis: analysisToStore,
              skillAssessment: assessment,
              context: contextPayload,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Skill gap analysis stored for chat access:', {
              storageId: result.storageId,
              userId,
              repository: analysisToStore.repository,
              skillCount: assessment.skillGaps.length,
              overallScore: assessment.overallScore,
            });
          } else {
            console.error('❌ Failed to store skill gap analysis:', await response.text());
          }
        } catch (storageError) {
          console.error('❌ Failed to store skill gap analysis:', storageError);
        }
      }
    },
    [domainKeywords, professionalGoals, targetIndustry, targetRole]
  );

  const handleGitHubAnalysisComplete = useCallback(async (
    analysis: GitHubAnalysis
  ) => {
    setGitHubAnalysis(analysis);
    setAnalysisType('github');

    try {
      const assessment = await gapAnalyzer.generateAutomaticSkillAssessment(
        analysis,
        { includeCategories: selectedCategories }
      );
      assessment.analysisType = 'github';
      handleSkillAssessmentComplete(assessment, {
        sourceGithub: analysis,
      });
    } catch (assessmentError) {
      console.error('GitHub assessment error:', assessmentError);
      setError('Unable to evaluate skill gaps from the repository.');
      setIsProcessing(false);
    }
  }, [gapAnalyzer, selectedCategories, handleSkillAssessmentComplete]);

  const createSkillsFromAIChat = useCallback((analysis: any): Skill[] => {
    const skills: Skill[] = [];

    const addSkill = (skill: Skill) => {
      if (!skills.some((current) => current.id === skill.id)) {
        skills.push({
          ...skill,
          currentLevel: normalizeLevel(skill.currentLevel),
          targetLevel: normalizeLevel(skill.targetLevel ?? 5),
        });
      }
    };

    const baseLevel = analysis.skillLevel === 'advanced' ? 4 : analysis.skillLevel === 'intermediate' ? 3 : 2;

    analysis.technologies?.forEach((tech: string) => {
      addSkill({
        id: `ai-tech-${tech}`,
        name: tech,
        currentLevel: baseLevel,
        targetLevel: 5,
        importance: 4,
        category: 'technical',
      });
    });

    analysis.concepts?.forEach((concept: string) => {
      addSkill({
        id: `ai-concept-${concept}`,
        name: concept,
        currentLevel: baseLevel - 1,
        targetLevel: 5,
        importance: 3,
        category: 'technical',
      });
    });

    if ((analysis.learningPatterns?.debuggingQuestions ?? 0) > 0) {
      addSkill({
        id: 'ai-debugging',
        name: 'Debugging & Troubleshooting',
        currentLevel: baseLevel,
        targetLevel: 5,
        importance: 4,
        category: 'technical',
      });
    }

    if ((analysis.learningPatterns?.learningQuestions ?? 0) > 0) {
      addSkill({
        id: 'ai-learning-agility',
        name: 'Learning Agility',
        currentLevel: baseLevel,
        targetLevel: 5,
        importance: 3,
        category: 'soft',
      });
    }

    if ((analysis.promptingSignals ?? 0) > 0) {
      addSkill({
        id: 'prompt-engineering',
        name: 'Prompt Engineering',
        currentLevel: baseLevel,
        targetLevel: 5,
        importance: 4,
        category: 'technical',
      });
    }

    if ((analysis.contextSignals ?? 0) > 0) {
      addSkill({
        id: 'context-engineering',
        name: 'Context & Retrieval Practices',
        currentLevel: baseLevel - 1,
        targetLevel: 5,
        importance: 3,
        category: 'technical',
      });
    }

    if ((analysis.questionCount ?? 0) > 0 && skills.length === 0) {
      addSkill({
        id: 'ai-questioning',
        name: 'Problem Framing',
        currentLevel: baseLevel,
        targetLevel: 5,
        importance: 3,
        category: 'soft',
      });
    }

    if (skills.length === 0) {
      addSkill({
        id: 'ai-overview',
        name: 'AI Session Review',
        currentLevel: 2,
        targetLevel: 5,
        importance: 2,
        category: 'technical',
      });
    }

    return skills;
  }, [normalizeLevel]);

  const handleAIChatAnalysisComplete = useCallback((analysis: any) => {
    setAIChatAnalysis(analysis);
    setAnalysisType('ai-chat');

    try {
      const skills = createSkillsFromAIChat(analysis);
      const assessment = gapAnalyzer.analyzeSkillGaps(skills, {
        includeCategories: selectedCategories,
      });
      assessment.chatAnalysis = analysis;
      assessment.analysisType = 'ai-chat';
      handleSkillAssessmentComplete(assessment, {
        sourceChat: analysis,
      });
    } catch (assessmentError) {
      console.error('AI chat assessment error:', assessmentError);
      setError('Unable to infer skill gaps from the chat session.');
      setIsProcessing(false);
    }
  }, [createSkillsFromAIChat, gapAnalyzer, selectedCategories, handleSkillAssessmentComplete]);



  const handleAnalysisStart = () => {
    setIsProcessing(true);
    setError(null);
  };

  useEffect(() => {
    if (isProcessing) {
      return;
    }

    if (!selectedCategories.length) {
      return;
    }

    const updateAssessment = async () => {
      try {
        if (githubAnalysis) {
          const assessment = await gapAnalyzer.generateAutomaticSkillAssessment(
            githubAnalysis,
            { includeCategories: selectedCategories }
          );
          assessment.analysisType = 'github';
          handleSkillAssessmentComplete(assessment, {
            sourceGithub: githubAnalysis,
            finalizeProcessing: false,
          });
        } else if (aiChatAnalysis) {
          const skills = createSkillsFromAIChat(aiChatAnalysis);
          const assessment = gapAnalyzer.analyzeSkillGaps(skills, {
            includeCategories: selectedCategories,
          });
          assessment.chatAnalysis = aiChatAnalysis;
          assessment.analysisType = 'ai-chat';
          handleSkillAssessmentComplete(assessment, {
            sourceChat: aiChatAnalysis,
            finalizeProcessing: false,
          });
        }
      } catch (updateError) {
        console.error('Category update error:', updateError);
      }
    };

    updateAssessment();
  }, [
    selectedCategories,
    githubAnalysis,
    aiChatAnalysis,
    gapAnalyzer,
    createSkillsFromAIChat,
    handleSkillAssessmentComplete,
    isProcessing,
  ]);

  const resetAnalysis = () => {
    setGitHubAnalysis(null);
    setAIChatAnalysis(null);
    setSkillAssessment(null);
    setIsProcessing(false);
    setError(null);
    setAnalysisType('github');
  };

  const getProgress = () => {
    const hasAnalysis = githubAnalysis || aiChatAnalysis;
    if (!hasAnalysis && !skillAssessment) return 0;
    if (hasAnalysis && !skillAssessment) return 50;
    if (hasAnalysis && skillAssessment) return 100;
    return 0;
  };

  const getProgressText = () => {
    const hasAnalysis = githubAnalysis || aiChatAnalysis;
    if (!hasAnalysis && !skillAssessment) return 'Ready to analyze';
    if (hasAnalysis && !skillAssessment) return 'Analyzing skills...';
    if (hasAnalysis && skillAssessment) return 'Analysis complete!';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Automatic Skill Gap Analysis</span>
          </CardTitle>
          <CardDescription>
            Enter a GitHub repository URL to automatically analyze your skills and identify gaps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{getProgressText()}</span>
              <span>{getProgress()}% Complete</span>
            </div>
            <Progress value={getProgress()} />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                <span>Focus Categories</span>
                <span>{selectedCategories.length} selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(({ id, label }) => {
                  const isSelected = selectedCategories.includes(id);
                  return (
                    <Button
                      key={id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(id)}
                      className="rounded-full"
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            
            {/* Step Indicators */}
            <div className="flex justify-between">
              <div className={`flex items-center space-x-2 ${analysisType === 'github' && githubAnalysis ? 'text-green-600' : analysisType === 'ai-chat' && aiChatAnalysis ? 'text-green-600' : 'text-gray-400'}`}>
                {analysisType === 'github' ? (
                  <>
                    <Github className="h-4 w-4" />
                    <span className="text-sm">GitHub Analysis</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    <span className="text-sm">Chat Analysis</span>
                  </>
                )}
              </div>
              <div className={`flex items-center space-x-2 ${skillAssessment ? 'text-green-600' : isProcessing ? 'text-blue-600' : 'text-gray-400'}`}>
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Skill Assessment</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Career Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Career Goals & Focus</span>
          </CardTitle>
          <CardDescription>
            Tell the research agent what roles and industries you care about so it can search beyond pure programming topics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Role</label>
              <Input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Industry</label>
              <Input
                value={targetIndustry}
                onChange={(event) => setTargetIndustry(event.target.value)}
                placeholder="e.g. Healthcare, Fintech, Climate"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Domain Keywords (comma separated)
              </label>
              <Input
                value={domainKeywords}
                onChange={(event) => setDomainKeywords(event.target.value)}
                placeholder="e.g. HIPAA, EHR, patient analytics"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Professional Goals</label>
              <Textarea
                value={professionalGoals}
                onChange={(event) => setProfessionalGoals(event.target.value)}
                placeholder="Describe what you want to achieve in the next 6-12 months"
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Options */}
      {!skillAssessment && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Choose Your Analysis Method</h3>
            <p className="text-muted-foreground">
              Select either GitHub repository analysis or AI chat session analysis
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={`cursor-pointer transition-all ${analysisType === 'github' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
              <CardHeader onClick={() => setAnalysisType('github')}>
                <CardTitle className="flex items-center space-x-2">
                  <Github className="h-5 w-5" />
                  <span>GitHub Repository</span>
                </CardTitle>
                <CardDescription>
                  Analyze your code repositories to discover skills and technologies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GitHubAnalysisComponent
                  onAnalysisComplete={handleGitHubAnalysisComplete}
                  showContainer={false}
                  showHeader={false}
                  selectedCategories={selectedCategories}
                  autoGenerateAssessment={false}
                />
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all ${analysisType === 'ai-chat' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
              <CardHeader onClick={() => setAnalysisType('ai-chat')}>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Chat Session</span>
                </CardTitle>
                <CardDescription>
                  Analyze your AI coding conversations to identify learning patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIChatAnalysis
                  onAnalysisComplete={handleAIChatAnalysisComplete}
                  onAnalysisStart={handleAnalysisStart}
                  isAnalyzing={isProcessing}
                  showContainer={false}
                  showHeader={false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && !skillAssessment && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Analyzing Your Skills</h3>
              <p className="text-muted-foreground">
                {analysisType === 'github' 
                  ? "We're automatically assessing your skills based on the repository analysis..."
                  : "We're analyzing your AI chat session to identify skills and learning patterns..."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {skillAssessment && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Skill Gap Analysis Complete!</span>
              </CardTitle>
              <CardDescription>
                {analysisType === 'github' 
                  ? 'Based on your GitHub repository analysis'
                  : 'Based on your AI chat session analysis'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {skillAssessment.overallScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Skill Score</div>
                  <Progress value={skillAssessment.overallScore} className="mt-2" />
                </div>

                {/* Radar Chart */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Skill Visualization</h3>
                  <SkillRadarChart
                    categories={skillAssessment.categories}
                    currentSkills={skillAssessment.skillGaps.map(gap => gap.skill)}
                    targetSkills={skillAssessment.skillGaps.map(gap => ({
                      ...gap.skill,
                      currentLevel: gap.skill.targetLevel
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Chat Analysis Insights */}
          {analysisType === 'ai-chat' && aiChatAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Chat Analysis Insights</span>
                </CardTitle>
                <CardDescription>
                  Key findings from your AI coding session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Questions Analyzed</h4>
                      <div className="text-2xl font-bold text-primary">{aiChatAnalysis.questionCount || 0}</div>
                      <p className="text-sm text-muted-foreground">User questions</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">AI Responses</h4>
                      <div className="text-2xl font-bold text-primary">{aiChatAnalysis.responseCount || 0}</div>
                      <p className="text-sm text-muted-foreground">Assistant responses</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Prompting Signals</h4>
                      <div className="text-2xl font-bold text-primary">{aiChatAnalysis.promptingSignals || 0}</div>
                      <p className="text-sm text-muted-foreground">Prompt engineering references</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Context Signals</h4>
                      <div className="text-2xl font-bold text-primary">{aiChatAnalysis.contextSignals || 0}</div>
                      <p className="text-sm text-muted-foreground">Context & retrieval mentions</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Technologies Discussed</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiChatAnalysis.technologies.map((tech: string, index: number) => (
                          <Badge key={index} variant="outline">{tech}</Badge>
                        ))}
                        {aiChatAnalysis.technologies.length === 0 && (
                          <span className="text-sm text-muted-foreground">No specific technologies mentioned in questions</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Concepts Covered</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiChatAnalysis.concepts.map((concept: string, index: number) => (
                          <Badge key={index} variant="secondary">{concept}</Badge>
                        ))}
                        {aiChatAnalysis.concepts.length === 0 && (
                          <span className="text-sm text-muted-foreground">No specific concepts mentioned in questions</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {aiChatAnalysis.learningPatterns && (
                    <div>
                      <h4 className="font-semibold mb-2">Learning Patterns</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Beginner Questions:</span>
                          <span className="font-medium">{aiChatAnalysis.learningPatterns.beginnerQuestions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Intermediate Questions:</span>
                          <span className="font-medium">{aiChatAnalysis.learningPatterns.intermediateQuestions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Advanced Questions:</span>
                          <span className="font-medium">{aiChatAnalysis.learningPatterns.advancedQuestions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Debugging Questions:</span>
                          <span className="font-medium">{aiChatAnalysis.learningPatterns.debuggingQuestions || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold mb-2">Skill Level</h4>
                    <div className="flex items-center space-x-4">
                      <Badge className={`${aiChatAnalysis.skillLevel === 'advanced' ? 'bg-green-100 text-green-800' : aiChatAnalysis.skillLevel === 'intermediate' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {aiChatAnalysis.skillLevel}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {aiChatAnalysis.confidence}%
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Key Insights</h4>
                    <ul className="text-sm space-y-1">
                      {aiChatAnalysis.insights.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Skill Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Top Skill Gaps</span>
              </CardTitle>
              <CardDescription>
                Areas where you can improve your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skillAssessment.skillGaps.slice(0, 5).map((gap) => {
                  const gapValue = (Math.round(gap.gap * 10) / 10).toFixed(1);
                  const currentLevel = (Math.round(gap.skill.currentLevel * 10) / 10).toFixed(1);
                  const targetLevel = (Math.round(gap.skill.targetLevel * 10) / 10).toFixed(1);

                  return (
                    <div key={`${gap.skill.id}-${gapValue}`} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{gap.skill.name}</span>
                        <Badge variant={gap.gap > 2 ? "destructive" : gap.gap > 1 ? "default" : "secondary"}>
                          Gap: {gapValue}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Current: {currentLevel}/5 → Target: {targetLevel}/5
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(gap.skill.currentLevel / 5) * 100}%` }}
                        />
                      </div>
                      {gap.recommendations.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Recommendation:</div>
                          <div className="text-xs">{gap.recommendations[0]}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Learning Path */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Recommended Learning Path</span>
              </CardTitle>
              <CardDescription>
                Personalized steps to improve your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {skillAssessment.learningPath.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="text-sm">{step}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* General Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>General Recommendations</span>
              </CardTitle>
              <CardDescription>
                Additional insights for your skill development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skillAssessment.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Button onClick={resetAnalysis} variant="outline">
              Analyze Another Repository
            </Button>
            <Button onClick={() => window.print()}>
              Export Results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
