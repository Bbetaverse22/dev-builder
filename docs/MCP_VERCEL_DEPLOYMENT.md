# Deploy MCP Server to Vercel

This guide shows you how to deploy the Template Creator MCP as Vercel serverless functions.

---

## 🎯 Why Deploy to Vercel?

- ✅ **Generous Free Tier**: 100GB bandwidth, 100 hours execution time/month
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Global Edge Network**: Low latency worldwide
- ✅ **Easy Deployment**: Deploy from GitHub in minutes
- ✅ **Built-in Monitoring**: Logs and analytics included

---

## 🚀 Quick Deployment

### Option 1: Deploy as Separate Vercel Project (Recommended)

This creates a dedicated MCP service at its own URL.

#### Step 1: Prepare the Directory

```bash
cd lib/mcp/template-creator

# Install dependencies
pnpm install @vercel/node @octokit/rest minimatch
```

#### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy: Yes
# - Which scope: Your account
# - Link to existing project: No
# - Project name: skillbridge-mcp-server
# - Directory: ./
# - Override settings: No
```

#### Step 3: Set Environment Variables

```bash
# Set GITHUB_TOKEN in Vercel
vercel env add GITHUB_TOKEN

# Paste your GitHub token when prompted
# Choose: Production, Preview, Development (all)
```

#### Step 4: Deploy to Production

```bash
vercel --prod
```

#### Step 5: Copy the URL

```bash
# Vercel will output something like:
# https://skillbridge-mcp-server.vercel.app

# Add to your main Next.js app .env.local:
MCP_SERVER_URL=https://skillbridge-mcp-server.vercel.app
```

---

### Option 2: Deploy via GitHub (Auto-Deploy)

#### Step 1: Create a Separate Repository

```bash
# Option A: Create new repo for MCP only
cd lib/mcp/template-creator
git init
git add .
git commit -m "Initial commit"
gh repo create skillbridge-mcp-server --public --source=. --remote=origin --push

# Option B: Use existing repo but different project
# (Vercel can deploy from subdirectory)
```

#### Step 2: Connect to Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your repository
4. Configure:
   - **Project Name**: `skillbridge-mcp-server`
   - **Root Directory**: `lib/mcp/template-creator` (if using subdirectory)
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty

#### Step 3: Add Environment Variables

In Vercel dashboard:
- Go to **Settings** → **Environment Variables**
- Add: `GITHUB_TOKEN` = `your_github_token`
- Save

#### Step 4: Deploy

- Click **"Deploy"**
- Wait ~1-2 minutes
- Copy the deployment URL

#### Step 5: Update Main App

```bash
# In your main Next.js app .env.local:
MCP_SERVER_URL=https://skillbridge-mcp-server.vercel.app

# Also add to Vercel dashboard for main app:
# Settings → Environment Variables → Add
```

---

## 🧪 Testing the Deployment

### Test Health Check

```bash
curl https://your-mcp-server.vercel.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "template-creator-mcp",
  "version": "1.0.0",
  "timestamp": "2025-10-14T...",
  "platform": "vercel"
}
```

### Test Repository Analysis

```bash
curl -X POST https://your-mcp-server.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/vercel/next.js",
    "depth": 3
  }'
```

### Test from Your Next.js App

```bash
# Update .env.local
MCP_SERVER_URL=https://your-mcp-server.vercel.app

# Start your app
pnpm dev

# Check console logs - should see:
# [Template Creator] Using remote MCP server: https://...
```

---

## 📁 File Structure

```
lib/mcp/template-creator/
├── api/
│   ├── analyze.ts           # POST /api/analyze
│   ├── extract.ts           # POST /api/extract
│   ├── create-template.ts   # POST /api/create-template
│   └── health.ts            # GET /health
├── serverless-client.ts     # Core logic
├── vercel.json             # Vercel configuration
├── package-vercel.json     # Dependencies
└── .vercelignore           # Files to ignore
```

---

## ⚙️ Configuration

### vercel.json Explained

```json
{
  "version": 2,
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60,      // Max 60 seconds (hobby plan)
      "memory": 1024          // 1GB RAM per function
    }
  },
  "routes": [
    {
      "src": "/health",
      "dest": "/api/health"
    }
  ]
}
```

### Function Limits (Free Tier)

- **Execution Time**: 10 seconds per invocation (60s for paid)
- **Memory**: 1024 MB per function
- **Invocations**: 100,000/month
- **Bandwidth**: 100 GB/month

**For template extraction**: This is usually enough for small-medium repos

---

## 🔒 Security Best Practices

### 1. Rate Limiting

Add to `api/analyze.ts`:

```typescript
// Simple IP-based rate limiting
const rateLimitMap = new Map();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];

  // Keep only requests from last minute
  const recentRequests = userRequests.filter((time: number) => now - time < 60000);

  if (recentRequests.length >= 10) {
    return false; // Max 10 requests per minute
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// In handler:
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
if (!checkRateLimit(ip)) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### 2. API Key Authentication (Optional)

```typescript
// Add to each handler:
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.MCP_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Then set in Vercel:
```bash
vercel env add MCP_API_KEY
```

### 3. CORS Configuration

```typescript
// Add CORS headers
res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

---

## 📊 Monitoring

### View Logs

```bash
# Real-time logs
vercel logs --follow

# Or in Vercel Dashboard:
# Project → Deployments → Click deployment → Function Logs
```

### Monitor Usage

In Vercel Dashboard:
- **Usage** tab shows bandwidth, execution time
- **Analytics** shows request counts, response times
- **Logs** shows errors and debugging info

### Set Up Alerts

1. Go to **Settings** → **Notifications**
2. Enable **Deploy Notifications**
3. Enable **Error Alerts**

---

## 💰 Cost Estimates

### Free Tier (Hobby)
- **Bandwidth**: 100 GB/month
- **Execution**: 100 hours/month
- **Cost**: $0

**Typical usage:**
- 1000 template extractions/month = ~5-10 hours execution
- **Still free!**

### Pro Plan ($20/month)
- **Bandwidth**: 1 TB/month
- **Execution**: 1000 hours/month
- **Function Duration**: Up to 60s (vs 10s)
- **Better for**: High-traffic production apps

---

## 🔄 Continuous Deployment

### Auto-Deploy from Git

1. Push to your repository
2. Vercel automatically detects and deploys
3. Preview deployments for PRs
4. Production deployment for main branch

```bash
# Development branch
git checkout -b feature/improve-extraction
git push origin feature/improve-extraction
# Creates preview deployment at unique URL

# Production
git checkout main
git merge feature/improve-extraction
git push origin main
# Automatically deploys to production
```

---

## 🐛 Troubleshooting

### Issue: "Function exceeded timeout"

**Solution**: Reduce file patterns or increase timeout (Pro plan)

```typescript
// In your request:
{
  "filePatterns": ["*.ts", "*.tsx"], // Be specific
  // Don't use: ["**/*"] // Too broad
}
```

### Issue: "Module not found"

**Solution**: Ensure dependencies are in package.json

```bash
cd lib/mcp/template-creator
pnpm install @vercel/node @octokit/rest minimatch
```

### Issue: "Environment variable not found"

**Solution**: Set in Vercel dashboard

```bash
vercel env add GITHUB_TOKEN
# Or in dashboard: Settings → Environment Variables
```

---

## 🚀 Advanced: Multiple Environments

### Development

```bash
vercel env add GITHUB_TOKEN development
# Use different token for dev
```

### Staging

```bash
vercel env add GITHUB_TOKEN preview
# Preview deployments use this
```

### Production

```bash
vercel env add GITHUB_TOKEN production
# Production deployments use this
```

---

## 📋 Deployment Checklist

- [ ] Install dependencies: `@vercel/node`, `@octokit/rest`, `minimatch`
- [ ] Create `vercel.json` configuration
- [ ] Set `GITHUB_TOKEN` environment variable
- [ ] Deploy: `vercel --prod`
- [ ] Test health check: `/health`
- [ ] Test API endpoints: `/api/analyze`, `/api/extract`
- [ ] Update main app: Set `MCP_SERVER_URL`
- [ ] Verify in production
- [ ] Set up monitoring/alerts
- [ ] (Optional) Configure rate limiting
- [ ] (Optional) Add API key authentication

---

## 🎯 Summary

**Vercel deployment is the easiest option for serverless:**

1. **Deploy in 2 minutes**: `vercel` command
2. **No server management**: Fully serverless
3. **Auto-scaling**: Handles any traffic
4. **Free tier**: Generous limits
5. **Works globally**: Edge network

**Your URL structure:**
```
https://your-mcp-server.vercel.app/health
https://your-mcp-server.vercel.app/api/analyze
https://your-mcp-server.vercel.app/api/extract
https://your-mcp-server.vercel.app/api/create-template
```

**In your main app:**
```bash
MCP_SERVER_URL=https://your-mcp-server.vercel.app
```

Done! 🎉

---

*Last Updated: October 14, 2025*
