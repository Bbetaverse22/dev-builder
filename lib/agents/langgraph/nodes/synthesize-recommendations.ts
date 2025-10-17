/**
 * Synthesize Recommendations Node for LangGraph Research Agent
 *
 * Creates actionable recommendations by combining:
 * - Top-rated learning resources
 * - High-quality GitHub examples
 * - User context and goals
 * - Personalized learning path
 */

import type {
  ResearchState,
  Recommendation,
  ScoredResource,
  GitHubProject,
  ComparativeInsight,
  LearningPathStep,
} from "../research-agent";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const DEFAULT_MODEL = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini";
const MAX_RECOMMENDATIONS = 6;
const MAX_PER_TYPE: Record<Recommendation["type"], number> = {
  resource: 3,
  example: 2,
  action: 2,
};

const synthesisSchema = z.object({
  recommendations: z.array(
    z.object({
      type: z.enum(["resource", "example", "action"]),
      title: z.string(),
      description: z.string(),
      url: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
});

/**
 * Main LangGraph node that synthesizes all research into recommendations
 */
export async function synthesizeRecommendationsNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  console.log("🎯 Running synthesizeRecommendationsNode");

  const resources = state.evaluatedResults ?? [];
  const examples = state.examples ?? [];
  const confidence = state.confidence ?? 0;

  console.log(`   Resources: ${resources.length}`);
  console.log(`   Examples: ${examples.length}`);
  console.log(`   Confidence: ${confidence.toFixed(2)}`);

  // Generate recommendations using LLM
  const result = await generateRecommendations(state, resources, examples);

  console.log(`✅ synthesizeRecommendationsNode complete`);
  console.log(`   Generated ${result.recommendations.length} recommendations`);

  return {
    recommendations: result.recommendations,
    comparativeInsights: result.comparativeInsights,
    learningPath: result.learningPath,
  };
}

/**
 * Generate personalized recommendations using LLM
 */
async function generateRecommendations(
  state: ResearchState,
  resources: ScoredResource[],
  examples: GitHubProject[]
): Promise<{
  recommendations: Recommendation[];
  comparativeInsights: ComparativeInsight[];
  learningPath: LearningPathStep[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[synthesizeRecommendationsNode] OPENAI_API_KEY not configured. Using fallback.");
    return generateFallbackRecommendations(state, resources, examples);
  }

  try {
    const llm = new ChatOpenAI({
      model: DEFAULT_MODEL,
      temperature: 0.3, // Some creativity for recommendations
    });

    const topResources = resources.slice(0, 5);
    const topExamples = examples.slice(0, 3);
    const scrapedResources = state.scrapedResources ?? [];
    const confidenceBreakdown = state.confidenceBreakdown;

    const systemPrompt = [
      "You are a personalized learning advisor.",
      "Create actionable recommendations based on the user's skill gap and available resources.",
      "",
      "Recommendation types:",
      "- resource: Learning materials (tutorials, docs, courses)",
      "- example: GitHub projects to study or reference",
      "- action: Specific steps to take (e.g., 'Build a project', 'Practice X')",
      "",
      "Priority levels:",
      "- high: Critical for closing the skill gap",
      "- medium: Important but not urgent",
      "- low: Nice to have, supplementary",
      "",
      "CRITICAL: If a primary language/framework is specified, ALL recommendations must be specific to that technology stack.",
      "For example, if the language is TypeScript, recommend TypeScript resources, NOT Java or Python.",
      "",
      "IMPORTANT: Return ONLY valid JSON with this exact structure:",
      '{"recommendations": [...], "comparative_insights": [...], "learning_path": [...]}',
      "",
      "ALL recommendations MUST have a title field. Do not include any explanatory text, only the JSON object.",
      "Comparative insights should highlight trade-offs between the top resources.",
      "Learning path should be 3-6 steps, ordered from foundational to advanced.",
    ].join("\n");

    const humanPrompt = [
      `Skill gap: ${state.skillGap}`,
      `**PRIMARY LANGUAGE/FRAMEWORK: ${state.detectedLanguage || "unknown"}**`,
      `IMPORTANT: All recommendations MUST be relevant to ${state.detectedLanguage || "the detected tech stack"}.`,
      `User context: ${state.userContext}`,
      `Target role: ${state.targetRole || "not specified"}`,
      `Learning objectives: ${(state.learningObjectives ?? []).join(", ") || "not specified"}`,
      "",
      "Top Learning Resources:",
      ...topResources.map((r, i) => `${i + 1}. ${r.title} (score: ${r.score.toFixed(2)})\n   ${r.url}\n   ${r.description}\n   Summary: ${r.summary ?? "(no summary)"}`),
      "",
      "Top GitHub Examples:",
      ...topExamples.map((e, i) => `${i + 1}. ${e.name} (⭐ ${e.stars})\n   ${e.url}\n   ${e.description}`),
      "",
      "Scraped Resource Summaries:",
      ...scrapedResources.map(
        (scraped, i) =>
          `${i + 1}. ${scraped.summary}\n   Key points: ${scraped.keyPoints.join(", ")}\n   Recommended audience: ${scraped.recommendedAudience ?? "general"}`
      ),
      "",
      confidenceBreakdown
        ? `Confidence breakdown: relevance ${Math.round(
            confidenceBreakdown.relevance * 100
          )}%, coverage ${Math.round(
            confidenceBreakdown.coverage * 100
          )}%, recency ${Math.round(
            confidenceBreakdown.recency * 100
          )}%`
        : "Confidence breakdown: unavailable",
      "",
      `Generate 5-10 personalized recommendations for ${state.detectedLanguage || "the tech stack"}.`,
      "Return JSON with keys: recommendations (array), comparative_insights (array), learning_path (array).",
      "Each comparative insight: title, insight, supporting_resources (URLs array), confidence (low|medium|high).",
      "Learning path items: order, title, description, difficulty (beginner|intermediate|advanced), estimated_time_hours (number), resource_url (optional).",
      `Remember: Focus ONLY on ${state.detectedLanguage || "relevant"} resources!`,
    ].join("\n");

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanPrompt],
    ]);

    const aiMessage = await llm.invoke(await prompt.formatMessages({}));
    const rawText = extractTextContent(aiMessage.content);
    const parsed = parseLLMJson(rawText);

    const validated = extendedSynthesisSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(
        "[synthesizeRecommendationsNode] LLM response failed validation:",
        validated.error
      );
      return generateFallbackRecommendations(state, resources, examples);
    }

    return {
      recommendations: limitRecommendations(validated.data.recommendations),
      comparativeInsights: validated.data.comparative_insights.map((insight) => ({
        title: insight.title,
        insight: insight.insight,
        supportingResources: insight.supporting_resources,
        confidence: insight.confidence,
      })),
      learningPath: validated.data.learning_path
        .map((step, index) => ({
          order: step.order ?? index + 1,
          title: step.title,
          description: step.description,
          estimatedTimeHours: step.estimated_time_hours,
          difficulty: step.difficulty,
          resourceUrl: step.resource_url,
          resourceTitle: step.resource_title,
        }))
        .slice(0, 6),
    };
  } catch (error) {
    console.warn(
      "[synthesizeRecommendationsNode] LLM synthesis failed:",
      (error as Error)?.message ?? error
    );
    return generateFallbackRecommendations(state, resources, examples);
  }
}

/**
 * Generate basic recommendations without LLM
 */
function generateFallbackRecommendations(
  state: ResearchState,
  resources: ScoredResource[],
  examples: GitHubProject[]
): {
  recommendations: Recommendation[];
  comparativeInsights: ComparativeInsight[];
  learningPath: LearningPathStep[];
} {
  const recommendations: Recommendation[] = [];

  // Add top 3 resources
  resources.slice(0, 3).forEach((resource, index) => {
    recommendations.push({
      type: "resource",
      title: resource.title,
      description: resource.description,
      url: resource.url,
      priority: index === 0 ? "high" : "medium",
    });
  });

  // Add top 3 examples
  examples.slice(0, 3).forEach((example, index) => {
    recommendations.push({
      type: "example",
      title: `Study: ${example.name}`,
      description: `${example.description} (${example.stars} stars)`,
      url: example.url,
      priority: index === 0 ? "high" : "medium",
    });
  });

  // Add generic action items
  recommendations.push({
    type: "action",
    title: "Build a practice project",
    description:
      "Apply what you learn by building a small project that incorporates the key concepts",
    priority: "high",
  });

  recommendations.push({
    type: "action",
    title: "Review and refactor",
    description:
      "After completing the learning resources, review your existing code and refactor using new knowledge",
    priority: "medium",
  });

  const comparativeInsights: ComparativeInsight[] = buildFallbackInsights(
    resources
  );
  const learningPath: LearningPathStep[] = buildFallbackLearningPath(
    state,
    resources
  );

  return {
    recommendations: limitRecommendations(recommendations),
    comparativeInsights,
    learningPath,
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
 * Deduplicate and limit recommendations by type.
 */
function limitRecommendations(recommendations: Recommendation[]): Recommendation[] {
  const limited: Recommendation[] = [];
  const seenTitles = new Set<string>();
  const typeCounts: Record<Recommendation["type"], number> = {
    resource: 0,
    example: 0,
    action: 0,
  };

  for (const rec of recommendations) {
    if (limited.length >= MAX_RECOMMENDATIONS) {
      break;
    }
    const normalizedTitle = rec.title.trim().toLowerCase();
    if (seenTitles.has(normalizedTitle)) {
      continue;
    }
    if (typeCounts[rec.type] >= (MAX_PER_TYPE[rec.type] ?? 2)) {
      continue;
    }

    seenTitles.add(normalizedTitle);
    typeCounts[rec.type] += 1;
    limited.push(rec);
  }

  return limited;
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
      "[synthesizeRecommendationsNode] Failed to parse JSON response:",
      (error as Error)?.message ?? error
    );
    return null;
  }
}

const extendedSynthesisSchema = z.object({
  recommendations: synthesisSchema.shape.recommendations,
  comparative_insights: z
    .array(
      z.object({
        title: z.string().min(3),
        insight: z.string().min(10),
        supporting_resources: z.array(z.string().url()).min(1),
        confidence: z.enum(["low", "medium", "high"]),
      })
    )
    .max(6)
    .default([]),
  learning_path: z
    .array(
      z.object({
        order: z.number().int().min(1).optional(),
        title: z.string().min(3),
        description: z.string().min(10),
        estimated_time_hours: z.number().min(0).max(80).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]),
        resource_url: z.string().url().optional(),
        resource_title: z.string().optional(),
      })
    )
    .max(6)
    .default([]),
});

function buildFallbackInsights(
  resources: ScoredResource[]
): ComparativeInsight[] {
  if (!resources.length) {
    return [];
  }

  const highScore = resources[0];
  const secondary = resources.slice(1, 3);

  const insights: ComparativeInsight[] = [];
  if (highScore) {
    insights.push({
      title: "Best overall resource",
      insight: `${highScore.title} stands out with the highest evaluation score, offering a balanced mix of depth and practicality for ${highScore.source ?? "the"} stack.`,
      supportingResources: [highScore.url],
      confidence: "high",
    });
  }

  if (secondary.length) {
    insights.push({
      title: "Alternative perspectives",
      insight: `Consider complementing the top pick with ${secondary
        .map((res) => res.title)
        .join(" and ")} to cover different teaching styles and focus areas.`,
      supportingResources: secondary.map((res) => res.url),
      confidence: "medium",
    });
  }

  return insights;
}

function buildFallbackLearningPath(
  state: ResearchState,
  resources: ScoredResource[]
): LearningPathStep[] {
  const steps: LearningPathStep[] = [];

  resources.slice(0, 3).forEach((resource, index) => {
    steps.push({
      order: index + 1,
      title: `Study: ${resource.title}`,
      description: resource.description.slice(0, 200),
      estimatedTimeHours: 4,
      difficulty: index === 0 ? "beginner" : index === 1 ? "intermediate" : "advanced",
      resourceUrl: resource.url,
      resourceTitle: resource.title,
    });
  });

  if (!steps.length) {
    steps.push({
      order: 1,
      title: `Explore fundamentals of ${state.skillGap}`,
      description: "Review introductory materials to solidify core concepts before diving deeper.",
      estimatedTimeHours: 6,
      difficulty: "beginner",
    });
  }

  return steps;
}
