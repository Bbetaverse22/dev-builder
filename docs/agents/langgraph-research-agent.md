## LangGraph Research Agent Overview

The research agent is a **LangGraph-powered autonomous workflow** that researches learning resources, finds GitHub examples, and generates **adaptive learning paths** based on the user's skill level (beginner/intermediate/advanced). It combines web search, AI synthesis, and intelligent resource filtering to provide personalized learning recommendations.

## Key Innovation: Adaptive Learning Paths

**NEW FEATURE**: The research agent now generates skill-level-aware learning paths that adapt to the user's experience level, providing appropriate resources and time estimates.

### Skill-Level Adaptation
- **Beginner**: Foundation → Practice → Application → Next Steps
- **Intermediate**: Review → Advanced Concepts → Real Projects → Best Practices  
- **Advanced**: Optimization → Architecture → Innovation → Leadership

Each path includes:
- Difficulty-appropriate content
- Adjusted time estimates (beginners get 50% more time)
- Skill-level-specific descriptions
- Progressive difficulty within the path

## LangGraph Workflow

### State Machine Architecture
Initializes a `StateGraph<ResearchState>` with channels for:
- User context (skill level, current/target proficiency, career goals)
- Search results (web resources, GitHub examples)
- Evaluation scores and confidence metrics
- **Adaptive learning path** based on skill level
- Recommendations and action plans

### Node Execution Sequence

#### 1. **Load State** (`load_state`)
- Hydrate cached research results (unless `forceRefresh: true`)
- Resume previous research sessions
- Skip redundant searches for same skill gaps

#### 2. **Search Resources** (`search`)
- **Firecrawl Integration**: Rich web scraping when API key available
- **OpenAI Fallback**: GPT-4o generates synthetic resources when Firecrawl unavailable
- **Skill-Aware Queries**: Searches adapt to detected skill level
- **Multi-Source**: Documentation, tutorials, courses, articles

#### 3. **Search GitHub Examples** (`search_github`)
- Find real-world code examples via GitHub MCP
- Filter by skill gap, language, and complexity
- Analyze repository quality (stars, forks, activity)
- Safely fallback to language-based queries

#### 4. **Conditional Branching**
- Loop back to search if results insufficient
- Cap iterations to prevent infinite loops
- Track iteration count for observability

#### 5. **Evaluate Quality** (`evaluate`)
- Score resources using heuristics and LLM judgment
- Consider: relevance, recency, authority, completeness
- Filter low-quality or outdated resources
- Generate confidence breakdown

#### 6. **Synthesize Recommendations** (`synthesize`)
- **Adaptive Learning Path Generation**: Creates 4-6 steps based on skill level
- Assemble personalized recommendations
- Generate action plan with priorities
- Add market signals and comparative insights
- Include confidence metrics

#### 7. **Termination**
- Returns compiled recommendations, examples, learning path
- Includes confidence estimates and metadata
- Results cached for future sessions

## Current Implementation

### Adaptive Learning Path Generation

```typescript
function generateAdaptiveLearningPath(
  state: ResearchState,
  resources: ScoredResource[],
  examples: GitHubProject[]
): LearningPathStep[] {
  const userSkillLevel = state.userSkillLevel ?? 'intermediate';
  const skillGap = state.skillGapValue ?? 2;
  
  // Get skill-specific configuration
  const config = getSkillLevelConfig(userSkillLevel);
  
  // Generate steps for each focus area
  return config.focusAreas.map((area, index) => ({
    order: index + 1,
    title: `${area}: ${state.skillGap}`,
    description: getStepDescription(area, userSkillLevel, skillGap),
    difficulty: determineDifficulty(userSkillLevel, skillGap, index),
    estimatedTimeHours: calculateAdaptiveTimeEstimate(userSkillLevel, difficulty),
    resourceUrl: findRelevantResource(area, resources),
  }));
}
```

### Enhanced State Interface
```typescript
interface ResearchState {
  // User context
  skillGap: string;
  detectedLanguage: string;
  userContext: string;
  
  // NEW: Adaptive learning fields
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
  skillCurrentLevel?: number;  // 1-5 scale
  skillTargetLevel?: number;    // 1-5 scale
  skillGapValue?: number;       // Numeric gap
  
  // Research results
  searchResults?: Resource[];
  examples?: GitHubProject[];
  learningPath?: LearningPathStep[];
  recommendations?: Recommendation[];
  confidence?: number;
}
```

### Skill-Level Configurations

**Beginner Configuration**:
- Focus: Foundation → Practice → Application → Next Steps
- Time Multiplier: 1.5x (thorough learning)
- Content: Tutorials, step-by-step guides, basic examples
- Difficulty Range: beginner → intermediate

**Intermediate Configuration**:
- Focus: Review → Advanced Concepts → Real Projects → Best Practices
- Time Multiplier: 1.0x (standard pace)
- Content: Advanced tutorials, real-world projects, best practices
- Difficulty Range: beginner → advanced

**Advanced Configuration**:
- Focus: Optimization → Architecture → Innovation → Leadership
- Time Multiplier: 0.75x (accelerated)
- Content: Architecture patterns, system design, optimization
- Difficulty Range: intermediate → advanced

## Effectiveness Assessment

### Strengths
- ✅ **LangGraph State Management**: Deterministic state merges, no race conditions
- ✅ **Adaptive Paths**: Learning paths match user's actual skill level
- ✅ **Multi-Source Search**: Combines Firecrawl, OpenAI, and GitHub
- ✅ **Graceful Fallbacks**: Works even when external services unavailable
- ✅ **Intelligent Caching**: Reuses previous research when appropriate
- ✅ **Confidence Metrics**: Transparent about research quality

### Key Features
- **36+ Contextual Descriptions**: Tailored to skill level and focus area
- **Smart Time Estimates**: Adjusted for difficulty and experience
- **Progressive Difficulty**: Paths adapt as user progresses
- **Resource Mapping**: Links steps to relevant resources
- **GitHub Integration**: Real code examples for hands-on learning

## Optimization Opportunities

### Performance
- **Parallel Execution**: Run `search` and `search_github` concurrently
- **Batch Processing**: Research multiple skill gaps in one session
- **Connection Pooling**: Reuse MCP connections across searches

### Intelligence
- **Iteration Control**: Separate counters for resources vs examples
- **QA Feedback Loop**: Use evaluation scores to refine future searches
- **ML-Based Scoring**: Train models on resource effectiveness

### Observability
- **Structured Logging**: Trace node transitions and decisions
- **Performance Metrics**: Track search latency, cache hit rates
- **User Analytics**: Monitor which paths users complete

### State Management
- **Cross-Session Persistence**: Save research across user sessions
- **Version Control**: Track learning path evolution over time
- **A/B Testing**: Compare different path strategies

## Testing

```bash
# Test research agent end-to-end
pnpm tsx tests/test-research-agent-e2e.ts

# Test adaptive learning path generation
# (integrated in main workflow)

# Test with different skill levels
# Visit: http://localhost:3000/agentic
# Analyze repositories of varying complexity
```

## De-Scoping Considerations

- **Cannot Remove**: Core feature for personalized learning recommendations
- **LangGraph Dependency**: State management critical for complex workflows
- **Firecrawl Optional**: GPT-4o fallback ensures functionality without it
- **Skill Level Required**: Defaults to intermediate if not provided

## Related Documentation
- [Adaptive Learning Paths](../../docs/ADAPTIVE_LEARNING_PATHS.md) - Complete implementation details
- [Gap Analyzer](gap-analyzer.md) - Provides skill level detection
- [GitHub Agent](github-agent.md) - Searches for code examples
- [Portfolio Builder](portfolio-builder.md) - Uses research results for tasks
