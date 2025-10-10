export interface SkillCategory {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Skill {
  id: string;
  name: string;
  currentLevel: number; // 1-5 scale
  targetLevel: number; // 1-5 scale
  importance: number; // 1-5 scale
  category: string;
}

export interface SkillGap {
  skill: Skill;
  gap: number; // targetLevel - currentLevel
  priority: number; // calculated based on gap and importance
  recommendations: string[];
}

export interface GitHubAnalysis {
  repository: string;
  technologies: string[];
  frameworks: string[];
  languages: string[];
  tools: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  recommendations: string[];
}

export interface GapAnalysisResult {
  overallScore: number;
  skillGaps: SkillGap[];
  categories: SkillCategory[];
  recommendations: string[];
  learningPath: string[];
  githubAnalysis?: GitHubAnalysis;
  chatAnalysis?: any;
  analysisType?: 'github' | 'ai-chat';
}

export interface ResearchContext {
  targetRole?: string;
  targetIndustry?: string;
  professionalGoals?: string;
  domainKeywords?: string[];
}

export class GapAnalyzerAgent {
  private clampSkillLevel(level: number): number {
    if (Number.isNaN(level)) {
      return 1;
    }
    return Math.min(5, Math.max(1, Math.round(level * 10) / 10));
  }

  private skillCategories: SkillCategory[] = [
    {
      id: 'technical',
      name: 'Technical Skills',
      skills: [
        { id: 'programming', name: 'Programming Languages', currentLevel: 1, targetLevel: 5, importance: 5, category: 'technical' },
        { id: 'frameworks', name: 'Frameworks & Libraries', currentLevel: 1, targetLevel: 5, importance: 5, category: 'technical' },
        { id: 'databases', name: 'Database Management', currentLevel: 1, targetLevel: 5, importance: 4, category: 'technical' },
        { id: 'cloud', name: 'Cloud Platforms', currentLevel: 1, targetLevel: 5, importance: 4, category: 'technical' },
        { id: 'devops', name: 'DevOps & CI/CD', currentLevel: 1, targetLevel: 5, importance: 3, category: 'technical' },
        { id: 'testing', name: 'Testing & QA', currentLevel: 1, targetLevel: 5, importance: 4, category: 'technical' },
        { id: 'prompt-engineering', name: 'Prompt Engineering', currentLevel: 1, targetLevel: 5, importance: 4, category: 'technical' },
        { id: 'context-engineering', name: 'Context & Retrieval Practices', currentLevel: 1, targetLevel: 5, importance: 3, category: 'technical' },
      ]
    },
    {
      id: 'soft',
      name: 'Soft Skills',
      skills: [
        { id: 'communication', name: 'Communication', currentLevel: 1, targetLevel: 5, importance: 5, category: 'soft' },
        { id: 'leadership', name: 'Leadership', currentLevel: 1, targetLevel: 5, importance: 4, category: 'soft' },
        { id: 'problem-solving', name: 'Problem Solving', currentLevel: 1, targetLevel: 5, importance: 5, category: 'soft' },
        { id: 'teamwork', name: 'Teamwork', currentLevel: 1, targetLevel: 5, importance: 4, category: 'soft' },
        { id: 'time-management', name: 'Time Management', currentLevel: 1, targetLevel: 5, importance: 4, category: 'soft' },
      ]
    },
    {
      id: 'domain',
      name: 'Domain Knowledge',
      skills: [
        { id: 'industry', name: 'Industry Knowledge', currentLevel: 1, targetLevel: 5, importance: 4, category: 'domain' },
        { id: 'business', name: 'Business Acumen', currentLevel: 1, targetLevel: 5, importance: 3, category: 'domain' },
        { id: 'architecture', name: 'System Architecture', currentLevel: 1, targetLevel: 5, importance: 4, category: 'domain' },
        { id: 'security', name: 'Security Best Practices', currentLevel: 1, targetLevel: 5, importance: 4, category: 'domain' },
      ]
    }
  ];

  /**
   * Analyze skill gaps based on current and target skill levels
   */
  analyzeSkillGaps(
    skills: Skill[],
    options: { includeCategories?: string[] } = {}
  ): GapAnalysisResult {
    const includeSet = options.includeCategories?.length
      ? new Set(options.includeCategories)
      : null;

    const skillsToProcess = (() => {
      if (!includeSet) return skills;
      const filtered = skills.filter((skill) => includeSet.has(skill.category));
      return filtered.length > 0 ? filtered : skills;
    })();

    const aggregated = new Map<string, SkillGap>();

    skillsToProcess.forEach((skill) => {
      const normalizedSkill: Skill = {
        ...skill,
        currentLevel: this.clampSkillLevel(skill.currentLevel),
        targetLevel: this.clampSkillLevel(skill.targetLevel ?? 5),
      };

      const gap = Math.max(0, normalizedSkill.targetLevel - normalizedSkill.currentLevel);
      const recommendations = this.generateSkillRecommendations(normalizedSkill, gap);

      const existing = aggregated.get(normalizedSkill.id);

      if (existing) {
        const mergedSkill: Skill = {
          ...existing.skill,
          currentLevel: this.clampSkillLevel(
            Math.min(existing.skill.currentLevel, normalizedSkill.currentLevel)
          ),
          targetLevel: this.clampSkillLevel(
            Math.max(existing.skill.targetLevel, normalizedSkill.targetLevel)
          ),
        };

        const mergedGap = Math.max(0, mergedSkill.targetLevel - mergedSkill.currentLevel);
        const mergedPriority = mergedGap * mergedSkill.importance;

        aggregated.set(normalizedSkill.id, {
          skill: mergedSkill,
          gap: mergedGap,
          priority: mergedPriority,
          recommendations: Array.from(
            new Set([...existing.recommendations, ...recommendations])
          ),
        });
      } else {
        aggregated.set(normalizedSkill.id, {
          skill: normalizedSkill,
          gap,
          priority: gap * normalizedSkill.importance,
          recommendations,
        });
      }
    });

    const skillGaps = Array.from(aggregated.values());
    let totalAchieved = 0;
    let totalTarget = 0;

    skillGaps.forEach((gap) => {
      totalAchieved += gap.skill.currentLevel * gap.skill.importance;
      totalTarget += gap.skill.targetLevel * gap.skill.importance;
    });

    const overallScore = totalTarget > 0
      ? Math.round(
          Math.min(1, Math.max(0, totalAchieved / totalTarget)) * 100
        )
      : 100;

    // Sort gaps by priority
    skillGaps.sort((a, b) => b.priority - a.priority);

    // Generate general recommendations
    const recommendations = this.generateGeneralRecommendations(skillGaps);
    const learningPath = this.generateLearningPath(skillGaps);

    const categoryList = includeSet
      ? this.skillCategories
          .filter((category) => includeSet.has(category.id))
          .map((category) => ({
            ...category,
            skills: category.skills.filter((skill) => includeSet.has(skill.category)),
          }))
      : this.skillCategories;

    const uniqueSkillGaps = skillGaps.reduce<SkillGap[]>((acc, gap) => {
      if (!acc.some((existing) => existing.skill.id === gap.skill.id)) {
        acc.push(gap);
      }
      return acc;
    }, []);

    return {
      overallScore,
      skillGaps: uniqueSkillGaps,
      categories: categoryList,
      recommendations,
      learningPath
    };
  }

  /**
   * Analyze GitHub repository for skills and technologies
   */
  async analyzeGitHubRepository(repoUrl: string): Promise<GitHubAnalysis> {
    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present

      // Fetch repository data from GitHub API
      const [repoData, languagesData, contentsData] = await Promise.all([
        this.fetchGitHubData(`https://api.github.com/repos/${owner}/${cleanRepo}`),
        this.fetchGitHubData(`https://api.github.com/repos/${owner}/${cleanRepo}/languages`),
        this.fetchGitHubData(`https://api.github.com/repos/${owner}/${cleanRepo}/contents`)
      ]);

      // Extract technologies and frameworks
      const technologies = this.extractTechnologies(repoData, languagesData, contentsData);
      const frameworks = this.extractFrameworks(contentsData, languagesData);
      const languages = Object.keys(languagesData).sort((a, b) => languagesData[b] - languagesData[a]);
      const tools = this.extractTools(contentsData);

      // Determine skill level based on repository complexity
      const skillLevel = this.determineSkillLevel(repoData, languagesData, contentsData);

      // Generate recommendations based on actual technologies found
      const recommendations = this.generateTechnologyRecommendations(languages, frameworks, technologies);

      return {
        repository: repoUrl,
        technologies,
        frameworks,
        languages,
        tools,
        skillLevel,
        recommendations
      };

    } catch (error) {
      console.error('GitHub analysis error:', error);
      throw new Error(`Failed to analyze repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Automatically generate skill assessment from GitHub analysis
   */
  async generateAutomaticSkillAssessment(
    githubAnalysis: GitHubAnalysis,
    options: { includeCategories?: string[] } = {}
  ): Promise<GapAnalysisResult> {
    // Create skills based on discovered technologies
    const skills = this.createSkillsFromTechnologies(githubAnalysis);
    
    // Analyze skill gaps automatically
    const analysisResult = this.analyzeSkillGaps(skills, options);
    
    // Enhance recommendations with GitHub-specific insights
    analysisResult.recommendations = [
      ...analysisResult.recommendations,
      ...this.generateGitHubSpecificRecommendations(githubAnalysis)
    ];

    // Include the GitHub analysis in the result for storage
    analysisResult.githubAnalysis = githubAnalysis;

    return analysisResult;
  }

  /**
   * Create skill objects from discovered technologies
   */
  private createSkillsFromTechnologies(githubAnalysis: GitHubAnalysis): Skill[] {
    const skills: Skill[] = [];
    
    // Map technologies to skill categories and levels
    const technologySkillMap = this.getTechnologySkillMap();
    
    // Process languages
    githubAnalysis.languages.forEach(language => {
      const skillInfo = technologySkillMap[language.toLowerCase()];
      if (skillInfo) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferSkillLevel(githubAnalysis, language),
          targetLevel: this.getTargetLevelForTechnology(language),
          importance: skillInfo.importance,
          category: skillInfo.category
        });
      }
    });

    // Process frameworks
    githubAnalysis.frameworks.forEach(framework => {
      const skillInfo = technologySkillMap[framework.toLowerCase()];
      if (skillInfo) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferSkillLevel(githubAnalysis, framework),
          targetLevel: this.getTargetLevelForTechnology(framework),
          importance: skillInfo.importance,
          category: skillInfo.category
        });
      }
    });

    githubAnalysis.technologies.forEach((tech) => {
      const skillInfo = technologySkillMap[tech.toLowerCase()];
      if (skillInfo && !skills.some((existing) => existing.id === skillInfo.id)) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferSkillLevel(githubAnalysis, tech),
          targetLevel: this.getTargetLevelForTechnology(tech),
          importance: skillInfo.importance,
          category: skillInfo.category,
        });
      }
    });

    githubAnalysis.tools.forEach(tool => {
      const skillInfo = technologySkillMap[tool.toLowerCase()];
      if (skillInfo) {
        skills.push({
          id: skillInfo.id,
          name: skillInfo.name,
          currentLevel: this.inferToolingSkillLevel(githubAnalysis, tool),
          targetLevel: this.getTargetLevelForTechnology(tool),
          importance: skillInfo.importance,
          category: skillInfo.category,
        });
      }
    });

    // Add general technical skills based on repository complexity
    skills.push({
      id: 'frameworks',
      name: 'Frameworks & Libraries',
      currentLevel: this.inferFrameworkLevel(githubAnalysis),
      targetLevel: 5,
      importance: 5,
      category: 'technical'
    });

    const hasMlSpecialty = skills.some((skill) =>
      ['ml-python', 'ml-pytorch', 'ml-tensorflow', 'ml-scikit', 'ml-nlp'].includes(skill.id)
    );
    if (hasMlSpecialty) {
      skills.push({
        id: 'ai-ml-specialization',
        name: 'AI & Machine Learning',
        currentLevel: this.inferSpecialtyLevel(skills, ['ml-python', 'ml-pytorch', 'ml-tensorflow', 'ml-scikit', 'ml-nlp']),
        targetLevel: 5,
        importance: 5,
        category: 'technical',
      });
    }

    const hasDataEngineering = skills.some((skill) =>
      ['data-spark', 'data-hadoop', 'data-kafka', 'data-airflow', 'data-snowflake', 'data-databricks'].includes(skill.id)
    );
    if (hasDataEngineering) {
      skills.push({
        id: 'data-engineering-specialization',
        name: 'Data Engineering & Pipelines',
        currentLevel: this.inferSpecialtyLevel(skills, ['data-spark', 'data-hadoop', 'data-kafka', 'data-airflow', 'data-snowflake', 'data-databricks']),
        targetLevel: 5,
        importance: 5,
        category: 'technical',
      });
    }

    return skills;
  }

  /**
   * Infer skill level based on repository analysis
   */
  private inferSkillLevel(githubAnalysis: GitHubAnalysis, technology: string): number {
    const baseLevel = this.getBaseLevelFromSkillLevel(githubAnalysis.skillLevel);
    
    // Adjust based on technology complexity and usage
    const complexityMultiplier = this.getTechnologyComplexity(technology);
    const usageMultiplier = this.getTechnologyUsage(githubAnalysis, technology);
    
    return this.clampSkillLevel(
      baseLevel * complexityMultiplier * usageMultiplier
    );
  }

  /**
   * Get base level from skill level string
   */
  private getBaseLevelFromSkillLevel(skillLevel: string): number {
    switch (skillLevel) {
      case 'beginner': return 2;
      case 'intermediate': return 3;
      case 'advanced': return 4;
      default: return 2;
    }
  }

  /**
   * Get technology complexity multiplier
   */
  private getTechnologyComplexity(technology: string): number {
    const complexityMap: { [key: string]: number } = {
      'javascript': 1.0,
      'html': 0.8,
      'css': 0.8,
      'python': 1.1,
      'java': 1.2,
      'typescript': 1.3,
      'react': 1.2,
      'vue': 1.2,
      'angular': 1.4,
      'node.js': 1.3,
      'spring': 1.4,
      'django': 1.2,
      'flask': 1.1,
      'express': 1.1,
      'mongodb': 1.1,
      'postgresql': 1.2,
      'mysql': 1.0,
      'docker': 1.2,
      'kubernetes': 1.5,
      'aws': 1.4,
      'azure': 1.4,
      'gcp': 1.4,
      'pytorch': 1.5,
      'tensorflow': 1.5,
      'scikit-learn': 1.3,
      'sklearn': 1.3,
      'pandas': 1.1,
      'numpy': 1.1,
      'huggingface': 1.3,
      'langchain': 1.2,
      'machine learning': 1.4,
      'machine-learning': 1.4,
      'deep learning': 1.5,
      'deep-learning': 1.5,
      'spark': 1.4,
      'apache spark': 1.4,
      'hadoop': 1.3,
      'kafka': 1.3,
      'airflow': 1.3,
      'databricks': 1.3,
      'snowflake': 1.3,
      'bigquery': 1.2,
      'terraform': 1.3,
      'ansible': 1.1,
      'jest': 1.0,
      'cypress': 1.1,
      'playwright': 1.2
    };
    
    return complexityMap[technology.toLowerCase()] || 1.0;
  }

  /**
   * Get technology usage multiplier based on repository
   */
  private getTechnologyUsage(githubAnalysis: GitHubAnalysis, technology: string): number {
    // If technology is in primary languages, give higher multiplier
    if (githubAnalysis.languages.includes(technology)) {
      return 1.2;
    }
    
    // If technology is in frameworks, give medium multiplier
    if (githubAnalysis.frameworks.includes(technology)) {
      return 1.1;
    }
    
    // If technology is in tools, give lower multiplier
    if (githubAnalysis.tools.includes(technology)) {
      return 1.0;
    }
    
    return 0.8;
  }

  /**
   * Get target level for technology
   */
  private getTargetLevelForTechnology(technology: string): number {
    return 5;
  }

  private inferToolingSkillLevel(githubAnalysis: GitHubAnalysis, tool: string): number {
    const baseLevel = this.getBaseLevelFromSkillLevel(githubAnalysis.skillLevel);
    const isPrimaryTool = githubAnalysis.tools.includes(tool);
    const multiplier = isPrimaryTool ? 1.2 : 0.9;
    return this.clampSkillLevel(baseLevel * multiplier);
  }

  /**
   * Get technology to skill mapping
   */
  private getTechnologySkillMap(): { [key: string]: any } {
    return {
      'javascript': { id: 'tech-javascript', name: 'JavaScript', importance: 5, category: 'technical' },
      'typescript': { id: 'tech-typescript', name: 'TypeScript', importance: 5, category: 'technical' },
      'python': { id: 'tech-python', name: 'Python', importance: 5, category: 'technical' },
      'java': { id: 'tech-java', name: 'Java', importance: 5, category: 'technical' },
      'react': { id: 'framework-react', name: 'React', importance: 5, category: 'technical' },
      'vue': { id: 'framework-vue', name: 'Vue.js', importance: 4, category: 'technical' },
      'angular': { id: 'framework-angular', name: 'Angular', importance: 4, category: 'technical' },
      'node.js': { id: 'framework-nodejs', name: 'Node.js', importance: 5, category: 'technical' },
      'spring': { id: 'framework-spring', name: 'Spring Framework', importance: 5, category: 'technical' },
      'django': { id: 'framework-django', name: 'Django', importance: 4, category: 'technical' },
      'flask': { id: 'framework-flask', name: 'Flask', importance: 3, category: 'technical' },
      'express': { id: 'framework-express', name: 'Express.js', importance: 4, category: 'technical' },
      'mongodb': { id: 'database-mongodb', name: 'MongoDB', importance: 4, category: 'technical' },
      'postgresql': { id: 'database-postgresql', name: 'PostgreSQL', importance: 4, category: 'technical' },
      'mysql': { id: 'database-mysql', name: 'MySQL', importance: 3, category: 'technical' },
      'docker': { id: 'devops-docker', name: 'Docker', importance: 4, category: 'technical' },
      'kubernetes': { id: 'devops-kubernetes', name: 'Kubernetes', importance: 5, category: 'technical' },
      'aws': { id: 'cloud-aws', name: 'AWS', importance: 5, category: 'technical' },
      'azure': { id: 'cloud-azure', name: 'Azure', importance: 4, category: 'technical' },
      'gcp': { id: 'cloud-gcp', name: 'Google Cloud', importance: 4, category: 'technical' },
      'terraform': { id: 'devops-terraform', name: 'Terraform', importance: 4, category: 'technical' },
      'ansible': { id: 'devops-ansible', name: 'Ansible', importance: 3, category: 'technical' },
      'jest': { id: 'testing-jest', name: 'Jest', importance: 3, category: 'technical' },
      'cypress': { id: 'testing-cypress', name: 'Cypress', importance: 3, category: 'technical' },
      'playwright': { id: 'testing-playwright', name: 'Playwright', importance: 3, category: 'technical' },
      'pytorch': { id: 'ml-pytorch', name: 'PyTorch', importance: 5, category: 'technical' },
      'tensorflow': { id: 'ml-tensorflow', name: 'TensorFlow', importance: 5, category: 'technical' },
      'scikit-learn': { id: 'ml-scikit', name: 'scikit-learn', importance: 4, category: 'technical' },
      'sklearn': { id: 'ml-scikit', name: 'scikit-learn', importance: 4, category: 'technical' },
      'pandas': { id: 'ml-python', name: 'Pandas', importance: 4, category: 'technical' },
      'numpy': { id: 'ml-python', name: 'NumPy', importance: 4, category: 'technical' },
      'huggingface': { id: 'ml-nlp', name: 'Hugging Face Transformers', importance: 4, category: 'technical' },
      'transformers': { id: 'ml-nlp', name: 'Transformers', importance: 4, category: 'technical' },
      'langchain': { id: 'ml-langchain', name: 'LangChain', importance: 3, category: 'technical' },
      'machine learning': { id: 'ml-foundations', name: 'Machine Learning Foundations', importance: 5, category: 'technical' },
      'machine-learning': { id: 'ml-foundations', name: 'Machine Learning Foundations', importance: 5, category: 'technical' },
      'deep learning': { id: 'ml-nlp', name: 'Deep Learning', importance: 5, category: 'technical' },
      'deep-learning': { id: 'ml-nlp', name: 'Deep Learning', importance: 5, category: 'technical' },
      'mlops': { id: 'mlops', name: 'MLOps Practices', importance: 4, category: 'technical' },
      'spark': { id: 'data-spark', name: 'Apache Spark', importance: 5, category: 'technical' },
      'apache spark': { id: 'data-spark', name: 'Apache Spark', importance: 5, category: 'technical' },
      'hadoop': { id: 'data-hadoop', name: 'Apache Hadoop', importance: 4, category: 'technical' },
      'kafka': { id: 'data-kafka', name: 'Apache Kafka', importance: 4, category: 'technical' },
      'airflow': { id: 'data-airflow', name: 'Apache Airflow', importance: 4, category: 'technical' },
      'databricks': { id: 'data-databricks', name: 'Databricks', importance: 4, category: 'technical' },
      'snowflake': { id: 'data-snowflake', name: 'Snowflake', importance: 4, category: 'technical' },
      'bigquery': { id: 'data-bigquery', name: 'BigQuery', importance: 4, category: 'technical' }
    };
  }

  /**
   * Infer general programming level
   */
  private inferGeneralProgrammingLevel(githubAnalysis: GitHubAnalysis): number {
    const languageCount = githubAnalysis.languages.length;
    const frameworkCount = githubAnalysis.frameworks.length;
    const toolCount = githubAnalysis.tools.length;
    
    // More languages and frameworks = higher programming level
    const complexityScore = (languageCount * 0.4) + (frameworkCount * 0.3) + (toolCount * 0.3);
    
    let level = 1;
    if (complexityScore >= 8) level = 5;
    else if (complexityScore >= 5) level = 4;
    else if (complexityScore >= 2) level = 3;
    else if (complexityScore >= 1) level = 2;
    return this.clampSkillLevel(level);
  }

  /**
   * Infer framework level
   */
  private inferFrameworkLevel(githubAnalysis: GitHubAnalysis): number {
    const frameworkCount = githubAnalysis.frameworks.length;
    const hasAdvancedFrameworks = githubAnalysis.frameworks.some(f => 
      ['react', 'angular', 'vue', 'spring', 'django'].includes(f.toLowerCase())
    );
    
    let level = 1;
    if (frameworkCount >= 3 && hasAdvancedFrameworks) level = 5;
    else if (frameworkCount >= 2) level = 4;
    else if (frameworkCount >= 1) level = 3;
    else if (frameworkCount > 0) level = 2;
    return this.clampSkillLevel(level);
  }

  private inferToolingLevel(githubAnalysis: GitHubAnalysis): number {
    const toolCount = githubAnalysis.tools.length;
    const hasAdvancedTools = githubAnalysis.tools.some((tool) =>
      ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'spark', 'hadoop', 'kafka', 'airflow', 'databricks', 'snowflake', 'bigquery'].includes(tool.toLowerCase())
    );

    let level = 1;
    if (toolCount >= 4 && hasAdvancedTools) level = 5;
    else if (toolCount >= 3) level = 4;
    else if (toolCount >= 2) level = 3;
    else if (toolCount > 0) level = 2;
    return this.clampSkillLevel(level);
  }

  private inferStackBreadth(githubAnalysis: GitHubAnalysis): number {
    const languageLevel = this.inferGeneralProgrammingLevel(githubAnalysis);
    const frameworkLevel = this.inferFrameworkLevel(githubAnalysis);
    const toolingLevel = this.inferToolingLevel(githubAnalysis);

    const average = (languageLevel + frameworkLevel + toolingLevel) / 3;
    return this.clampSkillLevel(Math.round(average));
  }

  private inferSpecialtyLevel(skills: Skill[], specialtyIds: string[]): number {
    const relevant = skills.filter((skill) => specialtyIds.includes(skill.id));
    if (relevant.length === 0) {
      return 1;
    }
    const averageLevel = relevant.reduce((sum, skill) => sum + skill.currentLevel, 0) / relevant.length;
    const averageImportance = relevant.reduce((sum, skill) => sum + skill.importance, 0) / relevant.length;
    return this.clampSkillLevel(Math.round((averageLevel * 0.7) + (averageImportance * 0.3)));
  }

  /**
   * Generate GitHub-specific recommendations
   */
  private generateGitHubSpecificRecommendations(githubAnalysis: GitHubAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (githubAnalysis.skillLevel === 'beginner') {
      recommendations.push('Focus on mastering the fundamentals of your primary programming language');
      recommendations.push('Practice with smaller, simpler projects before tackling complex ones');
    } else if (githubAnalysis.skillLevel === 'intermediate') {
      recommendations.push('Explore advanced features and patterns in your current technology stack');
      recommendations.push('Consider contributing to open source projects to gain real-world experience');
    } else if (githubAnalysis.skillLevel === 'advanced') {
      recommendations.push('Share your knowledge by mentoring others or writing technical content');
      recommendations.push('Consider exploring emerging technologies and architectural patterns');
    }
    
    if (githubAnalysis.tools.includes('Docker')) {
      recommendations.push('Learn container orchestration with Kubernetes for production deployments');
    }
    
    if (githubAnalysis.frameworks.some(f => ['react', 'vue', 'angular'].includes(f.toLowerCase()))) {
      recommendations.push('Explore state management solutions and advanced frontend patterns');
    }
    
    return recommendations;
  }

  /**
   * Fetch data from GitHub API
   */
  private async fetchGitHubData(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SkillBridge.ai-Agents'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found or is private');
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized access to repository');
      }
      throw new Error(`GitHub API error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Extract technologies from repository data
   */
  private extractTechnologies(repoData: any, languagesData: any, contentsData: any): string[] {
    const technologies: string[] = [];
    
    // Add primary languages
    const primaryLanguages = Object.keys(languagesData).slice(0, 5);
    technologies.push(...primaryLanguages);

    // Check for common technologies in repository description and topics
    const description = (repoData.description || '').toLowerCase();
    const topics = repoData.topics || [];
    
    const techKeywords = [
      'react', 'vue', 'angular', 'svelte',
      'nodejs', 'express', 'fastapi', 'django', 'spring',
      'mongodb', 'postgresql', 'mysql', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'typescript', 'javascript', 'python', 'java', 'c#', 'go', 'rust',
      'nextjs', 'nuxt', 'sveltekit', 'gatsby',
      'tailwind', 'bootstrap', 'material-ui', 'chakra',
      'pytorch', 'tensorflow', 'scikit-learn', 'sklearn', 'huggingface', 'transformers', 'langchain',
      'machine learning', 'machine-learning', 'deep learning', 'deep-learning', 'mlops', 'ai', 'artificial intelligence',
      'apache spark', 'spark', 'hadoop', 'kafka', 'airflow', 'databricks', 'snowflake', 'bigquery', 'data engineering', 'data-engineering'
    ];

    techKeywords.forEach(tech => {
      if (description.includes(tech) || topics.includes(tech)) {
        technologies.push(tech);
      }
    });

    return [...new Set(technologies)]; // Remove duplicates
  }

  /**
   * Extract frameworks from repository contents
   */
  private extractFrameworks(contentsData: any, languagesData: any): string[] {
    const frameworks: string[] = [];
    
    if (!Array.isArray(contentsData)) return frameworks;

    // Look for configuration files to detect frameworks
    const configFiles = contentsData.map((file: any) => file.name);
    const languages = Object.keys(languagesData);
    
    // JavaScript/TypeScript frameworks
    if (languages.includes('JavaScript') || languages.includes('TypeScript')) {
      frameworks.push('Node.js');
      if (languages.includes('TypeScript')) {
        frameworks.push('TypeScript');
      }
      
      // Check for specific JS frameworks
      if (configFiles.some((file: string) => file.includes('react'))) {
        frameworks.push('React');
      }
      if (configFiles.some((file: string) => file.includes('vue'))) {
        frameworks.push('Vue.js');
      }
      if (configFiles.some((file: string) => file.includes('angular'))) {
        frameworks.push('Angular');
      }
      if (configFiles.some((file: string) => file.includes('next'))) {
        frameworks.push('Next.js');
      }
    }
    
    // Java frameworks
    if (languages.includes('Java')) {
      // Check for Spring Boot indicators
      if (configFiles.includes('pom.xml') || configFiles.includes('build.gradle')) {
        frameworks.push('Spring Framework');
        frameworks.push('Spring Boot');
      }
      
      // Check for other Java frameworks
      if (configFiles.some((file: string) => file.includes('hibernate'))) {
        frameworks.push('Hibernate');
      }
      if (configFiles.some((file: string) => file.includes('maven'))) {
        frameworks.push('Maven');
      }
      if (configFiles.some((file: string) => file.includes('gradle'))) {
        frameworks.push('Gradle');
      }
    }
    
    // Python frameworks
    if (languages.includes('Python')) {
      frameworks.push('Python');
      
      if (configFiles.includes('requirements.txt')) {
        frameworks.push('pip');
      }
      if (configFiles.some((file: string) => file.includes('django'))) {
        frameworks.push('Django');
      }
      if (configFiles.some((file: string) => file.includes('flask'))) {
        frameworks.push('Flask');
      }
      if (configFiles.some((file: string) => file.includes('fastapi'))) {
        frameworks.push('FastAPI');
      }
    }
    
    // Go frameworks
    if (languages.includes('Go')) {
      frameworks.push('Go');
      if (configFiles.includes('go.mod')) {
        frameworks.push('Go Modules');
      }
    }
    
    // Rust frameworks
    if (languages.includes('Rust')) {
      frameworks.push('Rust');
      if (configFiles.includes('Cargo.toml')) {
        frameworks.push('Cargo');
      }
    }

    return [...new Set(frameworks)]; // Remove duplicates
  }

  /**
   * Extract tools from repository contents
   */
  private extractTools(contentsData: any): string[] {
    const tools: string[] = [];
    
    if (!Array.isArray(contentsData)) return tools;

    // Look for common tool configuration files
    const toolFiles = contentsData.map((file: any) => file.name);
    
    if (toolFiles.includes('docker-compose.yml') || toolFiles.includes('Dockerfile')) {
      tools.push('docker');
    }
    
    if (toolFiles.includes('.github')) {
      tools.push('github actions');
    }
    
    if (toolFiles.includes('jest.config.js') || toolFiles.includes('vitest.config.ts')) {
      tools.push('jest');
    }
    
    if (toolFiles.includes('eslint.config.js') || toolFiles.includes('.eslintrc')) {
      tools.push('eslint');
    }
    
    if (toolFiles.includes('prettier.config.js') || toolFiles.includes('.prettierrc')) {
      tools.push('prettier');
    }

    const fileNamesLower = toolFiles.map((file: string) => file.toLowerCase());

    if (fileNamesLower.some((name) => name.includes('airflow'))) {
      tools.push('airflow');
    }

    if (fileNamesLower.some((name) => name.includes('spark'))) {
      tools.push('spark');
    }

    if (fileNamesLower.some((name) => name.includes('hadoop'))) {
      tools.push('hadoop');
    }

    if (fileNamesLower.some((name) => name.includes('kafka'))) {
      tools.push('kafka');
    }

    if (fileNamesLower.some((name) => name.includes('databricks'))) {
      tools.push('databricks');
    }

    if (fileNamesLower.some((name) => name.includes('snowflake'))) {
      tools.push('snowflake');
    }

    if (fileNamesLower.some((name) => name.includes('bigquery'))) {
      tools.push('bigquery');
    }

    if (fileNamesLower.some((name) => name.includes('terraform'))) {
      tools.push('terraform');
    }

    if (fileNamesLower.some((name) => name.includes('ansible'))) {
      tools.push('ansible');
    }

    return [...new Set(tools)];
  }

  /**
   * Determine skill level based on repository complexity
   */
  private determineSkillLevel(repoData: any, languagesData: any, contentsData: any): 'beginner' | 'intermediate' | 'advanced' {
    const languageCount = Object.keys(languagesData).length;
    const fileCount = Array.isArray(contentsData) ? contentsData.length : 0;
    const stars = repoData.stargazers_count || 0;
    const forks = repoData.forks_count || 0;
    
    // Simple heuristic based on repository metrics
    if (languageCount >= 5 || fileCount >= 100 || stars >= 100) {
      return 'advanced';
    } else if (languageCount >= 3 || fileCount >= 50 || stars >= 10) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  /**
   * Generate technology-specific recommendations
   */
  private generateTechnologyRecommendations(languages: string[], frameworks: string[], technologies: string[]): string[] {
    const recommendations: string[] = [];
    
    // Language-specific recommendations
    if (languages.includes('Java')) {
      recommendations.push('Master Spring Boot and Spring Security for enterprise development');
      recommendations.push('Learn Maven or Gradle for dependency management');
      recommendations.push('Practice design patterns and SOLID principles');
    }
    
    if (languages.includes('Python')) {
      recommendations.push('Explore Django or FastAPI for web development');
      recommendations.push('Learn pandas and numpy for data science');
      recommendations.push('Practice with virtual environments and pip');
    }
    
    if (languages.includes('JavaScript') || languages.includes('TypeScript')) {
      recommendations.push('Master modern ES6+ features and async programming');
      recommendations.push('Learn a frontend framework like React, Vue, or Angular');
      recommendations.push('Understand Node.js and server-side JavaScript');
    }
    
    if (languages.includes('Go')) {
      recommendations.push('Learn Go modules and package management');
      recommendations.push('Master goroutines and channels for concurrency');
      recommendations.push('Explore popular Go frameworks like Gin or Echo');
    }
    
    if (languages.includes('Rust')) {
      recommendations.push('Master ownership and borrowing concepts');
      recommendations.push('Learn Cargo and the Rust ecosystem');
      recommendations.push('Practice with async programming in Rust');
    }

    // Framework-specific recommendations
    if (frameworks.includes('Spring Framework')) {
      recommendations.push('Learn Spring Boot auto-configuration and starters');
      recommendations.push('Master Spring Data JPA for database operations');
      recommendations.push('Understand Spring Security for authentication');
    }

    if (frameworks.includes('React')) {
      recommendations.push('Explore advanced React patterns like hooks and context');
      recommendations.push('Learn performance optimization techniques (memoization, lazy loading)');
      recommendations.push('Practice testing React components with React Testing Library or Cypress');
    }

    if (technologies.includes('pytorch')) {
      recommendations.push('Build end-to-end experiments with PyTorch Lightning or similar frameworks');
      recommendations.push('Learn model serving with TorchServe, BentoML, or FastAPI integrations');
      recommendations.push('Explore optimization techniques (mixed precision, distributed training)');
    }

    if (technologies.includes('tensorflow')) {
      recommendations.push('Build production-ready models with TensorFlow Extended (TFX)');
      recommendations.push('Practice model deployment using TensorFlow Serving or Vertex AI');
      recommendations.push('Learn TensorFlow Lite for edge deployment scenarios');
    }

    if (technologies.includes('airflow')) {
      recommendations.push('Design resilient DAGs with modular operators and clear retries');
      recommendations.push('Implement data quality checks using Airflow sensors or Great Expectations');
      recommendations.push('Automate environment provisioning with Terraform or Helm');
    }

    if (technologies.includes('spark')) {
      recommendations.push('Optimize Spark jobs with partitioning, caching, and Catalyst tuning');
      recommendations.push('Explore streaming workloads with Spark Structured Streaming');
      recommendations.push('Deploy Spark on managed services like Databricks or EMR');
    }

    if (technologies.includes('terraform')) {
      recommendations.push('Create reusable Terraform modules and enforce code review policies');
      recommendations.push('Use Terraform Cloud or Atlantis for collaborative workflows');
      recommendations.push('Integrate Terraform with CI/CD pipelines for infrastructure automation');
    }

    if (technologies.includes('kubernetes')) {
      recommendations.push('Learn advanced Kubernetes concepts (Operators, StatefulSets, RBAC)');
      recommendations.push('Improve observability with Prometheus, Grafana, or OpenTelemetry');
      recommendations.push('Automate delivery with GitOps tools like ArgoCD or Flux');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Focus on mastering the primary programming language');
      recommendations.push('Learn version control best practices with Git');
      recommendations.push('Practice writing clean, maintainable code');
      recommendations.push('Explore testing frameworks and write unit tests');
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Generate skill-specific recommendations
   */
  private generateSkillRecommendations(skill: Skill, gap: number): string[] {
    const recommendations: string[] = [];
    
    if (gap < 0.5) {
      return [];
    }

    if (gap > 0) {
      switch (skill.id) {
        case 'frameworks':
          recommendations.push('Follow official documentation and tutorials');
          recommendations.push('Build a complete project using the framework');
          recommendations.push('Join community forums and attend meetups');
          break;
        case 'communication':
          recommendations.push('Practice presenting technical concepts to non-technical audiences');
          recommendations.push('Join Toastmasters or similar public speaking groups');
          recommendations.push('Write technical blog posts or documentation');
          break;
        case 'leadership':
          recommendations.push('Take on mentoring opportunities');
          recommendations.push('Lead small projects or initiatives');
          recommendations.push('Read leadership books and apply concepts');
          break;
        default:
          recommendations.push(`Set a focused improvement goal for ${skill.name}`);
          recommendations.push('Design a mini-project to exercise this skill in context');
          recommendations.push('Review feedback or code reviews related to this area');
      }
    }

    return recommendations;
  }

  /**
   * Generate general recommendations based on skill gaps
   */
  private generateGeneralRecommendations(skillGaps: SkillGap[]): string[] {
    const recommendations: string[] = [];
    const impactfulGaps = skillGaps
      .filter((gap) => gap.gap >= 1)
      .sort((a, b) => b.priority - a.priority);

    const topGaps = impactfulGaps.slice(0, 3);

    if (topGaps.length > 0) {
      recommendations.push(`Focus on your top 3 skill gaps: ${topGaps.map(gap => gap.skill.name).join(', ')}`);
    }

    const technicalGaps = impactfulGaps.filter(gap => gap.skill.category === 'technical');
    if (technicalGaps.length > 0) {
      recommendations.push('Invest time in advanced technical training or certifications');
      recommendations.push('Create a project roadmap to apply the targeted technologies');
    }

    const softSkillGaps = impactfulGaps.filter(gap => gap.skill.category === 'soft');
    if (softSkillGaps.length > 0) {
      recommendations.push('Practice soft skills through mentorship, coaching, or peer feedback sessions');
    }

    if (impactfulGaps.length > 0) {
      recommendations.push('Set a focused learning plan with milestones for the identified gaps');
    }

    return recommendations;
  }

  /**
   * Generate a structured learning path
   */
  private generateLearningPath(skillGaps: SkillGap[]): string[] {
    const learningPath: string[] = [];
    const priorityGaps = skillGaps.filter(gap => gap.priority > 10).slice(0, 5);

    learningPath.push('Phase 1: Foundation (Weeks 1-4)');
    priorityGaps.slice(0, 2).forEach(gap => {
      learningPath.push(`- Focus on ${gap.skill.name}: ${gap.recommendations[0]}`);
    });

    if (priorityGaps.length > 2) {
      learningPath.push('Phase 2: Development (Weeks 5-8)');
      priorityGaps.slice(2, 4).forEach(gap => {
        learningPath.push(`- Develop ${gap.skill.name}: ${gap.recommendations[0]}`);
      });
    }

    if (priorityGaps.length > 4) {
      learningPath.push('Phase 3: Mastery (Weeks 9-12)');
      priorityGaps.slice(4).forEach(gap => {
        learningPath.push(`- Master ${gap.skill.name}: ${gap.recommendations[0]}`);
      });
    }

    learningPath.push('Phase 4: Application (Ongoing)');
    learningPath.push('- Apply skills in real-world projects');
    learningPath.push('- Seek feedback and continue learning');

    return learningPath;
  }

  /**
   * Get default skill categories for initial assessment
   */
  getDefaultSkillCategories(): SkillCategory[] {
    return this.skillCategories.map(category => ({
      ...category,
      skills: category.skills.map(skill => ({
        ...skill,
        currentLevel: 1,
        targetLevel: skill.targetLevel
      }))
    }));
  }

  /**
   * Update skill levels based on user input
   */
  updateSkillLevel(skillId: string, currentLevel: number, targetLevel?: number): void {
    this.skillCategories.forEach(category => {
      const skill = category.skills.find(s => s.id === skillId);
      if (skill) {
        skill.currentLevel = Math.max(1, Math.min(5, currentLevel));
        if (targetLevel !== undefined) {
          skill.targetLevel = Math.max(1, Math.min(5, targetLevel));
        }
      }
    });
  }
}
