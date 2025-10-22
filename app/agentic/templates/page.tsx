"use client";

import { Sparkles } from "lucide-react";
import { TemplateGeneratorDisplay } from "@/components/devbuilder/template-generator-display";

export default function TemplateGeneratorPage() {
  return (
    <div className="space-y-8 text-white">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Template Generator</h1>
            <p className="text-lg text-slate-300/80 mt-1">
              Extract ready-to-use templates from example repositories and create PRs to your repo
            </p>
          </div>
        </div>
      </div>

      {/* Template Generator Display */}
      <TemplateGeneratorDisplay />
    </div>
  );
}
