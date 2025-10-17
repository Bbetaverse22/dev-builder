"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Types
export interface SkillGap {
  skill: string;
  importance: string;
  reasoning: string;
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

export interface GitHubExample {
  name: string;
  url: string;
  description: string;
  stars?: number;
  language?: string;
}

export interface AnalysisResults {
  repoUrl: string;
  portfolioQuality: PortfolioQuality | null;
  skillGaps: SkillGap[];
  portfolioActions: PortfolioAction[];
  researchResults: ResearchResult[];
  githubExamples: GitHubExample[];
  templates: any[];
  agentLogs: Array<{ agent: string; status: string; message: string; timestamp: Date }>;
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
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAnalysisResults(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load analysis results from localStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when results change
  useEffect(() => {
    if (isHydrated) {
      try {
        if (analysisResults) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(analysisResults));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Failed to save analysis results to localStorage:', error);
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
