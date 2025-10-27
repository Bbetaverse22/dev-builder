## Data Flow Overview

The platform routes user input (repository URL, target role context) through a set of server-side agents exposed via Next.js API routes. Each agent owns a specific transformation—skill assessment, research, portfolio improvement, template extraction—and exchanges typed payloads such as GitHub analyses, gap assessments, and research recommendations. Persistent state lives in Prisma-backed skill-gap tables.

### 1. Agent Activation Entry Point
1. The UI presents a single input for a GitHub repository plus optional context (target role, goals) and issues a sequence of API calls when the user clicks **Activate Agent**.
2. Typical orchestration:
   - Trigger `POST /api/gap-analysis` to assess the repository or submitted skills.
   - Persist the resulting `GitHubAnalysis` + `GapAnalysisResult` via `POST /api/skill-gaps` so subsequent steps share the same state.
   - Optionally run the LangGraph research workflow (`POST /api/research`) to gather learning resources tied to the identified gaps.
   - Invoke `POST /api/portfolio-builder` to transform assessments and research findings into prioritized remediation tasks.

### 2. Skill Gap Analysis Pipeline
1. UX flows (e.g., automatic gap analysis page) call `POST /api/gap-analysis`.
2. Depending on `action`, `GapAnalyzerAgent` either:
   - Calculates gap metrics from submitted `Skill[]` payloads, or
   - Scrapes GitHub metadata (`analyzeGitHubRepository`) to build `GitHubAnalysis`.
3. Clients that need persistence call `POST /api/skill-gaps`, which forwards the `GitHubAnalysis` + `GapAnalysisResult` to `skillGapStoragePrisma.storeSkillGap`.
4. Stored analyses become available to internal tools (e.g., `get_skill_gap_analysis`) and the research agent’s `load_state` node via `getResearchStateSeed`.

### 3. LangGraph Research Workflow
1. Learning journeys post to `POST /api/research` with the target skill gap and user context.
2. The API seeds a `ResearchState` (defaulting `forceRefresh` to `true` so each request runs a fresh search) and invokes the compiled LangGraph `graph`:
   - `load_state` pulls prior seeds from Prisma and merges them into the working state.
   - `search` queries the web for resources; `search_github` fetches GitHub examples.
   - Conditional edge loops until enough examples exist or iteration limits hit.
   - `evaluate` scores results; `synthesize` assembles recommendations, action plans, and confidence metrics.
3. The response returns evaluated resources, GitHub examples, synthesized recommendations, and the queries executed—used by the UI and portfolio builder enrichment.

### 4. Portfolio Improvement Flow
1. UI triggers `POST /api/portfolio-builder` with a `repoUrl`, optional `skillAssessment`, and optional `researchResults`.
2. `PortfolioBuilderAgent.analyzePortfolioQuality` fetches repo metadata via `GitHubClient`, inspects structure (README, tests, CI/CD, docs), and emits weaknesses, strengths, and recommendations.
3. If research output is provided, `enrichRecommendationsWithResearch` grafts relevant resources/examples; action items from the research payload become additional `PortfolioRecommendation`s.
4. Optional GitHub issue creation uses the agent’s `createImprovementIssues`, leveraging `GITHUB_TOKEN` to open issues tied to prioritized recommendations.

### 5. Template Extraction Flow
1. Template requests hit `POST /api/templates`, which proxies to the hosted Template Creator MCP service.
2. The MCP service (or the local `TemplateExampleGenerator`) verifies template-worthiness, extracts files, and returns instructions plus optional PR metadata.
3. Portfolio builder recommendations can attach these template artifacts to guide users toward concrete fixes.

### 6. Persistence & Shared State
- **Storage:** Prisma (`skillGapStoragePrisma`) stores skill gaps, technologies, gap items, recommendations, and exposes research seeds.
- **External dependencies:** GitHub REST APIs (via `GitHubClient`), LangGraph runtime, and the MCP template service.

### 7. Cross-Agent Dependencies
- `GapAnalyzerAgent` results feed `skillGapStoragePrisma` → research seed → LangGraph `load_state`.
- `Research Agent` output informs portfolio recommendations and action items.
- `PortfolioBuilderAgent` may call template extraction and GitHub issue creation, closing the loop from diagnosis to actionable fixes.
