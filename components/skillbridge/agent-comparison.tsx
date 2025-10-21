"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  BarChart3, 
  BookOpen, 
  Briefcase, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface AgentComparisonProps {
  agents: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'active' | 'ready' | 'development';
    capabilities: string[];
    strengths: string[];
    limitations: string[];
    useCases: string[];
    performance: {
      speed: 'fast' | 'medium' | 'slow';
      accuracy: 'high' | 'medium' | 'low';
      reliability: 'high' | 'medium' | 'low';
    };
  }[];
}

export function AgentComparison({ agents }: AgentComparisonProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'ready': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'development': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPerformanceIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Agent Comparison</h2>
        <p className="text-muted-foreground">
          Compare agent capabilities, performance, and use cases
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {agent.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription className="text-sm">{agent.description}</CardDescription>
                  </div>
                </div>
                <Badge className={`flex items-center space-x-1 ${getStatusColor(agent.status)}`}>
                  <span className="capitalize">{agent.status}</span>
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Performance Metrics */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Performance</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Speed</span>
                    <div className={`flex items-center space-x-1 ${getPerformanceColor(agent.performance.speed)}`}>
                      {getPerformanceIcon(agent.performance.speed)}
                      <span className="text-sm capitalize">{agent.performance.speed}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accuracy</span>
                    <div className={`flex items-center space-x-1 ${getPerformanceColor(agent.performance.accuracy)}`}>
                      {getPerformanceIcon(agent.performance.accuracy)}
                      <span className="text-sm capitalize">{agent.performance.accuracy}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reliability</span>
                    <div className={`flex items-center space-x-1 ${getPerformanceColor(agent.performance.reliability)}`}>
                      {getPerformanceIcon(agent.performance.reliability)}
                      <span className="text-sm capitalize">{agent.performance.reliability}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Capabilities</h4>
                <div className="space-y-1">
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs">{capability}</span>
                    </div>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Strengths</h4>
                <div className="space-y-1">
                  {agent.strengths.slice(0, 2).map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Limitations</h4>
                <div className="space-y-1">
                  {agent.limitations.slice(0, 2).map((limitation, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-xs">{limitation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Use Cases */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Best For</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.useCases.slice(0, 3).map((useCase, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {useCase}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Predefined agent data for comparison
export const AGENT_COMPARISON_DATA = [
  {
    id: 'sanitizer',
    name: 'Security Sanitizer',
    description: 'Protects sensitive data and secrets',
    icon: <Shield className="h-4 w-4" />,
    status: 'active' as const,
    capabilities: [
      'API Key Detection',
      'Password Sanitization',
      'JWT Token Masking',
      'Credit Card Protection',
      'Email Address Masking',
      'File Path Sanitization'
    ],
    strengths: [
      'Real-time processing',
      'High accuracy detection',
      'Configurable rules'
    ],
    limitations: [
      'May false positive on URLs',
      'Requires pattern updates'
    ],
    useCases: [
      'Input Validation',
      'Data Protection',
      'Compliance'
    ],
    performance: {
      speed: 'fast' as const,
      accuracy: 'high' as const,
      reliability: 'high' as const
    }
  },
  {
    id: 'gap_analyzer',
    name: 'Gap Analysis Agent',
    description: 'Analyzes skills and identifies gaps',
    icon: <BarChart3 className="h-4 w-4" />,
    status: 'active' as const,
    capabilities: [
      'GitHub Repository Analysis',
      'Skill Level Inference',
      'Technology Detection',
      'Gap Identification',
      'Recommendation Generation',
      'Visual Skill Charts'
    ],
    strengths: [
      'Real GitHub integration',
      'Automatic skill inference',
      'Comprehensive analysis'
    ],
    limitations: [
      'Requires public repositories',
      'Limited to code analysis'
    ],
    useCases: [
      'Skill Assessment',
      'Career Planning',
      'Learning Paths'
    ],
    performance: {
      speed: 'medium' as const,
      accuracy: 'high' as const,
      reliability: 'high' as const
    }
  },
  {
    id: 'learning',
    name: 'Learning Agent',
    description: 'Creates personalized learning paths',
    icon: <BookOpen className="h-4 w-4" />,
    status: 'ready' as const,
    capabilities: [
      'Learning Path Generation',
      'Resource Recommendations',
      'Progress Tracking',
      'Skill-based Modules',
      'Adaptive Learning',
      'Milestone Setting'
    ],
    strengths: [
      'Personalized content',
      'Adaptive recommendations',
      'Progress tracking'
    ],
    limitations: [
      'Requires skill data',
      'Limited content sources'
    ],
    useCases: [
      'Skill Development',
      'Career Growth',
      'Training Programs'
    ],
    performance: {
      speed: 'medium' as const,
      accuracy: 'medium' as const,
      reliability: 'medium' as const
    }
  },
  {
    id: 'career',
    name: 'Career Agent',
    description: 'Provides career development guidance',
    icon: <Briefcase className="h-4 w-4" />,
    status: 'ready' as const,
    capabilities: [
      'Resume Analysis',
      'Job Matching',
      'Career Path Planning',
      'Skill Requirements',
      'Market Analysis',
      'Interview Prep'
    ],
    strengths: [
      'Industry insights',
      'Market awareness',
      'Career guidance'
    ],
    limitations: [
      'Requires market data',
      'Subjective recommendations'
    ],
    useCases: [
      'Job Search',
      'Career Change',
      'Professional Growth'
    ],
    performance: {
      speed: 'medium' as const,
      accuracy: 'medium' as const,
      reliability: 'medium' as const
    }
  },
  {
    id: 'progress',
    name: 'Progress Agent',
    description: 'Tracks and monitors development progress',
    icon: <TrendingUp className="h-4 w-4" />,
    status: 'ready' as const,
    capabilities: [
      'Goal Tracking',
      'Milestone Monitoring',
      'Progress Visualization',
      'Achievement Recognition',
      'Performance Metrics',
      'Timeline Management'
    ],
    strengths: [
      'Real-time tracking',
      'Visual progress',
      'Motivation features'
    ],
    limitations: [
      'Requires goal setting',
      'Manual progress updates'
    ],
    useCases: [
      'Goal Achievement',
      'Skill Development',
      'Project Tracking'
    ],
    performance: {
      speed: 'fast' as const,
      accuracy: 'high' as const,
      reliability: 'high' as const
    }
  }
];
