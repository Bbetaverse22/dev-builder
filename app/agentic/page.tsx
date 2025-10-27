"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedHero } from "@/components/devbuilder/animated-hero";
import { Target, Briefcase, TrendingUp, BookOpen, Sparkles, ArrowRight } from "lucide-react";

export default function AgenticDashboardPage() {
  return (
    <div className="space-y-10 text-white">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 min-h-[300px]">
        <div className="absolute inset-0">
          <Image
            src="/agentic-gradient-bg.png"
            alt="Agentic gradient background"
            fill
            priority
            unoptimized
            className="object-cover animate-pulse"
            style={{ animationDuration: '4s' }}
          />
        </div>
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="relative z-10 space-y-5 p-12">
          <h1 className="text-5xl font-black tracking-tight drop-shadow-lg md:text-6xl">
            <span className="text-white">Welcome to </span>
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              DevBuilder
            </span>
          </h1>
          <p className="text-2xl text-slate-100/90 leading-relaxed md:text-3xl">
            AI-powered career growth for developers. Analyze your skills, improve your portfolio, and track your progress.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-slate-900/40 backdrop-blur hover:border-white/20 transition-all min-h-[280px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
          <CardHeader className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Skill Gap Analysis</CardTitle>
            </div>
            <CardDescription className="text-base text-slate-300/80 leading-relaxed">
              Analyze your GitHub profile and identify skill gaps with AI-powered insights. Get personalized recommendations for career growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agentic/skill-gaps">
              <Button className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white hover:scale-105 transition-transform">
                Start Analysis
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur hover:border-white/20 transition-all min-h-[280px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/20">
          <CardHeader className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 hover:scale-110 transition-transform">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Portfolio Builder</CardTitle>
            </div>
            <CardDescription className="text-base text-slate-300/80 leading-relaxed">
              Build and improve your developer portfolio with AI guidance. Generate GitHub issues and improvement tasks automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agentic/portfolio">
              <Button className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white hover:scale-105 transition-transform">
                Build Portfolio
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur hover:border-white/20 transition-all min-h-[280px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/20">
          <CardHeader className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Learning Resources</CardTitle>
            </div>
            <CardDescription className="text-base text-slate-300/80 leading-relaxed">
              Access AI-curated learning paths and resources tailored to your needs. Discover tutorials, courses, and GitHub examples.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agentic/learning">
              <Button className="w-full h-12 text-base bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white hover:scale-105 transition-transform">
                View Resources
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/40 backdrop-blur hover:border-white/20 transition-all min-h-[280px] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700 hover:scale-105 hover:shadow-2xl hover:shadow-fuchsia-500/20">
          <CardHeader className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-fuchsia-500 to-pink-500 hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Template Generator</CardTitle>
            </div>
            <CardDescription className="text-base text-slate-300/80 leading-relaxed">
              Extract ready-to-use templates from GitHub repositories. Generate code templates and create pull requests automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agentic/templates">
              <Button className="w-full h-12 text-base bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-600 hover:to-pink-600 text-white hover:scale-105 transition-transform">
                Generate Templates
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
