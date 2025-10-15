# Template Creator MCP - Deployment Options

## 🎯 You Have 3 Options

### Option 1: Use Local Client (Default) ✅
**No setup needed** - Already working!
- Runs directly in your Next.js app
- No separate server needed
- Works locally and on Vercel
- **Current status**: Ready to use

### Option 2: Host MCP as HTTP Server 🌐
**For when you want dedicated infrastructure**
- Separate service from your main app
- Can scale independently
- Reduces Next.js bundle size slightly
- **Setup required**: See full guide below

### Option 3: Hybrid Approach 🔀
**Best of both worlds**
- Use local client in development
- Use remote server in production
- Automatic fallback if server is down
- **Setup required**: Deploy server + set MCP_SERVER_URL

---

## Quick Start: Test Remote Server Locally

```bash
# 1. Install dependencies (in lib/mcp/template-creator/)
cd lib/mcp/template-creator
pnpm install express cors

# 2. Start the HTTP server
pnpm tsx http-server.ts

# 3. In another terminal, update your .env.local:
echo "MCP_SERVER_URL=http://localhost:3001" >> .env.local

# 4. Start your Next.js app
cd ../../..
pnpm dev

# Your app now calls the local HTTP server!
```

---

## Deploy to Production

See the full guide: `../../docs/MCP_SERVER_DEPLOYMENT.md`

**Quick options:**
1. **Railway** (easiest): Push to GitHub, done
2. **Render**: Free tier available
3. **Fly.io**: Best for global edge deployment

**After deployment:**
```bash
# Add to your .env.local and Vercel environment:
MCP_SERVER_URL=https://your-deployed-server.com
```

---

## Files Overview

```
lib/mcp/template-creator/
├── index.ts                    # Unified client (auto-selects local/remote)
├── serverless-client.ts        # Local implementation (GitHub API)
├── remote-client.ts            # Remote server client (HTTP)
├── http-server.ts             # HTTP server (deploy this)
├── server.ts                  # Original MCP (not used)
└── package-server.json        # Dependencies for HTTP server
```

---

## Environment Variable

```bash
# Optional - if not set, uses local client
MCP_SERVER_URL=https://your-mcp-server.com
```

**When to set:**
- ✅ You deployed the HTTP server
- ✅ You want to use remote server
- ❌ Don't set if you want local client (default)

---

## Monitoring

```typescript
// Check which mode you're using:
const client = await getTemplateCreatorClient();
console.log(client.isRemote()); // true if using remote server

// Health check (remote only):
const isHealthy = await client.healthCheck();
```

---

## Cost Comparison

| Option | Cost | Setup | Pros | Cons |
|--------|------|-------|------|------|
| **Local Client** | $0 | None | Simple, no extra infrastructure | Runs in Next.js bundle |
| **Railway** | $5/mo | 5 min | Easy deploy, good DX | Costs money |
| **Render** | Free-$7/mo | 5 min | Free tier available | Spins down when idle |
| **Fly.io** | Free-$10/mo | 10 min | Global edge, generous free tier | Slightly more complex |

---

## Recommendation

**For most projects**: Stick with the local client (no MCP_SERVER_URL)
- Zero setup
- Already working
- No extra costs
- Good enough performance

**Deploy separate server only if:**
- You need to share the service across multiple apps
- You want dedicated scaling/monitoring
- You have specific latency requirements
- You prefer microservices architecture

---

*See full deployment guide: `../../docs/MCP_SERVER_DEPLOYMENT.md`*
