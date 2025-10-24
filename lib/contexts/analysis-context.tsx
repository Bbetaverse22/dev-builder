"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Types
export interface SkillGap {
  skill: string;
  importance: string;
  reasoning: string;
  confidence?: 'low' | 'medium' | 'high';
  // Numeric values for display
  currentLevel?: number;
  targetLevel?: number;
  gap?: number;
}

export interface PortfolioQuality {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface PortfolioAction {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  category: string;
  optional?: boolean;
}

export interface ResearchResult {
  title: string;
  url: string;
  description: string;
  type: "article" | "course" | "tutorial" | "documentation" | "video";
  relevance?: string;
  summary?: string;
  keyPoints?: string[];
  recommendedAudience?: string;
}

export interface ComparativeInsightContext {
  title: string;
  insight: string;
  supportingResources: string[];
  confidence: "low" | "medium" | "high";
}

export interface LearningPathStepContext {
  order: number;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTimeHours?: number;
  resourceUrl?: string;
  resourceTitle?: string;
}

export interface ConfidenceBreakdownContext {
  overall: number;
  relevance: number;
  coverage: number;
  recency: number;
  practicality: number;
  confidenceNotes?: string[];
}

export interface GitHubExample {
  name: string;
  url: string;
  description: string;
  stars?: number;
  language?: string;
}

export interface AnalysisResults {
  repoUrl: string;
  githubAnalysis?: any; // Full GitHub analysis including AI insights (agenticAnalysis, readmeAnalysis)
  skillAssessmentScore?: number; // Overall skill score (e.g., 76%) - separate from portfolio quality
  portfolioQuality: PortfolioQuality | null; // Repository quality (e.g., 15%) - for GitHub issues
  skillGaps: SkillGap[];
  portfolioActions: PortfolioAction[];
  researchResults: ResearchResult[];
  githubExamples: GitHubExample[];
  comparativeInsights?: ComparativeInsightContext[];
  learningPath?: LearningPathStepContext[];
  confidenceBreakdown?: ConfidenceBreakdownContext | null;
  templates: any[];
  agentLogs: Array<{ agent: string; status: string; message: string; timestamp: Date }>;
  externalAssessments?: Record<string, unknown> | null;
}

interface AnalysisContextType {
  analysisResults: AnalysisResults | null;
  setAnalysisResults: (results: AnalysisResults | null) => void;
  hasCompletedAnalysis: boolean;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const STORAGE_KEY = 'skillbridge_analysis_results';

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    console.log('[AnalysisContext] Loading from localStorage...');
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[AnalysisContext] Loaded data:', {
          hasData: true,
          repoUrl: parsed.repoUrl,
          skillGapsCount: parsed.skillGaps?.length || 0
        });
        setAnalysisResults(parsed);
      } else {
        console.log('[AnalysisContext] No stored data found');
      }
    } catch (error) {
      console.warn('[AnalysisContext] Failed to load analysis results from localStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when results change
  useEffect(() => {
    if (isHydrated) {
      try {
        if (analysisResults) {
          console.log('[AnalysisContext] Saving to localStorage:', {
            repoUrl: analysisResults.repoUrl,
            skillGapsCount: analysisResults.skillGaps?.length || 0
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(analysisResults));
        } else {
          console.log('[AnalysisContext] Clearing localStorage');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn('[AnalysisContext] Failed to save analysis results to localStorage:', error);
      }
    }
  }, [analysisResults, isHydrated]);

  const hasCompletedAnalysis = analysisResults !== null;

  return (
    <AnalysisContext.Provider
      value={{
        analysisResults,
        setAnalysisResults,
        hasCompletedAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
