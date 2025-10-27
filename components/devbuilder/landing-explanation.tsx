"use client";

/**
 * Landing Explanation Section
 * Comprehensive overview of DevBuilder before the analysis input
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Github, 
  TrendingUp, 
  Rocket,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Search,
  Target,
  Activity
} from 'lucide-react';

export function LandingExplanation() {
  const scrollToAnalysis = () => {
    document.getElementById('analysis-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div id="features" className="text-center space-y-6">
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          DevBuilder
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
          Analyze. Research. Act.<br />
          <span className="font-semibold text-white">DevBuilder</span> — the agentic AI platform that turns skills into progress.
        </p>

      </div>

      {/* Problem Statement */}
      <Card className="max-w-4xl mx-auto border-2 border-orange-500/50 bg-orange-950/20 backdrop-blur">
        <CardContent className="p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">💡 The Challenge</h2>
          <p className="text-lg text-gray-300">
            Traditional career tools give you <span className="font-semibold text-white">reports and recommendations</span>. 
            But then what? You're left to figure out the next steps on your own.
          </p>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 mt-1">•</span>
              <span>Generic advice that doesn't match your actual GitHub portfolio</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 mt-1">•</span>
              <span>No real-time job market data or salary insights</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 mt-1">•</span>
              <span>Static recommendations that never adapt to your progress</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-orange-400 mt-1">•</span>
              <span>You have to manually improve your portfolio yourself</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Solution */}
      <Card className="max-w-4xl mx-auto border-2 border-blue-500/50 bg-gradient-to-br from-blue-950/30 to-purple-950/30 backdrop-blur">
        <CardContent className="p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">✅ The DevBuilder Solution</h2>
          <p className="text-lg text-gray-300">
            An <span className="font-semibold text-white">agentic AI system</span> that goes beyond analysis. 
            It <span className="font-semibold text-blue-400">researches</span> the market, 
            <span className="font-semibold text-purple-400"> creates</span> GitHub issues, 
            and <span className="font-semibold text-pink-400">monitors</span> your progress — all automatically.
          </p>
        </CardContent>
      </Card>

      {/* How It Works - 4 Phases */}
      <div id="how-it-works" className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-center mb-8 text-white">How It Works: The Agentic Loop</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phase 1 */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-950">
                  <Search className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">Phase 1</Badge>
                  <h3 className="font-bold text-lg">Deep GitHub Analysis</h3>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Analyzes your repositories, tech stack, and code quality</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Auto-detects your role (Frontend, Backend, DevOps, Data, etc.)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Identifies skill gaps vs. industry standards</span>
                </li>
              </ul>
              <Badge variant="secondary" className="text-xs">✅ REAL - Already Working</Badge>
            </CardContent>
          </Card>

          {/* Phase 2 */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-950">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">Phase 2</Badge>
                  <h3 className="font-bold text-lg">Market Intelligence</h3>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Scrapes 100+ job postings (LinkedIn, Indeed, AngelList)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Analyzes real-time salary data for your target role</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Finds trending skills and emerging technologies</span>
                </li>
              </ul>
              <Badge variant="secondary" className="text-xs">🚧 Simulated - V1 Implementation</Badge>
            </CardContent>
          </Card>

          {/* Phase 3 */}
          <Card className="border-2 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950">
                  <Rocket className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">Phase 3</Badge>
                  <h3 className="font-bold text-lg">Autonomous Actions</h3>
                  <Badge variant="secondary" className="text-xs mt-1">
                    👤 With Your Permission
                  </Badge>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Creates GitHub issues in your repos <span className="font-semibold text-foreground">(after approval)</span></span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Generates README drafts <span className="font-semibold text-foreground">(you review first)</span></span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Suggests code quality improvements <span className="font-semibold text-foreground">(optional)</span></span>
                </li>
              </ul>
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">You're in control:</span> The agent prepares actions but waits for your approval before making any changes to your repositories.
              </div>
              <Badge variant="secondary" className="text-xs">🚧 Simulated - V1 Implementation</Badge>
            </CardContent>
          </Card>

          {/* Phase 4 */}
          <Card className="border-2 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-950">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">Phase 4</Badge>
                  <h3 className="font-bold text-lg">Continuous Monitoring</h3>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span>Tracks your progress on created GitHub issues</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span>Adapts recommendations based on your completed work</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5" />
                  <span>Weekly check-ins to measure portfolio improvement</span>
                </li>
              </ul>
              <Badge variant="secondary" className="text-xs">🚧 Simulated - V1 Implementation</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* What Makes It Agentic */}
      <Card className="max-w-4xl mx-auto border-2 border-primary/20">
        <CardContent className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center">What Makes It "Agentic"?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">🤖 Traditional Gen AI</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Generates reports and analysis</li>
                <li>• One-time execution</li>
                <li>• Static recommendations</li>
                <li>• No follow-up actions</li>
                <li>• User does everything manually</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-primary">🚀 Agentic AI (DevBuilder)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Takes autonomous actions <span className="text-muted-foreground">(with your approval)</span></span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Continuous loops (monitors progress)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Adapts to user behavior and feedback</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Human-in-the-loop controls</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <div className="text-center space-y-6 py-8">
        <h2 className="text-3xl font-bold italic text-purple-600">Ready to Level Up Your Career?</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Enter your GitHub username below and let DevBuilder's AI agents analyze your portfolio, 
          research the job market, and create actionable improvement tasks.
        </p>
        
        <Button size="lg" onClick={scrollToAnalysis} className="text-lg px-8 py-6">
          <Rocket className="h-5 w-5 mr-2" />
          Start Your Analysis
          <ChevronDown className="h-5 w-5 ml-2 animate-bounce" />
        </Button>

        <p className="text-sm text-muted-foreground">
          Free • No signup required • Takes 2-3 minutes
        </p>
      </div>
    </div>
  );
}

