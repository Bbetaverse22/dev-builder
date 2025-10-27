"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Github,
  Code
} from 'lucide-react';

interface PracticeIssue {
  title: string;
  url: string;
  repository: string;
  created: string;
  updated: string;
  author: string;
}

export function LearningPathsTab() {
  const [skillGapData, setSkillGapData] = useState<any>(null);
  const [practiceIssues, setPracticeIssues] = useState<PracticeIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSkillGapData();
  }, []);

  useEffect(() => {
    if (skillGapData) {
      fetchPracticeIssues();
    }
  }, [skillGapData]);

  const fetchSkillGapData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/skill-gaps?action=summary&userId=user_123');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSkillGapData(result.data);
        } else {
          setSkillGapData(null);
        }
      } else {
        setSkillGapData(null);
      }
    } catch (err) {
      console.error('Failed to fetch skill gap data:', err);
      setError('Failed to load learning path data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPracticeIssues = async () => {
    try {
      setIsLoadingIssues(true);
      
      // Extract technologies and languages from the skill gap data
      const lines = skillGapData.split('\n');
      const technologies: string[] = [];
      
      // Parse technologies from the summary
      lines.forEach((line: string) => {
        if (line.includes('Languages:')) {
          const langs = line.split('Languages:')[1].split(',').map(l => l.trim());
          technologies.push(...langs);
        }
        if (line.includes('Frameworks:')) {
          const frameworks = line.split('Frameworks:')[1].split(',').map(f => f.trim());
          technologies.push(...frameworks);
        }
      });

      // Get top 3 skill gaps for more targeted practice
      const skillGapMatches = skillGapData.match(/\d+\.\s+(.+?):/g);
      if (skillGapMatches) {
        const topSkills = skillGapMatches.slice(0, 3).map((match: string) => 
          match.replace(/\d+\.\s+/, '').replace(':', '').trim()
        );
        technologies.push(...topSkills);
      }

      // Remove empty strings and duplicates
      const uniqueTech = [...new Set(technologies.filter(t => t && t.length > 0))];
      
      console.log('🔍 Extracted technologies:', uniqueTech);
      
      if (uniqueTech.length === 0) {
        console.warn('⚠️ No technologies found in skill gap data');
        setPracticeIssues([]);
        return;
      }

      // Use the primary skill for search
      const primarySkill = uniqueTech[0].toLowerCase();
      console.log('🎯 Searching for issues with skill:', primarySkill);
      
      // Direct GitHub API call to search for issues
      const query = `${primarySkill} label:"good first issue" is:open is:issue`;
      const githubApiUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=5`;
      
      const response = await fetch(githubApiUrl, {
        headers: {
          'Accept': 'application/vnd.github+json',
          // Add GitHub token if available in environment
          ...(process.env.NEXT_PUBLIC_GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`
          })
        }
      });

      if (!response.ok) {
        console.error('GitHub API error:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      console.log('📊 GitHub API response:', data);
      
      if (data.items && data.items.length > 0) {
        const issues = data.items.map((issue: any) => ({
          title: issue.title,
          url: issue.html_url,
          repository: issue.html_url.split('/').slice(3, 5).join('/'),
          created: issue.created_at,
          updated: issue.updated_at,
          author: issue.user.login,
        }));
        
        console.log('🎉 Setting practice issues:', issues.length);
        setPracticeIssues(issues);
      } else {
        console.warn('⚠️ No issues found');
        setPracticeIssues([]);
      }
    } catch (err) {
      console.error('Failed to fetch practice issues:', err);
    } finally {
      setIsLoadingIssues(false);
    }
  };

  // Parse skill gap data to extract learning path information
  const parseLearningPath = () => {
    if (!skillGapData) return null;

    // Extract data from the summary string
    const lines = skillGapData.split('\n');
    const topSkillGaps: Array<{ skill: string; gap: string; priority: number }> = [];
    const recommendations: string[] = [];
    
    let inSkillGaps = false;
    let inRecommendations = false;
    
    lines.forEach((line: string) => {
      if (line.includes('Top Skill Gaps:')) {
        inSkillGaps = true;
        inRecommendations = false;
        return;
      }
      if (line.includes('Key Recommendations:')) {
        inRecommendations = true;
        inSkillGaps = false;
        return;
      }
      
      if (inSkillGaps && line.match(/^\d+\./)) {
        const match = line.match(/\d+\.\s+(.+?):\s+(.+)/);
        if (match) {
          topSkillGaps.push({
            skill: match[1],
            gap: match[2],
            priority: topSkillGaps.length + 1,
          });
        }
      }
      
      if (inRecommendations && line.match(/^\d+\./)) {
        const recommendation = line.replace(/^\d+\.\s+/, '').trim();
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    });

    return { topSkillGaps, recommendations };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>📚 Learning Paths</span>
          </CardTitle>
          <CardDescription>
            Personalized learning paths based on your skill gaps
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading your learning path...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const learningData = parseLearningPath();

  if (!skillGapData || !learningData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>📚 Learning Paths</span>
          </CardTitle>
          <CardDescription>
            Personalized learning paths based on your skill gaps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">No skill assessment found</p>
                <p className="text-sm">
                  Complete a skill assessment in the <strong>Skill Analysis</strong> tab to generate your personalized learning path.
                </p>
              </div>
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <Target className="h-4 w-4 mr-2" />
              Refresh Learning Path
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { topSkillGaps, recommendations } = learningData;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Sparkles className="h-6 w-6 text-primary" />
                <span>Your Personalized Learning Path</span>
              </CardTitle>
              <CardDescription className="mt-2">
                Based on your recent skill gap analysis
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={fetchSkillGapData}>
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Priority Skills to Learn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-orange-500" />
            <span>Priority Skills to Develop</span>
          </CardTitle>
          <CardDescription>
            Focus on these areas to close your biggest skill gaps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topSkillGaps.length > 0 ? (
            topSkillGaps.map((skillGap, index) => (
              <div 
                key={index}
                className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={index === 0 ? 'destructive' : index === 1 ? 'default' : 'outline'}>
                        Priority {skillGap.priority}
                      </Badge>
                      <h3 className="font-semibold">{skillGap.skill}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{skillGap.gap}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No skill gaps identified in your assessment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Learning Path Phases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Recommended Learning Phases</span>
          </CardTitle>
          <CardDescription>
            Structured approach to skill development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {recommendations.length > 0 ? (
            recommendations.map((recommendation, index) => {
              const phases = [
                { title: 'Foundation', icon: BookOpen, color: 'text-blue-500' },
                { title: 'Practice', icon: Target, color: 'text-green-500' },
                { title: 'Advanced', icon: TrendingUp, color: 'text-purple-500' },
                { title: 'Application', icon: CheckCircle, color: 'text-orange-500' },
              ];
              
              const phase = phases[index % phases.length];
              const Icon = phase.icon;
              
              return (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-full bg-muted ${phase.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold">Phase {index + 1}: {phase.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Ongoing
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{recommendation}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Complete a skill assessment to get personalized recommendations.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Practice Opportunities from GitHub */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Github className="h-5 w-5 text-purple-500" />
                <span>Practice Opportunities</span>
              </CardTitle>
              <CardDescription>
                Beginner-friendly open-source issues to practice your skills
              </CardDescription>
            </div>
            {!isLoadingIssues && practiceIssues.length > 0 && (
              <Button size="sm" variant="outline" onClick={fetchPracticeIssues}>
                Refresh Issues
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingIssues ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Searching for practice issues...</p>
              </div>
            </div>
          ) : practiceIssues.length > 0 ? (
            <div className="space-y-4">
              {practiceIssues.map((issue, index) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg hover:border-primary/50 transition-all hover:shadow-md bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <Code className="h-4 w-4 text-purple-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">
                            {issue.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {issue.repository}
                            </Badge>
                            <span>•</span>
                            <span>by {issue.author}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => window.open(issue.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Start with issues that match your current skill level and gradually work up to more complex ones
                </p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  No practice issues found for your skills. Try analyzing a GitHub repository first or check back later.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Next Steps</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <ArrowRight className="h-4 w-4 text-blue-600" />
            <p className="text-sm">Start with your highest priority skill gap</p>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <ArrowRight className="h-4 w-4 text-green-600" />
            <p className="text-sm">Pick a practice issue from above and try to solve it</p>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <ArrowRight className="h-4 w-4 text-purple-600" />
            <p className="text-sm">Apply skills in real-world projects as you learn</p>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <ArrowRight className="h-4 w-4 text-orange-600" />
            <p className="text-sm">Track progress and adjust your learning path as needed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

