/**
 * AI Analysis Insights Card Component
 * 
 * Displays comprehensive AI analysis insights including:
 * - Quality metrics (README Quality, Code Quality)
 * - Problem-solving approaches
 * - Frameworks and patterns
 * - Best practices and anti-patterns
 * - Recommendations
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Code, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface QualityMetrics {
  readmeQuality: {
    score: number;
    confidence: number;
    insights: string[];
    improvements: string[];
  };
  codeQuality: {
    score: number;
    confidence: number;
    insights: string[];
    improvements: string[];
  };
  overallQuality: {
    score: number;
    confidence: number;
    strengths: string[];
    weaknesses: string[];
  };
}

interface AIAnalysisInsights {
  problemSolvingApproach: string[];
  frameworks: string[];
  patterns: string[];
  bestPractices: string[];
  antiPatterns: string[];
  recommendations: string[];
}

interface AIAnalysisInsightsCardProps {
  qualityMetrics?: QualityMetrics;
  aiInsights?: AIAnalysisInsights;
  className?: string;
}

export function AIAnalysisInsightsCard({ 
  qualityMetrics, 
  aiInsights, 
  className = '' 
}: AIAnalysisInsightsCardProps) {
  if (!qualityMetrics && !aiInsights) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quality Metrics Section */}
      {qualityMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Individual Quality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* README Quality */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">README Quality</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.readmeQuality.score)} mb-2`}>
                  {qualityMetrics.readmeQuality.score}/100
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Confidence: {qualityMetrics.readmeQuality.confidence}%
                </div>
                <Progress 
                  value={qualityMetrics.readmeQuality.score} 
                  className="h-1 mb-3"
                />
                
                {/* Insights */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-green-700">Strengths:</div>
                  {qualityMetrics.readmeQuality.insights.map((insight, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {insight}
                    </div>
                  ))}
                  
                  <div className="text-xs font-medium text-red-700 mt-3">Improvements:</div>
                  {qualityMetrics.readmeQuality.improvements.map((improvement, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                      <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Quality */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="h-4 w-4" />
                  <span className="font-medium">Code Quality</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(qualityMetrics.codeQuality.score)} mb-2`}>
                  {qualityMetrics.codeQuality.score}/100
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Confidence: {qualityMetrics.codeQuality.confidence}%
                </div>
                <Progress 
                  value={qualityMetrics.codeQuality.score} 
                  className="h-1 mb-3"
                />
                
                {/* Insights */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-green-700">Strengths:</div>
                  {qualityMetrics.codeQuality.insights.map((insight, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {insight}
                    </div>
                  ))}
                  
                  <div className="text-xs font-medium text-red-700 mt-3">Improvements:</div>
                  {qualityMetrics.codeQuality.improvements.map((improvement, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-start gap-1">
                      <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Section */}
      {aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problem-Solving Approach */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Problem-Solving Approach
              </h4>
              <div className="space-y-2">
                {aiInsights.problemSolvingApproach.map((approach, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">{approach}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frameworks & Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Frameworks & Patterns
                </h4>
                <div className="space-y-2">
                  {aiInsights.frameworks.map((framework, index) => (
                    <Badge key={index} variant="secondary" className="mr-2 mb-2">
                      {framework}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Code Patterns
                </h4>
                <div className="space-y-2">
                  {aiInsights.patterns.map((pattern, index) => (
                    <div key={index} className="text-sm text-gray-600 p-2 rounded bg-gray-50">
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Best Practices & Anti-Patterns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Best Practices
                </h4>
                <div className="space-y-2">
                  {aiInsights.bestPractices.map((practice, index) => (
                    <div key={index} className="text-sm text-gray-600 flex items-start gap-2 p-2 rounded bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {practice}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Areas for Improvement
                </h4>
                <div className="space-y-2">
                  {aiInsights.antiPatterns.map((antiPattern, index) => (
                    <div key={index} className="text-sm text-gray-600 flex items-start gap-2 p-2 rounded bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {antiPattern}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Recommendations
              </h4>
              <div className="space-y-2">
                {aiInsights.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border-l-4 border-yellow-400">
                    <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
