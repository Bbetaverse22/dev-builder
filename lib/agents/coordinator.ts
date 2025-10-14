import { jsonSchema, tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
// Vectorize service removed - not used in production
import { GitHubAgent } from "./github-agent";
import { skillGapStorage } from "@/lib/storage/skill-gap-storage";

export interface UserContext {
  userId?: string;
  sessionId?: string;
  tabContext?: string;
}

export interface AgentResponse {
  text: string;
  sources?: any[];
  toolCalls?: any[];
  agentType: string;
}

// Vectorize service removed - not used in production

const githubAgent = new GitHubAgent();

const KNOWLEDGE_BASE_KEYWORDS = [
  "react",
  "typescript",
  "type script",
  "ts",
  "jsx",
  "tsx",
];

export class CoordinatorAgent {

  /**
   * Route user queries to appropriate specialized agents
   */
  routeQuery(query: string, context: UserContext): string {
    const lowerQuery = query.toLowerCase();
    const { tabContext } = context;
    
    // Tab-aware routing: bias towards agents based on active tab
    // But still allow content-based routing to override
    const tabAgentMapping: Record<string, string> = {
      'gaps': 'gap_agent',
      'learning': 'learning_agent',
      'career': 'career_agent',
      'progress': 'progress_agent',
    };
    
    const suggestedAgent = tabContext ? tabAgentMapping[tabContext] : null;
    
    // Priority routing for practice issues - always goes to learning_agent
    if (lowerQuery.includes('practice') || 
        lowerQuery.includes('github_search_practice_issues') ||
        lowerQuery.includes('practice issue') ||
        lowerQuery.includes('find beginner')) {
      return 'learning_agent';
    }
    
    // GitHub repository analysis - route to gap_agent for skill analysis
    if (lowerQuery.includes('github.com') || lowerQuery.includes('github/')) {
      // Repository URLs should go to gap_agent for skill gap analysis
      if (lowerQuery.match(/github\.com\/[^\/]+\/[^\/]+/)) {
        return 'gap_agent';
      }
      // User profile analysis goes to github_agent
      if (lowerQuery.includes('github user') || lowerQuery.includes('github profile')) {
        return 'github_agent';
      }
      // Default: route to gap_agent for skill analysis
      return 'gap_agent';
    }
    
    // GitHub user/profile queries (without URL)
    if ((lowerQuery.includes('github user') || lowerQuery.includes('github profile')) && 
        !lowerQuery.includes('github.com/')) {
      return 'github_agent';
    }
    
    // Technical and skill-related keywords - route to gap_agent for specialized knowledge
    if (lowerQuery.includes('skill gap') ||
        lowerQuery.includes('assessment') ||
        lowerQuery.includes('analyze my skills') ||
        lowerQuery.includes('what am i missing') ||
        lowerQuery.includes('code analysis') ||
        lowerQuery.includes('analyze code') ||
        lowerQuery.includes('technologies') ||
        lowerQuery.includes('tech stack') ||
        lowerQuery.includes('frameworks') ||
        lowerQuery.includes('programming languages') ||
        lowerQuery.includes('languages used') ||
        lowerQuery.includes('what technologies') ||
        // Skill-based learning questions (should go to gap_agent, not learning_agent)
        lowerQuery.includes('what should i learn') ||
        lowerQuery.includes('what to learn') ||
        lowerQuery.includes('what can i learn') ||
        lowerQuery.includes('should i learn') ||
        lowerQuery.includes('learn next') ||
        lowerQuery.includes('improve my skills') ||
        lowerQuery.includes('skill recommendations') ||
        lowerQuery.includes('recommended skills') ||
        // Programming language and framework specific questions
        lowerQuery.includes('react') ||
        lowerQuery.includes('javascript') ||
        lowerQuery.includes('typescript') ||
        lowerQuery.includes('python') ||
        lowerQuery.includes('java') ||
        lowerQuery.includes('node.js') ||
        lowerQuery.includes('express') ||
        lowerQuery.includes('django') ||
        lowerQuery.includes('flask') ||
        lowerQuery.includes('spring') ||
        lowerQuery.includes('angular') ||
        lowerQuery.includes('vue') ||
        // Development concepts
        lowerQuery.includes('component') ||
        lowerQuery.includes('function') ||
        lowerQuery.includes('class') ||
        lowerQuery.includes('variable') ||
        lowerQuery.includes('loop') ||
        lowerQuery.includes('condition') ||
        lowerQuery.includes('api') ||
        lowerQuery.includes('database') ||
        lowerQuery.includes('testing') ||
        lowerQuery.includes('debug')) {
      return 'gap_agent';
    }
    
    // Learning and education keywords (for course/tutorial recommendations, not skill assessment)
    if (lowerQuery.includes('course') || 
        lowerQuery.includes('tutorial') ||
        lowerQuery.includes('study plan') ||
        lowerQuery.includes('how to learn')) {
      return 'learning_agent';
    }
    
    // Career development keywords (excluding general github)
    if (lowerQuery.includes('career') || 
        lowerQuery.includes('resume') || 
        lowerQuery.includes('job') ||
        lowerQuery.includes('interview') ||
        lowerQuery.includes('portfolio') ||
        lowerQuery.includes('salary') ||
        lowerQuery.includes('networking')) {
      return 'career_agent';
    }
    
    // Progress tracking keywords
    if (lowerQuery.includes('progress') || 
        lowerQuery.includes('history') || 
        lowerQuery.includes('track') ||
        lowerQuery.includes('analytics') ||
        lowerQuery.includes('stats') ||
        lowerQuery.includes('achievements')) {
      return 'progress_agent';
    }
    
    // If we have a tab context and no strong content match, use tab-suggested agent
    if (suggestedAgent && !lowerQuery.includes('help') && !lowerQuery.includes('what can you do')) {
      console.log(`Using tab-suggested agent: ${suggestedAgent} (from tab: ${tabContext})`);
      return suggestedAgent;
    }
    
    // Default to coordinator for general queries
    return 'coordinator';
  }

  /**
   * Provide shared tools available to all agents for streaming responses.
   */
  getTools(options: { gateByKeywords?: boolean } = {}) {
    const { gateByKeywords = true } = options;

    const tools: ToolSet = {
      web_search: openai.tools.webSearch({
        searchContextSize: "low",
      }),
      ...githubAgent.getTools(),
      
      // Skill gap analysis retrieval tool
      get_skill_gap_analysis: tool({
        description: 'Get the user\'s latest skill gap analysis results, including skills assessed, gaps identified, and personalized recommendations',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            userId: { 
              type: 'string', 
              description: 'User ID (defaults to "user_123" if not specified)',
              default: 'user_123'
            },
          },
          additionalProperties: false,
        }) as any,
        execute: async ({ userId = 'user_123' }: { userId?: string }) => {
          try {
            console.log('🔍 get_skill_gap_analysis called with userId:', userId);
            const summary = skillGapStorage.getSkillGapSummary(userId);
            console.log('📊 Skill gap summary:', summary ? 'Found' : 'Not found');
            
            if (!summary) {
              // Debug: Check what's in storage
              const allGaps = skillGapStorage.getUserSkillGaps(userId);
              console.log('📦 Total skill gaps for user:', allGaps.length);
              
              return {
                success: false,
                message: 'No skill gap analysis found. Please analyze a GitHub repository first in the "Skill Analysis" tab.',
              };
            }
            
            console.log('✅ Returning skill gap summary');
            return {
              success: true,
              data: summary,
              message: 'Retrieved recent skill gap analysis',
            };
          } catch (error) {
            console.error('❌ Error retrieving skill gap:', error);
            return {
              success: false,
              error: `Failed to retrieve skill gap analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
      }),

      // Skill gap analysis generation tool
      perform_skill_gap_analysis: tool({
        description: 'Perform a complete skill gap analysis based on GitHub repository data. This tool analyzes the repository data and generates skill assessments, gaps, and recommendations.',
        inputSchema: jsonSchema({
          type: 'object',
          properties: {
            githubData: {
              type: 'object',
              description: 'GitHub repository analysis data from github_repository_analysis tool',
            },
            userId: {
              type: 'string',
              description: 'User ID (defaults to "user_123" if not specified)',
              default: 'user_123'
            },
          },
          required: ['githubData'],
          additionalProperties: false,
        }) as any,
        execute: async ({ githubData, userId = 'user_123' }: { githubData: any; userId?: string }) => {
          try {
            console.log('🔍 perform_skill_gap_analysis called with userId:', userId);
            
            // Import the gap analyzer
            const { GapAnalyzerAgent } = await import('@/lib/agents/gap-analyzer');
            const gapAnalyzer = new GapAnalyzerAgent();
            
            // Convert GitHub data to the expected format
            const githubAnalysis: any = {
              repository: githubData.repository?.url || 'Unknown repository',
              technologies: [githubData.repository?.language || 'Unknown'],
              languages: [githubData.repository?.language || 'Unknown'],
              frameworks: [],
              tools: [],
              skillLevel: (githubData.skill_indicators?.project_maturity === 'mature' ? 'intermediate' : 'beginner') as 'beginner' | 'intermediate' | 'advanced',
              recommendations: [],
              stars: githubData.repository?.stars || 0,
              forks: githubData.repository?.forks || 0,
              createdAt: githubData.repository?.created || new Date().toISOString(),
              updatedAt: githubData.repository?.updated || new Date().toISOString(),
              description: githubData.repository?.description || '',
              topics: [],
              hasTests: false,
              hasCI: false,
              hasDocs: githubData.skill_indicators?.code_quality_indicators?.has_readme || false,
            };
            
            // Generate skill assessment
            const skillAssessment = await gapAnalyzer.generateAutomaticSkillAssessment(githubAnalysis);
            
            // Store the analysis
            const storageId = await skillGapStorage.storeSkillGap(userId, githubAnalysis, skillAssessment);
            
            console.log('✅ Skill gap analysis completed and stored:', storageId);
            
            return {
              success: true,
              data: {
                repository: githubAnalysis.repository,
                overallScore: skillAssessment.overallScore,
                skillLevel: githubAnalysis.skillLevel,
                skillGaps: skillAssessment.skillGaps.slice(0, 5),
                recommendations: skillAssessment.recommendations.slice(0, 5),
                storageId
              },
              message: 'Skill gap analysis completed successfully',
            };
          } catch (error) {
            console.error('❌ Error performing skill gap analysis:', error);
            return {
              success: false,
              error: `Failed to perform skill gap analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
      }),
    };

    // Knowledge base tool removed - vectorize service not used in production

    return tools;
  }

  /**
   * Get system prompt for specialized agents
   */
  getSystemPrompt(agentType: string): string {
    const prompts = {
      github_agent: `
You are a GitHub Analysis Agent specializing in analyzing GitHub profiles, repositories, and code to assess technical skills and provide career development insights.

Your expertise includes:
- Analyzing GitHub user profiles and activity patterns
- Extracting technical skills from repository analysis
- Assessing code quality and project maturity
- Identifying skill gaps based on GitHub activity
- Providing personalized recommendations for skill development
- Analyzing repository languages, frameworks, and technologies
- Evaluating community engagement and project contributions

Key capabilities:
- Get user profile information and repository statistics
- Analyze specific repositories for technical depth
- Search repositories by technology or topic
- Assess technical skills based on GitHub activity
- Provide skill-based career recommendations

When analyzing GitHub profiles:
- Look at repository languages, stars, forks, and activity
- Assess project complexity and code quality indicators
- Identify primary technical skills and expertise areas
- Compare against industry standards and best practices
- Provide actionable recommendations for skill development

For repository analysis:
- Extract technologies, frameworks, and programming languages
- Assess project maturity and community engagement
- Identify skill levels based on code patterns and complexity
- Suggest learning opportunities and next steps

Always provide specific, actionable insights based on the GitHub data analysis.
`,

      gap_agent: `
You are a Skill Gap Analysis Agent specializing in identifying skill gaps and providing personalized recommendations.

CRITICAL INSTRUCTION: When you call ANY tool and receive data, you MUST immediately use that data to provide a complete, helpful response. Do NOT just call tools and then explain what you would do - you MUST actually use the tool results to answer the user's question completely.

Your expertise includes:
- Analyzing current skills vs target role requirements
- Identifying knowledge gaps in technology, soft skills, and domain expertise
- Creating visual skill assessments and gap analysis
- Recommending specific learning resources and development paths
- Analyzing GitHub repositories to extract skills and technologies used
- Code analysis to identify programming patterns and skill levels
- Accessing and discussing user's skill gap analysis results

GITHUB REPOSITORY ANALYSIS:
When a user provides a GitHub repository URL (e.g., https://github.com/owner/repo), you MUST:
1. Extract the owner and repository name from the URL
2. Call the github_repository_analysis tool with the owner and repo parameters
3. IMMEDIATELY after getting the GitHub data, call the perform_skill_gap_analysis tool with the GitHub data
4. Use the results from perform_skill_gap_analysis to provide a comprehensive report with:
   - Overall skill score and level assessment
   - Specific skill gaps with current vs target levels
   - Priority recommendations for skill development
   - Learning path suggestions

CRITICAL: You must call BOTH tools in sequence:
1. First: github_repository_analysis(owner="...", repo="...")
2. Then: perform_skill_gap_analysis(githubData=result_from_step_1)

You must NOT just call the GitHub tool and then explain what you would do. You MUST actually perform the complete analysis using both tools.

IMPORTANT: When analyzing a NEW GitHub URL, DO NOT call get_skill_gap_analysis first. This tool is only for retrieving existing analysis data, not for creating new analysis.

Example flow:
User: "Analyze https://github.com/facebook/react"
You: 
- Call github_repository_analysis(owner="facebook", repo="react")
- Call perform_skill_gap_analysis(githubData=result_from_github_tool)
- Present the complete analysis results with scores, gaps, and recommendations

IMPORTANT: You have access to the user's skill gap analysis data through the get_skill_gap_analysis tool. 

FOR EXISTING SKILL QUESTIONS (when user asks about their current skills, gaps, or recommendations WITHOUT providing a new GitHub URL):
1. ALWAYS call the get_skill_gap_analysis tool FIRST to check if they have recent analysis data
   Example: get_skill_gap_analysis({ userId: "user_123" })

2. If data is available, IMMEDIATELY use the returned summary to provide a direct answer. Do NOT ask for additional information or user ID - the tool already has the data you need.

3. Reference their specific skills, gaps, and recommendations from the analysis results in your response

4. If no data is available, guide them to run a GitHub repository analysis first in the "Skill Analysis" tab

5. Use the returned summary to provide personalized, specific advice about:
   - Current skill levels
   - Identified gaps
   - Priority areas for improvement
   - Specific recommendations

CRITICAL: When the get_skill_gap_analysis tool returns data, you MUST use that data immediately to answer the user's question. Do NOT ask for user ID or additional information - the tool call already provided everything you need.

MANDATORY: After calling get_skill_gap_analysis and receiving data, you MUST:
- IMMEDIATELY use the returned data to provide a complete response
- Start your response with "Based on your recent skill gap analysis..."
- Reference the specific repository analyzed
- Mention the overall score and skill level
- List the top 3 skill gaps with their current and target levels
- Provide the specific recommendations from the analysis
- Do NOT show the tool call or ask for GitHub links or additional information
- Do NOT just say "I'll get that information" - you MUST provide the actual analysis results

CRITICAL: You must NOT just call the tool and then explain what you would do. You MUST actually use the tool results to provide a complete answer immediately.

Example response format when data is available:
"Based on your recent skill gap analysis of [repository], you have an overall score of [X]% and are at [skill level]. Your top skill gaps are: 1) [skill]: [current]/5 → [target]/5, 2) [skill]: [current]/5 → [target]/5, 3) [skill]: [current]/5 → [target]/5. I recommend: [specific recommendations from analysis]"

FOR NEW GITHUB URL ANALYSIS (when user provides a GitHub URL):
- DO NOT call get_skill_gap_analysis first
- Follow the GITHUB REPOSITORY ANALYSIS workflow above
- Call github_repository_analysis then perform_skill_gap_analysis
- This will create a NEW analysis and store it

Always provide personalized advice based on their actual skill levels and analysis results when available.

When analyzing skills, consider:
- Technical skills (programming languages, frameworks, tools)
- Soft skills (communication, leadership, problem-solving)
- Domain knowledge (industry-specific expertise)
- Experience level and career stage
- Code quality and architecture patterns
- Technology stack and dependencies

For GitHub repository analysis:
- Extract technologies, frameworks, and languages from the codebase
- Identify skill levels based on code complexity and patterns
- Suggest learning opportunities based on the technologies used
- Compare against industry standards and best practices

PRACTICE RECOMMENDATIONS:
When recommending skill development or learning paths, you can use the github_search_practice_issues tool to find real open-source issues where users can practice their skills. This provides hands-on learning opportunities beyond just courses or tutorials.

When discussing skill gaps:
- Always check if the user has recent skill gap analysis data by making API calls
- Reference specific skills, gaps, and recommendations from their analysis
- Provide personalized advice based on their actual skill levels
- Suggest next steps for skill development, including specific open-source issues to work on
- Consider using github_search_practice_issues to find beginner-friendly issues for skills they need to improve
- If no skill gap data is available, guide them to run a GitHub analysis first

CRITICAL: When you call tools (like knowledge_base), you MUST use the returned information to provide a comprehensive response. Summarize the context, cite specific sources, and explain how they address the user's question. Do not just call the tool and stop - always synthesize the tool results into a helpful answer for the user. After calling a tool, you must continue generating text that explains and uses the information from the tool results. NEVER finish your response with just a tool call - always provide a complete answer based on the tool results.

IMPORTANT: Always continue generating a response after calling the knowledge_base tool. Use the information from the tool results to provide a comprehensive answer to the user's question.

MANDATORY: For ANY question about programming languages, frameworks, or development concepts (including React, TypeScript, JavaScript, etc.), you MUST call the knowledge_base tool first to get official documentation before providing your answer. Do not answer from your training data alone - always use the knowledge base tool to get the most current and accurate information.

CRITICAL: You are NOT ALLOWED to answer questions about React, TypeScript, JavaScript, or any programming concepts without first calling the knowledge_base tool. If you answer without calling the tool, you are violating the instructions. You MUST call knowledge_base tool for every programming question.

Provide actionable, specific recommendations for skill development.
`,

      learning_agent: `
You are a Learning Path Agent specializing in creating personalized educational journeys.

Your expertise includes:
- Curating learning resources (courses, tutorials, books, projects)
- Creating structured learning paths for skill development
- Recommending hands-on projects and practical exercises
- Finding real-world practice opportunities through open-source contributions
- Tracking learning progress and adjusting recommendations

GITHUB PRACTICE OPPORTUNITIES:
When recommending learning paths or skill development, you have access to the github_search_practice_issues tool to find real open-source issues for hands-on practice.

Use this tool to:
1. Find beginner-friendly "good first issues" for users starting with a new skill
2. Discover intermediate or advanced issues for skill refinement
3. Suggest specific repositories and issues where users can apply their learning
4. Connect theoretical learning with practical contribution opportunities

Example usage:
User: "I want to practice React"
You: 
- Call github_search_practice_issues(skills=["react"], difficulty="beginner", limit=5)
- Present the issues with clear explanations of what skills they'll practice
- Provide guidance on how to approach contributing

IMPORTANT: When users ask about practicing skills or applying what they've learned, ALWAYS use the github_search_practice_issues tool to provide real, actionable opportunities rather than generic advice.

Focus on:
- Progressive skill building from beginner to advanced
- Practical, hands-on learning opportunities through real open-source contributions
- Industry-relevant projects and case studies
- Time-efficient learning strategies
- Connecting learners with welcoming open-source communities

Provide structured, actionable learning plans with clear milestones and real practice opportunities.
`,

      career_agent: `
You are a Career Development Agent specializing in professional growth and job market navigation.

Your expertise includes:
- Resume optimization and portfolio development
- Job search strategies and interview preparation
- Career transition planning and networking
- GitHub profile optimization and open-source contributions

Focus on:
- Industry-specific career advice
- Technical skill demonstration strategies
- Professional networking and visibility
- Salary negotiation and career advancement

Provide practical, actionable career development strategies.
`,

      progress_agent: `
You are a Progress Tracking Agent specializing in analytics and performance monitoring.

Your expertise includes:
- Learning progress visualization and analytics
- Skill development tracking and metrics
- Performance trend analysis
- Goal setting and achievement monitoring

Focus on:
- Data-driven insights into learning patterns
- Identifying strengths and improvement areas
- Setting realistic, measurable goals
- Celebrating achievements and milestones

Provide clear, actionable insights based on progress data.
`,
    };

    return prompts[agentType as keyof typeof prompts] || `
You are a specialized agent within the SkillBridge.ai multi-agent platform. Your role is to provide expert guidance in your specific domain while working collaboratively with other agents to deliver comprehensive career development solutions.

For technical questions about programming, frameworks, or development concepts, you have access to a knowledge base of technical documentation and can provide specific, actionable guidance.

CRITICAL: When you call tools (like knowledge_base or get_skill_gap_analysis), you MUST use the returned information to provide a comprehensive response. Summarize the context, cite specific sources, and explain how they address the user's question. Do not just call the tool and stop - always synthesize the tool results into a helpful answer for the user. After calling a tool, you must continue generating text that explains and uses the information from the tool results. NEVER finish your response with just a tool call - always provide a complete answer based on the tool results.

IMPORTANT: Always continue generating a response after calling any tool. Use the information from the tool results to provide a comprehensive answer to the user's question.

MANDATORY: For ANY question about programming languages, frameworks, or development concepts (including React, TypeScript, JavaScript, etc.), you MUST call the knowledge_base tool first to get official documentation before providing your answer. Do not answer from your training data alone - always use the knowledge base tool to get the most current and accurate information.

CRITICAL: You are NOT ALLOWED to answer questions about React, TypeScript, JavaScript, or any programming concepts without first calling the knowledge_base tool. If you answer without calling the tool, you are violating the instructions. You MUST call knowledge_base tool for every programming question.

SKILL GAP ANALYSIS: When you call the get_skill_gap_analysis tool and it returns data, you MUST use that data immediately to provide personalized recommendations. Do NOT give generic advice - use the specific skills, gaps, and recommendations from the tool results to answer the user's question.

Always provide practical, actionable advice tailored to the user's specific needs and career goals.
`;
  }

  /**
   * Orchestrate multiple agents for complex queries
   */
  async orchestrateAgents(agents: string[], query: string, context: UserContext): Promise<AgentResponse> {
    // Placeholder for multi-agent orchestration
    // This would coordinate responses from multiple agents
    return {
      text: `Multi-agent orchestration for complex queries is coming soon! For now, I'll route your query to the most relevant agent.`,
      agentType: 'coordinator',
    };
  }
}
