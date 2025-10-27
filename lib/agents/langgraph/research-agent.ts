/**
 * Research Agent - LangGraph Implementation
 * Autonomous research workflow for skill gap learning resources
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { searchResourcesNode } from "./nodes/search-resources";
import { searchGitHubExamplesNode } from "./nodes/search-github-examples";
import { loadLatestStateNode } from "./nodes/load-latest-state";
import { evaluateQualityNode } from "./nodes/evaluate-quality";
import { synthesizeRecommendationsNode } from "./nodes/synthesize-recommendations";

// State interface for the research agent
export interface ResearchState {
  // Input
  userId?: string;
  skillGap: string;
  detectedLanguage: string;
  userContext: string;
  targetRole?: string;
  targetIndustry?: string;
  professionalGoals?: string;
  focusSkills?: FocusSkill[];
  learningObjectives?: string[];
  queries?: string[];
  languageCandidates?: string[];
  searchSources?: string[];
  searchNotes?: string[];
  searchIterations?: SearchIteration[];
  scrapedResources?: ScrapedResource[];
  comparativeInsights?: ComparativeInsight[];
  learningPath?: LearningPathStep[];
  confidenceBreakdown?: ConfidenceBreakdown;
  searchIterationLog?: string[];
  researchCacheKey?: string;
  recommendedAudience?: AudienceSegment[];
  summaryNotes?: string[];
  forceRefresh?: boolean;
  
  // Adaptive Learning Fields
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
  skillCurrentLevel?: number; // 1-5 scale
  skillTargetLevel?: number; // 1-5 scale
  skillGapValue?: number; // Numeric gap value

  // Search phase
  searchQuery?: string;
  searchResults?: Resource[];

  // Evaluation phase
  evaluatedResults?: ScoredResource[];
  examples?: GitHubProject[];
  evaluationNotes?: string[];

  // Decision phase
  confidence?: number;
  iterationCount: number;
  marketSignals?: MarketSignal[];

  // Output
  recommendations?: Recommendation[];
  actionPlan?: ActionItem[];
  loadedFromStorage?: boolean;

  // Index signature for LangGraph compatibility
  [key: string]: any;
}

export interface Resource {
  title: string;
  url: string;
  description: string;
  source?: "firecrawl" | "openai" | "github";
  summary?: string;
  scrapedContent?: string;
  snippet?: string;
  recommendedAudience?: string;
  keyPoints?: string[];
  lastScrapedAt?: string;
}

export interface ScoredResource extends Resource {
  score: number;
  rating?: number;
  recency?: string;
}

export interface SearchIteration {
  number: number;
  queries: string[];
  sources: string[];
  notes?: string;
  resultsFound: number;
  scrapedCount?: number;
  durationMs?: number;
  errors?: string[];
}

export interface GitHubProject {
  name: string;
  url: string;
  stars: number;
  description: string;
  source?: "github";
  language?: string;
}

export interface Recommendation {
  type: "resource" | "example" | "action";
  title: string;
  description: string;
  url?: string;
  priority: "high" | "medium" | "low";
}

export interface FocusSkill {
  name: string;
  gap: number;
  priority: number;
}

export interface MarketSignal {
  source: string;
  title: string;
  snippet: string;
  url: string;
  roleMatch?: number;
}

export interface ActionItem {
  title: string;
  description: string;
  rationale?: string;
  effort?: "low" | "medium" | "high";
}

export interface ScrapedResource {
  url: string;
  content: string;
  snippet: string;
  summary: string;
  keyPoints: string[];
  recommendedAudience?: string;
  scrapedAt: string;
  source?: Resource["source"];
}

export interface ComparativeInsight {
  title: string;
  insight: string;
  supportingResources: string[];
  confidence: "low" | "medium" | "high";
}

export interface LearningPathStep {
  order: number;
  title: string;
  description: string;
  estimatedTimeHours?: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  resourceUrl?: string;
  resourceTitle?: string;
}

export interface ConfidenceBreakdown {
  overall: number;
  relevance: number;
  coverage: number;
  recency: number;
  practicality: number;
  confidenceNotes?: string[];
}

export interface AudienceSegment {
  label: string;
  description: string;
}

/**
 * Build the research agent graph
 * This will be implemented in Issues #3-#9
 */
function buildResearchGraph() {
  const workflow = new StateGraph<ResearchState>({
    channels: {
      skillGap: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      userId: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      detectedLanguage: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      userContext: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      targetRole: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      targetIndustry: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      professionalGoals: {
        value: (left?: string, right?: string) => right ?? left ?? "",
      },
      focusSkills: {
        value: (left?: FocusSkill[], right?: FocusSkill[]) => right ?? left ?? [],
      },
      learningObjectives: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      queries: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      searchSources: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      searchNotes: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      searchIterations: {
        value: (left?: SearchIteration[], right?: SearchIteration[]) =>
          right ?? left ?? [],
      },
      scrapedResources: {
        value: (left?: ScrapedResource[], right?: ScrapedResource[]) =>
          right ?? left ?? [],
      },
      comparativeInsights: {
        value: (left?: ComparativeInsight[], right?: ComparativeInsight[]) =>
          right ?? left ?? [],
      },
      learningPath: {
        value: (left?: LearningPathStep[], right?: LearningPathStep[]) =>
          right ?? left ?? [],
      },
      confidenceBreakdown: {
        value: (left?: ConfidenceBreakdown, right?: ConfidenceBreakdown) =>
          right ?? left ?? undefined,
      },
      summaryNotes: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      searchIterationLog: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      searchQuery: {
        value: (left?: string, right?: string) => right ?? left,
      },
      searchResults: {
        value: (left?: Resource[], right?: Resource[]) => right ?? left ?? [],
      },
      evaluatedResults: {
        value: (left?: ScoredResource[], right?: ScoredResource[]) => right ?? left ?? [],
      },
      examples: {
        value: (left?: GitHubProject[], right?: GitHubProject[]) => right ?? left ?? [],
      },
      confidence: {
        value: (left?: number, right?: number) => right ?? left ?? 0,
      },
      iterationCount: {
        value: (left?: number, right?: number) => right ?? left ?? 0,
      },
      marketSignals: {
        value: (left?: MarketSignal[], right?: MarketSignal[]) => right ?? left ?? [],
      },
      recommendations: {
        value: (left?: Recommendation[], right?: Recommendation[]) => right ?? left ?? [],
      },
      actionPlan: {
        value: (left?: ActionItem[], right?: ActionItem[]) => right ?? left ?? [],
      },
      loadedFromStorage: {
        value: (left?: boolean, right?: boolean) => right ?? left ?? false,
      },
      userSkillLevel: {
        value: (left?: 'beginner' | 'intermediate' | 'advanced', right?: 'beginner' | 'intermediate' | 'advanced') => 
          right ?? left ?? 'intermediate',
      },
      skillCurrentLevel: {
        value: (left?: number, right?: number) => right ?? left ?? 2,
      },
      skillTargetLevel: {
        value: (left?: number, right?: number) => right ?? left ?? 4,
      },
      skillGapValue: {
        value: (left?: number, right?: number) => right ?? left ?? 2,
      },
    },
  } as any);

  // Web search node (Issue #3)
  workflow.addNode("search", searchResourcesNode as any);

  // GitHub examples search node (Issue #5b)
  workflow.addNode("search_github", searchGitHubExamplesNode as any);

  // Evaluate quality node (Issue #4)
  workflow.addNode("evaluate", evaluateQualityNode as any);

  // Synthesize recommendations node (Issue #7)
  workflow.addNode("synthesize", synthesizeRecommendationsNode as any);

  // Add state loader node
  workflow.addNode("load_state", loadLatestStateNode as any);

  // Connect nodes with conditional flow
  workflow.addEdge(START, "load_state" as any);
  workflow.addEdge("load_state" as any, "search" as any);
  workflow.addEdge("search" as any, "search_github" as any);

  // Conditional edge: Continue searching or evaluate?
  workflow.addConditionalEdges(
    "search_github" as any,
    ((state: ResearchState) => {
      // If we found good examples, move to evaluation
      if (state.examples && state.examples.length >= 3) {
        return "evaluate";
      }
      // If not enough examples and haven't iterated too much, search again
      if (state.iterationCount < 2) {
        return "search";
      }
      // Otherwise, proceed to evaluation with what we have
      return "evaluate";
    }) as any,
    {
      search: "search" as any,
      evaluate: "evaluate" as any,
    }
  );

  workflow.addEdge("evaluate" as any, "synthesize" as any);
  workflow.addEdge("synthesize" as any, END);

  return workflow.compile();
}

// Export the compiled graph for LangGraph Platform
export const graph = buildResearchGraph();

export { buildResearchStateSeed } from "./utils/research-state-seed";
