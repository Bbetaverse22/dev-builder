#!/bin/bash
set -e  # Exit on error

echo "🚀 Starting Vercel build..."

# Normalize Vercel Postgres environment variables for Prisma when DATABASE_URL is missing
if [ -z "$DATABASE_URL" ]; then
  if [ -n "$POSTGRES_URL_NON_POOLING" ]; then
    export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
    echo "ℹ️  Using POSTGRES_URL_NON_POOLING as DATABASE_URL"
  elif [ -n "$POSTGRES_URL" ]; then
    export DATABASE_URL="$POSTGRES_URL"
    echo "ℹ️  Using POSTGRES_URL as DATABASE_URL"
  elif [ -n "$POSTGRES_PRISMA_URL" ] && { [ "$PRISMA_CLIENT_ENGINE_TYPE" = "dataproxy" ] || [ "$USE_PRISMA_ACCELERATE" = "true" ]; }; then
    export DATABASE_URL="$POSTGRES_PRISMA_URL"
    echo "ℹ️  Using POSTGRES_PRISMA_URL as DATABASE_URL (dataproxy)"
  fi
fi

if [ -z "$DIRECT_URL" ] && [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DIRECT_URL="$POSTGRES_URL_NON_POOLING"
  echo "ℹ️  Using POSTGRES_URL_NON_POOLING as DIRECT_URL"
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_PRISMA_URL" ]; then
  echo "⚠️  Warning: No database URL found. Skipping Prisma generation."
  SKIP_PRISMA=true
fi

# Generate Prisma client if database is configured
if [ "$SKIP_PRISMA" != "true" ]; then
  echo "📦 Generating Prisma client..."
  pnpm prisma generate --no-engine || {
    echo "⚠️  Prisma generation failed, continuing without database..."
  }
else
  echo "⏭️  Skipping Prisma generation (no database configured)"
fi

# Clean up development artifacts (keep dependencies)
echo "🧹 Cleaning development artifacts..."
rm -rf examples/generated
rm -rf lib/mcp/template-creator/node_modules
rm -rf lib/mcp/template-creator/dist

# Run the build
echo "🏗️  Building Next.js application..."
pnpm build

echo "✅ Vercel build completed successfully!"
