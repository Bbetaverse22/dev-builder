"use client";

/**
 * Sticky Agent Status Bar
 * Persistent header showing real-time agent state
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Pause, Play, AlertCircle } from 'lucide-react';

type AgentStatus = 'IDLE' | 'ANALYZING' | 'RESEARCHING' | 'PLANNING' | 'ACTING' | 'MONITORING' | 'COMPLETE' | 'ERROR';

interface StickyAgentStatusProps {
  status: AgentStatus;
  progress: number;
  currentTask: string;
  onPause?: () => void;
  onResume?: () => void;
  onViewLogs?: () => void;
  estimatedTimeRemaining?: string;
  isPaused?: boolean;
}

export function StickyAgentStatus({
  status,
  progress,
  currentTask,
  onPause,
  onResume,
  onViewLogs,
  estimatedTimeRemaining,
  isPaused = false
}: StickyAgentStatusProps) {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'IDLE':
        return 'bg-purple-500/20 text-purple-100 border border-purple-400/40';
      case 'ANALYZING':
        return 'bg-blue-500/20 text-blue-100 border border-blue-400/40';
      case 'RESEARCHING':
        return 'bg-purple-500/30 text-purple-100 border border-purple-400/50';
      case 'PLANNING':
        return 'bg-orange-500/20 text-orange-100 border border-orange-400/40';
      case 'ACTING':
        return 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40';
      case 'MONITORING':
        return 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/40';
      case 'COMPLETE':
        return 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40';
      case 'ERROR':
        return 'bg-red-500/25 text-red-100 border border-red-400/40';
      default:
        return 'bg-purple-500/20 text-purple-100 border border-purple-400/40';
    }
  };

  const isActive = status !== 'IDLE' && status !== 'COMPLETE' && status !== 'ERROR';

  if (!isActive) {
    return null; // Don't show when idle
  }

  return (
    <div className="sticky top-0 z-50 border-b border-purple-500/40 bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-purple-950/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Status & Progress */}
          <div className="flex items-center space-x-4 flex-1">
            <Activity className="h-6 w-6 text-purple-300 animate-pulse" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge className={`${getStatusColor(status)} backdrop-blur`}>
                  {status}
                </Badge>
                <span className="text-base text-purple-200">
                  {progress}%
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <p className="text-base text-white truncate">{currentTask}</p>
                {estimatedTimeRemaining && (
                  <span className="text-sm text-purple-200/80 whitespace-nowrap">
                    • {estimatedTimeRemaining} remaining
                  </span>
                )}
              </div>
              
              {/* Thin Progress Bar */}
              <div className="w-full bg-purple-900/60 rounded-full h-1.5 mt-2">
                <div
                  className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.45)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {onViewLogs && (
              <Button variant="outline" size="sm" onClick={onViewLogs} className="border-purple-500/40 text-white hover:bg-purple-500/20">
                <AlertCircle className="h-4 w-4 mr-2" />
                View Logs
              </Button>
            )}
            
            {!isPaused && onPause && (
              <Button variant="outline" size="sm" onClick={onPause} className="border-purple-500/40 text-white hover:bg-purple-500/20">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            
            {isPaused && onResume && (
              <Button variant="default" size="sm" onClick={onResume} className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-500 border-0">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
