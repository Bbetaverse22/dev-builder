# Deployment Issues & Solutions

**Date**: October 14, 2025
**Status**: 🔧 In Progress

---

## Summary of Issues

### 1. ✅ MCP Implementation Decision (RESOLVED)
- **Issue**: Uncertainty about GitHub MCP vs GitHub API, and template_creator MCP deployment
- **Solution**:
  - Use GitHub REST API (already implemented in `lib/github/github-client.ts`)
  - Use serverless template creator for Vercel (created unified `lib/mcp/template-creator/index.ts`)

### 2. 🔧 Database Connection Issues (FIXING)
- **Issue**: `DATABASE_URL` not set, Prisma client unable to connect
- **Root Cause**: Missing environment variable configuration
- **Impact**: Database operations failing, LangGraph nodes can't persist/retrieve data

### 3. ⚠️ Vercel Deployment Failures (PENDING)
- **Issue**: Recent commits failing to deploy on Vercel
- **Root Cause**: Bundle size exceeds limits, MCP dependencies causing issues
- **Impact**: Cannot deploy to production

### 4. 🐛 LangGraph Nodes Using Old Data (TO INVESTIGATE)
- **Issue**: LangGraph nodes showing stale/cached data
- **Root Cause**: TBD (may be related to database connection issues)

---

## Solution 1: MCP Implementation ✅

### Template Creator MCP - Unified Client

Created `lib/mcp/template-creator/index.ts` that:
- Uses `serverless-client.ts` for both local and Vercel environments
- Provides consistent API interface
- No subprocess/stdio dependencies (Vercel-compatible)

### Usage:

```typescript
import { getTemplateCreatorClient } from '@/lib/mcp/template-creator';

const client = await getTemplateCreatorClient();
const analysis = await client.analyzeStructure(repoUrl);
const template = await client.extractTemplate(repoUrl, patterns);
```

### Implementation Details:
- **Local Development**: Works via direct GitHub API calls
- **Vercel Deployment**: Works via direct GitHub API calls (no subprocess needed)
- **GitHub Operations**: Use `lib/github/github-client.ts` directly

---

## Solution 2: Database Connection 🔧

### Problem Analysis

The database connection is failing with:
```
Cannot fetch data from service: fetch failed
```

This indicates `DATABASE_URL` is not properly configured.

### Root Causes

1. **Missing Environment Variable**: `DATABASE_URL` not set in `.env.local`
2. **Prisma Client Not Generated**: Prisma client may be out of sync
3. **Vercel Postgres Not Configured**: Database may not be set up in Vercel project

### Fix Steps

#### Step 1: Set up Vercel Postgres (Production)

```bash
# In Vercel dashboard:
1. Go to Storage tab
2. Create Vercel Postgres database
3. Copy environment variables (automatically injected):
   - POSTGRES_URL
   - POSTGRES_PRISMA_URL
   - POSTGRES_URL_NON_POOLING
```

#### Step 2: Configure Local Development

```bash
# Add to .env.local:
DATABASE_URL="postgres://username:password@host/database?sslmode=require"

# Or use Vercel Postgres connection pooling URL:
DATABASE_URL="${POSTGRES_PRISMA_URL}"
```

#### Step 3: Generate Prisma Client

```bash
pnpm prisma generate
pnpm prisma db push  # Push schema to database
```

#### Step 4: Verify Connection

```bash
pnpm db:view  # Should now work
```

### Alternative: Use SQLite for Local Development

If you want to avoid Postgres setup locally:

```typescript
// prisma/schema.prisma
datasource db {
  provider = "sqlite"  // For local dev
  url      = env("DATABASE_URL")
}

// Or use conditional:
datasource db {
  provider = process.env.NODE_ENV === "production" ? "postgresql" : "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
# .env.local
DATABASE_URL="file:./dev.db"
```

---

## Solution 3: Vercel Deployment Failures ⚠️

### Problem Analysis

The `vercel-build.sh` script is aggressively removing dependencies:

```bash
rm -rf node_modules/@langchain
rm -rf node_modules/@langgraph
rm -rf node_modules/@modelcontextprotocol
```

This causes issues because:
1. These dependencies are needed at runtime
2. Next.js externals configuration conflicts with removal
3. Bundle size still exceeds Vercel limits

### Recommended Fixes

#### Option 1: Use Serverless-Only Approach (RECOMMENDED)

Remove all subprocess-based MCP clients and use only API-based implementations:

1. **Remove from dependencies**:
```json
// package.json - Remove or mark as devDependencies:
"@modelcontextprotocol/sdk": "devDependencies"
"@langchain/langgraph": "devDependencies" (if only used for local testing)
```

2. **Update imports**:
```typescript
// Before:
import { getTemplateCreatorClient } from '@/lib/mcp/template-creator/client';

// After:
import { getTemplateCreatorClient } from '@/lib/mcp/template-creator'; // Uses serverless
```

3. **Update vercel-build.sh**:
```bash
#!/bin/bash
echo "Starting Vercel build..."

# Generate Prisma client
pnpm prisma generate

# Run the build
pnpm build

echo "Vercel build completed!"
```

#### Option 2: Edge Functions for Heavy Operations

Move heavy operations to Edge/Serverless functions:

```typescript
// app/api/templates/route.ts
export const runtime = 'edge';
export const maxDuration = 60;
```

#### Option 3: Split into Microservices

If template extraction is too heavy for Vercel:
- Deploy template creator as separate service (Railway, Render)
- Call it via API from main Vercel deployment

---

## Solution 4: LangGraph Nodes Caching Issues 🐛

### Likely Causes

1. **Database Connection**: Nodes can't persist new data → use cached results
2. **State Management**: LangGraph state not properly reset between runs
3. **Prisma Client**: Needs regeneration after schema changes

### Investigation Steps

```typescript
// Add debug logging to nodes:
export async function createTemplatesNode(state: ResearchState) {
  console.log('[DEBUG] State input:', {
    skillGap: state.skillGap,
    examples: state.examples?.length,
    timestamp: new Date().toISOString()
  });

  // ... rest of function
}
```

### Potential Fixes

1. **Clear Prisma Client Cache**:
```bash
pnpm prisma generate --force
```

2. **Reset Database**:
```bash
pnpm prisma db push --force-reset
```

3. **Add Cache Busting**:
```typescript
// lib/storage/skill-gap-storage-prisma.ts
async getLatestSkillGap(userId: string): Promise<StoredSkillGap | null> {
  const skillGap = await prisma.skillGap.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }, // Ensure ordering by creation time
    // Add this to force fresh query:
    cacheStrategy: { ttl: 0 }
  });
  // ...
}
```

---

## Action Plan

### Immediate (Today)

- [x] Create unified template creator client
- [ ] Fix DATABASE_URL configuration
- [ ] Test database connection locally
- [ ] Run `pnpm prisma generate`

### Short-term (This Week)

- [ ] Simplify vercel-build.sh
- [ ] Test Vercel deployment
- [ ] Add database connection health check
- [ ] Investigate LangGraph state caching

### Long-term (Next Sprint)

- [ ] Set up proper CI/CD pipeline
- [ ] Add database migration workflow
- [ ] Implement proper error monitoring (Sentry)
- [ ] Add performance monitoring for Vercel functions

---

## Testing Checklist

### Local Testing
```bash
# 1. Check environment
echo $DATABASE_URL

# 2. Test database
pnpm db:view

# 3. Test template creator
pnpm tsx tests/test-template-creator.ts

# 4. Test build
pnpm build

# 5. Test production mode
pnpm start
```

### Vercel Testing
```bash
# 1. Test build locally with Vercel CLI
vercel build

# 2. Deploy to preview
vercel --prod=false

# 3. Check logs
vercel logs [deployment-url]

# 4. Deploy to production
vercel --prod
```

---

## Environment Variables Checklist

### Required for Local Development
- [ ] `OPENAI_API_KEY` - OpenAI API access
- [ ] `GITHUB_TOKEN` - GitHub API access
- [ ] `DATABASE_URL` - Postgres connection string
- [ ] `NEXTAUTH_SECRET` - Auth secret key

### Required for Vercel Production
- [ ] `OPENAI_API_KEY` - Set in Vercel dashboard
- [ ] `GITHUB_TOKEN` - Set in Vercel dashboard
- [ ] `POSTGRES_URL` - Auto-injected by Vercel
- [ ] `POSTGRES_PRISMA_URL` - Auto-injected by Vercel
- [ ] `NEXTAUTH_SECRET` - Set in Vercel dashboard
- [ ] `NEXTAUTH_URL` - Set to production domain

---

## Next Steps

1. **Fix database connection** (in progress)
2. **Test unified template creator client**
3. **Simplify Vercel build process**
4. **Deploy and verify**
5. **Investigate LangGraph caching**

---

*Last Updated: October 14, 2025*
