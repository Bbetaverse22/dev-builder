# Capstone Project Progress Report

**Project:** SkillBridge.ai – Agentic Portfolio Builder  
**Reporting Window:** Week 1 & Week 2 (Oct 1 – Oct 14, 2025)  
**Prepared By:** SkillBridge.ai Engineering  
**Last Updated:** October 14, 2025

---

## 1. Executive Overview
SkillBridge.ai is delivering an end-to-end agentic workflow that:
1. Profiles a developer’s GitHub footprint and calculates skill gaps.
2. Performs research across the web and GitHub to surface targeted learning resources.
3. Generates portfolio improvement tasks, templates, and even draft pull requests.

During Weeks 1–2 we built the LangGraph research foundation, migrated storage to Prisma/Postgres, enriched Portfolio Builder output, and added a standalone template workflow with optional GitHub PR automation. Remaining work focuses on LangGraph reasoning refinements, QA, and authentication.

**Overall Confidence:** ⭐⭐⭐⭐☆ (78%)  
**Critical Risks:** LangGraph retry/ confidence backlog, authentication scope, final QA coverage

---

## 2. Timeline of Major Workstreams
| Date Range | Workstream | Achievements |
| --- | --- | --- |
| Oct 1–5 | **LangGraph Foundations** | Installed LangGraph SDK, created research state schema, added loader + search nodes, configured `langgraph.json` (see `lib/agents/langgraph/research-agent.ts`, `docs/langgraph-platform.md`). |
| Oct 6 | **Week-1 Commit (32b89a0)** | Added Prisma setup (`prisma/schema.prisma`, migrations), `.env.example`, `scripts/view-database.ts`, initial README overhaul, baseline data snapshots, V1 development plan expansion. |
| Oct 7–9 | **Template Creator MCP** | Built custom MCP server/client (`lib/mcp/template-creator/*`), integrated `create-templates` LangGraph node, documented usage. |
| Oct 10–12 | **Portfolio Builder Core** | Implemented quality scoring, weaknesses, recommendation synthesis in `lib/agents/portfolio-builder.ts`; UI renders real data; research enrichment wired through analyzer. |
| Oct 13 | **Database & API Migration** | Replaced JSON storage with Prisma Postgres (`lib/storage/skill-gap-storage-prisma.ts`), updated `/api/skill-gaps`, ensured LangGraph can hydrate state history. |
| Oct 14 | **Template Workflow + PR Automation** | Added `TemplateExampleGenerator`, `/api/templates`, Analyzer UI controls, `.gitignore` updates, framework guidance refresh, template PR flow validation. |

---

## 3. Deliverables by Area
### 3.1 Research Agent (Week 1)
- **State Management** – `ResearchState` defined with channels for inputs, search results, examples, confidence, etc. (`lib/agents/langgraph/research-agent.ts`).
- **Nodes Implemented**  
  - `load-latest-state.ts` hydrates LangGraph state from Prisma.  
  - `search-resources.ts` queries Firecrawl + OpenAI fallback to fetch resources.  
  - `search-github-examples.ts` leverages GitHub REST search for exemplar repos.  
  - `evaluate-quality.ts` scores resources using recency/ratings/quality heuristics.  
  - `synthesize-recommendations.ts` aggregates resources/examples into recommendations.  
  - `create-templates.ts` (from Issue #5c) calls Template Creator MCP for worthiness-checked template extraction.
- **Docs & Configuration** – `docs/langgraph-platform.md` guides running LangGraph Platform; `langgraph.json` captures graph metadata.

### 3.2 Portfolio Builder Agent (Weeks 1–2)
- **Quality Analysis** – `lib/agents/portfolio-builder.ts` computes overall score, strengths/weaknesses, and research-enriched recommendations.
- **Issue Template Improvements** – Markdown issue bodies contain resource lists, example repos, and framework guidance (Issue #12 completed).
- **UI Integration** – `components/devbuilder/agentic-skill-analyzer.tsx` displays analysis, tasks, template actions; `interactive-skill-card.tsx` renders severity, narratives, focus-framework badges.
- **Database Persistence** – Analyzer stores gap analyses via Prisma (`lib/storage/skill-gap-storage-prisma.ts`); `scripts/view-database.ts` assists inspection.

### 3.3 Template Workflow & Automation (Week 2)
- **Extractor Upgrades** – Template Creator MCP prioritises core folders (`src/`, `app/`, `lib/`), raises file cap to 120, and preserves business logic (`lib/mcp/template-creator/server.ts`).
- **Template Example Generator** – `lib/agents/template-example-generator.ts` extracts templates, saves to `examples/generated/`, and (optionally) opens GitHub PRs using REST API.
- **API & UI** – `/api/templates` handles preview + PR actions; Analyzer UI presents “Generate Template” and “Create Pull Request” buttons per repo/manual input. `.gitignore` excludes generated examples.
- **Framework Plan Reuse** – `lib/analysis/framework-skill-plan.ts` ensures skill guidance and portfolio recommendations share the same action plan logic.

### 3.4 Documentation & Developer Experience
- New `.env.example` with full env vars (OpenAI, Prisma Postgres, GitHub OAuth, NextAuth).  
- README rewrite covering quick start, LangGraph usage, database setup, and agentic loop.  
- `DEMO_SCRIPT.md`, `PROGRESS_SUBMISSION.md`, and expanded `V1_DEVELOPMENT_PLAN.md` to support capstone deliverables.  
- GitHub ignore rules refined for generated data and Prisma artefacts.

---

## 4. Issue Tracking Snapshot (V1 Plan)
| Status | Issues | Highlights |
| --- | --- | --- |
| ✅ Closed | #0, #1, #5a, #5b, #5c, #11, #12, #15 | LangGraph setup, Template MCP & node, Portfolio Builder enhancements, template automation, README/env updates. |
| 🔄 Active | #2–#4, #6–#10, #16 | Research state refinements, web search QA, confidence calculation, retry strategy, LangGraph integration testing, portfolio QA. |
| ⏸️ Backlog | #13, #14, #17–#51 | MCP-based issue creation (deferred), orchestration, UI polish, authentication (NextAuth), marketing assets. |

`V1_DEVELOPMENT_PLAN.md` has been updated to mark completed issues and reflect Issue #16 progress.

---

## 5. Quality Assurance & Testing
- **Manual Runs** – Analyzer executed end-to-end on real repositories (`mcp-snowflake-server`, `system-design-primer`, `skillbridge-agents`), validating skill gap output, research enrichment, portfolio tasks, and template PR creation.
- **Template PR Smoke Tests** – `/api/templates` preview + PR mode exercised using PAT with `repo` scope; resulting branches reviewed for generated README/license/runtime files.
- **Type Checking** – `pnpm exec tsc --noEmit` attempted (blocked in sandbox). Needs to be re-run locally prior to submission.
- **Database Verification** – `scripts/view-database.ts` used to confirm Prisma storage writes/reads after migrations.
- **Pending Automation** – LangGraph integration tests (Issue #10) and a regression matrix for Issue #16 are scheduled for Week 3.

---

## 6. Risk Register
| Risk | Impact | Mitigation |
| --- | --- | --- |
| LangGraph confidence/retry nodes incomplete | Reduces adaptability of research results | Prioritise Issues #6 & #9; ship heuristic fallback if full ML scoring slips. |
| Portfolio QA (Issue #16) not finished | Potential regressions in template/issue flows | Create dedicated regression repo, document runbook, capture evidence. |
| Authentication backlog (Issues #40–51) | Capstone demo may lack OAuth | Stage NextAuth schema + env setup before Week 3; coordinate demo expectations. |
| MCP issue creation (Issue #13) deferred | MCP parity gap | REST client satisfies requirements; revisit MCP once Docker access available. |

---

## 7. Upcoming Priorities (Oct 15–21)
1. **LangGraph Enhancements:** Implement `calculateConfidenceNode`, retry logic, and integration tests (Issues #6, #9, #10).
2. **Portfolio QA:** Finish Issue #16 regression plan, including repository setup, scripted runs, and documentation.
3. **Authentication Prep:** Define Prisma models for NextAuth, acquire OAuth credentials, and scaffold Next.js auth routes.
4. **UI/Polish Sprint Prep:** Draft tasks for Issues #17–#19 (Results UI, progress indicators, marketing pages).
5. **Tooling:** Run type checks & linting locally; ensure `PROGRESS_SUBMISSION.md` reflects latest artifacts.

---

## 8. Supporting Artifacts
- `V1_DEVELOPMENT_PLAN.md` – Issue-level tracking with completion dates.  
- `docs/CURRENT_STATUS_SUMMARY.md` – Rolling status snapshots for stakeholders.  
- `PORTFOLIO_BUILDER_STATUS.md` – Detailed notes on portfolio builder capabilities & API usage (updated Oct 14).  
- `docs/GITHUB_MCP_STATUS.md` – Decision log on REST vs. MCP server usage.  
- `docs/langgraph-platform.md` – Instructions for running LangGraph Platform.  
- `PROGRESS_SUBMISSION.md` – Historical progress notes from Week 1 commit.

*This report summarises the SkillBridge.ai capstone progress through October 14, 2025. All referenced code lives on branch `v1-capstone-development` and incorporates commit `32b89a0be668334ff214ee8dae001b0a372d9502` and subsequent Week 2 enhancements.*
