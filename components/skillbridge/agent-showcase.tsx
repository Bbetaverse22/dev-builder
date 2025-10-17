"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  BarChart3, 
  BookOpen, 
  Briefcase, 
  TrendingUp, 
  MessageSquare,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from "lucide-react";

interface AgentShowcaseProps {
  agentType: 'sanitizer' | 'gap_analyzer' | 'learning' | 'career' | 'progress';
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'ready' | 'development';
  capabilities: string[];
  useCases: string[];
  demoComponent?: React.ReactNode;
  onTryDemo?: () => void;
}

export function AgentShowcase({
  agentType,
  title,
  description,
  icon,
  status,
  capabilities,
  useCases,
  demoComponent,
  onTryDemo
}: AgentShowcaseProps) {
  const [activeDemo, setActiveDemo] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'ready': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'development': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'ready': return <Clock className="h-3 w-3" />;
      case 'development': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
          <Badge className={`flex items-center space-x-1 ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            <span className="capitalize">{status}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="capabilities" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="use-cases">Use Cases</TabsTrigger>
            <TabsTrigger value="demo">Live Demo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="capabilities" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {capabilities.map((capability, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm">{capability}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="use-cases" className="space-y-4">
            <div className="space-y-3">
              {useCases.map((useCase, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-sm">{useCase}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="demo" className="space-y-4">
            {demoComponent ? (
              <div className="space-y-4">
                {!activeDemo ? (
                  <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Try the {title}</h3>
                    <p className="text-muted-foreground mb-4">
                      Experience the agent's capabilities with a live demonstration
                    </p>
                    <Button onClick={() => setActiveDemo(true)} className="flex items-center space-x-2">
                      <Play className="h-4 w-4" />
                      <span>Start Demo</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Live Demo</h4>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveDemo(false)}
                      >
                        Reset
                      </Button>
                    </div>
                    {demoComponent}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Demo Coming Soon</h3>
                <p className="text-muted-foreground">
                  Interactive demonstration will be available soon
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
