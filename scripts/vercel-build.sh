#!/bin/bash
set -e  # Exit on error

echo "🚀 Starting Vercel build..."

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
