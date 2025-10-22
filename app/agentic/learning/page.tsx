"use client";

import { BookOpen } from "lucide-react";
import { LearningDisplay } from "@/components/devbuilder/learning-display";

export default function LearningResourcesPage() {
  return (
    <div className="space-y-8 text-white">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Learning Resources</h1>
            <p className="text-lg text-slate-300/80 mt-1">
              AI-curated learning paths and resources tailored to your skill gaps
            </p>
          </div>
        </div>
      </div>

      {/* Learning Display */}
      <LearningDisplay />
    </div>
  );
}
