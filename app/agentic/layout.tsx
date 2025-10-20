"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  LayoutDashboard,
  Target,
  Briefcase,
  TrendingUp,
  BookOpen,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalysisProvider } from "@/lib/contexts/analysis-context";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/agentic" },
  { id: "skill-gaps", label: "Skill Gap Analysis", icon: Target, href: "/agentic/skill-gaps" },
  { id: "portfolio", label: "Portfolio Builder", icon: Briefcase, href: "/agentic/portfolio" },
  { id: "learning", label: "Learning Resources", icon: BookOpen, href: "/agentic/learning" },
  { id: "templates", label: "Template Generator", icon: Sparkles, href: "/agentic/templates" },
  // { id: "progress", label: "Progress Tracking", icon: TrendingUp, href: "/agentic/progress" },
] as const;

export default function AgenticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const renderNavigation = () => (
    <div className="flex h-full flex-col">
      <div className="px-4 py-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-2 text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/70">
                Dev-Builder
              </p>
              <h1 className="text-lg font-semibold text-white">Analyze. Learn. Build.</h1>
            </div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 pb-6">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/agentic" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-slate-300/80 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-300/80")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <AnalysisProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="flex min-h-screen">
          {/* Desktop navigation */}
          <aside className="hidden w-72 border-r border-white/10 bg-slate-900/40 backdrop-blur lg:flex lg:flex-col">
            {renderNavigation()}
          </aside>

          {/* Mobile navigation */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div className="w-72 border-r border-white/10 bg-slate-900/95 backdrop-blur">
                {renderNavigation()}
              </div>
              <button
                aria-label="Close navigation"
                className="flex-1 bg-black/60"
                onClick={() => setMobileOpen(false)}
              />
            </div>
          )}

          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 text-sm text-white backdrop-blur lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle navigation"
                onClick={() => setMobileOpen((open) => !open)}
                className="text-white hover:bg-white/10"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <span className="font-semibold uppercase tracking-wide text-slate-200">
                Dev-Builder
              </span>
              <div className="w-9" />
            </header>

            <main className="flex-1">
              <div className="container mx-auto px-4 py-10">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AnalysisProvider>
  );
}
