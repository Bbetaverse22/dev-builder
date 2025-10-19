import type {
  FocusSkill,
  ResearchState,
  GitHubProject,
} from "../research-agent";
import type {
  GapAnalysisResult,
  GitHubAnalysis,
  ResearchContext,
} from "../../gap-analyzer";

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function buildFocusSkills(skillAssessment: GapAnalysisResult): FocusSkill[] {
  const focusMap = new Map<string, FocusSkill>();

  (skillAssessment.skillGaps ?? [])
    .filter((gap) => gap?.skill?.name)
    .slice(0, 5)
    .forEach((gap) => {
      const name = gap.skill.name;
      const existing = focusMap.get(name);
      const blended: FocusSkill = {
        name,
        gap: Math.max(existing?.gap ?? 0, gap.gap ?? 0),
        priority: Math.max(existing?.priority ?? 0, gap.priority ?? 0),
      };
      focusMap.set(name, blended);
    });

  return Array.from(focusMap.values());
}

function inferLanguageFromSkill(skillName: string): string | null {
  const normalized = normalizeKeyword(skillName);
  if (normalized.includes("typescript")) return "TypeScript";
  if (normalized.includes("javascript")) return "JavaScript";
  if (normalized.includes("react")) return "JavaScript";
  if (normalized.includes("node")) return "JavaScript";
  if (normalized.includes("express")) return "JavaScript";
  if (normalized.includes("nestjs")) return "TypeScript";
  if (normalized.includes("next.js") || normalized.includes("nextjs")) return "JavaScript";
  if (normalized.includes("java")) return "Java";
  if (normalized.includes("spring")) return "Java";
  if (normalized.includes("kotlin")) return "Kotlin";
  if (normalized.includes("python")) return "Python";
  if (normalized.includes("django")) return "Python";
  if (normalized.includes("flask")) return "Python";
  if (normalized.includes("css")) return "CSS";
  if (normalized.includes("html")) return "HTML";
  return null;
}


function suggestQueries(
  focusSkills: FocusSkill[],
  context?: ResearchContext
): string[] {
  const role = context?.targetRole;
  const industry = context?.targetIndustry;

  const baseQueries = focusSkills.slice(0, 4).map((skill) => {
    const parts = [skill.name];
    if (industry) parts.push(industry);
    if (role) parts.push("case study");
    return parts.join(" ").trim();
  });

  if (role && industry) {
    baseQueries.push(`${role} ${industry} roadmap`);
  } else if (role) {
    baseQueries.push(`${role} portfolio examples`);
  }

  return Array.from(new Set(baseQueries)).filter(Boolean);
}

export interface ResearchStateSeedOptions {
  skillAssessment: GapAnalysisResult;
  githubAnalysis: GitHubAnalysis;
  context?: ResearchContext;
  examples?: GitHubProject[];
}

export function buildResearchStateSeed({
  skillAssessment,
  githubAnalysis,
  context,
  examples,
}: ResearchStateSeedOptions): Partial<ResearchState> {
  const focusSkills = buildFocusSkills(skillAssessment);
  const queries = suggestQueries(focusSkills, context);
  const languageCandidates = [
    ...(githubAnalysis?.languages ?? []),
    ...new Set(
      focusSkills
        .map((skill) => inferLanguageFromSkill(skill.name))
        .filter(Boolean) as string[]
    ),
  ].filter(Boolean);

  return {
    skillGap: skillAssessment.skillGaps?.[0]?.skill?.name ?? "",
    detectedLanguage: githubAnalysis.languages?.[0] ?? "unknown",
    userContext: context?.professionalGoals ?? "",
    targetRole: context?.targetRole,
    targetIndustry: context?.targetIndustry,
    professionalGoals: context?.professionalGoals,
    focusSkills,
    learningObjectives: skillAssessment.learningPath ?? [],
    queries,
    languageCandidates,
    examples,
    // Explicitly initialize all search-related fields as empty
    // to ensure fresh research on each run
    searchResults: [],
    evaluatedResults: [],
    searchIterations: [],
    scrapedResources: [],
    comparativeInsights: [],
    learningPath: [],
    confidenceBreakdown: undefined,
    searchNotes: [],
    recommendations: [],
  };
}
