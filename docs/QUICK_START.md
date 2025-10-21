# Quick Start Guide - SkillBridge Agents

## 🚀 Get Started Immediately

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local and add:
# - OPENAI_API_KEY (required)
# - GITHUB_TOKEN (required)
# - DATABASE_URL (see below)
```

### 3. Set Up Database

**Option A: Vercel Postgres (Recommended for Production)**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link to Vercel project
vercel link

# 3. Pull environment variables (includes DATABASE_URL)
vercel env pull .env.local

# 4. Generate Prisma client
pnpm prisma generate

# 5. Push schema
pnpm prisma db push
```

**Option B: Local SQLite (Quick Testing)**
```bash
# Add to .env.local:
DATABASE_URL="file:./dev.db"

# Generate and push
pnpm prisma generate
pnpm prisma db push
```

**Option C: Local PostgreSQL**
```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
# or
sudo apt install postgresql  # Ubuntu

# Create database
createdb skillbridge

# Add to .env.local:
DATABASE_URL="postgresql://localhost:5432/skillbridge"

# Generate and push
pnpm prisma generate
pnpm prisma db push
```

### 4. Verify Setup
```bash
# Test database connection
pnpm db:view

# Check TypeScript compilation
pnpm tsc --noEmit

# Run dev server
pnpm dev
```

### 5. Open Application
```
http://localhost:3000
```

---

## 🔧 Common Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:view          # View database contents
pnpm db:studio        # Open Prisma Studio GUI
pnpm prisma generate  # Regenerate Prisma client
pnpm prisma db push   # Sync schema to database

# LangGraph
pnpm langgraph:dev    # Start LangGraph dev server
pnpm langgraph:build  # Build LangGraph workflows

# Type Checking
pnpm tsc --noEmit     # Check for TypeScript errors
```

---

## 🐛 Troubleshooting

### Database Connection Errors
```bash
# Error: Cannot fetch data from service
# Solution: Ensure DATABASE_URL is set
echo $DATABASE_URL  # Should not be empty

# Regenerate Prisma client
pnpm prisma generate

# Reset database
pnpm prisma db push --force-reset
```

### Build Failures on Vercel
```bash
# Test build locally first
pnpm build

# Test with Vercel CLI
vercel build

# Check environment variables
vercel env ls
```

### Template Creator Issues
```typescript
// Import from unified client (works everywhere)
import { getTemplateCreatorClient } from '@/lib/mcp/template-creator';

// Usage
const client = await getTemplateCreatorClient();
const analysis = await client.analyzeStructure(repoUrl);
```

### GitHub API Rate Limits
```bash
# Ensure GITHUB_TOKEN is set (increases rate limit to 5000/hour)
echo $GITHUB_TOKEN  # Should show token

# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

---

## 📚 Key Files

### Configuration
- `.env.local` - Local environment variables
- `next.config.ts` - Next.js configuration
- `vercel.json` - Vercel deployment settings
- `prisma/schema.prisma` - Database schema

### API Routes
- `app/api/chat/route.ts` - AI chat endpoint
- `app/api/research/route.ts` - Research agent endpoint
- `app/api/skill-gaps/route.ts` - Skill gap analysis
- `app/api/templates/route.ts` - Template generation

### Core Libraries
- `lib/agents/` - AI agent implementations
- `lib/github/` - GitHub API client
- `lib/mcp/template-creator/` - Template extraction
- `lib/storage/` - Database operations

---

## 🚢 Deploy to Vercel

### First Time Setup
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Set environment variables in Vercel dashboard:
#    - OPENAI_API_KEY
#    - GITHUB_TOKEN
#    - NEXTAUTH_SECRET
#    - Create Vercel Postgres database (auto-injects DATABASE_URL)

# 5. Deploy
vercel --prod
```

### Subsequent Deployments
```bash
# Just push to GitHub
git push origin main

# Or deploy manually
vercel --prod
```

---

## 🧪 Testing

### Manual Testing
```bash
# 1. Start dev server
pnpm dev

# 2. Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Analyze my GitHub portfolio"}'

# 3. Test template extraction
# (Use the UI at http://localhost:3000)
```

### Database Testing
```bash
# View all data
pnpm db:view

# Open GUI
pnpm db:studio

# Check specific table
pnpm tsx scripts/view-database.ts
```

---

## 🎯 Next Steps

After completing Quick Start:

1. **Read Full Documentation**
   - `docs/DEPLOYMENT_ISSUES_FIX.md` - Deployment troubleshooting
   - `docs/ISSUES_RESOLVED.md` - Recent fixes
   - `README.md` - Full project overview

2. **Configure Authentication**
   - Set up GitHub OAuth app
   - Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
   - Configure `NEXTAUTH_SECRET`

3. **Explore Features**
   - Skill gap analysis
   - Research agent
   - Template extraction
   - Portfolio builder

4. **Customize**
   - Modify prompts in `lib/agents/`
   - Adjust LangGraph workflows
   - Customize UI components

---

## 📞 Need Help?

- **Deployment Issues**: See `docs/DEPLOYMENT_ISSUES_FIX.md`
- **Recent Changes**: See `docs/ISSUES_RESOLVED.md`
- **Database Issues**: Run `pnpm db:view` for diagnostics
- **TypeScript Errors**: Run `pnpm tsc --noEmit`

---

*Last Updated: October 14, 2025*
