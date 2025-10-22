"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Play,
  Shield,
  BarChart3,
  BookOpen,
  Briefcase,
  TrendingUp,
  MessageSquare
} from "lucide-react";

interface WorkflowStep {
  id: string;
  agent: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration?: number;
  output?: string;
}

interface MultiAgentWorkflowProps {
  title: string;
  description: string;
  steps: WorkflowStep[];
  onStart?: () => void;
  onReset?: () => void;
}

export function MultiAgentWorkflow({
  title,
  description,
  steps,
  onStart,
  onReset
}: MultiAgentWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const handleStart = () => {
    setIsRunning(true);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onStart?.();
    
    // Simulate workflow execution
    executeWorkflow();
  };

  const executeWorkflow = async () => {
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, steps[i].duration || 2000));
      
      setCompletedSteps(prev => new Set([...prev, steps[i].id]));
    }
    
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onReset?.();
  };

  const getStepStatus = (step: WorkflowStep, index: number) => {
    if (completedSteps.has(step.id)) return 'completed';
    if (isRunning && index === currentStep) return 'active';
    if (isRunning && index < currentStep) return 'completed';
    return 'pending';
  };

  const getStepIcon = (step: WorkflowStep, status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active': return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error': return <CheckCircle className="h-5 w-5 text-red-600" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const progress = (completedSteps.size / steps.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {isRunning ? (
              <Button variant="outline" onClick={handleReset} size="sm">
                Reset
              </Button>
            ) : (
              <Button onClick={handleStart} size="sm" className="flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Start Workflow</span>
              </Button>
            )}
          </div>
        </div>
        
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            const isActive = isRunning && index === currentStep;
            
            return (
              <div key={step.id} className="relative">
                <div className={`flex items-start space-x-4 p-4 rounded-lg border transition-all ${
                  isActive ? 'border-primary bg-primary/5' : 
                  status === 'completed' ? 'border-green-200 bg-green-50' : 
                  'border-muted'
                }`}>
                  <div className="flex-shrink-0">
                    {getStepIcon(step, status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {step.agent}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {step.description}
                    </p>
                    {step.output && status === 'completed' && (
                      <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        {step.output}
                      </div>
                    )}
                  </div>
                  
                  {step.duration && (
                    <div className="text-xs text-muted-foreground">
                      ~{step.duration}s
                    </div>
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined workflow examples
export const WORKFLOW_EXAMPLES = {
  skillAnalysis: {
    title: "Discover Your Hidden Skill Gaps",
    description: "From GitHub repository to personalized learning recommendations",
    steps: [
      {
        id: "sanitize",
        agent: "Sanitizer",
        title: "Input Sanitization",
        description: "Detect and sanitize any sensitive information in user input",
        icon: <Shield className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 1,
        output: "Input sanitized, no secrets detected"
      },
      {
        id: "coordinate",
        agent: "Coordinator",
        title: "Query Routing",
        description: "Analyze user query and route to appropriate specialized agent",
        icon: <MessageSquare className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 1,
        output: "Routed to Gap Analysis Agent"
      },
      {
        id: "github",
        agent: "Gap Analyzer",
        title: "GitHub Repository Analysis",
        description: "Fetch and analyze repository data, extract technologies and frameworks",
        icon: <BarChart3 className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 3,
        output: "Found Java, Spring Boot, Maven technologies"
      },
      {
        id: "skills",
        agent: "Gap Analyzer",
        title: "Skill Assessment",
        description: "Infer skill levels and identify gaps based on code analysis",
        icon: <BarChart3 className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 2,
        output: "Generated skill radar chart and recommendations"
      },
      {
        id: "learning",
        agent: "Learning Agent",
        title: "Learning Path Generation",
        description: "Create personalized learning recommendations based on skill gaps",
        icon: <BookOpen className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 2,
        output: "Generated 5 learning modules and resources"
      }
    ]
  },
  
  careerDevelopment: {
    title: "Build Your Career Roadmap",
    description: "Transform your current skills into a clear path forward",
    steps: [
      {
        id: "profile",
        agent: "Career Agent",
        title: "Profile Analysis",
        description: "Analyze current skills, experience, and career goals",
        icon: <Briefcase className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 2,
        output: "Profile analyzed: 3 years Java experience"
      },
      {
        id: "gaps",
        agent: "Gap Analyzer",
        title: "Skill Gap Identification",
        description: "Identify skills needed for target role",
        icon: <BarChart3 className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 2,
        output: "Identified 4 key skill gaps"
      },
      {
        id: "learning",
        agent: "Learning Agent",
        title: "Learning Plan Creation",
        description: "Generate personalized learning roadmap",
        icon: <BookOpen className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 3,
        output: "Created 6-month learning plan"
      },
      {
        id: "progress",
        agent: "Progress Agent",
        title: "Progress Tracking Setup",
        description: "Set up milestones and tracking system",
        icon: <TrendingUp className="h-4 w-4" />,
        status: 'pending' as const,
        duration: 1,
        output: "Progress tracking initialized"
      }
    ]
  }
};
