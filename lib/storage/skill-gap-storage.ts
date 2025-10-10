import { GapAnalysisResult, GitHubAnalysis, ResearchContext } from '@/lib/agents/gap-analyzer';
import type { ResearchState } from '@/lib/agents/langgraph/research-agent';
import { buildResearchStateSeed } from '@/lib/agents/langgraph/utils/research-state-seed';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface StoredSkillGap {
  id: string;
  userId: string;
  githubAnalysis: GitHubAnalysis;
  skillAssessment: GapAnalysisResult;
  context?: ResearchContext;
  createdAt: string; // Store as ISO string for JSON serialization
  lastAccessed: string;
}

class SkillGapStorage {
  private storage: Map<string, StoredSkillGap> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> latest skillGapId
  private dataDir: string;
  private storageFile: string;
  private sessionsFile: string;

  constructor() {
    this.dataDir = join(process.cwd(), '.data');
    this.storageFile = join(this.dataDir, 'skill-gaps.json');
    this.sessionsFile = join(this.dataDir, 'user-sessions.json');
    this.loadFromDisk();
  }

  /**
   * Load data from disk on initialization
   */
  private async loadFromDisk(): Promise<void> {
    try {
      // Ensure data directory exists
      await mkdir(this.dataDir, { recursive: true });

      // Load skill gaps
      try {
        const gapsData = await readFile(this.storageFile, 'utf-8');
        const gaps = JSON.parse(gapsData);
        this.storage = new Map(Object.entries(gaps));
        console.log('📂 Loaded', this.storage.size, 'skill gaps from disk');
      } catch (error) {
        console.log('📂 No existing skill gaps file found, starting fresh');
      }

      // Load user sessions
      try {
        const sessionsData = await readFile(this.sessionsFile, 'utf-8');
        const sessions = JSON.parse(sessionsData);
        this.userSessions = new Map(Object.entries(sessions));
        console.log('📂 Loaded', this.userSessions.size, 'user sessions from disk');
      } catch (error) {
        console.log('📂 No existing user sessions file found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading data from disk:', error);
    }
  }

  /**
   * Save data to disk
   */
  private async saveToDisk(): Promise<void> {
    try {
      // Save skill gaps
      const gapsObj = Object.fromEntries(this.storage);
      await writeFile(this.storageFile, JSON.stringify(gapsObj, null, 2));

      // Save user sessions
      const sessionsObj = Object.fromEntries(this.userSessions);
      await writeFile(this.sessionsFile, JSON.stringify(sessionsObj, null, 2));
    } catch (error) {
      console.error('❌ Error saving data to disk:', error);
    }
  }

  /**
   * Store skill gap analysis results
   */
  async storeSkillGap(
    userId: string,
    githubAnalysis: GitHubAnalysis,
    skillAssessment: GapAnalysisResult,
    context?: ResearchContext
  ): Promise<string> {
    const id = `skillgap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storedGap: StoredSkillGap = {
      id,
      userId,
      githubAnalysis,
      skillAssessment,
      context,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };

    this.storage.set(id, storedGap);
    this.userSessions.set(userId, id);
    
    // Save to disk
    await this.saveToDisk();
    
    console.log('💾 STORED skill gap:', {
      id,
      userId,
      repository: githubAnalysis.repository,
      context,
      totalStoredGaps: this.storage.size,
      userSessionMapped: this.userSessions.has(userId),
      userSessionsBefore: Array.from(this.userSessions.entries())
    });
    
    // Verify the update
    const verifyLatest = this.userSessions.get(userId);
    console.log('🔍 Verification - latest ID for user after store:', verifyLatest);
    
    return id;
  }

  /**
   * Get the latest skill gap analysis for a user
   */
  getLatestSkillGap(userId: string): StoredSkillGap | null {
    const latestId = this.userSessions.get(userId);
    console.log('🔍 getLatestSkillGap debug:', {
      userId,
      latestId,
      userSessionsSize: this.userSessions.size,
      allUserSessions: Array.from(this.userSessions.entries())
    });
    
    if (!latestId) return null;

    const skillGap = this.storage.get(latestId);
    if (skillGap) {
      skillGap.lastAccessed = new Date().toISOString();
      console.log('✅ Found latest skill gap:', {
        id: skillGap.id,
        repository: skillGap.githubAnalysis.repository,
        createdAt: skillGap.createdAt
      });
    } else {
      console.log('❌ Latest ID not found in storage:', latestId);
    }
    
    return skillGap || null;
  }

  /**
   * Get skill gap by ID
   */
  getSkillGap(id: string): StoredSkillGap | null {
    const skillGap = this.storage.get(id);
    if (skillGap) {
      skillGap.lastAccessed = new Date().toISOString();
    }
    return skillGap || null;
  }

  /**
   * Get all skill gaps for a user
   */
  getUserSkillGaps(userId: string): StoredSkillGap[] {
    const userGaps = Array.from(this.storage.values())
      .filter(gap => gap.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return userGaps;
  }

  /**
   * Get skill gap summary for chat
   */
  getSkillGapSummary(userId: string): string | null {
    console.log('🔍 getSkillGapSummary called for userId:', userId);
    const latestGap = this.getLatestSkillGap(userId);
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
${skillAssessment.skillGaps.slice(0, 3).map((gap, index) => 
  `${index + 1}. ${gap.skill.name}: ${gap.skill.currentLevel}/5 → ${gap.skill.targetLevel}/5 (Gap: ${gap.gap})`
).join('\n')}

Key Recommendations:
${skillAssessment.recommendations.slice(0, 3).map((rec, index) => 
  `${index + 1}. ${rec}`
).join('\n')}
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
   * Build a LangGraph research state seed from the latest stored gap analysis.
   */
  getResearchStateSeed(userId: string): Partial<ResearchState> | null {
    const latestGap = this.getLatestSkillGap(userId);
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
  getSkillDetails(userId: string, skillName: string): any | null {
    const latestGap = this.getLatestSkillGap(userId);
    if (!latestGap) return null;

    const skillGap = latestGap.skillAssessment.skillGaps.find(
      gap => gap.skill.name.toLowerCase().includes(skillName.toLowerCase())
    );

    if (!skillGap) return null;

    return {
      skill: skillGap.skill,
      gap: skillGap.gap,
      priority: skillGap.priority,
      recommendations: skillGap.recommendations
    };
  }

  /**
   * Clean up old skill gaps (older than 30 days)
   */
  async cleanup(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const [id, skillGap] of this.storage.entries()) {
      if (new Date(skillGap.createdAt) < thirtyDaysAgo) {
        this.storage.delete(id);
      }
    }
    
    // Save changes to disk
    await this.saveToDisk();
  }
}

// Export singleton instance
export const skillGapStorage = new SkillGapStorage();

// Cleanup can be called manually if needed
// Note: Automatic cleanup disabled to avoid issues with server components
