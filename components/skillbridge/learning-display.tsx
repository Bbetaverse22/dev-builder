"use client";

import { useAnalysis } from '@/lib/contexts/analysis-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Github, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export function LearningDisplay() {
  const { analysisResults, hasCompletedAnalysis } = useAnalysis();

  useEffect(() => {
    console.log('[LearningDisplay] hasCompletedAnalysis:', hasCompletedAnalysis);
    console.log('[LearningDisplay] analysisResults:', analysisResults);
    if (analysisResults) {
      console.log('[LearningDisplay] researchResults:', analysisResults.researchResults);
      console.log('[LearningDisplay] githubExamples:', analysisResults.githubExamples);
    }
  }, [hasCompletedAnalysis, analysisResults]);

  if (!hasCompletedAnalysis) {
    return (
      <div className="space-y-6">
        <Card className="border-indigo-400/30 bg-gradient-to-br from-indigo-800/50 via-indigo-900/40 to-slate-950/70">
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

  const { researchResults = [], githubExamples = [] } = analysisResults || {};

  return (
    <div className="space-y-6 text-white">
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
            <div className="grid gap-3">
              {researchResults.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-indigo-200/10 rounded-lg border border-indigo-200/20 hover:bg-indigo-200/20 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {resource.title}
                      </h4>
                      <p className="text-sm text-indigo-100/70 mt-1">{resource.description}</p>
                      {resource.relevance && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs text-indigo-200 border-indigo-200/30">
                            Relevance: {resource.relevance}
                          </Badge>
                        </div>
                      )}
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
            <div className="grid gap-3">
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

      {/* Empty State */}
      {researchResults.length === 0 && githubExamples.length === 0 && (
        <Card className="border-indigo-400/30 bg-gradient-to-br from-indigo-800/50 via-indigo-900/40 to-slate-950/70">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <BookOpen className="h-16 w-16 mx-auto text-indigo-400/50" />
              <h3 className="text-2xl font-bold text-white">No Learning Resources Generated</h3>
              <p className="text-indigo-100/70 leading-relaxed">
                The research agent didn't generate learning resources. Try running the analysis again or check your skill gap inputs.
              </p>
              <Link href="/agentic/skill-gaps">
                <Button className="mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                  Run Analysis Again
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
