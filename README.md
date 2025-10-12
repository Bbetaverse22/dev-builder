# 🚀 DevBuilder: AI-Powered Developer Career Growth

An **agentic AI platform** that helps developers identify skill gaps and improve their portfolios through deep research and autonomous actions. Unlike traditional generative AI that just produces reports, DevBuilder **takes action**: analyzing GitHub profiles, creating improvement tasks, and continuously monitoring progress.

## 🎯 V1 Vision: Research + Action

DevBuilder V1 focuses on two core innovations:
1. **Deep Research**: Real-time web scraping for job requirements, salary trends, and learning resources
2. **Autonomous Actions**: GitHub integration that creates issues, drafts improvements, and tracks progress

Built with advanced AI agents for intelligent career development and portfolio improvement.

## ✨ V1 Features

### 🧠 Agentic Skill Analyzer
- **Multi-Stage Analysis**: Automatically profiles GitHub repos, detects tech stack, and generates skill gaps
- **Career Research (Planned)**: Upcoming web research for job boards, salary trends, and learning resources
- **Learning Intelligence**: Surfaces curated resources with the current research pipeline
- **Persistent Memory**: Stores skill profiles for continuous tracking and improvement

### 🤖 Portfolio Builder Agent
- **Autonomous Improvement Loop**: Analyzes portfolio weaknesses and creates actionable tasks
- **GitHub Integration**: Creates GitHub issues with prioritized action steps
- **README Guidance**: Highlights documentation gaps and suggests next actions
- **Progress Monitoring (Planned)**: Upcoming tracking for completion and portfolio improvements

### 🔗 Tool Integrations
- **GitHub REST API**: Repository analysis and issue creation (no MCP/Docker required)
- **Template Creator MCP**: Custom MCP server for extracting reusable code templates
- **Extensible Architecture**: Designed for additional tools like web research MCPs

### 🎨 Modern UI
- **Single Tab Focus**: Clean, action-oriented interface for skill analysis
- **Real-Time Updates**: Live agent status and action logs
- **Visual Progress**: Skill radar charts and improvement tracking
- **TypeScript + Next.js**: Full-stack type safety with shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: use nvm)
- pnpm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Bbetaverse22/skillbridge-agents.git
   cd skillbridge-agents
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your API keys:
   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key_here

   # Database (Prisma Postgres)
   DATABASE_URL=your_postgres_connection_url

   # GitHub OAuth (for upcoming multi-user support)
   GITHUB_CLIENT_ID=your_github_oauth_client_id
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
   NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
   NEXTAUTH_URL=http://localhost:3000

   # Optional - increases GitHub API rate limits
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

4. **Set up database**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Run migrations (after setting up Vercel Postgres)
   npx prisma migrate dev --name init
   ```

5. **Start development servers**

   **Option A: Next.js only**
   ```bash
   pnpm dev
   ```

   **Option B: Next.js + LangGraph Platform (recommended for development)**
   ```bash
   # Terminal 1: Start Next.js
   pnpm dev

   # Terminal 2: Start LangGraph Platform
   pnpm langgraph:dev
   ```

6. **Open your browser**
   - Next.js App: http://localhost:3000
   - LangGraph Platform: http://localhost:2024 (if running)

## 💡 How It Works: The Agentic Loop

### Phase 1: Deep Analysis
1. **GitHub Profiling**: Analyzes your repositories, tech stack, and coding patterns
2. **Role Detection**: Automatically determines if you're a backend dev, data engineer, DevOps, etc.
3. **Skill Gap Identification**: Compares your current skills vs. market demands
4. **Market Intelligence (Planned)**: Future integration will monitor job postings for required skills

### Phase 2: Research & Planning
1. **Job Market Research (Planned)**: LinkedIn, Indeed, and AngelList scrapers are on the roadmap
2. **Salary Analysis (Planned)**: Compensation insights slated for a later release
3. **Learning Resource Discovery**: Current LangGraph research node surfaces courses, docs, and tutorials
4. **Priority Ranking**: Determines which skills have highest ROI using LLM reasoning

### Phase 3: Autonomous Action (Portfolio Builder)
1. **Weakness Detection**: Identifies repos needing improvement (missing READMEs, tests, docs)
2. **Task Generation**: Creates GitHub issues with specific improvement steps
3. **README Drafting (Planned)**: Template-based drafting is under development
4. **Progress Monitoring (Planned)**: Upcoming dashboards for issue completion and quality tracking

### Phase 4: Continuous Loop
- **Weekly Check-ins (Planned)**: Automated re-analysis to measure progress
- **Adaptive Planning**: Adjusts recommendations based on completed tasks
- **New Opportunities (Planned)**: Future updates will highlight trending technologies and skills

## 🔧 Configuration

### Database Setup (Prisma Postgres Free Tier)

DevBuilder uses **Prisma Postgres** for data persistence:

**Free Tier Includes:**
- ✅ 5 GB storage (supports 1000s of skill gap analyses)
- ✅ 10k queries/day
- ✅ **No credit card required**
- ✅ Perfect for V1 + early production

**Setup (2 minutes):**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Create Database** → **Prisma Postgres**
3. Select **Free Tier**
4. Copy the `DATABASE_URL` connection string to `.env.local`
5. Run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

**That's it!** No payment info needed.

### LangGraph Research Agent

DevBuilder uses **LangGraph** for autonomous research workflows:

**What it does:**
- Searches for learning resources based on skill gaps
- Evaluates resource quality and relevance
- Finds GitHub example projects
- Makes autonomous decisions to retry searches if confidence is low
- Synthesizes recommendations for Portfolio Builder

**Running LangGraph Platform:**

LangGraph Platform provides a visual interface to develop, test, and debug your agent workflows.

```bash
# Start LangGraph development server (with UI at http://localhost:2024)
pnpm langgraph:dev

# Or run in background
pnpm langgraph:up
```

**Features:**
- 🎨 Visual graph editor and inspector
- 🐛 Step-by-step debugging
- 📊 Real-time execution traces
- 🔄 Hot reloading on code changes
- 🧪 Test with different inputs

The research agent is defined in `lib/agents/langgraph/research-agent.ts` and configured in `langgraph.json`.

### Environment Variables

**Required for V1:**
```env
# AI Model Access
OPENAI_API_KEY=your_openai_api_key_here

# Database (Prisma Postgres)
DATABASE_URL=your_postgres_connection_url

# GitHub OAuth (planned multi-user authentication)
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

**Optional:**
```env
# GitHub Personal Access Token (increases API rate limits)
GITHUB_TOKEN=your_github_personal_access_token_here
```

**How to get GitHub OAuth credentials (optional until NextAuth integration ships):**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/github/callback`
3. Copy Client ID and Client Secret to `.env.local`

**How to get a GitHub Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with these scopes:
   - `repo` (full control for creating issues/PRs)
   - `read:user` (for profile analysis)
3. Add to `.env.local` as `GITHUB_TOKEN`

### Tool Integration Architecture

DevBuilder V1 uses standardized tool integrations for external services:

**GitHub API Integration** (Built-in):
- Repository analysis and profiling
- Issue creation for portfolio improvements
- README generation and documentation
- Progress tracking via GitHub API

**Web Research Integration** (Planned):
- Job board scraping (LinkedIn, Indeed, AngelList)
- Salary data aggregation
- Learning resource discovery
- Market trend analysis

**Extensible Design**:
- Add custom tools and integrations
- Standardized interface for easy integration
- See `lib/agents/coordinator.ts` for tool definitions

### Agent Workflow Architecture

The Portfolio Builder Agent uses advanced workflow management:
- **State Management**: Tracks analysis progress, goals, and actions
- **Conditional Routing**: Decides next steps based on current state
- **Human-in-the-Loop**: Optional approval gates for GitHub actions
- **Retry Logic**: Handles API failures and rate limits gracefully

See `V1_DEVELOPMENT_PLAN.md` for implementation roadmap.

## 🏗️ Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS + shadcn/ui**: Beautiful, accessible components
- **React**: UI library

### Backend & AI
- **AI SDK 5 (Vercel)**: Streamable AI responses and tool calling
- **LangGraph**: Autonomous agent workflows with state management and decision loops
- **OpenAI GPT-4**: Language model for analysis and generation
- **Prisma ORM**: Type-safe database access with PostgreSQL
- **NextAuth.js**: Authentication with GitHub OAuth

### Database & Storage
- **Prisma Postgres**: Serverless PostgreSQL managed via Vercel
- **Free Tier**: 5 GB storage, 10k queries/day, no credit card required
- **11 Data Models**: Users, skill gaps, technologies, recommendations, research results, GitHub issues

### Integrations
- **GitHub REST API**: Repository analysis, issue creation, profile enhancement
- **Web Scraping**: Job boards, salary data, learning resources (planned)
- **LangGraph Platform**: Visual agent development and debugging

## 🗺️ Roadmap

### ✅ V1 (Capstone - 3 Weeks)
**Focus**: Research + Action fundamentals
- ✅ LangGraph agent framework setup
- ✅ Database schema and migrations (Prisma Postgres)
- 🔄 GitHub OAuth integration (NextAuth wiring in progress)
- 🚧 Research agent implementation (LangGraph)
- 🚧 Portfolio Builder Agent
- 🚧 Deep career research with web scraping
- 🚧 Autonomous GitHub issue creation
- 🚧 Progress tracking and weekly check-ins

**Deliverables**: Working demo with real GitHub integration, research capabilities, and autonomous actions

**Progress**: LangGraph Platform and database are ready; GitHub authentication is next

### 🔮 V2 (Future Enhancements)
**Focus**: Scale and intelligence
- 🔄 Multi-user support with NextAuth.js (in progress)
- ✅ Database-backed persistence (Prisma Postgres - complete)
- Advanced tool integrations (LinkedIn, code quality tools)
- ML-powered skill matching
- Community features (share learning paths)
- Mobile app

## 📚 Key Documentation

- **`CAPSTONE_PROPOSAL.md`**: Complete project vision and academic context
- **`V1_DEVELOPMENT_PLAN.md`**: 25-issue breakdown for V1 implementation
- **`CLAUDE.md`**: Session context and development history

## 🤝 Contributing

This is a capstone project, but feedback and suggestions are welcome! For V2 and beyond, contributions will be encouraged.
----

**Built with ❤️ for developers who want to level up their careers through AI-powered insights and autonomous portfolio improvement.**
