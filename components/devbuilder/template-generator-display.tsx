"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAnalysis } from "@/lib/contexts/analysis-context";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  GitPullRequest,
} from "lucide-react";

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

const STORAGE_KEY_TEMPLATES = 'skillbridge_generated_templates';

export function TemplateGeneratorDisplay() {
  const { analysisResults } = useAnalysis();
  const [generatedTemplates, setGeneratedTemplates] = useState<Record<string, GeneratedTemplateSummary>>({});
  const [templateGenerationLoading, setTemplateGenerationLoading] = useState<Record<string, boolean>>({});
  const [templateGenerationErrors, setTemplateGenerationErrors] = useState<Record<string, string>>({});
  const [templatePrLoading, setTemplatePrLoading] = useState<Record<string, boolean>>({});
  const [templatePrErrors, setTemplatePrErrors] = useState<Record<string, string>>({});
  const [customTemplateRepo, setCustomTemplateRepo] = useState('');
  const [customTemplateFeature, setCustomTemplateFeature] = useState('');
  const [customTemplateError, setCustomTemplateError] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const normalizedCustomRepo = customTemplateRepo.trim();
  const customTemplateLoading = normalizedCustomRepo ? templateGenerationLoading[normalizedCustomRepo] : false;
  const customTemplateFailure = normalizedCustomRepo ? templateGenerationErrors[normalizedCustomRepo] : '';
  const customTemplateSuccess = normalizedCustomRepo ? generatedTemplates[normalizedCustomRepo] : undefined;
  const customTemplatePrLoading = normalizedCustomRepo ? templatePrLoading[normalizedCustomRepo] : false;
  const customTemplatePrError = normalizedCustomRepo ? templatePrErrors[normalizedCustomRepo] : '';

  // Get repoUrl and examples from context
  const repoUrl = analysisResults?.repoUrl;
  const githubExamples = analysisResults?.githubExamples || [];
  const skillGaps = analysisResults?.skillGaps || [];

  // Load generated templates from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (stored) {
        setGeneratedTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load generated templates from localStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save generated templates to localStorage when they change
  useEffect(() => {
    if (isHydrated) {
      try {
        if (Object.keys(generatedTemplates).length > 0) {
          localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(generatedTemplates));
        } else {
          localStorage.removeItem(STORAGE_KEY_TEMPLATES);
        }
      } catch (error) {
        console.warn('Failed to save generated templates to localStorage:', error);
      }
    }
  }, [generatedTemplates, isHydrated]);

  // Clear generated templates when analysis results are cleared
  useEffect(() => {
    if (isHydrated && !analysisResults && Object.keys(generatedTemplates).length > 0) {
      console.log('[TemplateGenerator] Clearing templates because analysis results were cleared');
      setGeneratedTemplates({});
      localStorage.removeItem(STORAGE_KEY_TEMPLATES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResults, isHydrated]);

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
          skillName: skillGaps[0]?.skill,
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
      } else {
        const message = data?.message ?? 'Template generation failed';
        setTemplateGenerationErrors((prev) => ({ ...prev, [url]: message }));
      }
    } catch (error) {
      console.error('Template generation error:', error);
      setTemplateGenerationErrors((prev) => ({
        ...prev,
        [url]: 'Unexpected error while generating template.',
      }));
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
          skillName: skillGaps[0]?.skill,
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
      } else {
        const message = data?.message ?? 'Failed to create pull request';
        setTemplatePrErrors((prev) => ({ ...prev, [url]: message }));
      }
    } catch (error) {
      console.error('Template PR creation error:', error);
      setTemplatePrErrors((prev) => ({
        ...prev,
        [url]: 'Unexpected error while creating pull request.',
      }));
    } finally {
      setTemplatePrLoading((prev) => ({ ...prev, [url]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Always show custom template generator */}
      <Card className="border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-700/40 via-fuchsia-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(217,70,239,0.25)] backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Sparkles className="h-5 w-5" />
            <span>Template Generator</span>
          </CardTitle>
          <CardDescription className="text-white/80">
            Extract ready-to-use templates from example repositories and create PRs to your repo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Manual Template Generation */}
        <div className="space-y-4 p-4 rounded-lg border border-fuchsia-300/20 bg-fuchsia-900/20">
          <div>
            <h4 className="text-sm font-semibold text-white mb-2">Generate from Custom Repository</h4>
            <p className="text-xs text-white/70">Enter any GitHub repository URL to extract a template</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="https://github.com/owner/repo"
              value={customTemplateRepo}
              onChange={(e) => setCustomTemplateRepo(e.target.value)}
              className="bg-fuchsia-200/10 border-fuchsia-300/30 text-white placeholder:text-fuchsia-200/60"
            />
            <Input
              placeholder="Feature name (optional)"
              value={customTemplateFeature}
              onChange={(e) => setCustomTemplateFeature(e.target.value)}
              className="bg-fuchsia-200/10 border-fuchsia-300/30 text-white placeholder:text-fuchsia-200/60"
            />
          </div>
          {customTemplateError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{customTemplateError}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleManualTemplateGeneration}
            disabled={!customTemplateRepo.trim() || customTemplateLoading}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600"
          >
            {customTemplateLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating Template...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Template
              </>
            )}
          </Button>

          {/* Show generated template preview */}
          {customTemplateSuccess && (
            <div className="mt-4 p-4 rounded-lg border border-emerald-300/30 bg-emerald-900/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h5 className="font-semibold text-white">Template Generated!</h5>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-white/80">
                  <strong>Source:</strong> {customTemplateSuccess.sourceName}
                </p>
                <p className="text-sm text-white/80">
                  <strong>Directory:</strong> <code className="px-1.5 py-0.5 bg-black/30 rounded">{customTemplateSuccess.templateDirectory}</code>
                </p>
                <p className="text-sm text-white/80">
                  <strong>Branch:</strong> <code className="px-1.5 py-0.5 bg-black/30 rounded">{customTemplateSuccess.branchName}</code>
                </p>
              </div>

              {customTemplateSuccess.instructions.length > 0 && (
                <div className="space-y-2">
                  <h6 className="text-sm font-semibold text-white">Setup Instructions:</h6>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-white/70">
                    {customTemplateSuccess.instructions.map((instruction, i) => {
                      const cleanedInstruction = instruction.replace(/^[\s\d]+[\).:\-\s]*\s*/, '');
                      return <li key={i}>{cleanedInstruction || instruction}</li>;
                    })}
                  </ol>
                </div>
              )}

              {customTemplateSuccess.pullRequestUrl && (
                <Alert className="border-emerald-500/50 bg-emerald-900/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-emerald-100 flex flex-col gap-2">
                    <div>
                      The PR has been created in this repo:{' '}
                      <a 
                        href={repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-semibold underline hover:text-emerald-200"
                      >
                        {repoUrl}
                      </a>
                    </div>
                    <a
                      href={customTemplateSuccess.pullRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      View PR #{customTemplateSuccess.pullRequestNumber}
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {!customTemplateSuccess.pullRequestUrl && (
                <Button
                  onClick={() => createTemplatePullRequest({ url: normalizedCustomRepo, name: customTemplateFeature || normalizedCustomRepo })}
                  disabled={customTemplatePrLoading || !repoUrl}
                  className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {customTemplatePrLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating PR...
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="h-4 w-4 mr-2" />
                      Create Pull Request
                    </>
                  )}
                </Button>
              )}
              {customTemplatePrError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{customTemplatePrError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          {customTemplateFailure && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{customTemplateFailure}</AlertDescription>
            </Alert>
          )}
        </div>

        </CardContent>
      </Card>

      {/* Generate from Research Examples - only show if there are examples */}
      {githubExamples.length > 0 && (
        <Card className="border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-700/40 via-fuchsia-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(217,70,239,0.25)] backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Sparkles className="h-5 w-5" />
              <span>Generate from Research Examples</span>
            </CardTitle>
            <CardDescription className="text-white/80">
              Extract templates from the GitHub examples found during research
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {githubExamples.slice(0, 5).map((example: any) => {
                const isLoading = templateGenerationLoading[example.url];
                const error = templateGenerationErrors[example.url];
                const template = generatedTemplates[example.url];
                const isPrLoading = templatePrLoading[example.url];
                const prError = templatePrErrors[example.url];

                return (
                  <div key={example.url} className="p-4 rounded-lg border border-fuchsia-300/20 bg-fuchsia-900/10 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-white truncate">{example.name}</h5>
                        <a
                          href={example.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-fuchsia-300 hover:underline truncate block"
                        >
                          {example.url}
                        </a>
                        {example.stars && (
                          <p className="text-xs text-white/60 mt-1">⭐ {example.stars} stars</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateTemplateFromExample(example)}
                        disabled={isLoading || !!template}
                        className="shrink-0 bg-fuchsia-600 hover:bg-fuchsia-700"
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : template ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                      </Alert>
                    )}

                    {template && (
                      <div className="space-y-2 pt-2 border-t border-fuchsia-300/10">
                        <p className="text-xs text-white/70">
                          <strong>Saved to:</strong> <code className="px-1 py-0.5 bg-black/30 rounded text-xs">{template.templateDirectory}</code>
                        </p>
                        {!template.pullRequestUrl && (
                          <Button
                            size="sm"
                            onClick={() => createTemplatePullRequest(example)}
                            disabled={isPrLoading || !repoUrl}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          >
                            {isPrLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Creating PR...
                              </>
                            ) : (
                              <>
                                <GitPullRequest className="h-4 w-4 mr-2" />
                                Create PR
                              </>
                            )}
                          </Button>
                        )}
                        {template.pullRequestUrl && (
                          <Alert className="border-emerald-500/50 bg-emerald-900/30">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            <AlertDescription className="text-emerald-100 flex flex-col gap-2 text-xs">
                              <div>
                                The PR has been created in this repo:{' '}
                                <a 
                                  href={repoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-semibold underline hover:text-emerald-200"
                                >
                                  {repoUrl}
                                </a>
                              </div>
                              <a
                                href={template.pullRequestUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                              >
                                <GitPullRequest className="h-4 w-4" />
                                View PR #{template.pullRequestNumber}
                              </a>
                            </AlertDescription>
                          </Alert>
                        )}
                        {prError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">{prError}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no analysis has been run */}
      {!repoUrl && githubExamples.length === 0 && (
        <Card className="border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-700/40 via-fuchsia-900/30 to-slate-950/60 shadow-[0_0_40px_rgba(217,70,239,0.25)] backdrop-blur-md">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Sparkles className="h-16 w-16 mx-auto text-fuchsia-400/50" />
              <h3 className="text-2xl font-bold text-white">Ready to Generate Templates!</h3>
              <p className="text-fuchsia-100/70 leading-relaxed">
                To create pull requests with templates, you need to analyze a repository first. This sets up your target repository where templates will be added.
              </p>
              <div className="space-y-3 text-sm text-fuchsia-200/80">
                <p><strong>Option 1:</strong> Run Skill Gap Analysis to find examples + set target repo</p>
                <p><strong>Option 2:</strong> Use the custom generator above (preview only)</p>
              </div>
              <a href="/agentic/skill-gaps">
                <button className="mt-4 inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white font-semibold transition-all">
                  Start Analysis
                  <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

