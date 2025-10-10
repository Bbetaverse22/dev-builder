/**
 * Research Agent - LangGraph Implementation
 * Autonomous research workflow for skill gap learning resources
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

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
  domainKeywords?: string[];
  focusSkills?: FocusSkill[];
  learningObjectives?: string[];
  queries?: string[];

  // Search phase
  searchQuery?: string;
  searchResults?: Resource[];

  // Evaluation phase
  evaluatedResults?: ScoredResource[];
  examples?: GitHubProject[];

  // Decision phase
  confidence?: number;
  iterationCount: number;
  marketSignals?: MarketSignal[];

  // Output
  recommendations?: Recommendation[];
  actionPlan?: ActionItem[];
  loadedFromStorage?: boolean;
}

export interface Resource {
  title: string;
  url: string;
  description: string;
}

export interface ScoredResource extends Resource {
  score: number;
  rating?: number;
  recency?: string;
}

export interface GitHubProject {
  name: string;
  url: string;
  stars: number;
  description: string;
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
      domainKeywords: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
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
        value: (left?: number, right?: number) => (right ?? 0) + (left ?? 0),
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
    },
  });

  // Placeholder node - will be implemented in Issue #3
  workflow.addNode("search", async (state: ResearchState) => {
    console.log(`🔍 Searching for: ${state.skillGap}`);
    return {
      searchQuery: `Learn ${state.skillGap} ${state.detectedLanguage}`,
      searchResults: [
        {
          title: "Placeholder Resource",
          url: "https://example.com",
          description: "This will be replaced with real search in Issue #3",
        },
      ],
    };
  });

  // Import the GitHub examples search node
  const { searchGitHubExamplesNode } = require("./nodes/search-github-examples");

  // Add GitHub examples search node
  workflow.addNode("search_github", searchGitHubExamplesNode);

  // Placeholder node - will be implemented in Issue #4
  workflow.addNode("evaluate", async (state: ResearchState) => {
    console.log("⚖️  Evaluating search results...");
    return {
      evaluatedResults: state.searchResults?.map((r) => ({
        ...r,
        score: 0.8,
      })),
      confidence: 0.8,
    };
  });

  // Placeholder node - will be implemented in Issue #7
  workflow.addNode("synthesize", async (state: ResearchState) => {
    console.log("🎯 Synthesizing recommendations...");
    return {
      recommendations: [
        {
          type: "resource" as const,
          title: "Placeholder Recommendation",
          description: "This will be replaced with real synthesis in Issue #7",
          priority: "high" as const,
        },
      ],
    };
  });

  // Import state loader node
  const { loadLatestStateNode } = require("./nodes/load-latest-state");

  // Add state loader node
  workflow.addNode("load_state", loadLatestStateNode);

  // Connect nodes with conditional flow
  workflow.addEdge(START, "load_state" as any);
  workflow.addEdge("load_state" as any, "search" as any);
  workflow.addEdge("search" as any, "search_github" as any);

  // Conditional edge: Continue searching or evaluate?
  workflow.addConditionalEdges(
    "search_github" as any,
    (state: ResearchState) => {
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
    },
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
