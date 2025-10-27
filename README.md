# DevBuilder · Agentic AI for Developer Growth

> 🎯 An agentic AI platform that analyzes your GitHub, identifies skill gaps, and creates personalized learning paths—automatically.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github)](https://github.com/Bbetaverse22/dev-builder)

[![Demo Video](https://img.shields.io/badge/▶️_Watch_Demo-Tella-FF6B6B?style=for-the-badge&logo=play&logoColor=white)](https://www.tella.tv/video/betuls-dev-builder-demo-video-1oo2)

---

## 🌐 **Live Demo Available!**

**Try DevBuilder without installing anything:**

🔗 **[https://v0-dev-builder-agents.vercel.app](https://v0-dev-builder-agents.vercel.app)**

> ⏰ **Public Testing Period:** October 28 - November 6, 2025 (10 days)  
> 📝 **No signup required** - just paste a GitHub repo URL and explore!

**Note:** This is a demo version for testing and feedback. To run it locally, follow the [Quick Start](#-quick-start-5-minutes) guide.

## ✨ What Does It Do?

Unlike traditional AI that just generates reports, DevBuilder **takes action**:

- 🔍 **Analyzes your GitHub** repositories with GPT-4o code review
- 🎯 **Identifies skill gaps** based on your code and career goals
- 📚 **Finds learning resources** tailored to your level (beginner/intermediate/advanced)
- 🚀 **Creates improvement tasks** and GitHub issues automatically
- 📈 **Tracks progress** with persistent skill history

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Bbetaverse22/dev-builder.git
cd dev-builder

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY

# 4. Start the app
pnpm dev
```

🎉 **That's it!** Open [http://localhost:3000](http://localhost:3000) and paste a GitHub repo URL to start.

> 💡 **Note**: The app works without a database for testing! Results won't be saved, but all AI features work. To enable persistence, see [Database Setup](#optional-database-setup).

---

## ⚙️ Environment Variables

### Required (Minimum Setup)
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Optional (Enhanced Features)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/devbuilder  # Save results
GITHUB_TOKEN=ghp_your_token              # Higher rate limits + issue creation
FIRECRAWL_API_KEY=fc_your_key            # Better web scraping for research
OPENAI_RESEARCH_MODEL=gpt-4o-mini        # Change AI model (default: gpt-4o-mini)
```

> 💡 **Tip**: Only `OPENAI_API_KEY` is required to try the app. Add `DATABASE_URL` if you want to save your analysis results.

---

## 📖 How to Use

1. **Go to** [http://localhost:3000/agentic](http://localhost:3000/agentic)
2. **Paste** a GitHub repository URL
3. **Click** "Activate Agent"
4. **Watch** as the AI analyzes your code, researches resources, and creates a learning path
5. **Navigate** to different tabs to see:
   - 🎯 **Skill Gaps**: Identified gaps with priority levels
   - 🚀 **Portfolio**: Auto-generated improvement tasks
   - 📚 **Learning**: Personalized resources and learning path
   - 📝 **Templates**: Code examples and templates

---

## 🎬 Demo Video

Watch a full walkthrough of DevBuilder in action (1 minute):

**[▶️ Watch Demo: DevBuilder AI in Action](https://www.tella.tv/video/betuls-dev-builder-demo-video-1oo2)**

See how DevBuilder:
- Analyzes your GitHub repository in real-time
- Identifies skill gaps with AI-powered code review
- Generates personalized learning resources
- Creates auto-generated code templates with MCP
- Builds adaptive learning paths based on your skill level

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-4o, LangGraph, Vercel AI SDK
- **Database**: PostgreSQL with Prisma
- **Agents**: Multi-agent system with Gap Analyzer, Research Agent, Portfolio Builder

---

## 📚 Documentation

### Core Documentation
- **[Architecture Overview](docs/AGENTIC_IMPLEMENTATION_SUMMARY.md)** - System design and agent architecture
- **[Adaptive Learning Paths](docs/ADAPTIVE_LEARNING_PATHS.md)** - How skill-level-based learning works
- **[Development Plan](docs/V1_DEVELOPMENT_PLAN.md)** - V1 development roadmap
- **[Capstone Proposal](docs/CAPSTONE_PROPOSAL.md)** - Original project proposal

### Agent Documentation
- [Gap Analyzer Agent](docs/agents/gap-analyzer.md) - AI-powered code analysis with MCP
- [Research Agent (LangGraph)](docs/agents/langgraph-research-agent.md) - Autonomous research workflow
- [Portfolio Builder Agent](docs/agents/portfolio-builder.md) - Auto-generated improvement tasks
- [Template Generator](docs/agents/template-example-generator.md) - Code template extraction
- [GitHub Agent](docs/agents/github-agent.md) - MCP GitHub integration

### System Diagrams
- [Data Flow](docs/data-flow.md) - How data flows through the system

---

## 🗄️ Optional: Database Setup

Want to save your analysis results? Set up a database:

### Option 1: Quick Local Setup
```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
# or apt-get install postgresql  # Linux

# Create database
createdb devbuilder

# Add to .env.local
DATABASE_URL=postgresql://localhost:5432/devbuilder

# Initialize schema
pnpm prisma generate
pnpm prisma db push
```

### Option 2: Free Cloud Database
1. Sign up for [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres/quickstart) (free tier)
2. Copy the `DATABASE_URL` from Vercel dashboard
3. Add it to your `.env.local`
4. Run `pnpm prisma generate && pnpm prisma db push`

---

## 🗺️ Roadmap

- ✅ Skill gap analysis with AI
- ✅ Adaptive learning paths (beginner/intermediate/advanced)
- ✅ Portfolio improvement suggestions
- ✅ Automated GitHub issue creation
- 🚧 Multi-user authentication
- 🚧 Progress tracking dashboard
- 📅 Mobile companion app
- 📅 Team collaboration features

---

Built with ❤️ by Betul Bogrek as a capstone project to help developers level up through actionable AI insights.
