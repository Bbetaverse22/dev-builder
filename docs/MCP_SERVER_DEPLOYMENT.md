# MCP Server Deployment Guide

This guide shows you how to host the Template Creator MCP as a standalone HTTP server.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Your Next.js App (Vercel)             │
│  ├── Uses remote-client.ts              │
│  └── Calls MCP_SERVER_URL               │
└─────────────────┬───────────────────────┘
                  │ HTTP
                  ↓
┌─────────────────────────────────────────┐
│  MCP Server (Railway/Render/Fly.io)    │
│  ├── http-server.ts                     │
│  ├── serverless-client.ts               │
│  └── Calls GitHub API                   │
└─────────────────┬───────────────────────┘
                  │
                  ↓
            GitHub REST API
```

---

## 📦 Option 1: Host on Railway (Recommended)

Railway provides free tier and simple deployment from GitHub.

### Setup Steps

1. **Prepare the Server Code**
```bash
cd lib/mcp/template-creator

# Install dependencies for the server
pnpm install express cors @octokit/rest minimatch
pnpm install -D @types/express @types/cors tsx typescript
```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure Build Settings**
   - **Root Directory**: `lib/mcp/template-creator`
   - **Build Command**: `pnpm install`
   - **Start Command**: `tsx http-server.ts`
   - **Port**: Railway auto-detects (uses PORT env var)

4. **Set Environment Variables**
   ```
   GITHUB_TOKEN=your_github_token_here
   PORT=3001  # Optional, Railway sets this
   ```

5. **Deploy**
   - Push to GitHub → Railway auto-deploys
   - Copy the generated URL (e.g., `https://your-app.up.railway.app`)

6. **Update Your Next.js App**
   ```bash
   # In your main project .env.local:
   MCP_SERVER_URL=https://your-app.up.railway.app
   ```

---

## 📦 Option 2: Host on Render

Render also offers free tier with simple deployment.

### Setup Steps

1. **Go to [render.com](https://render.com)**
   - Sign up/Sign in

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - **Name**: `skillbridge-mcp-server`
   - **Root Directory**: `lib/mcp/template-creator`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install`
   - **Start Command**: `tsx http-server.ts`

4. **Environment Variables**
   ```
   GITHUB_TOKEN=your_github_token_here
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (takes ~2-3 minutes)
   - Copy the service URL

6. **Update Next.js App**
   ```bash
   MCP_SERVER_URL=https://skillbridge-mcp-server.onrender.com
   ```

---

## 📦 Option 3: Host on Fly.io

Fly.io offers generous free tier and global edge deployment.

### Setup Steps

1. **Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
# or
brew install flyctl  # macOS
```

2. **Login**
```bash
flyctl auth login
```

3. **Create fly.toml in lib/mcp/template-creator/**
```toml
app = "skillbridge-mcp-server"
primary_region = "sjc"

[build]
  [build.args]
    NODE_VERSION = "20"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

4. **Deploy**
```bash
cd lib/mcp/template-creator
flyctl launch
flyctl secrets set GITHUB_TOKEN=your_token_here
flyctl deploy
```

5. **Get URL**
```bash
flyctl info
# Copy the hostname (e.g., skillbridge-mcp-server.fly.dev)
```

6. **Update Next.js App**
```bash
MCP_SERVER_URL=https://skillbridge-mcp-server.fly.dev
```

---

## 🏠 Option 4: Run Locally (Development)

For testing or if you want to host on your own server.

### Setup

1. **Navigate to MCP Directory**
```bash
cd lib/mcp/template-creator
```

2. **Install Dependencies**
```bash
pnpm install express cors
pnpm install -D @types/express @types/cors
```

3. **Set Environment Variables**
```bash
# Create .env file
echo "GITHUB_TOKEN=your_token_here" > .env
echo "PORT=3001" >> .env
```

4. **Run Server**
```bash
pnpm tsx http-server.ts
```

5. **Test Health Check**
```bash
curl http://localhost:3001/health
```

6. **Use Ngrok for External Access** (optional)
```bash
# Install ngrok
brew install ngrok  # macOS

# Expose local server
ngrok http 3001

# Copy the HTTPS URL and use as MCP_SERVER_URL
```

---

## 🧪 Testing the MCP Server

### Test Health Check
```bash
curl https://your-mcp-server.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "template-creator-mcp",
  "version": "1.0.0",
  "timestamp": "2025-10-14T..."
}
```

### Test Repository Analysis
```bash
curl -X POST https://your-mcp-server.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/vercel/next.js",
    "depth": 3
  }'
```

### Test Template Extraction
```bash
curl -X POST https://your-mcp-server.com/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/your-org/your-repo",
    "filePatterns": ["**/*.ts", "package.json"],
    "options": {
      "preserveStructure": true,
      "keepComments": true
    }
  }'
```

---

## 🔧 Configure Your Next.js App

Once your MCP server is deployed, configure your Next.js app to use it:

### 1. Update .env.local
```bash
# Add this line:
MCP_SERVER_URL=https://your-mcp-server-url.com
```

### 2. The unified client will automatically use remote
```typescript
// No code changes needed!
import { getTemplateCreatorClient } from '@/lib/mcp/template-creator';

const client = await getTemplateCreatorClient();
// Automatically uses remote server if MCP_SERVER_URL is set
```

### 3. Verify Connection
```bash
pnpm dev

# Check console logs - you should see:
# [Template Creator] Using remote MCP server: https://...
```

---

## 📊 Monitoring & Logs

### Railway
- Dashboard → Your Service → Logs tab
- Metrics: CPU, Memory, Network usage

### Render
- Dashboard → Your Service → Logs tab
- Metrics available in the dashboard

### Fly.io
```bash
flyctl logs
flyctl status
flyctl scale show
```

### Local
```bash
# Logs are printed to console
# Use PM2 for production logging:
pnpm install -g pm2
pm2 start http-server.ts --interpreter tsx
pm2 logs
```

---

## 🔒 Security Considerations

1. **Rate Limiting** (add to http-server.ts):
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

2. **API Key Authentication** (optional):
```typescript
// Add middleware
app.use('/api/', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

3. **CORS Configuration**:
```typescript
// Limit to your domain only
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST']
}));
```

---

## 💰 Cost Estimates

### Railway
- **Free Tier**: $5 credit/month (~500 hours)
- **Hobby Plan**: $5/month for 500 hours
- **Pro Plan**: $20/month for unlimited hours

### Render
- **Free Tier**: Available (spins down after inactivity)
- **Starter**: $7/month (always on)
- **Standard**: $25/month (more resources)

### Fly.io
- **Free Tier**:
  - 3 shared-cpu VMs (256MB RAM each)
  - 160GB bandwidth/month
- **Paid**: Pay only for what you use

### Recommendation
- **Development**: Local or Ngrok (free)
- **Small Project**: Railway free tier
- **Production**: Fly.io or Railway Hobby ($5/month)

---

## 🚀 Quick Start Summary

**Fastest way to get started:**

1. Choose Railway (easiest)
2. Connect your GitHub repo
3. Set GITHUB_TOKEN environment variable
4. Deploy
5. Copy the URL
6. Add `MCP_SERVER_URL=<url>` to your .env.local
7. Done! Your app will automatically use the remote server

**No MCP server?**
- Your app automatically falls back to local client
- No changes needed - it just works!

---

*Last Updated: October 14, 2025*
