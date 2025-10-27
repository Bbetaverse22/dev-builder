"use client";

import { Target } from "lucide-react";
import { AgenticSkillAnalyzer } from "@/components/devbuilder/agentic-skill-analyzer";

export default function SkillGapsPage() {
  return (
    <div className="space-y-8 text-white">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Skill Gap Analysis</h1>
            <p className="text-lg text-slate-300/80 mt-1">
              AI-powered skill gap identification and GitHub issue creation
            </p>
          </div>
        </div>
      </div>

      {/* Skill Analyzer */}
      <AgenticSkillAnalyzer showMarketing={false} />
    </div>
  );
}
