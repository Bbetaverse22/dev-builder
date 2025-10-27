# Deploy MCP to Vercel - Quick Start

## 🚀 Super Quick Deployment (2 Minutes)

```bash
# 1. Go to MCP directory
cd lib/mcp/template-creator

# 2. Run deployment script
./deploy-vercel.sh

# 3. Set GITHUB_TOKEN when prompted
vercel env add GITHUB_TOKEN

# 4. Done! Copy the URL and add to your main app:
# MCP_SERVER_URL=https://your-deployment.vercel.app
```

---

## 📁 What Got Created

```
lib/mcp/template-creator/
├── api/                        # Vercel serverless functions
│   ├── health.ts              # GET /health
│   ├── analyze.ts             # POST /api/analyze
│   ├── extract.ts             # POST /api/extract
│   └── create-template.ts     # POST /api/create-template
├── vercel.json                # Vercel configuration
├── package-vercel.json        # Dependencies for Vercel
└── deploy-vercel.sh          # Deployment script
```

---

## 🎯 How It Works

### Your App → Vercel MCP Server → GitHub API

```
┌─────────────────────────────────────┐
│  Your Next.js App                   │
│  (main Vercel deployment)           │
│                                     │
│  MCP_SERVER_URL=                    │
│  https://mcp-server.vercel.app     │
└──────────────┬──────────────────────┘
               │ HTTP Request
               ↓
┌─────────────────────────────────────┐
│  MCP Server (Vercel Functions)      │
│  https://mcp-server.vercel.app     │
│                                     │
│  /health                            │
│  /api/analyze                       │
│  /api/extract                       │
│  /api/create-template               │
└──────────────┬──────────────────────┘
               │
               ↓
         GitHub REST API
```

---

## 🧪 Test Your Deployment

```bash
# 1. Health check
curl https://your-mcp-server.vercel.app/api/health

# 2. Test analysis
curl -X POST https://your-mcp-server.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/vercel/next.js"
  }'

# 3. Update your main app
echo "MCP_SERVER_URL=https://your-mcp-server.vercel.app" >> ../../.env.local

# 4. Test from your app
cd ../../..
pnpm dev
# Check console: Should say "Using remote MCP server"
```

---

## ⚙️ Configuration

### Function Settings (vercel.json)

```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60,    // 60s max (requires Pro plan)
      "memory": 1024        // 1GB RAM per function
    }
  }
}
```

**Free tier limits:**
- Max duration: 10 seconds
- Memory: 1024 MB
- 100,000 invocations/month

**Pro plan ($20/mo):**
- Max duration: 60 seconds
- Memory: up to 3008 MB
- Unlimited invocations

---

## 🔒 Environment Variables

### Required

```bash
# Set in Vercel dashboard or CLI:
GITHUB_TOKEN=your_github_token_here
```

### Optional

```bash
# For rate limiting (if implemented):
MCP_API_KEY=your_secret_key

# For CORS restrictions:
ALLOWED_ORIGIN=https://your-main-app.vercel.app
```

---

## 💡 Why Deploy to Vercel?

### Pros ✅
- **Easy deployment**: One command
- **Free tier**: 100GB bandwidth, 100 hours execution
- **Auto-scaling**: Handles traffic automatically
- **Global CDN**: Fast worldwide
- **Same platform**: Uses same Vercel account as main app
- **No server management**: Fully serverless

### Cons ⚠️
- **Function timeout**: 10s free tier (60s Pro)
- **Cold starts**: ~1-2s for first request
- **Bundle size limits**: 50MB compressed

### Best For 👍
- Small to medium repositories
- Occasional template extraction
- Don't want separate infrastructure
- Already using Vercel

### Not Ideal For 👎
- Very large repositories (>10k files)
- Continuous heavy usage
- Need longer than 60s processing time
- Need stateful processing

---

## 🔄 Alternative Hosting Options

If Vercel doesn't fit your needs:

1. **Railway**: `http-server.ts` + Express (best for long-running)
2. **Render**: Free tier available
3. **Fly.io**: Global edge deployment
4. **Local client**: No hosting needed (default)

See: `docs/MCP_SERVER_DEPLOYMENT.md` for full guide

---

## 📊 Monitoring

### View Logs

```bash
# CLI
vercel logs --follow

# Or in dashboard:
# Project → Deployments → Click deployment → Logs
```

### Check Usage

Vercel Dashboard → Usage tab:
- Bandwidth used
- Function execution time
- Number of invocations

---

## 🐛 Common Issues

### "Function exceeded timeout"

**Problem**: Large repo takes >10s (free tier limit)

**Solutions:**
1. Upgrade to Pro ($20/mo) for 60s timeout
2. Use Railway/Render instead (no timeout limit)
3. Reduce file patterns in request
4. Use local client for large repos

### "Environment variable not found"

**Problem**: GITHUB_TOKEN not set

**Solution:**
```bash
vercel env add GITHUB_TOKEN
# Paste your token
# Select: Production, Preview, Development
```

### "Module not found"

**Problem**: Dependencies not installed

**Solution:**
```bash
cd lib/mcp/template-creator
pnpm install @vercel/node @octokit/rest minimatch
```

---

## 🎯 Deployment Checklist

- [ ] Navigate to `lib/mcp/template-creator`
- [ ] Install dependencies: `pnpm install @vercel/node @octokit/rest minimatch`
- [ ] Run: `./deploy-vercel.sh` or `vercel --prod`
- [ ] Set environment variable: `vercel env add GITHUB_TOKEN`
- [ ] Test health: `curl https://your-url.vercel.app/health`
- [ ] Test API: Try `/api/analyze` endpoint
- [ ] Update main app: Add `MCP_SERVER_URL` to `.env.local`
- [ ] Test from main app: `pnpm dev` and check console logs
- [ ] Deploy to production if needed

---

## 📖 Full Documentation

- **This Quick Start**: You're reading it!
- **Detailed Vercel Guide**: `../../docs/MCP_VERCEL_DEPLOYMENT.md`
- **All Hosting Options**: `../../docs/MCP_SERVER_DEPLOYMENT.md`
- **Deployment Options**: `README-DEPLOYMENT.md`

---

## 🎉 You're Done!

Your MCP server is now running on Vercel's global edge network.

**Your URLs:**
```
Health: https://your-mcp-server.vercel.app/api/health
API: https://your-mcp-server.vercel.app/api/*
```

**In your main app:**
```bash
MCP_SERVER_URL=https://your-mcp-server.vercel.app
```

The unified client automatically uses it - no code changes needed! 🚀

---

*Last Updated: October 14, 2025*
