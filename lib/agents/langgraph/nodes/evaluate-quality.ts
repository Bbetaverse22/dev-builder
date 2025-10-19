/**
 * Evaluate Quality Node for LangGraph Research Agent
 *
 * Scores and ranks learning resources based on multiple quality factors:
 * - Content relevance to skill gap
 * - Source authority and credibility
 * - Recency and timeliness
 * - Comprehensiveness and depth
 * - Practical applicability
 */

import type {
  ResearchState,
  Resource,
  ScoredResource,
  ConfidenceBreakdown,
} from "../research-agent";
import { escapePromptText, escapeTemplateBraces } from "../utils/prompt-utils";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const DEFAULT_MODEL = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini";
const TOP_N_RESULTS = 10;

// Scoring weights
const WEIGHTS = {
  relevance: 0.35,      // How well it matches the skill gap
  authority: 0.20,      // Source credibility
  recency: 0.15,        // How up-to-date
  comprehensiveness: 0.20, // Depth and completeness
  practicality: 0.10,   // Hands-on applicability
} as const;

const evaluationSchema = z.object({
  evaluations: z.array(
    z.object({
      url: z.string(),
      relevance: z.number().min(0).max(1),
      authority: z.number().min(0).max(1),
      recency: z.number().min(0).max(1),
      comprehensiveness: z.number().min(0).max(1),
      practicality: z.number().min(0).max(1),
      reasoning: z.string().optional(),
    })
  ),
});

type EvaluationResult = z.infer<typeof evaluationSchema>["evaluations"][number];

/**
 * Main LangGraph node that evaluates and ranks resources
 */
export async function evaluateQualityNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const resources = state.searchResults ?? [];

  console.log("⚖️  Running evaluateQualityNode");
  console.log(`   Evaluating ${resources.length} resources...`);

  if (resources.length === 0) {
    console.warn("⚠️  No resources to evaluate");
    return {
      evaluatedResults: [],
      confidence: 0.0,
    };
  }

  // Use LLM to evaluate each resource
  const evaluations = await evaluateWithLLM(state, resources);

  // Calculate composite scores
  const scoredResources = resources.map((resource, index) => {
    const evaluation = evaluations[index] ?? getDefaultEvaluation();
    const score = calculateCompositeScore(evaluation);

    const enriched: ScoredResource = {
      ...resource,
      score,
      rating: Math.round(score * 5), // Convert to 1-5 star rating
      recency: evaluation.recency > 0.7 ? "recent" : "older",
    };

    if (!enriched.summary && evaluation.reasoning) {
      enriched.summary = evaluation.reasoning.slice(0, 300);
    }

    return enriched;
  });

  // Sort by score (descending) and take top N
  const topResources = scoredResources
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N_RESULTS);

  // Calculate overall confidence based on scores
  const avgScore = topResources.reduce((sum, r) => sum + r.score, 0) / topResources.length;
  const confidence = Math.min(avgScore * 1.1, 1.0); // Slight boost, capped at 1.0

  const confidenceBreakdown = buildConfidenceBreakdown(
    topResources,
    evaluations
  );

  console.log(`✅ evaluateQualityNode complete`);
  console.log(`   Top resource score: ${topResources[0]?.score.toFixed(2) ?? 'N/A'}`);
  console.log(`   Average score: ${avgScore.toFixed(2)}`);
  console.log(`   Confidence: ${confidence.toFixed(2)}`);

  return {
    evaluatedResults: topResources,
    confidence,
    confidenceBreakdown,
  };
}

/**
 * Use LLM to evaluate resources intelligently
 */
async function evaluateWithLLM(
  state: ResearchState,
  resources: Resource[]
): Promise<EvaluationResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[evaluateQualityNode] OPENAI_API_KEY not configured. Using heuristics.");
    return resources.map(() => getDefaultEvaluation());
  }

  try {
    const llm = new ChatOpenAI({
      model: DEFAULT_MODEL,
      temperature: 0.1, // Low temperature for consistent scoring
    });

    const systemPrompt = [
      "You are a learning resource evaluator.",
      "Evaluate each resource on 5 criteria (0-1 scale):",
      "- relevance: How well it matches the skill gap",
      "- authority: Source credibility (official docs = 1.0, blog posts = 0.6, etc.)",
      "- recency: Estimated timeliness (recent = 0.9+, older = 0.5-)",
      "- comprehensiveness: Depth and completeness",
      "- practicality: Hands-on, actionable content",
      "",
      "IMPORTANT: Return ONLY valid JSON with this exact structure:",
      escapeTemplateBraces(
        '{"evaluations": [{"url": "...", "relevance": 0.8, "authority": 0.9, "recency": 0.7, "comprehensiveness": 0.8, "practicality": 0.7}]}'
      ),
      "",
      "Do not include any explanatory text, only the JSON object.",
    ].join("\n");

    const humanPrompt = [
      `Skill gap: ${escapePromptText(state.skillGap)}`,
      `Language: ${escapePromptText(state.detectedLanguage || "unknown")}`,
      `User context: ${escapePromptText(state.userContext)}`,
      "",
      "Resources to evaluate:",
      ...resources.map((r, i) => {
        const escapedTitle = escapePromptText(r.title);
        const escapedDescription = escapePromptText(r.description);
        return `${i + 1}. ${escapedTitle}\n   URL: ${r.url}\n   Description: ${escapedDescription}`;
      }),
      "",
      "Return JSON with an 'evaluations' array containing one object per resource.",
    ].join("\n");

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanPrompt],
    ]);

    const aiMessage = await llm.invoke(await prompt.formatMessages({}));
    const rawText = extractTextContent(aiMessage.content);
    const parsed = parseLLMJson(rawText);

    const validated = evaluationSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(
        "[evaluateQualityNode] LLM response failed validation:",
        validated.error
      );
      return resources.map(() => getDefaultEvaluation());
    }

    return validated.data.evaluations;
  } catch (error) {
    console.warn(
      "[evaluateQualityNode] LLM evaluation failed:",
      (error as Error)?.message ?? error
    );
    return resources.map(() => getDefaultEvaluation());
  }
}

/**
 * Calculate composite score from evaluation criteria
 */
function calculateCompositeScore(evaluation: EvaluationResult): number {
  return (
    evaluation.relevance * WEIGHTS.relevance +
    evaluation.authority * WEIGHTS.authority +
    evaluation.recency * WEIGHTS.recency +
    evaluation.comprehensiveness * WEIGHTS.comprehensiveness +
    evaluation.practicality * WEIGHTS.practicality
  );
}

/**
 * Default evaluation for fallback
 */
function getDefaultEvaluation(): EvaluationResult {
  return {
    url: "",
    relevance: 0.7,
    authority: 0.6,
    recency: 0.7,
    comprehensiveness: 0.6,
    practicality: 0.6,
  };
}

/**
 * Extract text content from LLM response
 */
function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => extractTextContent(part))
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object" && "text" in content) {
    return extractTextContent((content as { text: unknown }).text);
  }
  return "";
}

/**
 * Parse JSON from LLM response (handles code fences)
 */
function parseLLMJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const fencedMatch = trimmed.match(/```json([\s\S]*?)```/i);
  const jsonText = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.warn(
      "[evaluateQualityNode] Failed to parse JSON response:",
      (error as Error)?.message ?? error
    );
    return null;
  }
}

function buildConfidenceBreakdown(
  resources: ScoredResource[],
  evaluations: EvaluationResult[]
): ConfidenceBreakdown {
  if (!resources.length || !evaluations.length) {
    return {
      overall: 0,
      relevance: 0,
      coverage: 0,
      recency: 0,
      practicality: 0,
      confidenceNotes: ["No evaluated resources"],
    };
  }

  const evalMap = new Map<string, EvaluationResult>();
  evaluations.forEach((evaluation) => {
    if (evaluation.url) {
      evalMap.set(normalizeUrl(evaluation.url) ?? evaluation.url, evaluation);
    }
  });

  let relevance = 0;
  let recency = 0;
  let practicality = 0;
  let coverage = 0;

  resources.forEach((resource) => {
    const evaluation = evalMap.get(normalizeUrl(resource.url) ?? resource.url);
    if (evaluation) {
      relevance += evaluation.relevance;
      recency += evaluation.recency;
      practicality += evaluation.practicality;
      coverage += evaluation.comprehensiveness;
    }
  });

  const count = resources.length;
  const breakdown: ConfidenceBreakdown = {
    overall: Math.min(
      (relevance / count + coverage / count + recency / count) / 3,
      1
    ),
    relevance: clamp(relevance / count),
    coverage: clamp(coverage / count),
    recency: clamp(recency / count),
    practicality: clamp(practicality / count),
    confidenceNotes: [],
  };

  if (breakdown.relevance < 0.5) {
    breakdown.confidenceNotes?.push(
      "Limited relevance signals across evaluated resources"
    );
  }
  if (breakdown.recency < 0.5) {
    breakdown.confidenceNotes?.push(
      "Most resources appear older; consider refreshing queries"
    );
  }
  if (!breakdown.confidenceNotes?.length) {
    breakdown.confidenceNotes?.push("Resource quality signals are balanced");
  }

  return breakdown;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const normalized = new URL(url, url.startsWith("http") ? undefined : "https://").href;
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
