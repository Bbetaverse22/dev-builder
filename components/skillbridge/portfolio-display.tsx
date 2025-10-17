"use client";

import { useAnalysis } from '@/lib/contexts/analysis-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Target, Rocket, ArrowRight, GitPullRequest } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function PortfolioDisplay() {
  const { analysisResults, hasCompletedAnalysis } = useAnalysis();
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [isCreatingIssues, setIsCreatingIssues] = useState(false);
  const [createdIssues, setCreatedIssues] = useState<any[]>([]);
  const [creationMessage, setCreationMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    console.log('[PortfolioDisplay] hasCompletedAnalysis:', hasCompletedAnalysis);
    console.log('[PortfolioDisplay] analysisResults:', analysisResults);
  }, [hasCompletedAnalysis, analysisResults]);

  const toggleActionSelection = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const selectAllActions = (actions: any[], checked: boolean) => {
    if (checked) {
      setSelectedActions(new Set(actions.map(a => a.id)));
    } else {
      setSelectedActions(new Set());
    }
  };

  const createGitHubIssues = async () => {
    if (selectedActions.size === 0) {
      setCreationMessage({ type: 'error', text: 'Select at least one action to create issues' });
      return;
    }

    if (!analysisResults?.repoUrl) {
      setCreationMessage({ type: 'error', text: 'Repository URL not found' });
      return;
    }

    setIsCreatingIssues(true);
    setCreationMessage(null);
    setCreatedIssues([]);

    try {
      const selectedIds = Array.from(selectedActions);

      const response = await fetch('/api/portfolio-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: analysisResults.repoUrl,
          recommendationIds: selectedIds,
          createIssues: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.issues) {
          const successfulIssues = result.issues.filter((issue: any) => issue.success);
          setCreatedIssues(successfulIssues);
          setCreationMessage({
            type: 'success',
            text: `Successfully created ${successfulIssues.length} GitHub issue${successfulIssues.length !== 1 ? 's' : ''}!`
          });
          setSelectedActions(new Set());
        }
      } else {
        setCreationMessage({ type: 'error', text: 'Failed to create GitHub issues' });
      }
    } catch (error) {
      console.error('Error creating issues:', error);
      setCreationMessage({ type: 'error', text: 'An error occurred while creating issues' });
    } finally {
      setIsCreatingIssues(false);
    }
  };

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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Rocket className="h-6 w-6" />
                <div>
                  <CardTitle className="text-white text-2xl">Improvement Actions</CardTitle>
                  <CardDescription className="text-white/80 text-base">
                    Prioritized tasks to enhance your portfolio
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <Checkbox
                checked={selectedActions.size === portfolioActions.length && portfolioActions.length > 0}
                onCheckedChange={(checked) => selectAllActions(portfolioActions, checked as boolean)}
                className="h-4 w-4"
              />
              <label className="text-sm text-white cursor-pointer flex-1">
                Select all actions ({selectedActions.size}/{portfolioActions.length})
              </label>
            </div>

            {/* Action List */}
            <div className="space-y-3">
              {portfolioActions.map((action: any) => (
                <div
                  key={action.id}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-emerald-400/30 transition-colors flex gap-3"
                >
                  <Checkbox
                    checked={selectedActions.has(action.id)}
                    onCheckedChange={() => toggleActionSelection(action.id)}
                    className="h-4 w-4 mt-1"
                  />
                  <div className="flex-1">
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
                </div>
              ))}
            </div>

            {/* Creation Status Message */}
            {creationMessage && (
              <div className={`p-4 rounded-lg border ${
                creationMessage.type === 'success'
                  ? 'bg-emerald-900/20 border-emerald-400/30'
                  : 'bg-red-900/20 border-red-400/30'
              }`}>
                <p className={`text-sm ${creationMessage.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                  {creationMessage.type === 'success' ? '✅' : '❌'} {creationMessage.text}
                </p>
              </div>
            )}

            {/* Created Issues List */}
            {createdIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-white text-sm">Created GitHub Issues:</h4>
                {createdIssues.map((issue: any, index: number) => (
                  <div key={index} className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-400/30">
                    <a
                      href={issue.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      <span className="text-sm font-medium">#{issue.issueNumber}: {issue.title}</span>
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Create Issues Button */}
            {selectedActions.size > 0 && (
              <Button
                onClick={createGitHubIssues}
                disabled={isCreatingIssues}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold h-11 rounded-lg"
              >
                {isCreatingIssues ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating Issues...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="h-4 w-4 mr-2" />
                    Create {selectedActions.size} GitHub Issue{selectedActions.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
