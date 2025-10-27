/**
 * Prisma Client Singleton
 * Ensures single Prisma Client instance across the application
 * Optimized for Next.js hot reloading in development
 */

import { PrismaClient } from '@prisma/client'

// Allow deployments (e.g. Vercel Postgres) that expose POSTGRES_* vars but not DATABASE_URL
if (!process.env.DATABASE_URL) {
  const directPostgresUrl =
    process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL

  let fallbackDatabaseUrl = directPostgresUrl

  if (
    !fallbackDatabaseUrl &&
    process.env.POSTGRES_PRISMA_URL &&
    (process.env.PRISMA_CLIENT_ENGINE_TYPE === 'dataproxy' ||
      process.env.USE_PRISMA_ACCELERATE === 'true')
  ) {
    fallbackDatabaseUrl = process.env.POSTGRES_PRISMA_URL
  }

  if (fallbackDatabaseUrl) {
    process.env.DATABASE_URL = fallbackDatabaseUrl
  }
}

// Prisma uses DIRECT_URL for certain operations (migrations); populate when possible
if (!process.env.DIRECT_URL && process.env.POSTGRES_URL_NON_POOLING) {
  process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
