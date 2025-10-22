# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillBridge.ai is an AI-powered skill gap analysis and portfolio improvement platform that uses autonomous agents to analyze GitHub repositories, identify skill gaps, and provide personalized learning paths.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production app with Turbopack
- `pnpm start` - Start production server
- `pnpm tsc --noEmit` - Run TypeScript compiler to check for type errors
- `pnpm db:view` - View database contents
- `pnpm db:studio` - Open Prisma Studio GUI
- `pnpm prisma generate` - Regenerate Prisma client
- `pnpm prisma db push` - Sync schema to database

## Code Quality

**IMPORTANT**: Always run `pnpm tsc --noEmit` after writing or modifying any code to ensure there are no TypeScript errors before considering the task complete.

## Package Manager

This project strictly uses **pnpm**. Do not use npm or yarn.

## Architecture

### Core Stack
- **Next.js 15** with App Router
- **Vercel AI SDK 4** with OpenAI GPT-4o integration
- **LangChain/LangGraph** for complex multi-agent workflows (Research Agent)
- **Prisma ORM** with PostgreSQL database
- **shadcn/ui** components (New York style, slate base color)
- **Tailwind CSS v4** for styling

### Key Directories
- `app/` - Next.js App Router pages and API routes
  - `app/agentic/skill-gaps/` - Main skill gap analysis UI
  - `app/agentic/portfolio/` - Portfolio improvement recommendations
  - `app/agentic/learning/` - Learning resources display
  - `app/api/gap-analysis/` - Agentic skill gap analysis endpoint
  - `app/api/skill-gaps/` - Legacy skill gap analysis endpoint
  - `app/api/portfolio-builder/` - Portfolio improvement endpoint
  - `app/api/research/` - Research agent endpoint (LangGraph)
  - `app/api/templates/` - Template generation endpoint
- `lib/agents/` - AI agent implementations
  - `gap-analyzer.ts` - **AGENTIC** GitHub repository analysis using AI SDK
  - `portfolio-builder.ts` - **HEURISTIC** portfolio quality analysis
  - `langgraph/research-agent.ts` - **LANGGRAPH** autonomous research workflow
- `lib/github/github-client.ts` - GitHub API client (REST)
- `lib/mcp/template-creator/` - MCP server for template extraction
- `lib/storage/` - Prisma database operations
- `lib/contexts/analysis-context.tsx` - Shared state management across pages
- `components/ui/` - shadcn/ui components
- `components/devbuilder/` - Custom DevBuilder components
  - `agentic-skill-analyzer.tsx` - Main analysis component
  - `interactive-skill-card.tsx` - Individual skill gap cards with AI insights
  - `portfolio-display.tsx` - Portfolio quality display
  - `learning-display.tsx` - Learning resources display
- `prisma/` - Database schema and migrations

### AI Integration

**Gap Analyzer (AI SDK):**
- Uses AI SDK's `generateObject()` and `generateText()` for structured analysis
- Configured for GPT-4o-mini via OpenAI provider
- Performs agentic code quality analysis, README evaluation, and recommendation generation
- 5-layer fallback strategy (AI → heuristic → cached → minimal → error)
- Requires `OPENAI_API_KEY` in `.env.local`

**Research Agent (LangGraph):**
- Uses LangChain/LangGraph for complex multi-step workflows
- Autonomous research with state management and retry logic
- Web search, quality evaluation, and synthesis nodes
- Requires `OPENAI_API_KEY` in `.env.local`

### GitHub Integration
- GitHub REST API client for repository analysis
- Authenticated requests using `GITHUB_TOKEN`
- Rate limit: 5000 requests/hour (authenticated) vs 60/hour (unauthenticated)
- Features: repository data, file content, issue creation, PR automation

### Database
- PostgreSQL with Prisma ORM
- 11 models: User, Session, SkillGapAnalysis, SkillGap, PortfolioAnalysis, PortfolioAction, ResearchResult, GitHubExample, Template, etc.
- Type-safe database access throughout the application

### UI Components
- **shadcn/ui** configured with:
  - New York style
  - Slate base color with CSS variables
  - Import aliases: `@/components`, `@/lib`, `@/components/ui`
  - Lucide React for icons
- **Custom DevBuilder Components**:
  - Glowing card effects with theme-based gradients
  - Skill radar charts
  - Interactive skill gap cards with AI insights
  - Agent progress timelines
  - Multi-agent workflow visualization

### Adding Components
- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- Always use `cn()` utility from `lib/utils.ts` for className merging

## Environment Setup

Create `.env.local` with:
```
# AI
OPENAI_API_KEY=your_openai_api_key_here

# GitHub
GITHUB_TOKEN=your_github_personal_access_token

# Database
DATABASE_URL=your_postgresql_connection_string

# NextAuth (optional, for future authentication)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## Architecture Principles

1. **Agentic Design**: The Gap Analyzer uses AI SDK for autonomous analysis with structured outputs
2. **Fallback Strategy**: 5-layer fallback ensures graceful degradation (AI → heuristic → cached → minimal → error)
3. **Separation of Concerns**: Gap Analyzer (agentic AI), Portfolio Builder (heuristic), Research Agent (LangGraph)
4. **Type Safety**: Full TypeScript coverage with Prisma-generated types
5. **Shared State**: React Context (`analysis-context.tsx`) for cross-page data sharing
6. **Persistence**: localStorage for client-side caching + Prisma for server-side storage

## Important Notes

- **AI SDK vs LangGraph**: Use AI SDK for straightforward agentic tasks (Gap Analyzer), LangGraph for complex multi-step workflows with state management (Research Agent)
- **Skill-Specific Insights**: AI insights are filtered per skill using `getSkillSpecificInsights()` to ensure relevance
- **Soft Skills Filtering**: Soft skills (communication, teamwork, etc.) are excluded from technical analysis
- **GitHub Rate Limits**: Always use authenticated requests with `GITHUB_TOKEN` to avoid rate limits
- **Turbopack Caching**: Clear `.next` folder if you encounter module resolution errors
