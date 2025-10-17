"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { GitHubAnalysis, GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';
import { Github, ExternalLink, Code, Database, Cloud, Wrench, AlertCircle } from 'lucide-react';

interface GitHubAnalysisProps {
  onAnalysisComplete?: (analysis: GitHubAnalysis) => void;
  onSkillAssessmentComplete?: (skillAssessment: any) => void;
  onAnalysisStart?: () => void;
  onAnalysisError?: (message: string) => void;
  showContainer?: boolean;
  showHeader?: boolean;
  selectedCategories?: string[];
  autoGenerateAssessment?: boolean;
}

export function GitHubAnalysisComponent({
  onAnalysisComplete,
  onSkillAssessmentComplete,
  onAnalysisStart,
  onAnalysisError,
  showContainer = true,
  showHeader = true,
  selectedCategories,
  autoGenerateAssessment = true,
}: GitHubAnalysisProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [analysis, setAnalysis] = useState<GitHubAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gapAnalyzer = useMemo(() => new GapAnalyzerAgent(), []);

  const isValidGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;
    return githubRegex.test(url);
  };

  const handleAnalyze = async () => {
    const trimmedRepo = repoUrl.trim();

    if (!trimmedRepo) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!isValidGitHubUrl(trimmedRepo)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo)');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null); // Clear previous analysis
    onAnalysisStart?.();

    try {
      const result = await gapAnalyzer.analyzeGitHubRepository(trimmedRepo);
      setAnalysis(result);
      onAnalysisComplete?.(result);

      if (autoGenerateAssessment) {
        const skillAssessment = await gapAnalyzer.generateAutomaticSkillAssessment(result, {
          includeCategories: selectedCategories,
        });
        onSkillAssessmentComplete?.(skillAssessment);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze repository. Please try again.';
      setError(errorMessage);
      console.error('GitHub analysis error:', err);
      onAnalysisError?.(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSkillLevelIcon = (level: string) => {
    switch (level) {
      case 'beginner':
        return '🌱';
      case 'intermediate':
        return '🚀';
      case 'advanced':
        return '🏆';
      default:
        return '📊';
    }
  };

  const headerContent = (
    <>
      <div className="flex items-center space-x-2">
        <Github className="h-5 w-5" />
        <span className="font-semibold">GitHub Repository Analysis</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Analyze a GitHub repository to identify technologies, frameworks, and learning opportunities
      </p>
    </>
  );

  const analysisContent = (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex-1 space-y-2">
          <Label
            htmlFor="github-repo-url"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub username or repository URL
          </Label>
          <Input
            id="github-repo-url"
            placeholder="https://github.com/username or https://github.com/username/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="h-12 rounded-2xl border border-white/20 bg-white/15 text-white placeholder:text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-purple-200/60 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-end lg:w-auto">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !repoUrl.trim()}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 text-sm font-semibold text-slate-900 shadow-xl transition hover:from-purple-300 hover:via-fuchsia-300 hover:to-pink-300 lg:w-auto lg:px-6"
          >
            {isAnalyzing ? 'Activating...' : 'Activate Agent'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-400/40 bg-red-500/10 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Analyzing repository...</p>
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="space-y-6">
          {/* Repository Info */}
          <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 p-4 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="flex items-center space-x-2 text-white">
              <Github className="h-5 w-5 text-white" />
              <span className="font-medium">{analysis.repository}</span>
            </div>
            <Badge className={cn(getSkillLevelColor(analysis.skillLevel), 'border-none')}>
              {getSkillLevelIcon(analysis.skillLevel)} {analysis.skillLevel}
            </Badge>
          </div>

          {/* Technologies Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[{ title: "Languages", data: analysis.languages, icon: <Code className="h-4 w-4" /> },
              { title: "Frameworks", data: analysis.frameworks, icon: <Wrench className="h-4 w-4" /> },
              { title: "Technologies", data: analysis.technologies, icon: <Database className="h-4 w-4" /> },
              { title: "Tools", data: analysis.tools, icon: <Cloud className="h-4 w-4" /> }].map((section) => (
              <div
                key={section.title}
                className="space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                <div className="flex items-center space-x-2 text-white">
                  {section.icon}
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
                    {section.title}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 text-slate-200">
                  {section.data.map((item, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="rounded-full border-white/30 bg-white/10 text-xs text-white"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Learning Recommendations */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-white">Learning Opportunities</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {analysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 rounded-xl border border-white/10 bg-slate-900/30 p-3 text-slate-200"
                >
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gradient-to-r from-blue-300 to-emerald-300" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 text-white">
            <Button
              asChild
              size="sm"
              className="rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <a href={analysis.repository} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Repository
              </a>
            </Button>
            <Button 
              size="sm"
              className="rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                const text = `GitHub Analysis for ${analysis.repository}\n\n` +
                  `Technologies: ${analysis.technologies.join(', ')}\n` +
                  `Frameworks: ${analysis.frameworks.join(', ')}\n` +
                  `Languages: ${analysis.languages.join(', ')}\n` +
                  `Tools: ${analysis.tools.join(', ')}\n\n` +
                  `Recommendations:\n${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
                
                navigator.clipboard.writeText(text);
              }}
            >
              Copy Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (showContainer) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Github className="h-5 w-5" />
              <span>GitHub Repository Analysis</span>
            </CardTitle>
            <CardDescription>
              Analyze a GitHub repository to identify technologies, frameworks, and learning opportunities
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>{analysisContent}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="space-y-1">
          {headerContent}
        </div>
      )}
      {analysisContent}
    </div>
  );
}
