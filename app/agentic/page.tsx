"use client";

import { AgenticSkillAnalyzer } from "@/components/skillbridge/agentic-skill-analyzer";
import { AnimatedHero } from "@/components/skillbridge/animated-hero";

export default function AgenticAnalyzerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <main className="container mx-auto px-4 py-10 space-y-10">
        <AnimatedHero enableCtas={false} />
        <AgenticSkillAnalyzer showMarketing={false} />
      </main>
    </div>
  );
}
