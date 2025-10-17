## Deep Research Implementation Status

## Completed Work
- Captured design decisions for deep research upgrade (Steps 1-7 summarized below).
- Installed `@mendable/firecrawl-js@4.4.1`.
- Backed up current LangGraph implementation to `lib/agents/langgraph_backup_pre_deep_research`.

## Design Decisions (Summary)
1. **Goals & Constraints**
   - Outputs: richer summaries, comparisons, learning path, confidence breakdown.
   - Focus on deep dives from web sources only; keep costs/latency reasonable.
   - Results surfaced via new research results UI; persist artifacts briefly for reuse.

2. **State & Data**
   - Extend `ResearchState` with `searchIterations`, `searchNotes`, `scrapedResources`, `comparativeInsights`, `learningPath`, `confidenceBreakdown`.
   - Enforce caps (max 5 scraped docs, summaries ≤ 600 chars, etc.).

3. **Search Orchestration**
   - Pass 1 (general Firecrawl), Pass 2 (GitHub category), optional Pass 3 via LLM-generated queries.
   - Deduplicate URLs, log iteration results, early stop when target count met.

4. **Scrape & Summarize**
   - Firecrawl `scrape` for top resources (markdown only), cap snippet size.
   - Summaries via lightweight OpenAI prompt → `{ summary, keyPoints, recommendedAudience }`.

5. **Reasoning Layer**
   - Comparative insights from summarized data (short LLM prompts).
   - Learning path sequenced by difficulty; up to 6 steps.
   - Confidence breakdown derived from evaluation metrics.

6. **Persistence**
   - Cache enriched payload (with TTL ~24h) via Prisma `ResearchResult` or new table.
   - Allow `forceRefresh` to bypass cache.

7. **Testing & Observability**
   - Unit tests with mocked Firecrawl/LLM; integration snapshot of final payload.
   - Structured iteration logs, counters for Firecrawl/LLM usage; feature flag toggle.

## Pending Implementation Tasks
1. Update LangGraph nodes per plan:
   - Multi-pass search + iteration logging
   - Scraping/summarization pipeline
   - Comparative insights & learning path generation
   - Confidence breakdown output
2. Extend persistence layer for short-lived deep research payloads (TTL logic).
3. Update API response to expose new fields for research UI.
4. Add tests/mocks and enhanced logging.

## Next Session Starting Point
- Begin modifying `lib/agents/langgraph/research-agent.ts` and `nodes/search-resources.ts` to incorporate new state fields and multi-pass search logic.
- Implement scraping/summarization helpers.
- Integrate new outputs into synthesis node.
