"use client";

import { Briefcase } from "lucide-react";
import { PortfolioDisplay } from "@/components/devbuilder/portfolio-display";

export default function AgenticPortfolioPage() {
  return (
    <div className="space-y-8 text-white">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Portfolio Builder</h1>
            <p className="text-lg text-slate-300/80 mt-1">
              Your portfolio strengths and actionable improvements
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Display */}
      <PortfolioDisplay />
    </div>
  );
}
