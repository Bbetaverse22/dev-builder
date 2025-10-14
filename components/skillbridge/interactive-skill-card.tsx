"use client";

/**
 * Interactive Skill Gap Card
 * Expandable card showing WHY the skill gap exists and market context
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Code,
  TrendingUp,
  AlertCircle,
  Target,
  Briefcase
} from 'lucide-react';
import { formatGapValue } from '@/lib/utils';
import type { SkillGuidance } from '@/lib/agents/gap-analyzer';

interface SkillGap {
  id?: string;
  name: string;
  currentLevel: number;
  targetLevel: number;
  priority: number;
  gap: number;
  recommendations?: string[];
  guidance?: SkillGuidance;
}

interface InteractiveSkillCardProps {
  skill: SkillGap;
  onStartLearning?: (skillName: string) => void;
}

export function InteractiveSkillCard({ skill, onStartLearning }: InteractiveSkillCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCurrentLevel = formatGapValue(skill.currentLevel);
  const formattedTargetLevel = formatGapValue(skill.targetLevel);
  const formattedGap = formatGapValue(skill.gap);
  const guidance = skill.guidance;
  const recommendedSteps = guidance?.recommendedSteps?.length
    ? guidance.recommendedSteps
    : (skill.recommendations ?? []);

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'destructive';
    if (priority >= 6) return 'default';
    return 'secondary';
  };

  const getPriorityBarColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500';
    if (priority >= 6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const gapPercent = (skill.gap / skill.targetLevel) * 100;

  /**
   * Generate contextual explanation for WHY this skill gap exists
   */
  const getGapExplanation = () => {
    const isHighPriority = skill.priority >= 8;
    const isMediumPriority = skill.priority >= 6 && skill.priority < 8;
    const isLargeGap = skill.gap >= 2;
    const isMediumGap = skill.gap >= 1 && skill.gap < 2;

    let baseExplanation = {
      severity: 'Foundational Gap',
      icon: <Target className="h-4 w-4 text-blue-500" />,
      reason: `You're at ${formattedCurrentLevel}/5, and improving to ${formattedTargetLevel}/5 strengthens your technical foundation.`,
      impact: `This ${formattedGap}-level improvement ensures you can confidently work on diverse projects and contribute to team success.`,
      marketContext: `While not always required, ${skill.name} proficiency is a common expectation in modern development environments.`
    };

    if (isHighPriority && isLargeGap) {
      baseExplanation = {
        severity: 'Critical Gap',
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        reason: `You're currently at ${formattedCurrentLevel}/5 proficiency, but the market expects ${formattedTargetLevel}/5 for competitive roles.`,
        impact: `This ${formattedGap}-level gap is blocking access to senior positions and higher-paying opportunities.`,
        marketContext: `${skill.name} is a core requirement in 70-85% of relevant job postings, with expertise directly correlating to salary bands.`
      };
    }

    if (isHighPriority && isMediumGap) {
      baseExplanation = {
        severity: 'High Priority',
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
        reason: `Your ${formattedCurrentLevel}/5 proficiency is solid, but advancing to ${formattedTargetLevel}/5 is crucial for career progression.`,
        impact: `Closing this ${formattedGap}-level gap unlocks leadership roles, technical decision-making authority, and competitive compensation.`,
        marketContext: `Advanced ${skill.name} skills differentiate candidates in competitive hiring processes and enable you to mentor others.`
      };
    }

    if (isMediumPriority) {
      baseExplanation = {
        severity: 'Important Gap',
        icon: <Target className="h-4 w-4 text-yellow-500" />,
        reason: `You have ${formattedCurrentLevel}/5 proficiency, but reaching ${formattedTargetLevel}/5 enhances your versatility and market value.`,
        impact: `Addressing this ${formattedGap}-level gap broadens your project opportunities and makes you more competitive for cross-functional roles.`,
        marketContext: `${skill.name} appears in 40-60% of relevant job descriptions and is increasingly valued as teams adopt modern practices.`
      };
    }

    if (guidance) {
      return {
        ...baseExplanation,
        reason: guidance.currentState || baseExplanation.reason,
        impact: guidance.careerImpact || baseExplanation.impact,
        marketContext: guidance.marketContext || baseExplanation.marketContext,
      };
    }

    return baseExplanation;
  };

  const explanation = getGapExplanation();

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isExpanded ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-4">
        {/* Header - Always Visible */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{skill.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getPriorityColor(skill.priority)}>
                Priority: {skill.priority}/10
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getPriorityBarColor(skill.priority)} transition-all`}
                style={{ width: `${Math.min(100, gapPercent)}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Current: {formattedCurrentLevel}/5</span>
              <span>Gap: {formattedGap} levels</span>
              <span>Target: {formattedTargetLevel}/5</span>
            </div>
          </div>
        </div>

        {/* Expanded Content - WHY This Gap Exists */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Severity Badge */}
            <div className="flex items-center space-x-2">
              {explanation.icon}
              <Badge variant="outline" className="text-xs font-semibold">
                {explanation.severity}
              </Badge>
            </div>

            {/* Current State Explanation */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex-shrink-0">
                  <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Current State
                  </p>
                  <p className="text-sm leading-relaxed">
                    {explanation.reason}
                  </p>
                </div>
              </div>

              {/* Career Impact */}
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Career Impact
                  </p>
                  <p className="text-sm leading-relaxed">
                    {explanation.impact}
                  </p>
                </div>
              </div>

              {/* Market Context */}
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30 flex-shrink-0">
                  <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Market Context
                  </p>
                  <p className="text-sm leading-relaxed">
                    {explanation.marketContext}
                  </p>
                </div>
              </div>
            </div>

            {(guidance?.highlightedFrameworks?.length || recommendedSteps.length > 0) && (
              <div className="pt-3 border-t space-y-4">
                {guidance?.highlightedFrameworks?.length ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Focus Frameworks
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {guidance.highlightedFrameworks.map((framework) => (
                        <Badge key={framework} variant="outline" className="text-xs">
                          {framework}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {recommendedSteps.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Recommended Steps
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-sm leading-relaxed">
                      {recommendedSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {/* Action Hint */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center italic">
                See AI-generated recommendations and Portfolio Builder below for action items.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
