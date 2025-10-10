/**
 * Test harness for the searchResourcesNode
 *
 * Run with: pnpm tsx test-search-resources-node.ts
 */

import { config } from "dotenv";
import { searchResourcesNode } from "./lib/agents/langgraph/nodes/search-resources";
import type { ResearchState } from "./lib/agents/langgraph/research-agent";

config({ path: ".env.local" });

interface Scenario {
  name: string;
  state: ResearchState;
}

const scenarios: Scenario[] = [
  {
    name: "React authentication (TypeScript)",
    state: {
      skillGap: "React authentication with JWT",
      detectedLanguage: "TypeScript",
      userContext:
        "Need to learn how to add secure authentication to a SaaS dashboard",
      iterationCount: 0,
      focusSkills: [
        { name: "Authentication", gap: 3, priority: 4 },
        { name: "React Hooks", gap: 2, priority: 3 },
      ],
      learningObjectives: [
        "Implement protected routes",
        "Handle access token refresh",
      ],
    },
  },
  {
    name: "Python data engineering",
    state: {
      skillGap: "Building data pipelines with Python",
      detectedLanguage: "Python",
      userContext:
        "Upskilling for a data engineering role focusing on ETL pipelines",
      iterationCount: 0,
      focusSkills: [
        { name: "Airflow", gap: 4, priority: 5 },
        { name: "Data Pipelines", gap: 3, priority: 4 },
      ],
      domainKeywords: ["ETL", "batch processing", "data warehousing"],
    },
  },
];

async function runScenario({ name, state }: Scenario) {
  console.log("\n" + "━".repeat(72));
  console.log(`🔎 Scenario: ${name}`);
  console.log("━".repeat(72));

  try {
    const result = await searchResourcesNode(state);
    const resources = result.searchResults ?? [];

    console.log(
      `✅ Found ${resources.length} resources (query: ${result.searchQuery})`
    );

    if (!resources.length) {
      console.log(
        "⚠️  No resources returned. Ensure OPENAI_API_KEY is set for fallback results."
      );
      return;
    }

    resources.slice(0, 5).forEach((resource, index) => {
      console.log(
        `\n${index + 1}. ${resource.title}\n   ${resource.url}\n   ${
          resource.description
        }`
      );
    });
  } catch (error) {
    console.error("❌ Scenario failed:", error);
  }
}

async function main() {
  console.log("\n" + "#".repeat(72));
  console.log("   SEARCH RESOURCES NODE - TEST HARNESS");
  console.log("#".repeat(72));

  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "\n⚠️  OPENAI_API_KEY not found. Vectorize results will be used if configured, otherwise the test may return empty arrays."
    );
  }

  for (const scenario of scenarios) {
    await runScenario(scenario);
  }

  console.log("\nDone!\n");
}

main().catch((error) => {
  console.error("\n❌ Test harness failed:", error);
  process.exit(1);
});
