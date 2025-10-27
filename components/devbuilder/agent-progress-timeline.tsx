"use client";

/**
 * Interactive Progress Timeline Component
 * Shows multi-stage agent progress with expandable details
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Circle, ChevronDown, ChevronUp } from 'lucide-react';

interface PhaseStatus {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress?: number;
  tasks?: string[];
  completedAt?: string;
  estimatedTime?: string;
}

interface AgentProgressTimelineProps {
  phases: PhaseStatus[];
  currentPhase: string;
}

export function AgentProgressTimeline({ phases, currentPhase }: AgentProgressTimelineProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(currentPhase);

  const getPhaseIcon = (status: PhaseStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'in_progress':
        return (
          <div className="relative">
            <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
          </div>
        );
      case 'pending':
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: PhaseStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800';
      case 'pending':
        return 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <Card className="border-2">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Agent Progress Timeline</h3>
        
        <div className="space-y-4">
          {phases.map((phase, index) => (
            <div key={phase.id} className="relative">
              {/* Connecting Line */}
              {index < phases.length - 1 && (
                <div 
                  className={`absolute left-3 top-12 w-0.5 h-8 ${
                    phase.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
              )}
              
              {/* Phase Card */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  getStatusColor(phase.status)
                } ${expandedPhase === phase.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getPhaseIcon(phase.status)}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{phase.name}</h4>
                        {expandedPhase === phase.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className="mt-1">
                        {phase.status === 'completed' && phase.completedAt && (
                          <Badge variant="outline" className="text-xs">
                            Completed {phase.completedAt}
                          </Badge>
                        )}
                        {phase.status === 'in_progress' && phase.estimatedTime && (
                          <Badge variant="outline" className="text-xs">
                            Est. {phase.estimatedTime}
                          </Badge>
                        )}
                        {phase.status === 'pending' && (
                          <Badge variant="outline" className="text-xs">
                            Waiting
                          </Badge>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {phase.status === 'in_progress' && phase.progress !== undefined && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${phase.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{phase.progress}%</p>
                        </div>
                      )}
                      
                      {/* Expanded Details */}
                      {expandedPhase === phase.id && phase.tasks && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Current Tasks:</p>
                          {phase.tasks.map((task, i) => (
                            <div key={i} className="flex items-center space-x-2 text-sm">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                              <span>{task}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

