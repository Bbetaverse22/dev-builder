/**
 * End-to-End Test for Research Agent
 *
 * Tests the complete LangGraph workflow:
 * load_state → search → search_github → evaluate → synthesize
 */

import { config } from "dotenv";
import { graph } from "./lib/agents/langgraph/research-agent";
import type { ResearchState } from "./lib/agents/langgraph/research-agent";

config({ path: ".env.local" });

interface TestScenario {
  name: string;
  input: ResearchState;
}

const scenarios: TestScenario[] = [
  {
    name: "React Testing with Jest",
    input: {
      skillGap: "React testing with Jest and React Testing Library",
      detectedLanguage: "TypeScript",
      userContext: "Need to improve testing skills for React components. Currently writing no tests.",
      iterationCount: 0,
      focusSkills: [
        { name: "Jest", gap: 4, priority: 5 },
        { name: "React Testing Library", gap: 4, priority: 5 },
      ],
      learningObjectives: [
        "Write unit tests for React components",
        "Test user interactions",
        "Mock API calls in tests",
      ],
    },
  },
];

async function runTest(scenario: TestScenario) {
  console.log("\n" + "=".repeat(80));
  console.log(`🧪 Test: ${scenario.name}`);
  console.log("=".repeat(80));
  console.log("\nInput:");
  console.log(`  Skill gap: ${scenario.input.skillGap}`);
  console.log(`  Language: ${scenario.input.detectedLanguage}`);
  console.log(`  Context: ${scenario.input.userContext}`);

  try {
    console.log("\n🚀 Starting research agent workflow...\n");

    const startTime = Date.now();

    // Run the graph
    const result = await graph.invoke(scenario.input as any) as ResearchState;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "─".repeat(80));
    console.log("✅ Workflow Complete");
    console.log("─".repeat(80));
    console.log(`\n⏱️  Duration: ${duration}s`);

    // Display results
    console.log("\n📊 Results Summary:");
    console.log(`  Resources found: ${result.searchResults?.length ?? 0}`);
    console.log(`  Evaluated resources: ${result.evaluatedResults?.length ?? 0}`);
    console.log(`  GitHub examples: ${result.examples?.length ?? 0}`);
    console.log(`  Confidence: ${((result.confidence ?? 0) * 100).toFixed(0)}%`);
    console.log(`  Recommendations: ${result.recommendations?.length ?? 0}`);

    // Show top 3 resources
    if (result.evaluatedResults && result.evaluatedResults.length > 0) {
      console.log("\n📚 Top 3 Learning Resources:");
      result.evaluatedResults.slice(0, 3).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   Score: ${r.score.toFixed(2)} | Rating: ${"⭐".repeat(r.rating ?? 0)}`);
        console.log(`   URL: ${r.url}`);
        console.log(`   ${r.description.slice(0, 120)}...`);
      });
    }

    // Show top 3 GitHub examples
    if (result.examples && result.examples.length > 0) {
      console.log("\n🔧 Top 3 GitHub Examples:");
      result.examples.slice(0, 3).forEach((e, i) => {
        console.log(`\n${i + 1}. ${e.name} (⭐ ${e.stars})`);
        console.log(`   ${e.url}`);
        console.log(`   ${e.description.slice(0, 120)}...`);
      });
    }

    // Show recommendations
    if (result.recommendations && result.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");

      const highPriority = result.recommendations.filter(r => r.priority === "high");
      const mediumPriority = result.recommendations.filter(r => r.priority === "medium");
      const lowPriority = result.recommendations.filter(r => r.priority === "low");

      if (highPriority.length > 0) {
        console.log("\n  🔴 High Priority:");
        highPriority.forEach((r, i) => {
          console.log(`    ${i + 1}. [${r.type}] ${r.title}`);
          console.log(`       ${r.description}`);
          if (r.url) console.log(`       ${r.url}`);
        });
      }

      if (mediumPriority.length > 0) {
        console.log("\n  🟡 Medium Priority:");
        mediumPriority.forEach((r, i) => {
          console.log(`    ${i + 1}. [${r.type}] ${r.title}`);
          console.log(`       ${r.description}`);
          if (r.url) console.log(`       ${r.url}`);
        });
      }

      if (lowPriority.length > 0) {
        console.log("\n  🟢 Low Priority:");
        lowPriority.forEach((r, i) => {
          console.log(`    ${i + 1}. [${r.type}] ${r.title}`);
          console.log(`       ${r.description.slice(0, 80)}...`);
        });
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Test passed successfully!");
    console.log("=".repeat(80) + "\n");

    return result;
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  }
}

async function main() {
  console.log("\n" + "#".repeat(80));
  console.log("  RESEARCH AGENT - END-TO-END TEST");
  console.log("#".repeat(80));

  if (!process.env.OPENAI_API_KEY) {
    console.error("\n⚠️  OPENAI_API_KEY not found in .env.local");
    process.exit(1);
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    console.warn("\n⚠️  FIRECRAWL_API_KEY not found. Will use LLM fallback only.");
  }

  if (!process.env.GITHUB_TOKEN) {
    console.warn("\n⚠️  GITHUB_TOKEN not found. GitHub examples may be limited.");
  }

  for (const scenario of scenarios) {
    await runTest(scenario);
  }

  console.log("✅ All tests completed!\n");
}

main().catch((error) => {
  console.error("\n❌ Test suite failed:", error);
  process.exit(1);
});
