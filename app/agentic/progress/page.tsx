"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, CheckCircle2, Activity, Calendar, Sparkles } from "lucide-react";

export default function AgenticProgressPage() {
  return (
    <div className="space-y-8 text-white">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Progress Tracking</h1>
            <p className="text-lg text-slate-300/80 mt-1">
              Monitor your learning journey and portfolio improvements
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-white">Learning Paths</CardTitle>
            </div>
            <CardDescription className="text-slate-300/70">
              Track your progress through personalized learning paths and skill development goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4" />
              <span>Coming Soon</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-white">Completed Tasks</CardTitle>
            </div>
            <CardDescription className="text-slate-300/70">
              View all completed portfolio improvements, GitHub issues, and learning milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4" />
              <span>Coming Soon</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-white">Agent Runs</CardTitle>
            </div>
            <CardDescription className="text-slate-300/70">
              History of all analyzer runs, research results, and automated recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4" />
              <span>Coming Soon</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-orange-400" />
              <CardTitle className="text-white">Analytics Dashboard</CardTitle>
            </div>
            <CardDescription className="text-slate-300/70">
              Detailed analytics on your skill progression, time invested, and career growth metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4" />
              <span>Coming Soon</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="border-orange-400/30 bg-gradient-to-br from-orange-900/30 to-slate-900/40 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Sparkles className="h-5 w-5 text-orange-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-white text-lg">Progress Tracking Dashboard</h3>
              <p className="text-sm text-slate-300/80 leading-relaxed">
                This dashboard will provide comprehensive tracking of your learning journey. Monitor your skill development,
                review completed portfolio tasks, track recurring agent analysis runs, and visualize your career growth over time.
                All data from your analyzer sessions will be stored and displayed here with detailed analytics and insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
