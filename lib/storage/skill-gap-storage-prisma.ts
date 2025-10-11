/**
 * Prisma-based Skill Gap Storage
 * Replaces file-based storage with database persistence
 * Issue #30: Refactor SkillGapStorage to use Prisma
 */

import { prisma } from '@/lib/db';
import { GapAnalysisResult, GitHubAnalysis, ResearchContext } from '@/lib/agents/gap-analyzer';
import type { ResearchState } from '@/lib/agents/langgraph/research-agent';
import { buildResearchStateSeed } from '@/lib/agents/langgraph/utils/research-state-seed';

export interface StoredSkillGap {
  id: string;
  userId: string;
  githubAnalysis: GitHubAnalysis;
  skillAssessment: GapAnalysisResult;
  context?: ResearchContext;
  createdAt: string;
  lastAccessed: string;
}

export class SkillGapStoragePrisma {
  /**
   * Store skill gap analysis results in database
   */
  async storeSkillGap(
    userId: string,
    githubAnalysis: GitHubAnalysis,
    skillAssessment: GapAnalysisResult,
    context?: ResearchContext
  ): Promise<string> {
    try {
      // Create or update user
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
        },
      });

      // Create skill gap record
      const skillGap = await prisma.skillGap.create({
        data: {
          userId,
          repository: githubAnalysis.repository,
          overallScore: skillAssessment.overallScore,
          skillLevel: githubAnalysis.skillLevel,
          // Create related technologies
          technologies: {
            create: [
              ...githubAnalysis.languages.map((lang) => ({
                type: 'language',
                name: lang,
              })),
              ...githubAnalysis.frameworks.map((fw) => ({
                type: 'framework',
                name: fw,
              })),
              ...githubAnalysis.tools.map((tool) => ({
                type: 'tool',
                name: tool,
              })),
            ],
          },
          // Create skill gap items
          skillGapItems: {
            create: skillAssessment.skillGaps.map((gap) => ({
              skillName: gap.skill.name,
              currentLevel: gap.skill.currentLevel,
              targetLevel: gap.skill.targetLevel,
              gap: gap.gap,
              priority: gap.priority >= 8 ? 'high' : gap.priority >= 5 ? 'medium' : 'low',
            })),
          },
          // Create recommendations
          recommendations: {
            create: skillAssessment.recommendations.map((rec, index) => ({
              text: rec,
              priority: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
              completed: false,
            })),
          },
        },
        include: {
          technologies: true,
          skillGapItems: true,
          recommendations: true,
        },
      });

      console.log('💾 Stored skill gap in database:', {
        id: skillGap.id,
        userId,
        repository: githubAnalysis.repository,
        technologiesCount: skillGap.technologies.length,
        skillGapsCount: skillGap.skillGapItems.length,
        recommendationsCount: skillGap.recommendations.length,
      });

      return skillGap.id;
    } catch (error) {
      console.error('❌ Error storing skill gap in database:', error);
      throw error;
    }
  }

  /**
   * Get the latest skill gap analysis for a user
   */
  async getLatestSkillGap(userId: string): Promise<StoredSkillGap | null> {
    try {
      const skillGap = await prisma.skillGap.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          technologies: true,
          skillGapItems: true,
          recommendations: true,
        },
      });

      if (!skillGap) {
        console.log('❌ No skill gap found for user:', userId);
        return null;
      }

      // Update last accessed
      await prisma.skillGap.update({
        where: { id: skillGap.id },
        data: { lastAccessed: new Date() },
      });

      // Convert database format to StoredSkillGap format
      const storedGap = this.convertToStoredFormat(skillGap);

      console.log('✅ Found latest skill gap:', {
        id: skillGap.id,
        repository: skillGap.repository,
        createdAt: skillGap.createdAt,
      });

      return storedGap;
    } catch (error) {
      console.error('❌ Error getting latest skill gap:', error);
      return null;
    }
  }

  /**
   * Get skill gap by ID
   */
  async getSkillGap(id: string): Promise<StoredSkillGap | null> {
    try {
      const skillGap = await prisma.skillGap.findUnique({
        where: { id },
        include: {
          technologies: true,
          skillGapItems: true,
          recommendations: true,
        },
      });

      if (!skillGap) return null;

      // Update last accessed
      await prisma.skillGap.update({
        where: { id },
        data: { lastAccessed: new Date() },
      });

      return this.convertToStoredFormat(skillGap);
    } catch (error) {
      console.error('❌ Error getting skill gap:', error);
      return null;
    }
  }

  /**
   * Get all skill gaps for a user
   */
  async getUserSkillGaps(userId: string): Promise<StoredSkillGap[]> {
    try {
      const skillGaps = await prisma.skillGap.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          technologies: true,
          skillGapItems: true,
          recommendations: true,
        },
      });

      return skillGaps.map((sg) => this.convertToStoredFormat(sg));
    } catch (error) {
      console.error('❌ Error getting user skill gaps:', error);
      return [];
    }
  }

  /**
   * Get skill gap summary for chat
   */
  async getSkillGapSummary(userId: string): Promise<string | null> {
    console.log('🔍 getSkillGapSummary called for userId:', userId);
    const latestGap = await this.getLatestSkillGap(userId);
    if (!latestGap) {
      console.log('❌ No latest gap found for user:', userId);
      return null;
    }

    const { skillAssessment, githubAnalysis, context } = latestGap;

    const summary = `
SKILL GAP ANALYSIS SUMMARY
Repository: ${githubAnalysis.repository}
Overall Score: ${skillAssessment.overallScore}%
Skill Level: ${githubAnalysis.skillLevel}

Technologies Found:
- Languages: ${githubAnalysis.languages.join(', ')}
- Frameworks: ${githubAnalysis.frameworks.join(', ')}
- Tools: ${githubAnalysis.tools.join(', ')}

Top Skill Gaps:
${skillAssessment.skillGaps
  .slice(0, 3)
  .map(
    (gap, index) =>
      `${index + 1}. ${gap.skill.name}: ${gap.skill.currentLevel}/5 → ${gap.skill.targetLevel}/5 (Gap: ${gap.gap})`
  )
  .join('\n')}

Key Recommendations:
${skillAssessment.recommendations
  .slice(0, 3)
  .map((rec, index) => `${index + 1}. ${rec}`)
  .join('\n')}
${
  context
    ? `\n\nContext:\n${context.targetRole ? `- Target Role: ${context.targetRole}\n` : ''}${
        context.targetIndustry ? `- Target Industry: ${context.targetIndustry}\n` : ''
      }${context.professionalGoals ? `- Goals: ${context.professionalGoals}\n` : ''}${
        context.domainKeywords && context.domainKeywords.length
          ? `- Domain Keywords: ${context.domainKeywords.join(', ')}\n`
          : ''
      }`
    : ''
}
    `.trim();

    return summary;
  }

  /**
   * Build a LangGraph research state seed from the latest stored gap analysis
   */
  async getResearchStateSeed(userId: string): Promise<Partial<ResearchState> | null> {
    const latestGap = await this.getLatestSkillGap(userId);
    if (!latestGap) {
      return null;
    }

    try {
      return buildResearchStateSeed({
        skillAssessment: latestGap.skillAssessment,
        githubAnalysis: latestGap.githubAnalysis,
        context: latestGap.context,
      });
    } catch (error) {
      console.error('❌ Failed to build research state seed:', error);
      return null;
    }
  }

  /**
   * Get specific skill information
   */
  async getSkillDetails(userId: string, skillName: string): Promise<any | null> {
    const latestGap = await this.getLatestSkillGap(userId);
    if (!latestGap) return null;

    const skillGap = latestGap.skillAssessment.skillGaps.find((gap) =>
      gap.skill.name.toLowerCase().includes(skillName.toLowerCase())
    );

    if (!skillGap) return null;

    return {
      skill: skillGap.skill,
      gap: skillGap.gap,
      priority: skillGap.priority,
      recommendations: skillGap.recommendations,
    };
  }

  /**
   * Clean up old skill gaps (older than 30 days)
   */
  async cleanup(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.skillGap.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      console.log(`🧹 Cleaned up ${result.count} old skill gaps`);
    } catch (error) {
      console.error('❌ Error cleaning up skill gaps:', error);
    }
  }

  /**
   * Convert database format to StoredSkillGap format
   */
  private convertToStoredFormat(skillGap: any): StoredSkillGap {
    // Group technologies by type
    const languages = skillGap.technologies
      .filter((t: any) => t.type === 'language')
      .map((t: any) => t.name);
    const frameworks = skillGap.technologies
      .filter((t: any) => t.type === 'framework')
      .map((t: any) => t.name);
    const tools = skillGap.technologies.filter((t: any) => t.type === 'tool').map((t: any) => t.name);

    // Reconstruct GitHubAnalysis
    const githubAnalysis: GitHubAnalysis = {
      repository: skillGap.repository,
      languages,
      frameworks,
      tools,
      skillLevel: skillGap.skillLevel as 'beginner' | 'intermediate' | 'advanced',
      technologies: [...languages, ...frameworks, ...tools],
      recommendations: skillGap.recommendations.map((rec: any) => rec.text),
    };

    // Reconstruct GapAnalysisResult
    const skillAssessment: GapAnalysisResult = {
      overallScore: skillGap.overallScore,
      skillGaps: skillGap.skillGapItems.map((item: any) => ({
        skill: {
          name: item.skillName,
          currentLevel: item.currentLevel,
          targetLevel: item.targetLevel,
        },
        gap: item.gap,
        priority: item.priority.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
        recommendations: [],
      })),
      recommendations: skillGap.recommendations.map((rec: any) => rec.text),
      categories: [],
      learningPath: [],
    };

    return {
      id: skillGap.id,
      userId: skillGap.userId,
      githubAnalysis,
      skillAssessment,
      context: undefined, // Context not stored in current schema
      createdAt: skillGap.createdAt.toISOString(),
      lastAccessed: skillGap.lastAccessed.toISOString(),
    };
  }
}

// Export singleton instance
export const skillGapStoragePrisma = new SkillGapStoragePrisma();
