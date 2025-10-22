"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkillCategory, Skill, GapAnalysisResult, GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';
import { SkillRadarChart } from './skill-radar-chart';
import { BarChart3, Target, TrendingUp, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { formatGapValue } from '@/lib/utils';

interface SkillAssessmentFormProps {
  onAnalysisComplete?: (result: GapAnalysisResult) => void;
}

export function SkillAssessmentForm({ onAnalysisComplete }: SkillAssessmentFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [analysisResult, setAnalysisResult] = useState<GapAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const gapAnalyzer = new GapAnalyzerAgent();
  const categories = gapAnalyzer.getDefaultSkillCategories();

  const totalSteps = categories.length + 1; // +1 for results

  const handleSkillUpdate = (skillId: string, currentLevel: number, targetLevel?: number) => {
    setSkills(prev => {
      const existing = prev.find(s => s.id === skillId);
      if (existing) {
        return prev.map(s => 
          s.id === skillId 
            ? { ...s, currentLevel, targetLevel: targetLevel ?? s.targetLevel }
            : s
        );
      } else {
        // Find the skill in categories
        let newSkill: Skill | null = null;
        categories.forEach(category => {
          const skill = category.skills.find(s => s.id === skillId);
          if (skill) {
            newSkill = { ...skill, currentLevel, targetLevel: targetLevel ?? skill.targetLevel };
          }
        });
        
        if (newSkill) {
          return [...prev, newSkill];
        }
        return prev;
      }
    });
    setHasUnsavedChanges(true);
  };

  const saveAssessment = () => {
    try {
      const assessmentData = {
        skills,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem('skillbridge-assessment', JSON.stringify(assessmentData));
      setHasUnsavedChanges(false);
      console.log('Assessment saved successfully');
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }
  };

  const loadAssessment = () => {
    try {
      const saved = localStorage.getItem('skillbridge-assessment');
      if (saved) {
        const assessmentData = JSON.parse(saved);
        setSkills(assessmentData.skills || []);
        setHasUnsavedChanges(false);
        console.log('Assessment loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load assessment:', error);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Use all skills from categories, with updated values from form
      const allSkills = categories.flatMap(category => 
        category.skills.map(skill => {
          const updated = skills.find(s => s.id === skill.id);
          return updated || skill;
        })
      );

      // Validate that we have meaningful skill data
      const skillsWithData = allSkills.filter(skill => 
        skill.currentLevel > 1 || skill.targetLevel > 1
      );

      if (skillsWithData.length === 0) {
        throw new Error('Please provide skill levels for at least one skill before analyzing.');
      }

      // Use the real gap analyzer
      const result = gapAnalyzer.analyzeSkillGaps(allSkills);
      setAnalysisResult(result);
      setCurrentStep(totalSteps - 1);
      
      onAnalysisComplete?.(result);
    } catch (error) {
      console.error('Skill analysis error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSkillLevel = (skillId: string): number => {
    const skill = skills.find(s => s.id === skillId);
    return skill?.currentLevel || 1;
  };

  const getTargetLevel = (skillId: string): number => {
    const skill = skills.find(s => s.id === skillId);
    return skill?.targetLevel || 1;
  };

  const SkillLevelSelector = ({ skill, currentLevel, targetLevel }: { 
    skill: Skill; 
    currentLevel: number; 
    targetLevel: number; 
  }) => {
    const getLevelDescription = (level: number) => {
      switch (level) {
        case 1: return 'Beginner';
        case 2: return 'Novice';
        case 3: return 'Intermediate';
        case 4: return 'Advanced';
        case 5: return 'Expert';
        default: return 'Unknown';
      }
    };

    const getLevelColor = (level: number) => {
      switch (level) {
        case 1: return 'text-red-600';
        case 2: return 'text-orange-600';
        case 3: return 'text-yellow-600';
        case 4: return 'text-blue-600';
        case 5: return 'text-green-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="space-y-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between">
          <span className="font-medium">{skill.name}</span>
          <Badge variant="outline">Importance: {skill.importance}/5</Badge>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className={getLevelColor(currentLevel)}>
              Current: {currentLevel}/5 - {getLevelDescription(currentLevel)}
            </span>
            <span className={getLevelColor(targetLevel)}>
              Target: {targetLevel}/5 - {getLevelDescription(targetLevel)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Current Level</label>
              <input
                type="range"
                min="1"
                max="5"
                value={currentLevel}
                onChange={(e) => handleSkillUpdate(skill.id, parseInt(e.target.value), targetLevel)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Target Level</label>
              <input
                type="range"
                min="1"
                max="5"
                value={targetLevel}
                onChange={(e) => handleSkillUpdate(skill.id, currentLevel, parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          </div>
          
          {targetLevel < currentLevel && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Target level is lower than current level. Consider adjusting your target.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (currentStep === totalSteps - 1 && analysisResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Skill Gap Analysis Results</span>
            </CardTitle>
            <CardDescription>
              Your personalized skill assessment and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Score */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {analysisResult.overallScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Skill Score</div>
                  <Progress value={analysisResult.overallScore} className="mt-2" />
                </div>

                {/* Radar Chart */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 text-center">Skill Visualization</h3>
                  <SkillRadarChart
                    categories={analysisResult.categories}
                    currentSkills={analysisResult.skillGaps.map(gap => gap.skill)}
                    targetSkills={analysisResult.skillGaps.map(gap => ({
                      ...gap.skill,
                      currentLevel: gap.skill.targetLevel // Show target as the second polygon
                    }))}
                  />
                </div>
              </div>

              {/* Top Skill Gaps */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Top Skill Gaps</h3>
                <div className="space-y-3">
                  {analysisResult.skillGaps.slice(0, 5).map((gap, index) => (
                    <div key={gap.skill.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{gap.skill.name}</span>
                        <Badge variant={gap.gap > 2 ? "destructive" : gap.gap > 1 ? "default" : "secondary"}>
                          Gap: {formatGapValue(gap.gap)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Current: {formatGapValue(gap.skill.currentLevel)}/5 → Target: {formatGapValue(gap.skill.targetLevel)}/5
                      </div>
                      {gap.recommendations.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Recommendation:</div>
                          <div className="text-xs">{gap.recommendations[0]}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Learning Path */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Recommended Learning Path</span>
              </h3>
              <div className="space-y-2">
                {analysisResult.learningPath.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="text-sm">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Recommendations */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>General Recommendations</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysisResult.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-center space-x-4">
              <Button onClick={() => setCurrentStep(0)} variant="outline">
                Start Over
              </Button>
              <Button onClick={() => window.print()}>
                Export Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
        </div>
        <Progress value={((currentStep + 1) / totalSteps) * 100} />
        
        {/* Skills Assessment Progress */}
        <div className="text-xs text-muted-foreground">
          Skills assessed: {skills.length} / {categories.flatMap(c => c.skills).length}
        </div>
      </div>

      {/* Current Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>{categories[currentStep]?.name} Assessment</span>
          </CardTitle>
          <CardDescription>
            Rate your current and target skill levels for each area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            {categories[currentStep]?.skills.map((skill) => (
              <SkillLevelSelector
                key={skill.id}
                skill={skill}
                currentLevel={getSkillLevel(skill.id)}
                targetLevel={getTargetLevel(skill.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <Button
            variant="outline"
            onClick={loadAssessment}
            size="sm"
          >
            Load Saved
          </Button>
          
          <Button
            variant="outline"
            onClick={saveAssessment}
            disabled={!hasUnsavedChanges}
            size="sm"
          >
            {hasUnsavedChanges ? 'Save Progress' : 'Saved'}
          </Button>
        </div>
        
        <div>
          {currentStep < categories.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next Category
            </Button>
          ) : (
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Skills'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
