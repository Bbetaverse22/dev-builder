# 🤖 Agentic Gap Analyzer - AI-Powered Code Analysis

## Overview

The **Agentic Gap Analyzer** transforms the traditional heuristic-based skill analysis into an intelligent, AI-powered system using the **Vercel AI SDK**. It provides deep code understanding, quality assessment, and personalized recommendations.

## 🆕 What's New

Previously, the Gap Analyzer used simple pattern matching and file counting. Now it:

- ✅ **Reads and understands actual code** (not just file names)
- ✅ **Evaluates code quality** with AI reasoning
- ✅ **Analyzes README quality** with specific feedback
- ✅ **Detects architecture patterns** (MVC, microservices, etc.)
- ✅ **Identifies code smells** with fix suggestions
- ✅ **Assesses best practices** implementation
- ✅ **Generates personalized recommendations** based on goals

## 🏗️ Architecture

### Hybrid Approach

The analyzer uses a **hybrid strategy**:

1. **Fast Mode** (default): Heuristic analysis (~1-2s)
   - Quick technology detection
   - File structure analysis
   - Basic skill level estimation
   - **Cost**: Free

2. **Deep Mode** (opt-in): AI-powered analysis (~10-20s)
   - Reads actual code files (up to 3 key files)
   - AI code quality evaluation
   - README quality analysis
   - Architecture pattern detection
   - Personalized recommendations
   - **Cost**: ~$0.01-0.03 per analysis (GPT-4o-mini)

### Technology Stack

- **AI SDK**: Vercel AI SDK v5 (`generateObject`, `generateText`)
- **Model**: OpenAI GPT-4o-mini (fast, cheap, smart)
- **Validation**: Zod schemas for structured output
- **Fallback**: Graceful degradation to heuristic analysis

## 📖 Usage

### API Endpoints

#### 1. Fast Heuristic Analysis (Original)

```typescript
POST /api/gap-analysis
{
  "action": "analyze-github",
  "repositoryUrl": "https://github.com/user/repo"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "repository": "https://github.com/user/repo",
    "languages": ["TypeScript", "JavaScript"],
    "frameworks": ["Next.js", "React"],
    "skillLevel": "intermediate",
    "recommendations": ["Add comprehensive testing", ...]
  }
}
```

#### 2. Deep Agentic Analysis (NEW)

```typescript
POST /api/gap-analysis
{
  "action": "analyze-github-agentic",
  "repositoryUrl": "https://github.com/user/repo",
  "deepAnalysis": true,
  "userContext": {
    "targetRole": "Senior Full-Stack Developer",
    "professionalGoals": "Improve architecture and code quality"
  }
}
```

**Response:**
```json
{
  "success": true,
  "isAgentic": true,
  "hasDeepAnalysis": true,
  "result": {
    "repository": "https://github.com/user/repo",
    "languages": ["TypeScript"],
    "frameworks": ["Next.js"],
    "skillLevel": "advanced",
    "agenticAnalysis": {
      "overallQuality": 78,
      "skillLevel": "advanced",
      "confidence": 0.85,
      "architecturePatterns": ["Clean Architecture", "Repository Pattern"],
      "codeSmells": [
        {
          "type": "Long Functions",
          "severity": "medium",
          "description": "Several functions exceed 50 lines",
          "location": "src/utils/helper.ts",
          "suggestion": "Break down into smaller, single-responsibility functions"
        }
      ],
      "bestPractices": [
        {
          "name": "Error Handling",
          "implemented": true,
          "importance": "high"
        },
        {
          "name": "Type Safety",
          "implemented": false,
          "importance": "high",
          "suggestion": "Add TypeScript strict mode and explicit return types"
        }
      ],
      "recommendations": [
        "Implement comprehensive error boundaries in React components",
        "Add integration tests for critical user flows",
        "Consider extracting business logic into separate service layer"
      ]
    },
    "readmeAnalysis": {
      "qualityScore": 85,
      "clarity": 90,
      "completeness": 80,
      "hasInstallation": true,
      "hasUsageExamples": true,
      "strengths": [
        "Clear project description and getting started guide",
        "Well-structured with proper headings",
        "Includes code examples"
      ],
      "weaknesses": [
        "Missing API documentation",
        "No contribution guidelines"
      ],
      "suggestions": [
        "Add API endpoint documentation with request/response examples",
        "Include troubleshooting section for common issues",
        "Add badges for build status and test coverage"
      ]
    },
    "recommendations": [
      "Implement comprehensive error boundaries...",
      "Add integration tests for critical user flows...",
      "..."
    ]
  }
}
```

#### 3. README Quality Analysis (NEW)

```typescript
POST /api/gap-analysis
{
  "action": "analyze-readme",
  "readmeContent": "# My Project\n\n..."
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "qualityScore": 72,
    "clarity": 80,
    "completeness": 65,
    "hasInstallation": true,
    "hasUsageExamples": false,
    "strengths": ["Clear title", "Installation instructions"],
    "weaknesses": ["No usage examples", "Missing API docs"],
    "suggestions": [
      "Add code examples showing basic usage",
      "Include API reference documentation",
      "Add troubleshooting section"
    ]
  }
}
```

### Direct Usage (TypeScript/JavaScript)

```typescript
import { GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';

const analyzer = new GapAnalyzerAgent();

// Fast analysis (no AI)
const fast = await analyzer.analyzeGitHubRepositoryAgentic(
  'https://github.com/user/repo',
  { deepAnalysis: false }
);

// Deep AI analysis
const deep = await analyzer.analyzeGitHubRepositoryAgentic(
  'https://github.com/user/repo',
  { deepAnalysis: true }
);

console.log('Code Quality:', deep.agenticAnalysis?.overallQuality);
console.log('README Quality:', deep.readmeAnalysis?.qualityScore);

// Generate personalized recommendations
const recommendations = await analyzer.generateAgenticRecommendations(
  deep,
  deep.agenticAnalysis,
  deep.readmeAnalysis,
  {
    targetRole: 'Senior Full-Stack Developer',
    professionalGoals: 'Lead technical architecture decisions'
  }
);
```

## 🧪 Testing

Run the test script:

```bash
# Using tsx (recommended)
npx tsx tests/test-agentic-gap-analyzer.ts

# Or using Node with TypeScript
npm run test:agentic
```

Expected output:
```
🤖 Testing Agentic Gap Analyzer with AI SDK

📊 Analyzing repository: https://github.com/vercel/next.js

=== Test 1: Fast Heuristic Analysis (No AI) ===
✅ Fast analysis complete in 1234ms
   Languages: TypeScript, JavaScript
   Frameworks: Next.js, React
   Skill Level: advanced
   Has Agentic Analysis: false

=== Test 2: Deep Agentic Analysis (With AI) ===
✅ Deep analysis complete in 15678ms
   Languages: TypeScript, JavaScript
   Skill Level: advanced

📊 AI Code Analysis:
   Quality Score: 92/100
   Confidence: 95%
   Architecture Patterns: Modular Architecture, Plugin System
   Code Smells Found: 2
   ...
```

## 💰 Cost Analysis

| Operation | Model | Tokens (avg) | Cost |
|-----------|-------|--------------|------|
| Fast Analysis | None | 0 | $0.00 |
| Code Quality Analysis | GPT-4o-mini | ~2,000 | ~$0.001 |
| README Analysis | GPT-4o-mini | ~1,500 | ~$0.0008 |
| Recommendations | GPT-4o-mini | ~1,000 | ~$0.0005 |
| **Full Deep Analysis** | - | ~4,500 | **~$0.002** |

### Cost Optimization Tips

1. **Use fast mode by default** - Only use deep analysis when users explicitly request it
2. **Limit file analysis** - Current limit: 3 files, max 5000 chars each
3. **Cache results** - Store analysis in database, refresh only on demand
4. **Truncate README** - Only analyze first 3000 characters
5. **Batch requests** - Analyze multiple repos in sequence, not parallel

## 🎯 Use Cases

### 1. Portfolio Review Dashboard

Show users a "Deep Analysis" button next to each repository:

```typescript
// Fast analysis on page load (free, instant)
const quickResults = await analyzeGitHubRepositoryAgentic(repo, { 
  deepAnalysis: false 
});

// Deep analysis on button click (paid, detailed)
<Button onClick={async () => {
  const deepResults = await analyzeGitHubRepositoryAgentic(repo, { 
    deepAnalysis: true 
  });
  setAnalysis(deepResults);
}}>
  🤖 Get AI Insights ($0.002)
</Button>
```

### 2. Skill Gap Assessment

Provide context-aware recommendations:

```typescript
const analysis = await analyzeGitHubRepositoryAgentic(repo, { 
  deepAnalysis: true 
});

const recommendations = await generateAgenticRecommendations(
  analysis,
  analysis.agenticAnalysis,
  analysis.readmeAnalysis,
  {
    targetRole: userProfile.targetRole,
    targetIndustry: userProfile.industry,
    professionalGoals: userProfile.goals
  }
);
```

### 3. Code Review Assistant

Identify specific improvements:

```typescript
const { agenticAnalysis } = await analyzeGitHubRepositoryAgentic(repo, {
  deepAnalysis: true
});

// Show code smells as GitHub issues
agenticAnalysis.codeSmells.forEach(smell => {
  createGitHubIssue({
    title: `[Code Quality] ${smell.type}`,
    body: `**Issue**: ${smell.description}\n\n**Suggestion**: ${smell.suggestion}`,
    labels: [`severity:${smell.severity}`, 'code-quality']
  });
});
```

## 🔧 Configuration

### Environment Variables

```env
# Required for AI analysis
OPENAI_API_KEY=sk-...

# Optional: Use different model
AI_MODEL=gpt-4o-mini  # Default, recommended for cost/performance
# AI_MODEL=gpt-4o     # More capable but 10x more expensive
```

### Customizing Analysis

You can customize the AI prompts in `lib/agents/gap-analyzer.ts`:

```typescript
// Adjust code analysis prompt
const prompt = `You are an expert code reviewer...`;

// Adjust README analysis prompt
const prompt = `You are a technical documentation expert...`;

// Adjust token limits
if (content.length <= 5000) { // Increase to 10000 for more context
  files.push({ path, content, language });
}
```

## 🚀 Future Enhancements

- [ ] **Streaming analysis** - Real-time updates as AI analyzes
- [ ] **Multi-file context** - Analyze more files with summarization
- [ ] **Historical tracking** - Compare quality over time
- [ ] **Team analysis** - Aggregate insights across team repos
- [ ] **Custom rules** - User-defined quality criteria
- [ ] **Security analysis** - Vulnerability detection
- [ ] **Performance analysis** - Optimization suggestions

## 📊 Comparison: Before vs After

| Feature | Before (Heuristic) | After (Agentic) |
|---------|-------------------|-----------------|
| Technology Detection | ✅ Fast, accurate | ✅ Fast, accurate |
| Skill Level | ⚠️ File count heuristic | ✅ AI code analysis |
| Code Quality | ❌ Not available | ✅ 0-100 score + details |
| README Quality | ❌ Exists/not exists | ✅ Quality score + suggestions |
| Recommendations | ⚠️ Generic templates | ✅ Personalized, actionable |
| Architecture | ❌ Not detected | ✅ Patterns identified |
| Code Smells | ❌ Not detected | ✅ Specific issues + fixes |
| Best Practices | ❌ Not evaluated | ✅ Checklist with gaps |
| Speed | ⚡ 1-2s | ⚡ 10-20s (opt-in) |
| Cost | 💰 Free | 💰 ~$0.002 per deep analysis |

## 🎓 Best Practices

1. **Default to fast mode** - Only use AI when users request it
2. **Show AI badge** - Clearly indicate when AI analysis is used
3. **Cache aggressively** - Store results, don't reanalyze on every load
4. **Progressive enhancement** - Fast results first, AI enrichment optional
5. **User choice** - Let users decide if they want to spend on AI analysis
6. **Error handling** - Always fallback to heuristic analysis on AI errors
7. **Cost transparency** - Show users the cost before running deep analysis

## 🐛 Troubleshooting

### "No code files found for analysis"

The analyzer looks for files in common locations. If your repo has a non-standard structure:

```typescript
// Customize file selection in selectKeyFilesForAnalysis()
const importantPaths = [
  'src/index',
  'lib/main',       // Add your custom paths
  'custom/entry'    // ...
];
```

### "AI analysis failed, using fallback"

This can happen due to:
- Rate limits (upgrade OpenAI tier)
- Invalid API key
- Network issues
- Model unavailable

The system automatically falls back to heuristic analysis.

### High costs

If costs are high:
1. Reduce file limit (currently 3 files max)
2. Reduce char limit per file (currently 5000)
3. Use GPT-3.5-turbo instead of GPT-4o-mini
4. Cache results longer
5. Only analyze on user request, not automatically

---

**Built with ❤️ using Vercel AI SDK and OpenAI GPT-4o-mini**

