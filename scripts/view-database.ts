/**
 * Simple Database Viewer
 * Alternative to Prisma Studio when it has issues
 */

import { config } from 'dotenv'
import { prisma } from '../lib/db'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function viewDatabase() {
  console.log('📊 SkillBridge Database Viewer\n')

  try {
    // Count records in each table
    const [users, skillGaps, technologies, recommendations, githubIssues] = await Promise.all([
      prisma.user.count(),
      prisma.skillGap.count(),
      prisma.technology.count(),
      prisma.recommendation.count(),
      prisma.gitHubIssue.count(),
    ])

    console.log('📈 Record Counts:')
    console.log(`  Users: ${users}`)
    console.log(`  Skill Gaps: ${skillGaps}`)
    console.log(`  Technologies: ${technologies}`)
    console.log(`  Recommendations: ${recommendations}`)
    console.log(`  GitHub Issues: ${githubIssues}`)
    console.log()

    // Show recent users
    if (users > 0) {
      console.log('👥 Recent Users:')
      const recentUsers = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          githubUsername: true,
          createdAt: true,
        },
      })
      console.table(recentUsers)
    }

    // Show recent skill gaps
    if (skillGaps > 0) {
      console.log('🎯 Recent Skill Gaps:')
      const recentGaps = await prisma.skillGap.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          repository: true,
          overallScore: true,
          skillLevel: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              githubUsername: true,
            },
          },
        },
      })
      console.table(recentGaps)
    }

    console.log('\n✅ Database connection successful!')
  } catch (error) {
    console.error('❌ Database error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if executed directly
if (require.main === module) {
  viewDatabase()
}

export { viewDatabase }
