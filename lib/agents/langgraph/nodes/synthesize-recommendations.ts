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
} from "../research-agent";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const DEFAULT_MODEL = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini";
const MAX_RECOMMENDATIONS = 10;

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
  const recommendations = await generateRecommendations(state, resources, examples);

  console.log(`✅ synthesizeRecommendationsNode complete`);
  console.log(`   Generated ${recommendations.length} recommendations`);

  return {
    recommendations,
  };
}

/**
 * Generate personalized recommendations using LLM
 */
async function generateRecommendations(
  state: ResearchState,
  resources: ScoredResource[],
  examples: GitHubProject[]
): Promise<Recommendation[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[synthesizeRecommendationsNode] OPENAI_API_KEY not configured. Using fallback.");
    return generateFallbackRecommendations(resources, examples);
  }

  try {
    const llm = new ChatOpenAI({
      model: DEFAULT_MODEL,
      temperature: 0.3, // Some creativity for recommendations
    });

    const topResources = resources.slice(0, 3);
    const topExamples = examples.slice(0, 3);

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        [
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
          '{"recommendations": [{"type": "resource", "title": "...", "description": "...", "url": "...", "priority": "high"}]}',
          "",
          "ALL recommendations MUST have a title field. Do not include any explanatory text, only the JSON object.",
        ].join("\n"),
      ],
      [
        "human",
        [
          `Skill gap: ${state.skillGap}`,
          `**PRIMARY LANGUAGE/FRAMEWORK: ${state.detectedLanguage || "unknown"}**`,
          `IMPORTANT: All recommendations MUST be relevant to ${state.detectedLanguage || "the detected tech stack"}.`,
          `User context: ${state.userContext}`,
          `Target role: ${state.targetRole || "not specified"}`,
          `Learning objectives: ${(state.learningObjectives ?? []).join(", ") || "not specified"}`,
          "",
          "Top Learning Resources:",
          ...topResources.map((r, i) => `${i + 1}. ${r.title} (score: ${r.score.toFixed(2)})\n   ${r.url}\n   ${r.description}`),
          "",
          "Top GitHub Examples:",
          ...topExamples.map((e, i) => `${i + 1}. ${e.name} (⭐ ${e.stars})\n   ${e.url}\n   ${e.description}`),
          "",
          `Generate 5-10 personalized recommendations for ${state.detectedLanguage || "the tech stack"}. Return JSON with a 'recommendations' array where each recommendation has: type, title, description, url (optional), and priority.`,
          `Remember: Focus ONLY on ${state.detectedLanguage || "relevant"} resources!`,
        ].join("\n"),
      ],
    ]);

    const aiMessage = await llm.invoke(await prompt.formatMessages({}));
    const rawText = extractTextContent(aiMessage.content);
    const parsed = parseLLMJson(rawText);

    const validated = synthesisSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(
        "[synthesizeRecommendationsNode] LLM response failed validation:",
        validated.error
      );
      return generateFallbackRecommendations(resources, examples);
    }

    return validated.data.recommendations;
  } catch (error) {
    console.warn(
      "[synthesizeRecommendationsNode] LLM synthesis failed:",
      (error as Error)?.message ?? error
    );
    return generateFallbackRecommendations(resources, examples);
  }
}

/**
 * Generate basic recommendations without LLM
 */
function generateFallbackRecommendations(
  resources: ScoredResource[],
  examples: GitHubProject[]
): Recommendation[] {
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

  return recommendations.slice(0, MAX_RECOMMENDATIONS);
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
      "[synthesizeRecommendationsNode] Failed to parse JSON response:",
      (error as Error)?.message ?? error
    );
    return null;
  }
}
