"use client";

import { useAnalysis } from '@/lib/contexts/analysis-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Github, FileText, ArrowRight, Sparkles, Compass, BarChart3, Target, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';

export function LearningDisplay() {
  const { analysisResults, hasCompletedAnalysis } = useAnalysis();

  // Debug logging (remove in production)
  console.log('[LearningDisplay] Analysis status:', {
    hasCompletedAnalysis,
    researchResults: analysisResults?.researchResults?.length ?? 0,
    githubExamples: analysisResults?.githubExamples?.length ?? 0,
    repoUrl: analysisResults?.repoUrl
  });

  // Always show empty state if no analysis completed
  if (!hasCompletedAnalysis) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <BookOpen className="h-16 w-16 mx-auto text-indigo-400/50" />
              <h3 className="text-2xl font-bold text-white">No Learning Resources Yet</h3>
              <p className="text-indigo-100/70 leading-relaxed">
                Run the Skill Gap Analysis first to generate personalized learning resources and GitHub examples tailored to your skill gaps.
              </p>
              <Link href="/agentic/skill-gaps">
                <Button className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                  Start Analysis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    researchResults = [],
    githubExamples = [],
    comparativeInsights = [],
    learningPath = [],
    confidenceBreakdown,
  } = analysisResults || {};

  const skillLevel = analysisResults?.githubAnalysis?.skillLevel || 'intermediate';
  const overallScore = analysisResults?.skillAssessmentScore ?? 75;
  
  // Skill level configuration
  const skillLevelConfig = {
    beginner: {
      color: 'emerald',
      icon: Target,
      label: 'Beginner',
      description: 'Building strong fundamentals and confidence',
      gradient: 'from-emerald-600/30 via-emerald-800/20 to-slate-950/60',
      border: 'border-emerald-400/40',
      shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]',
    },
    intermediate: {
      color: 'blue',
      icon: TrendingUp,
      label: 'Intermediate',
      description: 'Advancing skills with practical application',
      gradient: 'from-blue-600/30 via-blue-800/20 to-slate-950/60',
      border: 'border-blue-400/40',
      shadow: 'shadow-[0_0_40px_rgba(59,130,246,0.25)]',
    },
    advanced: {
      color: 'purple',
      icon: Award,
      label: 'Advanced',
      description: 'Mastering advanced concepts and leadership',
      gradient: 'from-purple-600/30 via-purple-800/20 to-slate-950/60',
      border: 'border-purple-400/40',
      shadow: 'shadow-[0_0_40px_rgba(168,85,247,0.25)]',
    },
  };

  const currentConfig = skillLevelConfig[skillLevel as keyof typeof skillLevelConfig] || skillLevelConfig.intermediate;
  const SkillIcon = currentConfig.icon;

  return (
    <div className="space-y-6 text-white">
      {/* Adaptive Learning Level Indicator */}
      <Card className={`border-2 ${currentConfig.border} bg-gradient-to-br ${currentConfig.gradient} ${currentConfig.shadow} backdrop-blur-md`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-${currentConfig.color}-500/20 border border-${currentConfig.color}-400/40`}>
              <SkillIcon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {currentConfig.label} Level Learning Path
                  </h3>
                  <p className="text-sm text-white/80">
                    {currentConfig.description}
                  </p>
                </div>
                <Badge variant="secondary" className={`bg-${currentConfig.color}-500/30 text-${currentConfig.color}-100 border-${currentConfig.color}-400/40 px-4 py-2 text-base`}>
                  {overallScore}% Proficiency
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-white/60 mb-1">Learning Focus</span>
                  <span className="text-white font-medium">
                    {skillLevel === 'beginner' ? 'Fundamentals' : skillLevel === 'intermediate' ? 'Practical Skills' : 'Mastery'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 mb-1">Content Type</span>
                  <span className="text-white font-medium">
                    {skillLevel === 'beginner' ? 'Tutorials' : skillLevel === 'intermediate' ? 'Projects' : 'Architecture'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 mb-1">Estimated Pace</span>
                  <span className="text-white font-medium">
                    {skillLevel === 'beginner' ? 'Thorough' : skillLevel === 'intermediate' ? 'Moderate' : 'Accelerated'}
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-white/70">
                  💡 <strong>Personalized for you:</strong> This learning path adapts to your {currentConfig.label.toLowerCase()} skill level, 
                  providing resources and time estimates suited to your experience.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Resources */}
      {researchResults.length > 0 && (
        <Card className="border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <FileText className="h-6 w-6" />
              <span>Learning Resources</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              AI-curated articles, tutorials, and courses for your skill gaps ({researchResults.length} resources)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 ${researchResults.length > 4 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
              {researchResults.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-indigo-200/10 rounded-lg border border-indigo-200/20 hover:bg-indigo-200/20 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h4 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {resource.title}
                      </h4>
                      {resource.summary ? (
                        <p className="text-sm text-indigo-100/80 leading-relaxed">{resource.summary}</p>
                      ) : (
                        <p className="text-sm text-indigo-100/70 mt-1">{resource.description}</p>
                      )}
                      {resource.keyPoints && resource.keyPoints.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs uppercase tracking-wide text-indigo-200/60">Key takeaways</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-indigo-100/80">
                            {resource.keyPoints.slice(0, 4).map((point: string, idx: number) => (
                              <li key={idx}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {resource.relevance && (
                          <Badge variant="outline" className="text-xs text-indigo-200 border-indigo-200/30">
                            Relevance: {resource.relevance}
                          </Badge>
                        )}
                        {resource.recommendedAudience && (
                          <Badge variant="outline" className="text-xs text-indigo-200 border-indigo-200/30">
                            Audience: {resource.recommendedAudience}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GitHub Examples */}
      {githubExamples.length > 0 && (
        <Card className="border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <Github className="h-6 w-6" />
              <span>GitHub Examples</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Real-world repositories demonstrating best practices ({githubExamples.length} examples)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-3 ${githubExamples.length > 4 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
              {githubExamples.map((example: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-indigo-400/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <a
                      href={example.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-white hover:text-indigo-300 transition-colors flex items-center gap-2"
                    >
                      {example.name}
                      {example.stars && (
                        <Badge variant="secondary" className="text-xs">
                          {example.stars}⭐
                        </Badge>
                      )}
                    </a>
                  </div>
                  <p className="text-sm text-slate-300/80 mb-2">{example.description}</p>
                  {example.language && (
                    <Badge variant="outline" className="text-xs text-indigo-200 border-indigo-200/30">
                      {example.language}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparative Insights */}
      {comparativeInsights && comparativeInsights.length > 0 && (
        <Card className="border-2 border-purple-400/40 bg-gradient-to-br from-purple-700/40 via-purple-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(168,85,247,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <Compass className="h-6 w-6" />
              <span>Comparative Insights</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Trade-offs and positioning across top learning resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`space-y-4 ${comparativeInsights.length > 4 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
              {comparativeInsights.map((insight: any, index: number) => (
                <div key={index} className="p-4 rounded-lg border border-purple-200/20 bg-purple-200/10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-white">{insight.title}</h4>
                    <Badge variant="outline" className="text-xs text-purple-100 border-purple-200/40">
                      Confidence: {insight.confidence}
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-100/80 leading-relaxed">{insight.insight}</p>
                  {insight.supportingResources?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-wide text-purple-200/60 mb-1">Supporting resources</p>
                      <div className="flex flex-wrap gap-2">
                        {insight.supportingResources.slice(0, 4).map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-100 underline decoration-dotted hover:text-purple-200"
                          >
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Path */}
      {learningPath && learningPath.length > 0 && (
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/30 via-emerald-900/20 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <Sparkles className="h-6 w-6" />
              <span>Sequenced Learning Path</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Follow these steps to progress from fundamentals to mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`space-y-4 ${learningPath.length > 4 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
              {learningPath.map((step: any, index: number) => (
                <div key={`${step.title}-${step.order}-${index}`} className="p-4 rounded-lg border border-emerald-200/20 bg-emerald-200/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-100 border-emerald-400/40">
                          Step {step.order}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-emerald-100 border-emerald-200/40 capitalize">
                          {step.difficulty}
                        </Badge>
                        {typeof step.estimatedTimeHours === 'number' && (
                          <Badge variant="outline" className="text-xs text-emerald-100 border-emerald-200/40">
                            ~{step.estimatedTimeHours} hrs
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-lg font-semibold text-white">{step.title}</h4>
                      <p className="text-sm text-emerald-100/80 leading-relaxed">{step.description}</p>
                      {step.resourceUrl && (
                        <a
                          href={step.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-emerald-100 underline decoration-dotted hover:text-emerald-200"
                        >
                          {step.resourceTitle ?? 'View supporting resource'}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confidence Breakdown */}
      {confidenceBreakdown && (
        <Card className="border-2 border-sky-400/40 bg-gradient-to-br from-sky-700/30 via-sky-900/20 to-slate-950/60 shadow-[0_0_40px_rgba(56,189,248,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <BarChart3 className="h-6 w-6" />
              <span>Confidence Breakdown</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Scores generated by the research agent after ranking sources, evaluating coverage, and sanity-checking freshness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Overall', value: confidenceBreakdown.overall ?? 0 },
              { label: 'Relevance', value: confidenceBreakdown.relevance ?? 0 },
              { label: 'Coverage', value: confidenceBreakdown.coverage ?? 0 },
              { label: 'Recency', value: confidenceBreakdown.recency ?? 0 },
              { label: 'Practicality', value: confidenceBreakdown.practicality ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm text-sky-100/90">
                  <span>{label}</span>
                  <span>{Math.round((value ?? 0) * 100)}%</span>
                </div>
                <Progress value={Math.round((value ?? 0) * 100)} className="h-2 bg-sky-900/40" />
              </div>
            ))}
            {confidenceBreakdown.confidenceNotes && confidenceBreakdown.confidenceNotes.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-sky-200/60 mb-1">Notes</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-sky-100/80">
                  {confidenceBreakdown.confidenceNotes.map((note: string, idx: number) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {researchResults.length === 0 && githubExamples.length === 0 && (
        <Card className="border-2 border-indigo-400/40 bg-gradient-to-br from-indigo-700/40 via-indigo-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <BookOpen className="h-16 w-16 mx-auto text-indigo-400/50" />
              <h3 className="text-2xl font-bold text-white">No Learning Resources Generated</h3>
              <p className="text-indigo-100/70 leading-relaxed">
                The research agent didn't find learning resources or GitHub examples for this analysis.
              </p>
              <p className="text-sm text-indigo-100/60 leading-relaxed">
                This can happen for very niche skills or if the research agent encountered API issues. Try running the analysis again with a different repository or check the Skill Gap Analysis page for more details.
              </p>
              <div className="flex gap-3 justify-center mt-6">
                <Link href="/agentic/skill-gaps">
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                    Run New Analysis
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="border-indigo-400/40 text-white hover:bg-indigo-500/20"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('skillbridge_analysis_results');
                      window.location.reload();
                    }
                  }}
                >
                  Clear Cache
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
