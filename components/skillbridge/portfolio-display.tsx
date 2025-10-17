"use client";

import { useAnalysis } from '@/lib/contexts/analysis-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Target, Rocket, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export function PortfolioDisplay() {
  const { analysisResults, hasCompletedAnalysis } = useAnalysis();

  useEffect(() => {
    console.log('[PortfolioDisplay] hasCompletedAnalysis:', hasCompletedAnalysis);
    console.log('[PortfolioDisplay] analysisResults:', analysisResults);
  }, [hasCompletedAnalysis, analysisResults]);

  if (!hasCompletedAnalysis) {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-400/30 bg-gradient-to-br from-emerald-800/50 via-emerald-900/40 to-slate-950/70">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Rocket className="h-16 w-16 mx-auto text-emerald-400/50" />
              <h3 className="text-2xl font-bold text-white">No Portfolio Analysis Yet</h3>
              <p className="text-emerald-100/70 leading-relaxed">
                Run the Skill Gap Analysis first to generate portfolio quality insights and improvement recommendations.
              </p>
              <Link href="/agentic/skill-gaps">
                <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
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

  const { portfolioQuality = null, portfolioActions = [] } = analysisResults || {};

  return (
    <div className="space-y-6 text-white">
      {/* Portfolio Quality Section */}
      {portfolioQuality && (
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <Target className="h-6 w-6" />
              <span>Portfolio Quality Analysis</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              AI-powered analysis of your repository quality and completeness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="p-6 bg-emerald-200/10 rounded-lg border border-emerald-200/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Overall Quality Score</h3>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${
                    portfolioQuality.overallScore >= 80 ? 'text-emerald-300' :
                    portfolioQuality.overallScore >= 60 ? 'text-yellow-300' :
                    'text-red-300'
                  }`}>
                    {portfolioQuality.overallScore}%
                  </div>
                  <p className="text-sm text-emerald-100/70 mt-1">
                    {portfolioQuality.overallScore >= 80 ? 'Excellent' :
                     portfolioQuality.overallScore >= 60 ? 'Good' :
                     'Needs Improvement'}
                  </p>
                </div>
              </div>
              <Progress
                value={portfolioQuality.overallScore}
                className="h-3"
              />
            </div>

            {/* Strengths */}
            {portfolioQuality.strengths.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-300" />
                  Strengths ({portfolioQuality.strengths.length})
                </h3>
                <div className="grid gap-2">
                  {portfolioQuality.strengths.map((strength: string, index: number) => (
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
            {portfolioQuality.weaknesses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-300" />
                  Areas for Improvement ({portfolioQuality.weaknesses.length})
                </h3>
                <div className="grid gap-2">
                  {portfolioQuality.weaknesses.map((weakness: any, index: number) => (
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
          </CardContent>
        </Card>
      )}

      {/* Portfolio Actions */}
      {portfolioActions.length > 0 && (
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <Rocket className="h-6 w-6" />
              <span>Improvement Actions</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Prioritized tasks to enhance your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolioActions.map((action: any) => (
                <div
                  key={action.id}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-emerald-400/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white">{action.title}</h4>
                    <Badge
                      variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300/80 mb-2">{action.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>⏱️ {action.estimatedTime}</span>
                    <span>📂 {action.category}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-400/30 rounded-lg">
              <p className="text-sm text-blue-100/80">
                💡 <strong>Tip:</strong> Return to the Skill Gap Analysis page to create GitHub issues for selected improvements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
