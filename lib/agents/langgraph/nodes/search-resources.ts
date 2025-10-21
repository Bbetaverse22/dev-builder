/**
 * Search Resources Node for LangGraph Research Agent
 *
 * Looks up high-quality learning resources related to the user's skill gap.
 * Uses Firecrawl API for web search and scraping, with LLM fallback for
 * additional resource generation when needed.
 */

import type {
  ResearchState,
  Resource,
  SearchIteration,
  ScrapedResource,
} from "../research-agent";
import FirecrawlApp from "@mendable/firecrawl-js";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { escapePromptText } from "../utils/prompt-utils";

type SearchProvider = "firecrawl" | "openai";

class FirecrawlUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FirecrawlUnavailableError";
  }
}

const DEFAULT_MODEL = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o-mini";
const MAX_FIRECRAWL_RESULTS = 10;
const MAX_TOTAL_RESULTS = 20;
const MAX_FIRECRAWL_PASSES = Number(
  process.env.FIRECRAWL_MAX_PASSES ?? 1
);
const MAX_SCRAPE_COUNT = 5;
const MAX_SUMMARY_CHARS = 600;
const SUMMARY_KEYPOINT_LIMIT = 5;
const SUMMARY_RETRY_LIMIT = 2;
const SCRAPE_TIMEOUT_MS = Number(
  process.env.FIRECRAWL_SCRAPE_TIMEOUT_MS ?? 8_000
);
const SEARCH_ITERATION_LIMIT = 3;
const MIN_RESULTS_TARGET = 12;
const FIRECRAWL_MIN_INTERVAL_MS = Number(
  process.env.FIRECRAWL_MIN_INTERVAL_MS ?? 5000
);

let lastFirecrawlRequestAt = 0;

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
  const seenUrls = new Set<string>(
    (state.searchResults ?? []).map((res) => normalizeUrl(res.url) ?? res.url)
  );
  const sourcesUsed = new Set<string>(state.searchSources ?? []);
  const iterationLogs: string[] = [];
  const searchIterations: SearchIteration[] = [...(state.searchIterations ?? [])];
  const scrapeCandidates: Resource[] = [];
  const scrapedResources: ScrapedResource[] = [];
  const startTime = Date.now();

  console.log("🔍 Running searchResourcesNode");
  console.log(`   Skill gap: ${state.skillGap}`);
  console.log(`   Primary language: ${state.detectedLanguage || "unknown"}`);
  console.log(`   Seed queries: ${queries.join(" | ")}`);

  let firecrawl = await createFirecrawlClient();
  let pass = 0;
  let continueSearching = true;

  while (
    continueSearching &&
    pass < SEARCH_ITERATION_LIMIT &&
    pass < MAX_FIRECRAWL_PASSES
  ) {
    pass += 1;
    const iterationStart = Date.now();
    const iteration: SearchIteration = {
      number: (state.iterationCount ?? 0) + pass,
      queries: queries.slice(0, 6),
      sources: [],
      notes: undefined,
      resultsFound: 0,
      scrapedCount: 0,
      durationMs: 0,
      errors: [],
    };

    const iterationNotes: string[] = [];

    if (firecrawl) {
      try {
        const { resources: firecrawlResults, rateLimitHit } = await runFirecrawlSearch(
          firecrawl,
          queries,
          seenUrls,
          state,
          pass
        );
        if (firecrawlResults.length) {
          firecrawlResults.forEach((resource) => {
            resources.push(resource);
            if (
              resource.source === "firecrawl" &&
              !scrapeCandidates.some((r) => r.url === resource.url)
            ) {
              scrapeCandidates.push(resource);
            }
            sourcesUsed.add(resource.source ?? "firecrawl");
          });
          usedProviders.add("firecrawl");
          iterationNotes.push(
            `Firecrawl (pass ${pass}) returned ${firecrawlResults.length} items`
          );
        } else {
          iterationNotes.push(`Firecrawl (pass ${pass}) returned no new items`);
        }
        iteration.sources.push("firecrawl");
        iteration.resultsFound += firecrawlResults.length;
        if (rateLimitHit) {
          iterationNotes.push(
            "Firecrawl rate limit detected; pausing further search iterations"
          );
          continueSearching = false;
        }
      } catch (error) {
        const message =
          (error as Error)?.message ?? "Firecrawl search failed";
        iteration.errors?.push(message);
        iterationNotes.push(message);
        if (error instanceof FirecrawlUnavailableError) {
          iterationNotes.push(
            "Firecrawl appears unreachable (network/DNS). Falling back to LLM-generated resources only."
          );
          firecrawl = null;
        }
      }
    } else if (pass === 1) {
      iterationNotes.push("Skipped Firecrawl (no API key)");
    }

    if (resources.length < MIN_RESULTS_TARGET) {
      const { resources: llmResources, supplementalQueries } =
        await runLLMFallback(state, queries, resources);

      if (llmResources.length) {
        llmResources.forEach((resource) => {
          const normalized = normalizeUrl(resource.url);
          if (!normalized || seenUrls.has(normalized)) {
            return;
          }
          const resourceWithSource = {
            ...resource,
            source: resource.source ?? "openai",
          };
          resources.push(resourceWithSource);
          seenUrls.add(normalized);
        });
        usedProviders.add("openai");
        iterationNotes.push(
          `LLM fallback generated ${llmResources.length} items`
        );
      }

      supplementalQueries
        .slice(0, 3)
        .forEach((query) => querySet.add(query));
      iteration.sources.push("openai");
      iteration.resultsFound += llmResources.length;
    }

    const scrapeBatch = scrapeCandidates
      .filter((candidate) =>
        (state.scrapedResources ?? []).every(
          (scraped) => scraped.url !== candidate.url
        )
      )
      .slice(0, MAX_SCRAPE_COUNT - scrapedResources.length);

    if (scrapeBatch.length > 0 && firecrawl) {
      try {
        const scraped = await scrapeAndSummarizeResources(
          firecrawl,
          scrapeBatch,
          state
        );
        scrapedResources.push(...scraped);
        iteration.scrapedCount = (iteration.scrapedCount ?? 0) + scraped.length;
        iterationNotes.push(`Scraped ${scraped.length} resources`);
      } catch (error) {
        const message =
          (error as Error)?.message ?? "Scraping failed";
        iteration.errors?.push(message);
        iterationNotes.push(message);
      }
    }

    iteration.durationMs = Date.now() - iterationStart;
    iteration.notes = iterationNotes.join(" | ");
    searchIterations.push(iteration);
    iterationLogs.push(iteration.notes ?? "");

    continueSearching =
      resources.length < MIN_RESULTS_TARGET && pass < SEARCH_ITERATION_LIMIT;
  }

  const finalResources = dedupeAndTrim(resources, seenUrls);
  const finalQueries = Array.from(querySet);
  finalResources.forEach((resource) => {
    if (resource.source) {
      sourcesUsed.add(resource.source);
    }
  });

  const mergedScrapedResources = mergeScrapedResources(
    state.scrapedResources ?? [],
    scrapedResources
  );

  console.log(
    `✅ searchResourcesNode returning ${finalResources.length} resources (providers: ${
      usedProviders.size ? Array.from(usedProviders).join(", ") : "none"
    }) after ${pass} passes`
  );

  return {
    searchQuery: finalQueries[0] ?? state.skillGap,
    searchResults: finalResources,
    queries: finalQueries,
    searchSources: Array.from(sourcesUsed),
    searchIterations,
    searchNotes: [...(state.searchNotes ?? []), ...iterationLogs],
    scrapedResources: mergedScrapedResources,
    iterationCount: (state.iterationCount ?? 0) + pass,
    summaryNotes: [...(state.summaryNotes ?? []), buildSummaryNote(finalResources)],
    searchIterationLog: [...(state.searchIterationLog ?? []), ...iterationLogs],
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
    // ALWAYS prioritize language-specific queries first
    if (language && language.toLowerCase() !== "unknown") {
      // Language-specific queries come FIRST (higher priority in search)
      safeAdd(`${language} ${baseSkillGap} tutorial`);
      safeAdd(`${baseSkillGap} ${language} best practices`);
      safeAdd(`learn ${baseSkillGap} with ${language}`);
      safeAdd(`${language} ${baseSkillGap} roadmap`);
      // Generic query comes last as fallback
      safeAdd(`${baseSkillGap} tutorial`);
    } else {
      // No language detected - use generic queries
      safeAdd(baseSkillGap);
      safeAdd(`best resources to learn ${baseSkillGap}`);
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
  seenUrls: Set<string>,
  state: ResearchState,
  pass: number
): Promise<{ resources: Resource[]; rateLimitHit: boolean }> {
  const collected: Resource[] = [];
  const categories = chooseFirecrawlCategories(state, collected.length);
  if (categories) {
    console.log(
      `   [Firecrawl] Using categories: ${categories.join(", ")}`
    );
  }
  let rateLimitHit = false;

  // Use the first 3 queries for better coverage
  for (const query of queries.slice(0, 3)) {
    try {
      console.log(`   [Firecrawl] Searching: "${query}"`);

      await enforceFirecrawlThrottle();

      // Firecrawl search returns web results
      const searchOptions: Record<string, unknown> = {
        limit: MAX_FIRECRAWL_RESULTS,
      };
      if (categories) {
        searchOptions.categories = categories;
      }

      const searchResult = await firecrawl.search(query, searchOptions);

      // Firecrawl returns SearchData type - check if results exist
      if (searchResult && Array.isArray(searchResult)) {
        searchResult.forEach((item: any) => {
          const resource = firecrawlResultToResource(item);
          const normalized = normalizeUrl(resource.url);

          if (!normalized || seenUrls.has(normalized)) {
            return;
          }

          collected.push({ ...resource, source: "firecrawl" });
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

            collected.push({ ...resource, source: "firecrawl" });
            seenUrls.add(normalized);
          });

          console.log(`   [Firecrawl] Found ${data.length} results for "${query}"`);
        }
      }
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      console.warn(
        `[searchResourcesNode] Firecrawl search failed for "${query}":`,
        message
      );
      if (isNetworkUnavailableError(error)) {
        throw new FirecrawlUnavailableError(
          `Firecrawl network request failed: ${message}`,
          { cause: error instanceof Error ? error : undefined }
        );
      }
      if (/rate limit/i.test(message)) {
        rateLimitHit = true;
        break;
      }
    }
  }

  return { resources: collected, rateLimitHit };
}

async function enforceFirecrawlThrottle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastFirecrawlRequestAt;
  if (elapsed < FIRECRAWL_MIN_INTERVAL_MS) {
    await sleep(FIRECRAWL_MIN_INTERVAL_MS - elapsed);
  }
  lastFirecrawlRequestAt = Date.now();
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function chooseFirecrawlCategories(
  state: ResearchState,
  existingCount: number
): string[] | undefined {
  const repoSignals = hasRepositorySignals(state);
  const storedExamples = state.examples ? state.examples.length : 0;
  const iterations = state.iterationCount ?? 0;

  if (!repoSignals) {
    return undefined;
  }

  // If the agent has iterated but still lacks examples/resources, focus purely on GitHub.
  if (storedExamples < 3 && (iterations > 0 || existingCount === 0)) {
    return ["github"];
  }

  // Blend GitHub with research-oriented sources when we already have some coverage.
  return ["github", "research"];
}

function hasRepositorySignals(state: ResearchState): boolean {
  const repoKeywords = [
    "github",
    "repository",
    "repo",
    "open source",
    "code example",
    "project"
  ];

  const textBuckets: string[] = [];
  const pushIfString = (value?: string) => {
    if (value) {
      textBuckets.push(value.toLowerCase());
    }
  };

  pushIfString(state.skillGap);
  pushIfString(state.userContext);
  pushIfString(state.targetRole);
  pushIfString(state.targetIndustry);

  (state.learningObjectives ?? []).forEach((objective) =>
    pushIfString(objective)
  );

  (state.queries ?? []).forEach((query) => pushIfString(query));

  (state.focusSkills ?? []).forEach((skill) => pushIfString(skill.name));

  return textBuckets.some((bucket) =>
    repoKeywords.some((keyword) => bucket.includes(keyword))
  );
}

/**
 * Convert Firecrawl search result to Resource format
 */
function firecrawlResultToResource(item: any): Resource {
  return {
    title: (item.title || "Learning Resource").slice(0, 180),
    url: item.url || "",
    description: (item.description || item.content || "Relevant learning material.").slice(0, 500),
    snippet: (item.content || "").slice(0, MAX_SUMMARY_CHARS),
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
          "CRITICAL: If a primary language is specified, ALL resources MUST be specific to that language/framework.",
          "For example, if the primary language is TypeScript, return TypeScript-specific resources, NOT Java or Python.",
        ].join(" "),
      ],
      [
        "human",
        [
          `Skill gap: ${state.skillGap}`,
          `**PRIMARY LANGUAGE/FRAMEWORK: ${state.detectedLanguage || "unknown"}**`,
          `IMPORTANT: All resources must be relevant to ${state.detectedLanguage || "general programming"}.`,
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
          `Remember: Focus on ${state.detectedLanguage || "relevant"} resources ONLY!`,
        ].join("\n"),
      ],
    ]);

    const aiMessage = await llm.invoke(await prompt.formatMessages({}));
    const rawText = extractTextContent(aiMessage.content);
    const parsed = parseLLMJson(rawText);

    const parsedWithClamp = clampSupplementalQueries(parsed);

    const validated = llmResponseSchema.safeParse(parsedWithClamp);
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

function clampSupplementalQueries(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed;
  }

  const maybeSupplemental = (parsed as Record<string, unknown>)[
    "supplemental_queries"
  ];
  if (!Array.isArray(maybeSupplemental)) {
    return parsed;
  }

  const trimmed = maybeSupplemental.slice(0, 6);
  return {
    ...(parsed as Record<string, unknown>),
    supplemental_queries: trimmed,
  };
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

async function scrapeAndSummarizeResources(
  firecrawl: FirecrawlApp,
  resources: Resource[],
  state: ResearchState
): Promise<ScrapedResource[]> {
  const summaries: ScrapedResource[] = [];
  for (const resource of resources) {
    try {
      const scraped = await firecrawl.scrape(
        resource.url,
        {
          formats: ["markdown"],
          timeout: SCRAPE_TIMEOUT_MS,
        }
      );

      if (!scraped || !scraped.markdown) {
        continue;
      }

      const content = truncateMarkdown(scraped.markdown, MAX_SUMMARY_CHARS * 4);
      const snippet = content.slice(0, MAX_SUMMARY_CHARS);
      const summaryPayload = await summarizeScrapedContent(
        resource,
        content,
        state
      );

      summaries.push({
        url: resource.url,
        content,
        snippet,
        summary: summaryPayload.summary,
        keyPoints: summaryPayload.keyPoints,
        recommendedAudience: summaryPayload.recommendedAudience,
        scrapedAt: new Date().toISOString(),
        source: resource.source,
      });
    } catch (error) {
      console.warn(
        `[searchResourcesNode] Failed to scrape ${resource.url}:`,
        (error as Error)?.message ?? error
      );
      if (isNetworkUnavailableError(error)) {
        console.warn(
          "[searchResourcesNode] Network unavailable during scraping. Skipping remaining scrape attempts for this run."
        );
        break;
      }
    }
  }

  return summaries;
}

function truncateMarkdown(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }
  return `${content.slice(0, maxChars)}...`;
}

function isNetworkUnavailableError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const possibleCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (
    ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(
      possibleCode
    )
  ) {
    return true;
  }

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? `${error.name}: ${error.message}`
      : "";

  if (!message) {
    return false;
  }

  return /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|getaddrinfo|timeout of \d+ms exceeded|Network Error/i.test(
    message
  );
}

async function summarizeScrapedContent(
  resource: Resource,
  content: string,
  state: ResearchState
): Promise<{ summary: string; keyPoints: string[]; recommendedAudience?: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      summary: resource.description.slice(0, MAX_SUMMARY_CHARS),
      keyPoints: [],
      recommendedAudience: undefined,
    };
  }

  const llm = new ChatOpenAI({
    model: DEFAULT_MODEL,
    temperature: 0.2,
  });

  const summaryPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "Summarize the following resource content.",
        `Limit summary to ${MAX_SUMMARY_CHARS} characters.`,
        `Return JSON with keys summary (string), keyPoints (string[] up to ${SUMMARY_KEYPOINT_LIMIT}), recommendedAudience (string).`,
        "Focus on actionable insights aligned with the skill gap and detected language.",
      ].join(" \n"),
    ],
    [
      "human",
      [
        `Skill gap: ${escapePromptText(state.skillGap)}`,
        `Primary language: ${escapePromptText(state.detectedLanguage || "unknown")}`,
        `Resource title: ${escapePromptText(resource.title)}`,
        `URL: ${resource.url}`,
          `CONTENT:\n${escapePromptText(content.slice(0, MAX_SUMMARY_CHARS * 6))}`,
      ].join("\n"),
    ],
  ]);

  let attempts = 0;
  while (attempts < SUMMARY_RETRY_LIMIT) {
    attempts += 1;
    try {
      const aiMessage = await llm.invoke(await summaryPrompt.formatMessages({}));
      const rawText = extractTextContent(aiMessage.content);
      const parsed = parseLLMJson(rawText);

      if (
        parsed &&
        typeof parsed === "object" &&
        "summary" in parsed &&
        typeof (parsed as any).summary === "string"
      ) {
        const keyPoints = Array.isArray((parsed as any).keyPoints)
          ? (parsed as any).keyPoints.slice(0, SUMMARY_KEYPOINT_LIMIT)
          : [];
        const recommendedAudience = (parsed as any).recommendedAudience;

        return {
          summary: ((parsed as any).summary as string).slice(0, MAX_SUMMARY_CHARS),
          keyPoints: keyPoints.filter((kp: any) => typeof kp === "string"),
          recommendedAudience:
            typeof recommendedAudience === "string"
              ? recommendedAudience.slice(0, 180)
              : undefined,
        };
      }
    } catch (error) {
      console.warn(
        `[searchResourcesNode] Summarization attempt ${attempts} failed for ${resource.url}:`,
        (error as Error)?.message ?? error
      );
    }
  }

  return {
    summary: resource.description.slice(0, MAX_SUMMARY_CHARS),
    keyPoints: [],
    recommendedAudience: undefined,
  };
}

function mergeScrapedResources(
  existing: ScrapedResource[],
  incoming: ScrapedResource[]
): ScrapedResource[] {
  const byUrl = new Map<string, ScrapedResource>();
  existing.forEach((resource) => {
    byUrl.set(resource.url, resource);
  });
  incoming.forEach((resource) => {
    byUrl.set(resource.url, resource);
  });
  return Array.from(byUrl.values()).slice(0, MAX_SCRAPE_COUNT);
}

function buildSummaryNote(resources: Resource[]): string {
  if (!resources.length) {
    return "No resources discovered";
  }
  const topTitles = resources
    .slice(0, 5)
    .map((r) => r.title)
    .join(", ");
  return `Identified ${resources.length} resources. Highlights: ${topTitles}`;
}
