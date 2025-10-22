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

const QUERY_VARIANTS = [
  { stars: 200, pushed: '2024-01-01' },
  { stars: 100, pushed: '2023-01-01' },
  { stars: 50, pushed: '2022-01-01' },
  { stars: 20, pushed: '2021-01-01' },
];

const FALLBACK_LANGUAGES = ['TypeScript', 'JavaScript', 'Java'];

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

    const languageCandidates = buildLanguageCandidates(state);
    console.log(`   Language candidates: ${languageCandidates.join(', ') || 'none'}`);

    const attempts: GitHubProject[] = [];
    let rateLimitHit = false;

    for (const language of languageCandidates) {
      for (const variant of QUERY_VARIANTS) {
        if (rateLimitHit) break;
        const query = buildSearchQuery(
          state.skillGap,
          language,
          variant.stars,
          variant.pushed
        );
        console.log(`   Query: "${query}"`);

        try {
          const { items: repos, total_count } = await client.searchRepositories(query, {
            sort: 'stars',
            order: 'desc',
            per_page: 10,
          });

          console.log(`✅ Found ${total_count} repositories, analyzing top ${repos.length}...`);

          const examples = repos.map((repo) => ({
            name: repo.full_name,
            url: repo.html_url,
            stars: repo.stargazers_count,
            description: repo.description || 'No description provided',
            source: 'github' as const,
            language: repo.language || language,
          }));

          const qualityExamples = examples.filter((ex) => {
            if (!ex.description || ex.description === 'No description provided') {
              return false;
            }
            if (variant.stars >= 100 && ex.stars < variant.stars) {
              return false;
            }
            return true;
          });

          attempts.push(...qualityExamples);

          if (qualityExamples.length >= 3) {
            logTopExamples(qualityExamples);
            return {
              examples: qualityExamples,
              iterationCount: state.iterationCount + 1,
            };
          }
        } catch (error) {
          const message = (error as Error)?.message ?? String(error);
          console.error('❌ GitHub search failed:', message);
          if (/rate limit/i.test(message)) {
            rateLimitHit = true;
            break;
          }
        }
      }
    }

    if (attempts.length > 0) {
      logTopExamples(attempts);
    }

    return {
      examples: attempts.slice(0, 5),
      iterationCount: state.iterationCount + 1,
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
function buildSearchQuery(
  skillGap: string | undefined,
  language: string | undefined,
  starThreshold: number,
  pushedAfter: string
): string {
  const qualifiers: string[] = [];

  // Make generic skill names more specific for better GitHub search results
  const enhancedSkillGap = enhanceSkillGapQuery(skillGap, language);
  qualifiers.push(enhancedSkillGap);

  if (language && language.toLowerCase() !== 'unknown') {
    qualifiers.push(`language:${language}`);
  }

  qualifiers.push(`stars:>${starThreshold}`);
  qualifiers.push(`pushed:>${pushedAfter}`);

  return qualifiers.join(' ');
}

/**
 * Enhance generic skill names to be more specific for GitHub search
 * Uses language-specific keywords to find more relevant examples
 */
function enhanceSkillGapQuery(skillGap?: string, language?: string): string {
  const fallbackLanguage = language && language.toLowerCase() !== 'unknown'
    ? `${language} developer best practices`
    : 'software engineering best practices';

  const baseSkillGap = skillGap?.trim();
  if (!baseSkillGap) {
    return fallbackLanguage;
  }

  const lower = baseSkillGap.toLowerCase();
  const lang = (language || '').toLowerCase();
  
  // Language-specific enhancements for better relevance
  const languageSpecificEnhancements: Record<string, Record<string, string>> = {
    python: {
      'frameworks & libraries': 'python (django OR flask OR fastapi OR "streamlit")',
      'frameworks and libraries': 'python (django OR flask OR fastapi OR "streamlit")',
      'testing & qa': 'python (pytest OR unittest OR nose OR behave)',
      'testing and qa': 'python (pytest OR unittest OR nose OR behave)',
      'system architecture': 'python (microservices OR "clean architecture" OR "hexagonal" OR "design patterns")',
    },
    javascript: {
      'frameworks & libraries': 'javascript (react OR vue OR angular OR node OR nextjs)',
      'frameworks and libraries': 'javascript (react OR vue OR angular OR node OR nextjs)',
      'testing & qa': 'javascript (jest OR mocha OR cypress OR playwright)',
      'testing and qa': 'javascript (jest OR mocha OR cypress OR playwright)',
    },
    typescript: {
      'frameworks & libraries': 'typescript (react OR nextjs OR nestjs OR angular)',
      'frameworks and libraries': 'typescript (react OR nextjs OR nestjs OR angular)',
      'testing & qa': 'typescript (jest OR vitest OR playwright)',
      'testing and qa': 'typescript (jest OR vitest OR playwright)',
    },
    java: {
      'frameworks & libraries': 'java (spring OR "spring boot" OR hibernate OR micronaut)',
      'frameworks and libraries': 'java (spring OR "spring boot" OR hibernate OR micronaut)',
      'testing & qa': 'java (junit OR mockito OR testng)',
      'testing and qa': 'java (junit OR mockito OR testng)',
    },
  };

  // Try language-specific enhancement first
  if (lang && languageSpecificEnhancements[lang]) {
    for (const [key, value] of Object.entries(languageSpecificEnhancements[lang])) {
      if (lower.includes(key)) {
        return value;
      }
    }
  }
  
  // Fallback to generic enhancements
  const genericEnhancements: Record<string, string> = {
    'frameworks & libraries': `${language || 'web'} (framework OR library)`,
    'frameworks and libraries': `${language || 'web'} (framework OR library)`,
    'testing & qa': `${language || ''} (testing OR qa) (framework OR unit-test OR integration-test)`,
    'testing and qa': `${language || ''} (testing OR qa) (framework OR unit-test OR integration-test)`,
    'system architecture': `${language || ''} (architecture OR "design patterns" OR microservices)`,
    'time management': '(productivity OR "time management" OR automation)',
    'project management': '"project management" OR agile OR scrum OR kanban',
    'version control': '"version control" OR git OR github',
    'deployment': `${language || ''} (deployment OR "ci/cd" OR docker OR kubernetes)`,
  };

  // Check for exact matches in generic enhancements
  for (const [key, value] of Object.entries(genericEnhancements)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  // If no match, return the original (might be already specific enough)
  return baseSkillGap;
}

function buildLanguageCandidates(state: ResearchState): string[] {
  const primary = state.detectedLanguage && state.detectedLanguage !== 'unknown'
    ? [state.detectedLanguage]
    : [];
  
  // If we have a detected primary language, ONLY use that language
  // Don't pollute results with irrelevant languages
  if (primary.length > 0) {
    return primary;
  }
  
  // Only use fallbacks if NO language was detected
  const fromContext = state.languageCandidates ?? [];
  const fallbacks = FALLBACK_LANGUAGES;

  return Array.from(new Set([...fromContext, ...fallbacks])).filter(
    Boolean
  ) as string[];
}

function logTopExamples(examples: GitHubProject[]): void {
  console.log(`✅ Found ${examples.length} high-quality examples`);
  examples.slice(0, 3).forEach((ex, index) => {
    console.log(`   ${index + 1}. ${ex.name} (⭐ ${ex.stars})`);
    console.log(`      ${ex.description.substring(0, 80)}...`);
  });
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
