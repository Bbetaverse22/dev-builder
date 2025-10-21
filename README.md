# 🚀 DevBuilder: AI-Powered Developer Career Growth

An **agentic AI platform** that helps developers identify skill gaps and improve their portfolios through deep research and autonomous actions. Unlike traditional generative AI that just produces reports, DevBuilder **takes action**: analyzing GitHub repositories, creating improvement tasks, and providing personalized learning paths.

## 🎯 V1 Vision: Research + Action

DevBuilder V1 focuses on two core innovations:
1. **AI-Powered Analysis**: Agentic skill gap detection using GPT-4o for deep code and README analysis
2. **Autonomous Actions**: GitHub integration that creates issues, generates templates, and tracks progress

Built with advanced AI agents for intelligent career development and portfolio improvement.

## ✨ V1 Features

### 🧠 Agentic Skill Analyzer
- **Multi-Stage Analysis**: Automatically profiles GitHub repos, detects tech stack, and generates skill gaps
- **Learning Intelligence**: Surfaces curated resources with the current research pipeline
- **Persistent Memory**: Stores skill profiles for continuous tracking and improvement

### 🤖 Portfolio Builder Agent
- **Autonomous Improvement Loop**: Analyzes portfolio weaknesses and creates actionable tasks
- **GitHub Integration**: Creates GitHub issues with prioritized action steps
- **Template & PR Automation**: Extracts production-ready examples, saves them in `examples/generated/`, and can open a GitHub branch + PR via `/api/templates`
- **README Guidance**: Highlights documentation gaps and suggests next actions

### 🔗 Tool Integrations
- **GitHub REST API**: Repository analysis, issue creation, and optional template PR automation
- **Template Creator MCP**: Custom MCP server for extracting reusable code templates with worthiness scoring
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
   
   # GitHub MCP Server URL (for MCP integration)
   # For production: https://your-app.vercel.app/api/github-mcp
   # For local dev: http://localhost:3000/api/github-mcp
   GITHUB_MCP_SERVER_URL=http://localhost:3000/api/github-mcp
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

## 📖 How to Use

1. **Navigate to Skill Gap Analysis**
   - Go to `http://localhost:3000/agentic/skill-gaps`

2. **Analyze Your Repository**
   - Enter your GitHub repository URL (e.g., `https://github.com/username/repo`)
   - Add target role (e.g., "Full-Stack Developer", "Data Engineer")
   - Click "Start Analysis"

3. **Review Results**
   - **Skill Gaps**: See technical skills you're missing with AI-powered insights
   - **Portfolio Builder**: View improvement recommendations at `/agentic/portfolio`
   - **Learning Resources**: Access curated resources at `/agentic/learning`

4. **Take Action**
   - Create GitHub issues directly from the Portfolio Builder page
   - Generate code templates from example repositories

That's it! The AI agents will handle the rest automatically.

### Optional: Template Workflow / PR Automation
1. Ensure you have a GitHub PAT with `repo` scope set as `GITHUB_TOKEN` in `.env.local`.
2. In the Analyzer UI, expand the **Research Results** panel and either:
   - Click **Generate Template** on a suggested GitHub example, or
   - Paste any GitHub repo URL into the manual template form.
3. Review generated files under `examples/generated/<slug>-<timestamp>/`.
4. Use **Create Pull Request** to let `/api/templates` create a branch + PR automatically, or follow the provided git commands manually.
5. Generated examples are ignored by git (`examples/generated/` is in `.gitignore`).

## 💡 How It Works: The Agentic Loop

### Phase 1: Deep Analysis
1. **GitHub Profiling**: Analyzes your repositories, tech stack, and coding patterns
2. **Role Detection**: Automatically determines if you're a backend dev, data engineer, DevOps, etc.
3. **Skill Gap Identification**: Compares your current skills vs. market demands

### Phase 2: Research & Planning
1. **Learning Resource Discovery**: Current LangGraph research node surfaces courses, docs, and tutorials
2. **Priority Ranking**: Determines which skills have highest ROI using LLM reasoning

### Phase 3: Autonomous Action (Portfolio Builder)
1. **Weakness Detection**: Identifies repos needing improvement (missing READMEs, tests, docs)
2. **Task Generation**: Creates GitHub issues with specific improvement steps
3. **README Drafting (Planned)**: Template-based drafting is under development



## 🔧 Advanced Configuration

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

### Tool Integration Architecture

DevBuilder uses standardized tool integrations for external services:

**GitHub API Integration** (Built-in):
- Repository analysis and profiling
- Issue creation for portfolio improvements
- README generation and documentation
- Progress tracking via GitHub API

**Extensible Design**:
- Add custom tools and integrations
- Standardized interface for easy integration

### Agent Workflow Architecture

The system uses advanced workflow management:
- **State Management**: Tracks analysis progress, goals, and actions across pages
- **Conditional Routing**: Decides next steps based on current state
- **Human-in-the-Loop**: Optional approval gates for GitHub actions
- **Retry Logic**: Handles API failures and rate limits gracefully
- **Fallback Strategy**: 5-layer fallback ensures graceful degradation (AI → heuristic → cached → minimal → error)

## 🏗️ Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS + shadcn/ui**: Beautiful, accessible components
- **React**: UI library

### Backend & AI
- **AI SDK 4 (Vercel)**: Agentic skill gap analysis with structured outputs
- **LangGraph**: Autonomous research agent workflows with state management
- **OpenAI GPT-4o**: Language model for code analysis and recommendations
- **Prisma ORM**: Type-safe database access with PostgreSQL
- **NextAuth.js**: Authentication with GitHub OAuth (planned)

### Database & Storage
- **Prisma Postgres**: Serverless PostgreSQL managed via Vercel
- **Free Tier**: 5 GB storage, 10k queries/day, no credit card required
- **11 Data Models**: Users, skill gaps, technologies, recommendations, research results, GitHub issues

### Integrations
- **GitHub REST API**: Repository analysis, issue creation, profile enhancement
- **LangGraph Platform**: Visual agent development and debugging
- **MCP Servers**: Custom Model Context Protocol servers for template extraction

## 🗺️ Roadmap

### ✅ V1 (Capstone - Current)
**Focus**: AI-Powered Analysis + Autonomous Actions
- ✅ Agentic Gap Analyzer with AI SDK (GPT-4o for code & README analysis)
- ✅ 5-layer fallback strategy (AI → heuristic → cached → minimal → error)
- ✅ LangGraph Research Agent (autonomous learning resource discovery)
- ✅ Database schema and migrations (Prisma Postgres)
- ✅ Portfolio Builder Agent (quality scoring, GitHub issue creation, template automation)
- ✅ Skill-specific AI insights with soft skills filtering
- ✅ Shared state management across analysis pages
- ✅ Template extraction and PR automation

**Status**: Core features complete and operational

### 🔮 V2 (Future Enhancements)
**Focus**: Scale and intelligence
- Multi-user support with NextAuth.js
- Advanced tool integrations (code quality analyzers, CI/CD)
- ML-powered skill matching and recommendations
- Community features (share learning paths, compare portfolios)
- Mobile app

## 📚 Key Documentation

- **`docs/QUICK_START.md`**: Quick setup guide for developers
- **`docs/CAPSTONE_PROPOSAL.md`**: Complete project vision and academic context
- **`docs/V1_DEVELOPMENT_PLAN.md`**: Development roadmap and issues breakdown
- **`docs/AGENTIC_IMPLEMENTATION_SUMMARY.md`**: Current agentic architecture overview
- **`docs/CLAUDE.md`**: AI assistant guidance for working with this codebase
- **`project-docs/`**: Detailed agent documentation and data flow diagrams

## 🤝 Contributing

This is a capstone project, but feedback and suggestions are welcome! For V2 and beyond, contributions will be encouraged.

---

**Built with ❤️ for developers who want to level up their careers through AI-powered insights and autonomous portfolio improvement.**
