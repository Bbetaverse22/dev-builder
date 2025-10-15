#!/bin/bash
set -e

echo "🚀 Deploying Template Creator MCP to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "serverless-client.ts" ]; then
    echo "❌ Error: Must run from lib/mcp/template-creator directory"
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install @vercel/node @octokit/rest minimatch

echo ""
echo "🔐 Make sure GITHUB_TOKEN is set in Vercel:"
echo "   Run: vercel env add GITHUB_TOKEN"
echo ""
read -p "Press Enter when ready to deploy..."

echo ""
echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the deployment URL from above"
echo "2. Add to your main app .env.local:"
echo "   MCP_SERVER_URL=https://your-deployment-url.vercel.app"
echo ""
echo "3. Test the deployment:"
echo "   curl https://your-deployment-url.vercel.app/health"
echo ""
