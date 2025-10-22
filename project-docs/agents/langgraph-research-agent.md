## LangGraph Research Agent Overview

This agent compiles a LangGraph state machine that researches learning resources for a specific skill gap, evaluates quality, and synthesizes actionable recommendations.

## Workflow
- Initializes a `StateGraph<ResearchState>` with channels for user context, search results, evaluation scores, GitHub examples, and recommendation outputs.
- Executes nodes in sequence:
  - `load_state`: hydrate the latest run (unless callers set `forceRefresh` to skip cached state).
  - `search`: perform general web/resource discovery via Firecrawl when available, with an OpenAI fallback that still returns resources in offline runs.
  - `search_github`: mine GitHub examples associated with the target skill; safely falls back to language-based queries when the skill gap text is missing.
  - Conditional branch: loop back to `search` if examples are insufficient and iterations remain, otherwise move forward.
  - `evaluate`: score resources using heuristics or LLM judgement.
  - `synthesize`: assemble recommendations, action plan, and market signals for delivery.
- Terminates at `END` with a compiled set of recommendations, examples, and confidence estimates.

## Effectiveness Assessment
- LangGraph channels keep state merges deterministic, enabling parallel node development without race conditions.
- Conditional looping prevents premature synthesis when the search space is empty while still capping iterations, with the iteration counter tracking the most recent pass instead of accumulating intermediate steps.
- Division of responsibilities into nodes (`search-resources`, `evaluate-quality`, etc.) makes it easy to swap implementations or call external services.
- Integration points (e.g., GitHub examples) create a clean bridge to the portfolio builder and other downstream services.

## Optimization Opportunities
- **Iteration Control:** Track separate counters for resource and example searches to avoid re-running the same queries.
- **State Persistence:** Persist the compiled graph state for reuse across sessions rather than relying on the loader node alone; remember `forceRefresh` bypasses cached state for fully fresh runs.
- **Observability:** Add structured logging or tracing around node transitions for debugging complex research flows.
- **Node Parallelism:** Execute `search` and `search_github` in parallel when the infrastructure supports concurrency.
- **QA Feedback Loop:** Feed evaluation scores back into future search queries to refine relevance.

## De-Scoping Considerations
- Removing the research agent would drop automated learning recommendations; downstream agents would require manual resource curation.
- If LangGraph becomes too heavy, the node logic could be reimplemented as a simpler promise chain, but at the cost of clear state management and branching control.
