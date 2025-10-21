/**
 * Prisma-based Skill Gap Storage
 * Replaces file-based storage with database persistence
 * Issue #30: Refactor SkillGapStorage to use Prisma
 */

import { prisma } from '@/lib/db';
import { GapAnalysisResult, GitHubAnalysis, ResearchContext } from '@/lib/agents/gap-analyzer';
import type { ResearchState } from '@/lib/agents/langgraph/research-agent';
import { buildResearchStateSeed } from '@/lib/agents/langgraph/utils/research-state-seed';
import { formatGapValue } from '@/lib/utils';

export class DatabaseUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseUnavailableError';
  }
}

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
  private static readonly RETRY_INTERVAL_MS = 60_000;

  private databaseStatus: {
    state: 'unknown' | 'available' | 'unavailable';
    lastChecked: number;
    error?: unknown;
  } = { state: 'unknown', lastChecked: 0 };

  private lastLoggedErrorSignature?: string;

  /**
   * Store skill gap analysis results in database
   */
  async storeSkillGap(
    userId: string,
    githubAnalysis: GitHubAnalysis,
    skillAssessment: GapAnalysisResult,
    context?: ResearchContext
  ): Promise<string> {
    if (!(await this.ensureDatabaseAvailable())) {
      throw new DatabaseUnavailableError(
        this.buildDatabaseUnavailableMessage('store the skill gap analysis'),
        { cause: this.databaseStatus.error }
      );
    }

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
      if (this.isDatabaseConnectionError(error)) {
        this.markDatabaseUnavailable(error);
        throw new DatabaseUnavailableError(
          this.buildDatabaseUnavailableMessage('store the skill gap analysis'),
          { cause: error }
        );
      }
      throw error;
    }
  }

  /**
   * Get the latest skill gap analysis for a user
   */
  async getLatestSkillGap(userId: string): Promise<StoredSkillGap | null> {
    if (!(await this.ensureDatabaseAvailable())) {
      return null;
    }

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
      if (this.isDatabaseConnectionError(error)) {
        this.markDatabaseUnavailable(error);
      }
      return null;
    }
  }

  /**
   * Get skill gap by ID
   */
  async getSkillGap(id: string): Promise<StoredSkillGap | null> {
    if (!(await this.ensureDatabaseAvailable())) {
      return null;
    }

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
      if (this.isDatabaseConnectionError(error)) {
        this.markDatabaseUnavailable(error);
      }
      return null;
    }
  }

  /**
   * Get all skill gaps for a user
   */
  async getUserSkillGaps(userId: string): Promise<StoredSkillGap[]> {
    if (!(await this.ensureDatabaseAvailable())) {
      return [];
    }

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
      if (this.isDatabaseConnectionError(error)) {
        this.markDatabaseUnavailable(error);
      }
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
      `${index + 1}. ${gap.skill.name}: ${formatGapValue(gap.skill.currentLevel)}/5 → ${formatGapValue(gap.skill.targetLevel)}/5 (Gap: ${formatGapValue(gap.gap)})`
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
      }${context.professionalGoals ? `- Goals: ${context.professionalGoals}\n` : ''}`
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
    if (!(await this.ensureDatabaseAvailable())) {
      return;
    }

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
      if (this.isDatabaseConnectionError(error)) {
        this.markDatabaseUnavailable(error);
      }
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
        priority: this.mapPriorityToScore(item.priority),
        recommendations: [],
        confidence: this.mapConfidenceToLabel(item.confidence),
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

  private mapPriorityToScore(priority: string): number {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 9;
      case 'medium':
        return 6.5;
      case 'low':
        return 4;
      default:
        return 5;
    }
  }

  private mapConfidenceToLabel(confidence?: number | null): 'low' | 'medium' | 'high' {
    if (confidence == null) {
      return 'medium';
    }

    if (confidence >= 0.7) {
      return 'high';
    }

    if (confidence >= 0.45) {
      return 'medium';
    }

    return 'low';
  }

  private async ensureDatabaseAvailable(): Promise<boolean> {
    const now = Date.now();

    if (this.databaseStatus.state === 'available') {
      return true;
    }

    if (
      this.databaseStatus.state === 'unavailable' &&
      now - this.databaseStatus.lastChecked < SkillGapStoragePrisma.RETRY_INTERVAL_MS
    ) {
      return false;
    }

    try {
      await prisma.$connect();
      this.databaseStatus = {
        state: 'available',
        lastChecked: now,
      };
      return true;
    } catch (error) {
      this.markDatabaseUnavailable(error, now);
      return false;
    }
  }

  private logDatabaseConnectionError(error: unknown): void {
    const signature = this.getErrorSignature(error);

    if (signature && signature === this.lastLoggedErrorSignature) {
      return;
    }

    this.lastLoggedErrorSignature = signature;

    console.warn(
      '⚠️ Prisma database connection failed. Skill gap persistence is temporarily disabled.',
      this.describeDatabaseError(error)
    );
    console.warn(
      '➡️  Verify your PostgreSQL instance is reachable (local service or remote Prisma Data Platform) and that `DATABASE_URL` points to it.',
      this.getDatabaseLocationHint()
    );
    console.warn('   After the database is available, try `pnpm prisma db push` to sync the schema.');
  }

  private getDatabaseLocationHint(): string {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
      return 'DATABASE_URL is not set.';
    }

    try {
      // Allow prisma:// URLs by replacing the custom scheme before parsing
      const normalized = rawUrl.replace(/^prisma\+/, '');
      const parsed = new URL(normalized);
      const host = parsed.hostname || 'localhost';
      const port = parsed.port ? `:${parsed.port}` : '';
      const database =
        parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/^\//, '') : '(default schema)';
      return `Configured host: ${host}${port}, database: ${database}`;
    } catch {
      return 'DATABASE_URL is set but could not be parsed.';
    }
  }

  private getErrorSignature(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as { code?: unknown }).code);
    }

    if (error instanceof Error) {
      return error.name;
    }

    return undefined;
  }

  private describeDatabaseError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: string }).code;
      return code ? `Prisma error code ${code}` : 'Unknown Prisma error';
    }

    return 'Unknown error';
  }

  private buildDatabaseUnavailableMessage(action: string): string {
    return [
      `Unable to ${action} because the database connection is unavailable.`,
      'Confirm that your PostgreSQL instance (local server or hosted provider such as Prisma Data Platform) is running and reachable.',
      'Update `DATABASE_URL` (and `PRISMA_DATABASE_URL` if you use Accelerate) to the correct values.',
      'After the database is available, run `pnpm prisma db push` to initialize the schema if needed.',
    ].join(' ');
  }

  private isDatabaseConnectionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: unknown }).code;
    if (code === 'P1001' || code === 'P1002') {
      return true;
    }

    if (error instanceof Error) {
      return error.message.includes("Can't reach database server");
    }

    return false;
  }

  private markDatabaseUnavailable(error: unknown, timestamp: number = Date.now()): void {
    this.databaseStatus = {
      state: 'unavailable',
      lastChecked: timestamp,
      error,
    };
    this.logDatabaseConnectionError(error);
  }
}

// Export singleton instance
export const skillGapStoragePrisma = new SkillGapStoragePrisma();
