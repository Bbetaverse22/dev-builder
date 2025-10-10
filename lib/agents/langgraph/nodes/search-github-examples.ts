/**
 * Search GitHub Examples Node for LangGraph Research Agent
 *
 * This node searches GitHub for high-quality example repositories
 * related to the user's skill gap and detected language.
 *
 * Uses GitHub REST API (works on Vercel without Docker)
 */

import { GitHubClient } from '@/lib/github/github-client';
import type { ResearchState, GitHubProject } from '../research-agent';

/**
 * Search GitHub Examples Node
 *
 * Takes skill gap and language, searches GitHub for relevant repositories.
 * Filters for high-quality examples (stars, recency, topics).
 */
export async function searchGitHubExamplesNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  console.log('🔍 Searching GitHub for example repositories...');
  console.log(`   Skill: ${state.skillGap}`);
  console.log(`   Language: ${state.detectedLanguage}`);

  try {
    const client = new GitHubClient(process.env.GITHUB_TOKEN);

    // Build search query with qualifiers
    // Format: "{skill_gap} {language} stars:>100 pushed:>2023-01-01"
    const query = buildSearchQuery(state.skillGap, state.detectedLanguage);
    console.log(`   Query: "${query}"`);

    // Search repositories
    const { items: repos, total_count } = await client.searchRepositories(query, {
      sort: 'stars',
      order: 'desc',
      per_page: 10, // Top 10 results
    });

    console.log(`✅ Found ${total_count} repositories, analyzing top ${repos.length}...`);

    // Convert to GitHubProject format
    const examples: GitHubProject[] = repos.map((repo) => ({
      name: repo.full_name,
      url: repo.html_url,
      stars: repo.stargazers_count,
      description: repo.description || 'No description provided',
    }));

    // Filter for quality (minimum star threshold already in query)
    const qualityExamples = examples.filter((ex) => {
      // Must have description
      if (!ex.description || ex.description === 'No description provided') {
        return false;
      }
      // Must have reasonable stars
      if (ex.stars < 100) {
        return false;
      }
      return true;
    });

    console.log(`✅ Found ${qualityExamples.length} high-quality examples`);

    // Log top 3 for user visibility
    qualityExamples.slice(0, 3).forEach((ex, i) => {
      console.log(`   ${i + 1}. ${ex.name} (⭐ ${ex.stars})`);
      console.log(`      ${ex.description.substring(0, 80)}...`);
    });

    return {
      examples: qualityExamples,
      iterationCount: 1,
    };
  } catch (error) {
    console.error('❌ GitHub search failed:', error);

    // Return empty results on error (don't block the workflow)
    return {
      examples: [],
      iterationCount: 1,
    };
  }
}

/**
 * Build GitHub search query with qualifiers
 *
 * Constructs a search query that:
 * - Includes skill gap keywords
 * - Filters by language
 * - Requires minimum stars (quality indicator)
 * - Filters for recent activity (not abandoned)
 *
 * @example
 * buildSearchQuery("React hooks authentication", "TypeScript")
 * // Returns: "React hooks authentication language:TypeScript stars:>100 pushed:>2023-01-01"
 */
function buildSearchQuery(skillGap: string, language: string): string {
  const qualifiers: string[] = [];

  // Add skill gap keywords
  qualifiers.push(skillGap);

  // Add language filter (if specified)
  if (language && language.toLowerCase() !== 'unknown') {
    qualifiers.push(`language:${language}`);
  }

  // Add quality filters
  qualifiers.push('stars:>100'); // Minimum 100 stars
  qualifiers.push('pushed:>2023-01-01'); // Active in last 2 years

  return qualifiers.join(' ');
}

/**
 * Score GitHub repository quality
 *
 * Provides a quality score (0-1) based on:
 * - Star count (popularity)
 * - Description quality
 * - Recent activity
 * - Forks (community adoption)
 *
 * Used for ranking results when needed.
 */
export function scoreRepositoryQuality(repo: {
  stars: number;
  description: string;
  forks?: number;
  updated_at?: string;
}): number {
  let score = 0;

  // Stars (max 0.4 points)
  // 100 stars = 0.1, 500 stars = 0.2, 1000+ stars = 0.4
  if (repo.stars >= 1000) score += 0.4;
  else if (repo.stars >= 500) score += 0.3;
  else if (repo.stars >= 100) score += 0.2;
  else score += 0.1;

  // Description (max 0.3 points)
  if (repo.description && repo.description.length > 50) {
    score += 0.3;
  } else if (repo.description && repo.description.length > 20) {
    score += 0.2;
  } else if (repo.description) {
    score += 0.1;
  }

  // Forks (max 0.2 points)
  if (repo.forks && repo.forks >= 100) score += 0.2;
  else if (repo.forks && repo.forks >= 50) score += 0.15;
  else if (repo.forks && repo.forks >= 10) score += 0.1;

  // Recency (max 0.1 points)
  if (repo.updated_at) {
    const lastUpdate = new Date(repo.updated_at);
    const monthsSinceUpdate =
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceUpdate < 6) score += 0.1;
    else if (monthsSinceUpdate < 12) score += 0.05;
  }

  return Math.min(score, 1); // Cap at 1.0
}
