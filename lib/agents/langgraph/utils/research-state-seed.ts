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
  return (skillAssessment.skillGaps ?? [])
    .filter((gap) => gap?.skill?.name)
    .slice(0, 5)
    .map((gap) => ({
      name: gap.skill.name,
      gap: gap.gap,
      priority: gap.priority,
    }));
}

function buildDomainKeywords(
  githubAnalysis: GitHubAnalysis,
  context?: ResearchContext
): string[] {
  const keywordSet = new Set<string>();

  const addKeyword = (keyword?: string) => {
    if (!keyword) return;
    const normalized = normalizeKeyword(keyword);
    if (normalized.length) {
      keywordSet.add(normalized);
    }
  };

  context?.domainKeywords?.forEach(addKeyword);
  addKeyword(context?.targetIndustry);

  githubAnalysis.languages?.forEach(addKeyword);
  githubAnalysis.frameworks?.forEach(addKeyword);
  githubAnalysis.technologies?.forEach(addKeyword);
  githubAnalysis.recommendations?.forEach((rec) => {
    rec.split(/[,/]/).forEach(addKeyword);
  });

  return Array.from(keywordSet);
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
  const domainKeywords = buildDomainKeywords(githubAnalysis, context);
  const queries = suggestQueries(focusSkills, context);

  return {
    skillGap: skillAssessment.skillGaps?.[0]?.skill?.name ?? "",
    detectedLanguage: githubAnalysis.languages?.[0] ?? "unknown",
    userContext: context?.professionalGoals ?? "",
    targetRole: context?.targetRole,
    targetIndustry: context?.targetIndustry,
    professionalGoals: context?.professionalGoals,
    domainKeywords,
    focusSkills,
    learningObjectives: skillAssessment.learningPath ?? [],
    queries,
    examples,
  };
}
