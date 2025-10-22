"use client";

import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GitHubAnalysisComponent } from './github-analysis';
import { SkillRadarChart } from './skill-radar-chart';
import {
  GapAnalyzerAgent,
  type GapAnalysisResult,
  type GitHubAnalysis,
} from '@/lib/agents/gap-analyzer';
import { Target, CheckCircle, AlertCircle, TrendingUp, BookOpen, Github } from 'lucide-react';
import { cn, formatGapValue } from '@/lib/utils';

const primaryCard =
  'relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-[#1a1441] via-[#231856] to-[#351c72] p-8 shadow-[0_20px_60px_rgba(76,29,149,0.35)]';
const translucentCard = 'border-white/10 bg-white/5 backdrop-blur rounded-3xl';

export function AutomaticGapAnalysis() {
  const [githubAnalysis, setGitHubAnalysis] = useState<GitHubAnalysis | null>(null);
  const [skillAssessment, setSkillAssessment] = useState<GapAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [professionalGoals, setProfessionalGoals] = useState('');

  const gapAnalyzer = useMemo(() => new GapAnalyzerAgent(), []);

  const handleSkillAssessmentComplete = useCallback(
    async (assessment: GapAnalysisResult, options: { sourceGithub?: GitHubAnalysis | null; finalizeProcessing?: boolean } = {}) => {
      const { sourceGithub, finalizeProcessing = true } = options;

      if (sourceGithub) {
        assessment.githubAnalysis = sourceGithub;
      }

      setSkillAssessment(assessment);

      if (finalizeProcessing) {
        setIsProcessing(false);
      }

      const analysisToStore = sourceGithub ?? assessment.githubAnalysis ?? null;
      if (!analysisToStore) {
        return;
      }

      const userId = 'user_123';
      try {
        const response = await fetch('/api/skill-gaps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            githubAnalysis: analysisToStore,
            skillAssessment: assessment,
            context: {
              targetRole: targetRole || undefined,
              targetIndustry: targetIndustry || undefined,
              professionalGoals: professionalGoals || undefined,
            },
          }),
        });

        if (!response.ok) {
          console.error('Failed to store skill gap analysis:', await response.text());
        }
      } catch (storageError) {
        console.error('Failed to store skill gap analysis:', storageError);
      }
    },
    [professionalGoals, targetIndustry, targetRole]
  );

  const handleGitHubAnalysisComplete = useCallback(
    async (analysis: GitHubAnalysis) => {
      setGitHubAnalysis(analysis);

      try {
        const assessment = await gapAnalyzer.generateAutomaticSkillAssessment(analysis);
        assessment.analysisType = 'github';
        handleSkillAssessmentComplete(assessment, { sourceGithub: analysis });
      } catch (assessmentError) {
        console.error('GitHub assessment error:', assessmentError);
        setError('Unable to evaluate skill gaps from the repository.');
        setIsProcessing(false);
      }
    },
    [gapAnalyzer, handleSkillAssessmentComplete]
  );

  const handleAnalysisStart = () => {
    setIsProcessing(true);
    setError(null);
    setSkillAssessment(null);
    setGitHubAnalysis(null);
  };

  const resetAnalysis = () => {
    setGitHubAnalysis(null);
    setSkillAssessment(null);
    setIsProcessing(false);
    setError(null);
    setTargetRole('');
    setTargetIndustry('');
    setProfessionalGoals('');
  };

  return (
    <div className="space-y-6 text-white">
      <Card className={primaryCard}>
        <CardHeader className="space-y-3 text-white">
          <CardTitle className="flex items-center gap-3 text-2xl font-semibold text-white">
            <Target className="h-6 w-6" />
            <span>Agentic Skill Analyzer</span>
          </CardTitle>
          <CardDescription className="text-slate-300">
            Drop a GitHub username or repository URL and let autonomous agents audit your work, map skill gaps, and build a market-aligned learning plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-white">
          <div className="space-y-4 rounded-2xl border border-white/15 bg-white/10 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <GitHubAnalysisComponent
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleGitHubAnalysisComplete}
              onAnalysisError={(message) => {
                setIsProcessing(false);
                setError(message);
              }}
              showContainer={false}
              showHeader={false}
              autoGenerateAssessment={false}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                  Target Role (Optional)
                </label>
                <Input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="h-11 rounded-2xl border border-white/15 bg-white/10 text-white placeholder:text-slate-300 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-purple-200/40 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                  Target Industry (Optional)
                </label>
                <Input
                  value={targetIndustry}
                  onChange={(event) => setTargetIndustry(event.target.value)}
                  placeholder="e.g. Healthcare, Fintech, Climate"
                  className="h-11 rounded-2xl border border-white/15 bg-white/10 text-white placeholder:text-slate-300 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-purple-200/40 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                Professional Goals (Optional)
              </label>
              <Textarea
                value={professionalGoals}
                onChange={(event) => setProfessionalGoals(event.target.value)}
                placeholder="Describe what you want to achieve in the next 6-12 months"
                rows={3}
                className="rounded-2xl border border-white/15 bg-white/10 text-white placeholder:text-slate-300 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-purple-200/40 focus-visible:ring-offset-0"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {error && (
        <Alert
          variant="destructive"
          className="border-red-400/40 bg-red-500/10 text-red-200"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!skillAssessment && !isProcessing && (
        <Card className={cn(translucentCard, 'border-dashed border-white/20')}>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-16 text-center text-slate-200">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <Github className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">No Analysis Yet</h3>
              <p className="max-w-md text-sm text-slate-300">
                Enter your GitHub profile or repository URL and activate the agent to start mapping skill gaps and recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && !skillAssessment && (
        <Card className={translucentCard}>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
              <h3 className="mb-2 text-lg font-semibold text-white">Analyzing Your Skills</h3>
              <p className="text-slate-300">
                We&apos;re automatically assessing your GitHub footprint to identify strengths, gaps, and next-step recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {skillAssessment && (
        <div className="space-y-6">
          <Card className={translucentCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
                <span>Skill Gap Analysis Complete!</span>
              </CardTitle>
              <CardDescription className="text-slate-300">
                Based on your GitHub repository analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="text-center">
                  <div className="mb-2 text-4xl font-bold text-white">
                    {skillAssessment.overallScore}%
                  </div>
                  <div className="text-sm text-slate-300">Overall Skill Score</div>
                  <Progress value={skillAssessment.overallScore} className="mt-2 bg-white/10" />
                </div>

                <div className="mt-6">
                  <h3 className="mb-4 text-center text-lg font-semibold text-white">Skill Visualization</h3>
                  <SkillRadarChart
                    categories={skillAssessment.categories}
                    currentSkills={skillAssessment.skillGaps.map((gap) => gap.skill)}
                    targetSkills={skillAssessment.skillGaps.map((gap) => ({
                      ...gap.skill,
                      currentLevel: gap.skill.targetLevel,
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={translucentCard}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <TrendingUp className="h-5 w-5" />
                <span>Top Skill Gaps</span>
              </CardTitle>
              <CardDescription className="text-slate-300">
                Areas where you can improve your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skillAssessment.skillGaps.slice(0, 5).map((gap) => {
                  const gapValue = formatGapValue(gap.gap);
                  const currentLevel = formatGapValue(gap.skill.currentLevel);
                  const targetLevel = formatGapValue(gap.skill.targetLevel);

                  return (
                    <div
                      key={`${gap.skill.id}-${gapValue}`}
                      className="rounded-lg border border-white/10 bg-slate-900/40 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-white">{gap.skill.name}</span>
                        <Badge variant={gap.gap > 2 ? 'destructive' : gap.gap > 1 ? 'default' : 'secondary'}>
                          Gap: {gapValue}
                        </Badge>
                      </div>
                      <div className="mb-2 text-sm text-slate-300">
                        Current: {currentLevel}/5 → Target: {targetLevel}/5
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-emerald-400/80 transition-all duration-300"
                          style={{ width: `${(gap.skill.currentLevel / 5) * 100}%` }}
                        />
                      </div>
                      {gap.recommendations.length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                            Recommendation
                          </div>
                          <div className="text-sm text-slate-200">{gap.recommendations[0]}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className={translucentCard}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <BookOpen className="h-5 w-5" />
                <span>Recommended Learning Path</span>
              </CardTitle>
              <CardDescription className="text-slate-300">
                Personalized steps to improve your skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {skillAssessment.learningPath.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 rounded-lg border border-white/10 bg-slate-900/40 p-3"
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-slate-900">
                      {index + 1}
                    </div>
                    <div className="text-sm text-slate-200">{step}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={translucentCard}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Target className="h-5 w-5" />
                <span>General Recommendations</span>
              </CardTitle>
              <CardDescription className="text-slate-300">
                Additional insights for your skill development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {skillAssessment.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 rounded-lg border border-white/10 bg-slate-900/40 p-3"
                  >
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                    <span className="text-sm text-slate-200">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center space-x-4">
            <Button
              onClick={resetAnalysis}
              variant="outline"
              className="rounded-xl border-white/40 text-white hover:bg-white/10"
            >
              Analyze Another Repository
            </Button>
            <Button
              onClick={() => window.print()}
              className="rounded-xl bg-white text-slate-900 hover:bg-slate-200"
            >
              Export Results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
