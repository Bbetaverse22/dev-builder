# DevBuilder · AI-Powered Developer Career Copilot

An agentic AI platform that helps developers identify skill gaps and improve their portfolios through deep research and autonomous actions. Unlike traditional generative AI that just produces reports, DevBuilder takes action: analyzing GitHub repositories, creating improvement tasks, and providing personalized learning paths.

  ---

  ## Table of Contents
  1. [Core Capabilities](#core-capabilities)
  2. [Architecture Overview](#architecture-overview)
  3. [Local Quick Start](#local-quick-start)
  4. [Environment Variables](#environment-variables)
  5. [Running in Production](#running-in-production)
  6. [Product Tour](#product-tour)
  7. [Troubleshooting](#troubleshooting)
  8. [Roadmap](#roadmap)
  9. [Reference Docs](#reference-docs)

  ---

  ## Core Capabilities
  - **Agentic Skill Analyzer** – multi-stage GitHub profiling, GPT-4o code review, persistent skill history.
  - **Autonomous Portfolio Builder** – prioritised improvements, issue creation, template extraction, PR scaffolding.
  - **Learning Intelligence** – LangGraph research agent finds courses, docs, GitHub exemplars, and a sequenced
  learning path.
  - **Observability** – live agent logs, reminders when data is cached, five-layer fallback to keep the app useful
  under rate limits.
  - **Modern Stack** – Next.js 15, TypeScript, shadcn/ui, Prisma on Postgres, Vercel AI SDK, LangGraph.

  ---

  ## Architecture Overview
  | Layer            | Notes |
  |------------------|-------|
  | **UI**           | Next.js App Router, shadcn/ui, Tailwind, shared analysis context. |
  | **Agents**       | Vercel AI SDK for repo analysis; LangGraph handles research/recommendations. |
  | **Persistence**  | Prisma + Postgres store users, skill gaps, recommendations, research cache. |
  | **Integrations** | GitHub REST, Firecrawl, OpenAI, MCP template extractor. |

  ---

  ## Local Quick Start
  **Prerequisites**
  - Node.js 18+ (nvm recommended)
  - pnpm 8+
  - PostgreSQL database (local or managed)
  - API keys: `OPENAI_API_KEY`, GitHub PAT (`repo` scope) and optionally `FIRECRAWL_API_KEY`

  ```bash
  git clone https://github.com/Bbetaverse22/skillbridge-agents.git
  cd skillbridge-agents
  pnpm install
  cp .env.example .env.local
  pnpm prisma generate
  pnpm prisma db push         # or migrate dev --name init
  pnpm dev                    # UI at http://localhost:3000
  pnpm langgraph:dev          # optional: LangGraph UI at http://localhost:2024
  ```
  ———

  ## Environment Variables

  | Key | Required | Description |
  |-----|----------|-------------|
  | OPENAI_API_KEY | ✅ | Used for GPT-4o (analysis) and research fallback. |
  | OPENAI_RESEARCH_MODEL | ➖ (defaults to gpt-4o-mini) | Ensure it’s a supported model name. |
  | DATABASE_URL / POSTGRES_URL_NON_POOLING | ✅ | Direct Postgres connection for Prisma. |
  | PRISMA_DATABASE_URL | ✅ when using Prisma Accelerate | prisma+postgres:// connection string. |
  | DIRECT_URL | ➖ | Optional direct connection for migrations. |
  | GITHUB_TOKEN | ➖ (strongly recommended) | Higher GitHub rate limits + issue/PR creation. |
  | NEXTAUTH_*, GITHUB_CLIENT_ID/SECRET | Planned | Only needed once auth features land. |
  | FIRECRAWL_API_KEY | ➖ | Enables richer web research; otherwise LLM fallback only. |
  | MCP_SERVER_URL | ➖ | Points to template MCP endpoint. |
  |GITHUB_MCP_SERVER_URL | ➖ | Points to official Github MCP server. |

  Copy the keys into .env.local for dev, 
  Vercel → Project Settings → Environment Variables for production.

  ———

  ## Running in Production

  1. Provision Postgres (Vercel Postgres or your provider) and paste connection strings into Vercel envs
     (POSTGRES_URL_NON_POOLING, DATABASE_URL, DIRECT_URL).
  2. Set API Keys – OPENAI_API_KEY, FIRECRAWL_API_KEY, GITHUB_TOKEN etc.
  3. Deploy

     vercel                 # preview
     vercel --prod          # production
  4. After deploy, initialise schema once:

     DATABASE_URL="postgres://..." pnpm prisma db push
  5. Verify the app by running a Skill Gap analysis and watching /api/research logs in Vercel.

  ———

  ## Product Tour

  | Page | What happens |
  |------|--------------|
  | /agentic/skill-gaps | Upload repo URL → AI profiler, LangGraph research, portfolio planner. |
  | /agentic/portfolio | See improvement tasks, auto-generate GitHub issues |
  | /agentic/learning | Curated resources, GitHub exemplars, comparative insights, sequenced learning path. |
  | /agentic/templates | Browse saved code templates (generated via MCP). |

  Each run persists to Postgres so you can revisit results later.

  ———

  ## Troubleshooting

  - No learning resources → Check /api/research response diagnostics. Ensure OPENAI_API_KEY is present and
    OPENAI_RESEARCH_MODEL is valid (gpt-4o-mini, gpt-4o, etc.). Firecrawl key boosts coverage.
  - 503 “database unavailable” → Confirm DATABASE_URL resolves from the deployed runtime; fallbacks in lib/db.ts
    expect the POSTGRES_* vars.
  - LangGraph returns cached state → Clear local storage via the “Clear Cache” button or call /api/research with
    { forceRefresh: true }.
  - GitHub issue creation fails → Verify GITHUB_TOKEN has repo scope and the repo allows issues.

  ———

  ## Roadmap (High-Level)

  - Current (V1) – Skill analysis, research agent, portfolio automation, template extraction complete.
  - Next – Multi-user auth, deeper CI/CD integrations, smarter matching, social sharing, mobile companion.

  ———

  ## Reference Docs

  - docs/QUICK_START.md – detailed setup walkthrough.
  - docs/V1_DEVELOPMENT_PLAN.md – end-to-end capstone plan.
  - docs/AGENTIC_IMPLEMENTATION_SUMMARY.md – agent architecture.
  - docs/CAPSTONE_PROPOSAL.md – project vision.
  - project-docs/ – flow diagrams, research notes.

  ———

  Built with ❤️ to help developers level up through actionable AI insights.
