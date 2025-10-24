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
import { escapePromptText, escapeTemplateBraces } from "../utils/prompt-utils";

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
      escapeTemplateBraces(
        '{"recommendations": [{"type": "resource", "title": "...", "description": "...", "url": "...", "priority": "high"}], "comparative_insights": [{"title": "...", "insight": "...", "supporting_resources": ["https://..."], "confidence": "medium"}], "learning_path": [{"order": 1, "title": "...", "description": "...", "difficulty": "beginner", "estimated_time_hours": 4, "resource_url": "https://..."}]}'
      ),
      "",
      "ALL recommendations MUST have a title field. Do not include any explanatory text, only the JSON object.",
      "Comparative insights should highlight trade-offs between the top resources.",
      "Learning path should be 3-6 steps, ordered from foundational to advanced.",
    ].join("\n");

    // Get skill level context
    const userSkillLevel = state.userSkillLevel ?? 'intermediate';
    const skillCurrentLevel = state.skillCurrentLevel ?? 2;
    const skillTargetLevel = state.skillTargetLevel ?? 4;
    const skillGap = state.skillGapValue ?? 2;
    
    // Get adaptive learning configuration
    const config = getSkillLevelConfig(userSkillLevel);
    
    const skillLevelInstructions = {
      beginner: 'Focus on fundamentals and building confidence. Recommend tutorials, step-by-step guides, and beginner-friendly resources. Emphasize hands-on practice with simple projects.',
      intermediate: 'Emphasize practical application and advanced concepts. Recommend real-world projects, best practices guides, and intermediate to advanced resources. Balance theory with implementation.',
      advanced: 'Concentrate on optimization, architecture, and leadership. Recommend system design resources, performance optimization guides, and advanced architectural patterns. Focus on mastery and innovation.',
    };

    const humanPrompt = [
      `Skill gap: ${state.skillGap}`,
      `**PRIMARY LANGUAGE/FRAMEWORK: ${state.detectedLanguage || "unknown"}**`,
      `IMPORTANT: All recommendations MUST be relevant to ${state.detectedLanguage || "the detected tech stack"}.`,
      `User context: ${state.userContext}`,
      `Target role: ${state.targetRole || "not specified"}`,
      `Learning objectives: ${(state.learningObjectives ?? []).join(", ") || "not specified"}`,
      "",
      `🎯 USER SKILL LEVEL: ${userSkillLevel.toUpperCase()}`,
      `Current proficiency: ${skillCurrentLevel}/5`,
      `Target proficiency: ${skillTargetLevel}/5`,
      `Skill gap: ${skillGap} levels`,
      `Learning path focus: ${config.pathDescription}`,
      "",
      `📋 ADAPTIVE INSTRUCTIONS FOR ${userSkillLevel.toUpperCase()} LEVEL:`,
      skillLevelInstructions[userSkillLevel],
      "",
      "Top Learning Resources:",
      ...topResources.map((r, i) => {
        const escapedTitle = escapePromptText(r.title);
        const escapedDescription = escapePromptText(r.description ?? "");
        const escapedSummary = escapePromptText(r.summary ?? "(no summary)");
        return `${i + 1}. ${escapedTitle} (score: ${r.score.toFixed(2)})\n   ${r.url}\n   ${escapedDescription}\n   Summary: ${escapedSummary}`;
      }),
      "",
      "Top GitHub Examples:",
      ...topExamples.map((e, i) => `${i + 1}. ${e.name} (⭐ ${e.stars})\n   ${e.url}\n   ${e.description}`),
      "",
      "Scraped Resource Summaries:",
      ...scrapedResources.map((scraped, i) => {
        const escapedSummary = escapePromptText(scraped.summary);
        const escapedKeyPoints = scraped.keyPoints
          .map((point) => escapePromptText(point))
          .join(", ");
        const escapedAudience = escapePromptText(scraped.recommendedAudience ?? "general");
        return `${i + 1}. ${escapedSummary}\n   Key points: ${escapedKeyPoints}\n   Recommended audience: ${escapedAudience}`;
      }),
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
      "Return JSON with keys: recommendations (array), comparative_insights (array), learning_path (array). Every recommendation must include type, title, description, and priority. If URL is unknown, set it to an empty string."
        + " Include at least 5 recommendations. If you cannot find enough valid items, synthesize high-confidence suggestions based on the provided resources.",
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

    const fallback = generateFallbackRecommendations(state, resources, examples);

    let recommendations = limitRecommendations(
      validated.data.recommendations.map((rec) => ({
        ...rec,
        description:
          (typeof rec.description === "string" && rec.description.trim().length > 0)
            ? rec.description
            : "Follow this recommendation generated by the research agent to reinforce your learning path.",
        url: rec.url ?? "",
      }))
    );

    if (recommendations.length < 5) {
      const existingTitles = new Set(
        recommendations.map((rec) => rec.title.trim().toLowerCase())
      );
      for (const fallbackRec of fallback.recommendations) {
        const key = fallbackRec.title.trim().toLowerCase();
        if (!existingTitles.has(key)) {
          recommendations.push(fallbackRec);
          existingTitles.add(key);
        }
        if (recommendations.length >= 6) {
          break;
        }
      }
      recommendations = limitRecommendations(recommendations);
    }

    const comparativeInsights = validated.data.comparative_insights.length
      ? validated.data.comparative_insights.map((insight) => ({
          title: insight.title,
          insight: insight.insight,
          supportingResources: insight.supporting_resources.filter((url) => !!url && url.trim().length > 0),
          confidence: insight.confidence,
        }))
      : fallback.comparativeInsights;

    // Use adaptive learning path if skill level is available, otherwise use LLM-generated or fallback
    const learningPath = state.userSkillLevel
      ? generateAdaptiveLearningPath(state, resources, examples)
      : validated.data.learning_path.length
      ? validated.data.learning_path
          .map((step, index) => ({
            order: step.order ?? index + 1,
            title: step.title,
            description: step.description,
            estimatedTimeHours: step.estimated_time_hours,
            difficulty: step.difficulty,
            resourceUrl: step.resource_url && step.resource_url.trim().length > 0 ? step.resource_url : undefined,
            resourceTitle: step.resource_title,
          }))
          .slice(0, 6)
      : fallback.learningPath;

    return {
      recommendations,
      comparativeInsights,
      learningPath,
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
        supporting_resources: z.array(z.string().min(1)).min(1),
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
        resource_url: z.string().optional(),
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

/**
 * Get skill level-specific learning path configuration
 */
function getSkillLevelConfig(userSkillLevel: 'beginner' | 'intermediate' | 'advanced') {
  const configs = {
    beginner: {
      minDifficulty: 'beginner',
      maxDifficulty: 'intermediate',
      focusAreas: ['Foundation', 'Practice', 'Application', 'Next Steps'],
      timeMultiplier: 1.5, // Beginners need more time
      resourceTypes: ['tutorial', 'documentation', 'basic-example'],
      pathDescription: 'Building strong fundamentals and confidence',
    },
    intermediate: {
      minDifficulty: 'beginner',
      maxDifficulty: 'advanced',
      focusAreas: ['Review', 'Advanced Concepts', 'Real Projects', 'Best Practices'],
      timeMultiplier: 1.0, // Standard time
      resourceTypes: ['advanced-tutorial', 'best-practices', 'real-world-project'],
      pathDescription: 'Advancing skills with practical application',
    },
    advanced: {
      minDifficulty: 'intermediate',
      maxDifficulty: 'advanced',
      focusAreas: ['Optimization', 'Architecture', 'Innovation', 'Leadership'],
      timeMultiplier: 0.75, // Advanced users are faster
      resourceTypes: ['architecture', 'optimization', 'system-design', 'research'],
      pathDescription: 'Mastering advanced concepts and leadership',
    },
  };

  return configs[userSkillLevel];
}

/**
 * Determine appropriate difficulty based on skill level and gap
 */
function determineDifficulty(
  userSkillLevel: 'beginner' | 'intermediate' | 'advanced',
  skillGap: number,
  stepIndex: number,
  totalSteps: number
): 'beginner' | 'intermediate' | 'advanced' {
  const config = getSkillLevelConfig(userSkillLevel);
  
  // Calculate progression through the path (0 to 1)
  const progression = stepIndex / totalSteps;
  
  // For large gaps, start easier
  if (skillGap >= 2.0) {
    if (progression < 0.3) return 'beginner';
    if (progression < 0.7) return 'intermediate';
    return config.maxDifficulty as 'beginner' | 'intermediate' | 'advanced';
  }
  
  // For medium gaps, balanced approach
  if (skillGap >= 1.0) {
    if (userSkillLevel === 'beginner') {
      return progression < 0.5 ? 'beginner' : 'intermediate';
    }
    if (userSkillLevel === 'intermediate') {
      return progression < 0.4 ? 'intermediate' : 'advanced';
    }
    return 'advanced';
  }
  
  // For small gaps, focus on refinement
  if (userSkillLevel === 'beginner') return 'intermediate';
  if (userSkillLevel === 'intermediate') return 'advanced';
  return 'advanced';
}

/**
 * Calculate adaptive time estimate based on difficulty and skill level
 */
function calculateAdaptiveTimeEstimate(
  userSkillLevel: 'beginner' | 'intermediate' | 'advanced',
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  baseHours: number
): number {
  const config = getSkillLevelConfig(userSkillLevel);
  
  // Base difficulty multipliers
  const difficultyMultipliers = {
    beginner: 1.0,
    intermediate: 1.5,
    advanced: 2.0,
  };
  
  // Apply skill level adjustment
  const adjustedTime = baseHours * difficultyMultipliers[difficulty] * config.timeMultiplier;
  
  // Round to reasonable increments
  if (adjustedTime < 2) return Math.ceil(adjustedTime * 2) / 2; // Round to 0.5 hour increments
  if (adjustedTime < 10) return Math.ceil(adjustedTime); // Round to 1 hour increments
  return Math.ceil(adjustedTime / 5) * 5; // Round to 5 hour increments
}

/**
 * Generate adaptive learning path based on skill level
 */
export function generateAdaptiveLearningPath(
  state: ResearchState,
  resources: ScoredResource[],
  examples: GitHubProject[]
): LearningPathStep[] {
  const userSkillLevel = state.userSkillLevel ?? 'intermediate';
  const skillGap = state.skillGapValue ?? 2;
  const config = getSkillLevelConfig(userSkillLevel);
  
  console.log(`📚 Generating adaptive learning path for ${userSkillLevel} level (gap: ${skillGap})`);
  
  const steps: LearningPathStep[] = [];
  const focusAreas = config.focusAreas;
  
  // Generate steps for each focus area
  focusAreas.forEach((area, index) => {
    const difficulty = determineDifficulty(userSkillLevel, skillGap, index, focusAreas.length);
    const baseHours = index === 0 ? 5 : index === focusAreas.length - 1 ? 10 : 8;
    const estimatedTime = calculateAdaptiveTimeEstimate(userSkillLevel, difficulty, baseHours);
    
    // Find relevant resource for this step
    const relevantResource = resources.find(r => 
      r.title.toLowerCase().includes(area.toLowerCase()) ||
      r.description.toLowerCase().includes(area.toLowerCase())
    );
    
    steps.push({
      order: index + 1,
      title: `${area}: ${state.skillGap}`,
      description: getStepDescription(area, userSkillLevel, skillGap),
      difficulty,
      estimatedTimeHours: estimatedTime,
      resourceUrl: relevantResource?.url,
      resourceTitle: relevantResource?.title,
    });
  });
  
  // Add example-based steps if available
  if (examples.length > 0 && userSkillLevel !== 'beginner') {
    const practiceStep: LearningPathStep = {
      order: steps.length + 1,
      title: `Hands-on Practice: Study Real Examples`,
      description: userSkillLevel === 'advanced' 
        ? `Analyze production-level implementations and architectural patterns in real-world projects.`
        : `Learn from real-world implementations by studying and replicating working examples.`,
      difficulty: userSkillLevel === 'advanced' ? 'advanced' : 'intermediate',
      estimatedTimeHours: calculateAdaptiveTimeEstimate(userSkillLevel, 'intermediate', 12),
      resourceUrl: examples[0]?.url,
      resourceTitle: examples[0]?.name,
    };
    steps.push(practiceStep);
  }
  
  return steps.slice(0, 6); // Limit to 6 steps
}

/**
 * Get contextual step description based on focus area and skill level
 */
function getStepDescription(
  area: string,
  userSkillLevel: 'beginner' | 'intermediate' | 'advanced',
  skillGap: number
): string {
  const descriptions: Record<string, Record<string, string>> = {
    Foundation: {
      beginner: 'Start with core concepts and fundamental principles. Build a solid understanding through guided tutorials.',
      intermediate: 'Review foundational concepts and fill knowledge gaps to ensure strong fundamentals.',
      advanced: 'Quickly review fundamentals and identify any gaps in core understanding.',
    },
    Practice: {
      beginner: 'Apply what you learned through simple exercises and guided projects.',
      intermediate: 'Solidify understanding through structured practice and small projects.',
      advanced: 'Reinforce concepts through targeted practice and quick implementations.',
    },
    Review: {
      beginner: 'Review and consolidate learning from previous steps.',
      intermediate: 'Revisit core concepts and assess your current understanding.',
      advanced: 'Quick review of essential concepts before advancing.',
    },
    'Advanced Concepts': {
      beginner: 'Introduction to more complex topics and patterns.',
      intermediate: 'Deep dive into advanced features, patterns, and best practices.',
      advanced: 'Explore cutting-edge techniques and architectural patterns.',
    },
    'Real Projects': {
      beginner: 'Work on a small real-world project applying what you learned.',
      intermediate: 'Build production-quality projects implementing advanced concepts.',
      advanced: 'Architect and implement complex, scalable solutions.',
    },
    Application: {
      beginner: 'Build a small project to apply your new skills in a practical context.',
      intermediate: 'Create meaningful applications demonstrating your mastery.',
      advanced: 'Design and implement production-grade solutions.',
    },
    'Next Steps': {
      beginner: 'Continue learning path with next-level resources and community involvement.',
      intermediate: 'Plan next learning goals and consider contributing to open source.',
      advanced: 'Explore leadership opportunities and cutting-edge developments.',
    },
    'Best Practices': {
      beginner: 'Learn industry standards and common conventions.',
      intermediate: 'Master best practices and coding standards for production code.',
      advanced: 'Define and advocate for best practices within your team.',
    },
    Optimization: {
      beginner: 'Introduction to basic optimization concepts.',
      intermediate: 'Learn performance optimization techniques.',
      advanced: 'Master advanced optimization, profiling, and system-level performance tuning.',
    },
    Architecture: {
      beginner: 'Understanding basic software architecture concepts.',
      intermediate: 'Learn common architectural patterns and when to apply them.',
      advanced: 'Design scalable architectures and lead architectural decisions.',
    },
    Innovation: {
      beginner: 'Explore new tools and emerging technologies.',
      intermediate: 'Experiment with innovative approaches and new paradigms.',
      advanced: 'Pioneer new solutions and contribute to technology evolution.',
    },
    Leadership: {
      beginner: 'Begin developing soft skills and collaboration practices.',
      intermediate: 'Take on mentoring roles and lead small initiatives.',
      advanced: 'Lead technical teams, mentor others, and drive strategic decisions.',
    },
  };
  
  return descriptions[area]?.[userSkillLevel] ?? 
    `Progress through ${area.toLowerCase()} to advance your skills.`;
}
