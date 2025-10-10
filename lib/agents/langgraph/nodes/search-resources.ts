/**
 * Search Resources Node for LangGraph Research Agent
 *
 * Looks up high-quality learning resources related to the user's skill gap.
 * Uses Firecrawl API for web search and scraping, with LLM fallback for
 * additional resource generation when needed.
 */

import type { ResearchState, Resource } from "../research-agent";
import FirecrawlApp from "@mendable/firecrawl-js";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

type SearchProvider = "firecrawl" | "openai";

const DEFAULT_MODEL = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini";
const MAX_FIRECRAWL_RESULTS = 10;
const MAX_TOTAL_RESULTS = 20;

const llmResponseSchema = z.object({
  resources: z
    .array(
      z.object({
        title: z.string().min(1).max(180),
        url: z.string().min(1),
        description: z.string().min(1).max(500),
      })
    )
    .min(3)
    .max(10),
  supplemental_queries: z.array(z.string().min(4)).max(6).optional(),
});

/**
 * Main LangGraph node that enriches the research state with learning resources.
 */
export async function searchResourcesNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  const querySet = buildSearchQuerySet(state);
  const queries = Array.from(querySet);
  const resources: Resource[] = [];
  const usedProviders: Set<SearchProvider> = new Set();
  const seenUrls = new Set<string>();

  console.log("🔍 Running searchResourcesNode");
  console.log(`   Skill gap: ${state.skillGap}`);
  console.log(`   Primary language: ${state.detectedLanguage || "unknown"}`);
  console.log(`   Seed queries: ${queries.join(" | ")}`);

  // 1. Use Firecrawl for web search (primary method)
  const firecrawl = await createFirecrawlClient();
  if (firecrawl) {
    const firecrawlResults = await runFirecrawlSearch(
      firecrawl,
      queries,
      seenUrls
    );
    if (firecrawlResults.length) {
      resources.push(...firecrawlResults);
      usedProviders.add("firecrawl");
    }
  }

  // 2. Fallback to an LLM-assisted search if we still need more coverage
  if (resources.length < 8) {
    const { resources: llmResources, supplementalQueries } =
      await runLLMFallback(state, queries, resources);

    if (llmResources.length) {
      llmResources.forEach((resource) => {
        const normalized = normalizeUrl(resource.url);
        if (!normalized || seenUrls.has(normalized)) {
          return;
        }
        resources.push(resource);
        seenUrls.add(normalized);
      });
      usedProviders.add("openai");
    }

    supplementalQueries.forEach((query) => querySet.add(query));
  }

  const finalResources = dedupeAndTrim(resources, seenUrls);
  const finalQueries = Array.from(querySet);

  console.log(
    `✅ searchResourcesNode returning ${finalResources.length} resources (providers: ${
      usedProviders.size ? Array.from(usedProviders).join(", ") : "none"
    })`
  );

  return {
    searchQuery: finalQueries[0] ?? state.skillGap,
    searchResults: finalResources,
    queries: finalQueries,
  };
}

/**
 * Build a diverse set of search queries using state hints.
 */
function buildSearchQuerySet(state: ResearchState): Set<string> {
  const queries = new Set<string>();

  const safeAdd = (value?: string) => {
    if (!value) return;
    const normalized = value.trim();
    if (normalized.length > 3) {
      queries.add(normalized);
    }
  };

  const baseSkillGap = state.skillGap?.trim();
  const language = state.detectedLanguage?.trim();

  if (baseSkillGap) {
    safeAdd(baseSkillGap);
    safeAdd(`best resources to learn ${baseSkillGap}`);
    if (language && language.toLowerCase() !== "unknown") {
      safeAdd(`${baseSkillGap} ${language} tutorial`);
      safeAdd(`${baseSkillGap} roadmap ${language}`);
    } else {
      safeAdd(`${baseSkillGap} tutorial`);
    }
  }

  (state.queries ?? []).forEach(safeAdd);

  (state.focusSkills ?? [])
    .slice(0, 3)
    .forEach((skill) => {
      const parts = [skill.name];
      if (language && language.toLowerCase() !== "unknown") {
        parts.push(language);
      }
      safeAdd(`learn ${parts.join(" ")}`);
      safeAdd(`${parts.join(" ")} best practices`);
    });

  (state.domainKeywords ?? [])
    .slice(0, 5)
    .forEach((keyword) => {
      safeAdd(`${keyword} tutorial`);
      safeAdd(`${keyword} roadmap`);
    });

  if (queries.size === 0) {
    safeAdd("software engineering learning resources");
  }

  return queries;
}

/**
 * Create Firecrawl client instance (may fail if API key missing).
 */
async function createFirecrawlClient(): Promise<FirecrawlApp | null> {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn(
        "[searchResourcesNode] FIRECRAWL_API_KEY not configured. Skipping Firecrawl search."
      );
      return null;
    }
    return new FirecrawlApp({ apiKey });
  } catch (error) {
    console.warn(
      "[searchResourcesNode] Firecrawl client unavailable:",
      (error as Error)?.message ?? error
    );
    return null;
  }
}

/**
 * Run web search using Firecrawl API
 */
async function runFirecrawlSearch(
  firecrawl: FirecrawlApp,
  queries: string[],
  seenUrls: Set<string>
): Promise<Resource[]> {
  const collected: Resource[] = [];

  // Use the first 3 queries for better coverage
  for (const query of queries.slice(0, 3)) {
    try {
      console.log(`   [Firecrawl] Searching: "${query}"`);

      // Firecrawl search returns web results
      const searchResult = await firecrawl.search(query, {
        limit: MAX_FIRECRAWL_RESULTS,
      });

      // Firecrawl returns SearchData type - check if results exist
      if (searchResult && Array.isArray(searchResult)) {
        searchResult.forEach((item: any) => {
          const resource = firecrawlResultToResource(item);
          const normalized = normalizeUrl(resource.url);

          if (!normalized || seenUrls.has(normalized)) {
            return;
          }

          collected.push(resource);
          seenUrls.add(normalized);
        });

        console.log(`   [Firecrawl] Found ${searchResult.length} results for "${query}"`);
      } else if (searchResult && typeof searchResult === 'object' && 'data' in searchResult) {
        // Handle alternative response format
        const data = (searchResult as any).data;
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const resource = firecrawlResultToResource(item);
            const normalized = normalizeUrl(resource.url);

            if (!normalized || seenUrls.has(normalized)) {
              return;
            }

            collected.push(resource);
            seenUrls.add(normalized);
          });

          console.log(`   [Firecrawl] Found ${data.length} results for "${query}"`);
        }
      }
    } catch (error) {
      console.warn(
        `[searchResourcesNode] Firecrawl search failed for "${query}":`,
        (error as Error)?.message ?? error
      );
    }
  }

  return collected;
}

/**
 * Convert Firecrawl search result to Resource format
 */
function firecrawlResultToResource(item: any): Resource {
  return {
    title: (item.title || "Learning Resource").slice(0, 180),
    url: item.url || "",
    description: (item.description || item.content || "Relevant learning material.").slice(0, 500),
  };
}

async function runLLMFallback(
  state: ResearchState,
  queries: string[],
  existingResources: Resource[]
): Promise<{ resources: Resource[]; supplementalQueries: string[] }> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "[searchResourcesNode] Skipping LLM fallback: OPENAI_API_KEY not configured."
    );
    return { resources: [], supplementalQueries: [] };
  }

  try {
    const llm = new ChatOpenAI({
      model: DEFAULT_MODEL,
      temperature: 0.2,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        [
          "You are a research assistant that finds practical learning resources.",
          "Return results as JSON that matches the schema provided.",
          "Prefer official docs, reputable guides, modern tutorials, and hands-on courses.",
          "Do not invent URLs. Only use links you are confident exist.",
        ].join(" "),
      ],
      [
        "human",
        [
          `Skill gap: ${state.skillGap}`,
          `Primary language: ${state.detectedLanguage || "unknown"}`,
          `Learning objectives: ${(state.learningObjectives ?? []).join(", ")}`,
          `Focus skills: ${(state.focusSkills ?? [])
            .map((skill) => `${skill.name}`)
            .join(", ")}`,
          `Existing queries: ${queries.join(" | ")}`,
          existingResources.length
            ? `Existing resources: ${existingResources
                .slice(0, 3)
                .map((res) => res.url)
                .join(", ")}`
            : "No resources yet.",
          "Output JSON with keys `resources` and (optional) `supplemental_queries`.",
        ].join("\n"),
      ],
    ]);

    const aiMessage = await llm.invoke(await prompt.formatMessages({}));
    const rawText = extractTextContent(aiMessage.content);
    const parsed = parseLLMJson(rawText);

    const validated = llmResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(
        "[searchResourcesNode] LLM response failed validation:",
        validated.error
      );
      return { resources: [], supplementalQueries: [] };
    }

    const resources = validated.data.resources.map((item) => ({
      title: item.title,
      url: item.url,
      description: item.description,
    }));

    return {
      resources,
      supplementalQueries: validated.data.supplemental_queries ?? [],
    };
  } catch (error) {
    console.warn(
      "[searchResourcesNode] LLM fallback failed:",
      (error as Error)?.message ?? error
    );
    return { resources: [], supplementalQueries: [] };
  }
}

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

function parseLLMJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const fencedMatch = trimmed.match(/```json([\s\S]*?)```/i);
  const jsonText = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.warn(
      "[searchResourcesNode] Failed to parse JSON response:",
      (error as Error)?.message ?? error
    );
    return null;
  }
}

function normalizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const normalized = new URL(trimmed, trimmed.startsWith("http") ? undefined : "https://").href;
    return normalized.toLowerCase();
  } catch {
    return null;
  }
}

function dedupeAndTrim(
  resources: Resource[],
  seenUrls: Set<string>
): Resource[] {
  if (resources.length <= MAX_TOTAL_RESULTS) {
    return resources;
  }

  const unique: Resource[] = [];
  const used = new Set<string>();

  for (const resource of resources) {
    const normalized = normalizeUrl(resource.url) ?? resource.url;
    if (!normalized || used.has(normalized)) {
      continue;
    }
    used.add(normalized);
    unique.push(resource);
    if (unique.length >= MAX_TOTAL_RESULTS) {
      break;
    }
  }

  // Update the original seenUrls so callers stay in sync
  used.forEach((url) => seenUrls.add(url));

  return unique;
}
