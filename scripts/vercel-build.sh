#!/usr/bin/env bash
set -euo pipefail

echo "Starting Vercel build (safe mode)..."

echo "Generating Prisma Client..."
pnpm prisma generate

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Applying Prisma migrations..."
  pnpm prisma migrate deploy
else
  echo "DATABASE_URL not set; skipping migrations."
fi

echo "Building Next.js app..."
pnpm build

echo "Build completed."