"use client";

/**
 * Redesigned Skill Assessment Tab
 * GitHub-first approach with advanced tool integration
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';
import { formatGapValue } from '@/lib/utils';
import { 
  Github, 
  Search, 
  User, 
  Zap, 
  Target,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Code,
  Clock,
  AlertCircle,
  BookOpen
} from 'lucide-react';

interface RedesignedSkillAssessmentProps {
  onNavigateToLearning?: () => void;
}

export function RedesignedSkillAssessment({ onNavigateToLearning }: RedesignedSkillAssessmentProps) {
  const [githubInput, setGithubInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const gapAnalyzer = useMemo(() => new GapAnalyzerAgent(), []);

  const handleAnalyzeRepository = async () => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(10);
    
    try {
      // Parse GitHub URL
      const urlMatch = githubInput.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (!urlMatch) {
        setError('Invalid GitHub URL. Please enter a valid repository URL.');
        setIsAnalyzing(false);
        return;
      }
      
      const repoUrl = `https://github.com/${urlMatch[1]}/${urlMatch[2]}`;
      console.log('🔍 Analyzing repository:', repoUrl);
      
      setProgress(30);
      
      // Step 1: Analyze GitHub repository
      const githubAnalysis = await gapAnalyzer.analyzeGitHubRepository(repoUrl);
      console.log('📊 GitHub analysis complete:', githubAnalysis);
      
      setProgress(50);
      
      // Step 2: Generate skill assessment from GitHub data
      const gapAnalysis = await gapAnalyzer.generateAutomaticSkillAssessment(githubAnalysis);
      console.log('📊 Gap analysis complete:', gapAnalysis);
      
      setProgress(70);
      
      // Store results on server
      const response = await fetch('/api/skill-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_123',
          githubAnalysis: githubAnalysis,
          skillAssessment: gapAnalysis,
        }),
      });
      
      setProgress(90);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Stored skill gap analysis:', result.storageId);
      }
      
      setProgress(100);
      
      // Display results
      setAnalysisResults({
        type: 'repository',
        github: githubAnalysis,
        gaps: gapAnalysis,
      });
      
    } catch (err) {
      console.error('❌ Analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('rate limit')) {
        setError('GitHub API rate limit exceeded. Please try again in a few minutes or use a GitHub token.');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError('Repository not found. Please check the URL and ensure the repository is public.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('Access forbidden. The repository may be private or require authentication.');
      } else {
        setError(`Analysis failed: ${errorMessage}`);
      }
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleAnalyzeProfile = async () => {
    setIsAnalyzing(true);
    setError(null);
    setProgress(10);
    
    try {
      const username = usernameInput.trim();
      if (!username) {
        setError('Please enter a GitHub username.');
        setIsAnalyzing(false);
        return;
      }
      
      console.log('🔍 Analyzing GitHub profile:', username);
      setProgress(30);
      
      // Analyze all public repositories for the user
      // For now, we'll analyze their most popular repository
      // In the future, this could aggregate across all repos
      
      // Fetch user's repositories
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=1`);
      if (!response.ok) {
        if (response.status === 404) {
          setError(`GitHub user "${username}" not found. Please check the username and try again.`);
        } else if (response.status === 403) {
          setError('GitHub API rate limit exceeded. Please try again in a few minutes.');
        } else {
          setError(`Failed to fetch GitHub profile (Status: ${response.status}). Please try again.`);
        }
        setIsAnalyzing(false);
        return;
      }
      
      const repos = await response.json();
      if (!repos || repos.length === 0) {
        setError(`No public repositories found for user "${username}". Try analyzing a specific repository instead.`);
        setIsAnalyzing(false);
        return;
      }
      
      setProgress(50);
      
      // Analyze the most recent repository
      const topRepo = repos[0];
      const repoUrl = topRepo.html_url;
      
      console.log('📊 Analyzing top repository:', repoUrl);
      
      // Step 1: Analyze GitHub repository
      const githubAnalysis = await gapAnalyzer.analyzeGitHubRepository(repoUrl);
      console.log('📊 GitHub analysis complete:', githubAnalysis);
      
      setProgress(70);
      
      // Step 2: Generate skill assessment from GitHub data
      const gapAnalysis = await gapAnalyzer.generateAutomaticSkillAssessment(githubAnalysis);
      console.log('📊 Gap analysis complete:', gapAnalysis);
      
      setProgress(85);
      
      // Store results on server
      const storeResponse = await fetch('/api/skill-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_123',
          githubAnalysis: githubAnalysis,
          skillAssessment: gapAnalysis,
        }),
      });
      
      if (storeResponse.ok) {
        const result = await storeResponse.json();
        console.log('✅ Stored skill gap analysis:', result.storageId);
      }
      
      setProgress(100);
      
      // Display results
      setAnalysisResults({
        type: 'profile',
        github: githubAnalysis,
        gaps: gapAnalysis,
      });
      
    } catch (err) {
      console.error('❌ Profile analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('rate limit')) {
        setError('GitHub API rate limit exceeded. Please try again in a few minutes.');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError(`GitHub user or repository not found. Please check the username and try again.`);
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setError('Access forbidden. Please try again later or use a different username.');
      } else {
        setError(`Profile analysis failed: ${errorMessage}`);
      }
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section - GitHub Input */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Github className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Analyze Your Skills</CardTitle>
                <CardDescription className="text-base">
                  Get instant insights from your GitHub repositories and profile
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Powered by GitHub Integration
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {isAnalyzing && progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progress < 30 && 'Parsing repository URL...'}
                {progress >= 30 && progress < 50 && 'Fetching repository data from GitHub...'}
                {progress >= 50 && progress < 70 && 'Analyzing skills and generating gaps...'}
                {progress >= 70 && progress < 90 && 'Storing results for chat access...'}
                {progress >= 90 && 'Complete! Displaying results...'}
              </p>
            </div>
          )}

          {/* Repository Analysis */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <Code className="h-4 w-4" />
              <span>Analyze a Repository</span>
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="https://github.com/username/repository"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && githubInput.trim() && !isAnalyzing) {
                    handleAnalyzeRepository();
                  }
                }}
                className="flex-1 h-12 text-base"
                disabled={isAnalyzing}
              />
              <Button 
                size="lg" 
                onClick={handleAnalyzeRepository}
                disabled={!githubInput.trim() || isAnalyzing}
                className="px-8"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll analyze the tech stack, code quality, and extract your skill profile
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1 border-t" />
            <span className="text-sm text-muted-foreground font-medium">OR</span>
            <div className="flex-1 border-t" />
          </div>

          {/* Profile Analysis */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <User className="h-4 w-4" />
              <span>Analyze a GitHub Profile</span>
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="GitHub username (e.g., torvalds, facebook)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && usernameInput.trim() && !isAnalyzing) {
                    handleAnalyzeProfile();
                  }
                }}
                className="flex-1 h-12 text-base"
                disabled={isAnalyzing}
              />
              <Button 
                size="lg"
                variant="outline"
                onClick={handleAnalyzeProfile}
                disabled={!usernameInput.trim() || isAnalyzing}
                className="px-8"
              >
                <User className="h-4 w-4 mr-2" />
                Analyze Profile
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll analyze their most recent public repository for skill assessment
            </p>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                disabled
                title="Coming soon"
              >
                <Search className="h-3 w-3 mr-1" />
                Search Repositories
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                disabled
                title="Coming soon"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Compare with Role
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                disabled
                title="Coming soon"
              >
                <Clock className="h-3 w-3 mr-1" />
                Recent Analyses
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: GitHub Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Github className="h-5 w-5" />
                <span>GitHub Analysis</span>
              </CardTitle>
              <CardDescription>
                Repository insights and metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Repository:</span>
                  <p className="font-medium break-all">
                    {analysisResults.github?.repository || 'Unknown'}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Skill Level:</span>
                  <Badge className="ml-2 capitalize">
                    {analysisResults.github?.skillLevel || 'unknown'}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">Languages Detected</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.github?.languages?.map((lang: string) => (
                    <Badge key={lang} variant="secondary">{lang}</Badge>
                  )) || <span className="text-xs text-muted-foreground">No languages detected</span>}
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">Frameworks</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.github?.frameworks?.map((framework: string) => (
                    <Badge key={framework} variant="outline">{framework}</Badge>
                  )) || <span className="text-xs text-muted-foreground">No frameworks detected</span>}
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">Technologies</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.github?.technologies?.slice(0, 6).map((tech: string) => (
                    <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                  )) || <span className="text-xs text-muted-foreground">No technologies detected</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column 2: Skill Gaps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Skill Gap Report</span>
              </CardTitle>
              <CardDescription>
                Your current vs target skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-4xl font-bold text-primary mb-1">
                  {analysisResults.gaps?.overallScore || 0}%
                </div>
                <p className="text-sm text-muted-foreground">Overall Skill Score</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Top Skill Gaps</p>
                
                {analysisResults.gaps?.skillGaps?.slice(0, 5).map((skillGap: any) => {
                  const gapPercent = (skillGap.gap / skillGap.skill.targetLevel) * 100;
                  const isHighPriority = skillGap.priority >= 8;
                  const isMediumPriority = skillGap.priority >= 5 && skillGap.priority < 8;
                  
                  return (
                    <div key={skillGap.skill.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{skillGap.skill.name}</span>
                        <Badge variant={isHighPriority ? 'destructive' : isMediumPriority ? 'default' : 'outline'}>
                          Gap: {formatGapValue(skillGap.gap)}
                        </Badge>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isHighPriority ? 'bg-destructive' : isMediumPriority ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, gapPercent)}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: {formatGapValue(skillGap.skill.currentLevel)}/5</span>
                        <span>Target: {formatGapValue(skillGap.skill.targetLevel)}/5</span>
                      </div>
                    </div>
                  );
                }) || <p className="text-xs text-muted-foreground text-center py-4">No skill gaps identified</p>}
              </div>

              {analysisResults.gaps?.skillGaps && analysisResults.gaps.skillGaps.length > 5 && (
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View All {analysisResults.gaps.skillGaps.length} Skills
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Column 3: Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Recommendations</span>
              </CardTitle>
              <CardDescription>
                Personalized learning paths
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {analysisResults.gaps?.recommendations?.slice(0, 5).map((rec: string, index: number) => {
                  const colors = [
                    'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600',
                    'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-600',
                    'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-600',
                    'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-600',
                    'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800 text-pink-600',
                  ];
                  const colorClass = colors[index % colors.length];
                  const bgColor = colorClass.split(' ')[0];
                  const borderColor = colorClass.split(' ')[1];
                  const textColor = colorClass.split(' ')[2];
                  
                  return (
                    <div key={index} className={`p-3 ${bgColor} ${borderColor} border rounded-lg`}>
                      <div className="flex items-start space-x-2">
                        <TrendingUp className={`h-4 w-4 mt-0.5 ${textColor}`} />
                        <div className="flex-1">
                          <p className="text-sm">{rec}</p>
                        </div>
                      </div>
                    </div>
                  );
                }) || (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Complete the analysis to get personalized recommendations
                  </p>
                )}
              </div>

              {analysisResults.gaps?.recommendations && analysisResults.gaps.recommendations.length > 0 && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => {
                      if (onNavigateToLearning) {
                        onNavigateToLearning();
                      }
                    }}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Full Learning Path
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    See your personalized learning roadmap and next steps
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
