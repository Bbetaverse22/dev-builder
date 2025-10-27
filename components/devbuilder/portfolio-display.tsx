"use client";

import { useAnalysis } from '@/lib/contexts/analysis-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Rocket, ArrowRight, GitPullRequest, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

export function PortfolioDisplay() {
  const { analysisResults, hasCompletedAnalysis, setAnalysisResults } = useAnalysis();
  const [visibleActions, setVisibleActions] = useState<any[]>([]);
  const [isCreatingIssues, setIsCreatingIssues] = useState(false);
  const [createdIssues, setCreatedIssues] = useState<any[]>([]);
  const [creationMessage, setCreationMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initialize visible actions when portfolio actions change
  useEffect(() => {
    if (analysisResults?.portfolioActions) {
      setVisibleActions(analysisResults.portfolioActions);
    }
  }, [analysisResults?.portfolioActions]);

  const clearAnalysisData = () => {
    setAnalysisResults(null);
    setVisibleActions([]);
    setCreatedIssues([]);
    setCreationMessage(null);
  };

  const handleDeleteAction = (actionId: string) => {
    setVisibleActions(prev => prev.filter(action => action.id !== actionId));
  };

  const createGitHubIssues = async () => {
    if (visibleActions.length === 0) {
      setCreationMessage({ type: 'error', text: 'No actions available to create issues' });
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
      console.log(`[Portfolio Display] Creating issues for ${visibleActions.length} actions`);

      // Convert portfolio actions to full recommendation format
      const providedRecommendations = visibleActions.map((action: any) => ({
        id: action.id,
        title: action.title,
        description: action.description || '',
        weakness: {
          id: action.id,
          type: 'skill' as const,
          severity: action.priority as 'high' | 'medium' | 'low',
          title: action.title,
          description: action.description || '',
          impact: 'Portfolio improvement action',
          optional: action.optional || false,
        },
        actionItems: [action.description || 'Complete this improvement action'],
        estimatedEffort: (action.estimatedTime || 'medium') as 'low' | 'medium' | 'high',
        priority: action.priority === 'high' ? 9 : action.priority === 'medium' ? 7 : 5,
      }));

      const requestBody: any = {
        repoUrl: analysisResults.repoUrl,
        createIssues: true,
        providedRecommendations,
      };

      console.log('[Portfolio Display] Sending recommendations:', providedRecommendations);

      const response = await fetch('/api/portfolio-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Portfolio Display] API Response:', result);
        if (result.issues) {
          const successfulIssues = result.issues.filter((issue: any) => issue.success);
          const failedIssues = result.issues.filter((issue: any) => !issue.success);
          
          console.log(`[Portfolio Display] Created ${successfulIssues.length}/${result.issues.length} issues successfully`);
          console.log('[Portfolio Display] Successful issues data:', successfulIssues);
          if (failedIssues.length > 0) {
            console.error('[Portfolio Display] Failed issues:', failedIssues);
          }
          
          // Validate issue data
          const validatedIssues = successfulIssues.map((issue: any) => ({
            ...issue,
            issueUrl: issue.issueUrl || issue.url || '#',
            issueNumber: issue.issueNumber || issue.number || 'N/A',
          }));
          
          console.log('[Portfolio Display] Validated issues:', validatedIssues);
          
          setCreatedIssues(validatedIssues);
          setCreationMessage({
            type: 'success',
            text: `Successfully created ${successfulIssues.length} GitHub issue${successfulIssues.length !== 1 ? 's' : ''}!`
          });
          // Clear visible actions so the button is hidden after creation
          setVisibleActions([]);
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

  // Always show empty state if no analysis completed
  if (!hasCompletedAnalysis) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
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

  const { portfolioQuality = null } = analysisResults || {};

  // Check if we have any meaningful data to display
  const hasStrengths = portfolioQuality && portfolioQuality.strengths && portfolioQuality.strengths.length > 0;
  const hasActions = visibleActions && visibleActions.length > 0;
  const hasCreatedIssues = createdIssues && createdIssues.length > 0;

  // Show empty state if no portfolio data available
  if (!hasStrengths && !hasActions && !hasCreatedIssues) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Rocket className="h-16 w-16 mx-auto text-emerald-400/50" />
              <h3 className="text-2xl font-bold text-white">No Portfolio Data Available</h3>
              <p className="text-emerald-100/70 leading-relaxed">
                Portfolio analysis didn't generate any data. Try running the Skill Gap Analysis again with a different repository.
              </p>
              <Link href="/agentic/skill-gaps">
                <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                  Run Analysis Again
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Strengths Section */}
      {hasStrengths && (
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white text-2xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <span>Portfolio Strengths</span>
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Your repository's notable qualities and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Portfolio Actions */}
      {(hasActions || hasCreatedIssues) && (
        <Card className="border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-700/40 via-emerald-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500"
                >
                  <Rocket className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <CardTitle className="text-white text-2xl">
                    {hasCreatedIssues && !hasActions ? 'GitHub Issues Created' : 'Improvement Actions'}
                  </CardTitle>
                  <CardDescription className="text-white/80 text-base">
                    {hasActions ? (
                      <>Swipe left to dismiss • {visibleActions.length} task{visibleActions.length !== 1 ? 's' : ''}</>
                    ) : (
                      <>View your created issues below</>
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action List with Animations */}
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {visibleActions.map((action: any, index: number) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    index={index}
                    onDelete={handleDeleteAction}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Creation Status Message */}
            {creationMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  creationMessage.type === 'success'
                    ? 'bg-emerald-900/20 border-emerald-400/30'
                    : 'bg-red-900/20 border-red-400/30'
                }`}
              >
                <p className={`text-sm ${creationMessage.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                  {creationMessage.type === 'success' ? '✅' : '❌'} {creationMessage.text}
                </p>
              </motion.div>
            )}

            {/* Created Issues List */}
            {createdIssues.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <h4 className="font-semibold text-white text-sm">Created GitHub Issues:</h4>
                {createdIssues.map((issue: any, index: number) => {
                  const hasValidUrl = issue.issueUrl && issue.issueUrl !== '#';
                  const displayNumber = issue.issueNumber || issue.number || '?';
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-400/30"
                    >
                      {hasValidUrl ? (
                        <a
                          href={issue.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors group"
                        >
                          <GitPullRequest className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium group-hover:underline">
                            #{displayNumber}: {issue.title}
                          </span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0 ml-auto" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-300">
                          <GitPullRequest className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            #{displayNumber}: {issue.title}
                          </span>
                          <span className="text-xs text-emerald-400/60 ml-auto">(URL not available)</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Create Issues Button */}
            {visibleActions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={createGitHubIssues}
                  disabled={isCreatingIssues}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold h-11 rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all"
                >
                  {isCreatingIssues ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Issues...
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="h-4 w-4 mr-2" />
                      Create {visibleActions.length} GitHub Issue{visibleActions.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ActionCard Component with Swipe-to-Delete
interface ActionCardProps {
  action: any;
  index: number;
  onDelete: (id: string) => void;
}

function ActionCard({ action, index, onDelete }: ActionCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    // If swiped left more than 150px, delete the card
    if (info.offset.x < -150) {
      onDelete(action.id);
    }
  };

  const priorityColors = {
    high: 'from-red-500 to-orange-500',
    medium: 'from-yellow-500 to-orange-500',
    low: 'from-blue-500 to-cyan-500',
  };

  const priorityBadgeClass = {
    high: 'bg-red-500/20 text-red-200 border-red-400/30',
    medium: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30',
    low: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -300, scale: 0.8 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
      drag="x"
      dragConstraints={{ left: -300, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className="relative cursor-grab active:cursor-grabbing"
    >
      {/* Delete indicator that shows when dragging */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-0 flex items-center gap-2 text-red-400"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-sm font-semibold">Swipe to delete</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content */}
      <motion.div
        whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(16, 185, 129, 0.3)" }}
        className="relative p-5 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-400/40 transition-all backdrop-blur-sm overflow-hidden group"
      >
        {/* Animated gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Priority indicator bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
          className={`absolute top-0 left-0 h-1 bg-gradient-to-r ${priorityColors[action.priority as keyof typeof priorityColors] || priorityColors.low}`}
        />

        <div className="relative z-10 flex items-start gap-4">
          {/* Priority icon */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${priorityColors[action.priority as keyof typeof priorityColors] || priorityColors.low} flex items-center justify-center flex-shrink-0 shadow-lg`}
          >
            <span className="text-white text-xl font-bold">
              {action.priority === 'high' ? '🔥' : action.priority === 'medium' ? '⚡' : '💡'}
            </span>
          </motion.div>

          {/* Action content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="font-semibold text-white text-lg leading-tight">{action.title}</h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {action.optional && (
                  <Badge
                    className="text-xs font-medium px-2 py-1 border bg-slate-500/20 text-slate-200 border-slate-400/30"
                  >
                    Optional
                  </Badge>
                )}
                <Badge
                  className={`text-xs font-medium px-2 py-1 border ${priorityBadgeClass[action.priority as keyof typeof priorityBadgeClass] || priorityBadgeClass.low}`}
                >
                  {action.priority}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-slate-300/90 mb-3 leading-relaxed">{action.description}</p>
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-base">⏱️</span>
                <span>{action.estimatedTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">📂</span>
                <span>{action.category}</span>
              </div>
            </div>
          </div>

          {/* Delete button (always visible on hover) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(action.id)}
            className="flex-shrink-0 p-2 rounded-lg bg-red-500/10 border border-red-400/20 hover:bg-red-500/20 hover:border-red-400/40 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="h-4 w-4 text-red-400" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
