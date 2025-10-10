# LangGraph Studio Test Examples

Examples for testing the DevBuilder research agent in LangGraph Studio.

---

## 🎯 Example State Inputs

### Example 1: React Authentication (Beginner)

```json
{
  "skillGap": "React authentication with JWT",
  "detectedLanguage": "TypeScript",
  "userContext": "I'm a junior developer learning how to implement authentication in React apps. I understand basic React hooks but need to learn JWT token management and protected routes.",
  "iterationCount": 0
}
```

**Expected Results:**
- Find 10+ examples like next-auth, react-auth-kit
- High star count repos (1000+)
- TypeScript-focused examples

---

### Example 2: Python REST API (Intermediate)

```json
{
  "skillGap": "Flask REST API with database",
  "detectedLanguage": "Python",
  "userContext": "Building a REST API for a mobile app. Need to learn Flask, SQLAlchemy, and API best practices like pagination, authentication, and error handling.",
  "iterationCount": 0
}
```

**Expected Results:**
- Find Flask/FastAPI examples
- Database integration examples
- REST API best practices

---

### Example 3: Testing & TDD (Advanced)

```json
{
  "skillGap": "Jest testing and test-driven development",
  "detectedLanguage": "TypeScript",
  "userContext": "I want to improve my testing skills. Currently writing tests after code, but want to learn TDD properly with Jest, React Testing Library, and integration tests.",
  "iterationCount": 0
}
```

**Expected Results:**
- Testing framework examples
- TDD methodology examples
- High-quality test suites

---

### Example 4: Machine Learning (No Language Specified)

```json
{
  "skillGap": "neural networks for image classification",
  "detectedLanguage": "unknown",
  "userContext": "Starting with deep learning. Want to understand convolutional neural networks (CNNs) for image classification tasks. Background in Python but new to ML.",
  "iterationCount": 0
}
```

**Expected Results:**
- PyTorch/TensorFlow examples
- CNN architecture examples
- Image classification projects

---

### Example 5: DevOps & CI/CD (Cloud)

```json
{
  "skillGap": "GitHub Actions CI/CD deployment",
  "detectedLanguage": "YAML",
  "userContext": "Need to set up automated deployments for a Next.js app. Want to learn GitHub Actions workflows, Docker containerization, and deployment to Vercel/AWS.",
  "iterationCount": 0
}
```

**Expected Results:**
- GitHub Actions workflow examples
- Docker + Next.js examples
- Deployment automation projects

---

### Example 6: Mobile Development (Cross-Platform)

```json
{
  "skillGap": "React Native authentication and navigation",
  "detectedLanguage": "TypeScript",
  "userContext": "Building my first mobile app with React Native. Need to implement user authentication, navigation between screens, and state management with Redux.",
  "iterationCount": 0
}
```

**Expected Results:**
- React Native starter projects
- Navigation library examples
- Mobile auth implementations

---

## 🔄 Testing Retry Logic

### Example 7: Narrow Search (Tests Retry)

```json
{
  "skillGap": "very specific obscure library v2.3.1 alpha",
  "detectedLanguage": "TypeScript",
  "userContext": "Looking for examples of a very specific library version that might not have many GitHub examples.",
  "iterationCount": 0
}
```

**Expected Behavior:**
- Initial search finds < 3 examples
- Triggers retry (iterationCount increments)
- Eventually proceeds to evaluation

---

## 🧪 Testing in LangGraph Studio

### Step 1: Open LangGraph Studio

```bash
# Install LangGraph CLI (if not already installed)
npm install -g @langchain/langgraph-cli

# Start LangGraph Studio
langgraph dev
```

### Step 2: Load the Research Agent

1. Navigate to: `lib/agents/langgraph/research-agent.ts`
2. LangGraph Studio should auto-detect the exported `graph`

### Step 3: Run with Example State

1. Click "New Run"
2. Paste one of the example states above
3. Click "Start"
4. Watch the execution flow:
   ```
   START → search → search_github → [decision] → evaluate → synthesize → END
   ```

### Step 4: Inspect Results

Check the state updates at each node:
- **After `search`**: Should have `searchQuery` and placeholder `searchResults`
- **After `search_github`**: Should have `examples` array with 10 repos
- **After `evaluate`**: Should have `evaluatedResults` and `confidence`
- **After `synthesize`**: Should have `recommendations`

---

## 📊 Expected Output Structure

### After `search_github` Node

```json
{
  "skillGap": "React authentication with JWT",
  "detectedLanguage": "TypeScript",
  "userContext": "...",
  "iterationCount": 0,
  "searchQuery": "Learn React authentication with JWT TypeScript",
  "searchResults": [...],
  "examples": [
    {
      "name": "nextauthjs/next-auth",
      "url": "https://github.com/nextauthjs/next-auth",
      "stars": 27624,
      "description": "Authentication for the Web."
    },
    // ... 9 more examples
  ]
}
```

---

## 🎬 Video Walkthrough (Steps)

1. **Open Studio**: `langgraph dev` → Opens browser at `http://localhost:8000`
2. **Select Graph**: Click "research-agent" from sidebar
3. **Create Run**: Click "New Run" button
4. **Paste Input**: Use Example 1 (React Authentication)
5. **Execute**: Click "Start" → Watch nodes execute
6. **Inspect State**: Click each node to see state changes
7. **View Results**: Final state shows `examples` array with 10 repos

---

## 🔍 Debugging Tips

### Check Node Execution

Each node should log to console:
```
🔍 Searching for: React authentication with JWT
🔍 Searching GitHub for example repositories...
   Skill: React authentication with JWT
   Language: TypeScript
   Query: "React authentication with JWT language:TypeScript stars:>100 pushed:>2023-01-01"
✅ Found 61 repositories, analyzing top 10...
✅ Found 10 high-quality examples
```

### Verify Conditional Edges

After `search_github`, check which path was taken:
- **3+ examples found** → Goes to `evaluate`
- **< 3 examples** → Goes back to `search` (retry)
- **Max iterations reached** → Goes to `evaluate` anyway

### Check State Updates

State should accumulate:
```typescript
Iteration 1: { skillGap, detectedLanguage, userContext, iterationCount: 0 }
After search: { ...previous, searchQuery, searchResults }
After search_github: { ...previous, examples: [...10 repos] }
After evaluate: { ...previous, evaluatedResults, confidence }
After synthesize: { ...previous, recommendations }
```

---

## 🚀 Quick Start Command

```bash
# 1. Start LangGraph Studio
langgraph dev

# 2. Open browser to http://localhost:8000

# 3. Paste this in "New Run":
{
  "skillGap": "React authentication with JWT",
  "detectedLanguage": "TypeScript",
  "userContext": "Learning authentication for React apps",
  "iterationCount": 0
}

# 4. Click "Start" and watch execution!
```

---

## 📝 Notes

- **LangSmith Tracing**: Already configured in `.env.local`
  - Project: `dev-builder-project`
  - Endpoint: `https://api.smith.langchain.com`
  - View traces at: https://smith.langchain.com

- **GitHub Token**: Automatically loaded from `.env.local`

- **Rate Limits**: GitHub API allows 5000 requests/hour with token

- **Iteration Limit**: Set to 2 max retries to prevent infinite loops

---

*Last Updated: October 8, 2025*
