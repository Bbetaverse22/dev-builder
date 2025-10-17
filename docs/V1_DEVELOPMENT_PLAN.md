# SkillBridge.ai V1 - Development Plan & GitHub Issues

## 📋 Overview

This document outlines the complete development plan for SkillBridge V1, broken down into GitHub issues that can be tracked and implemented one by one.

**Timeline:** 3 Weeks  
**Branch:** `v1-capstone-development`  
**Milestone:** V1 Launch

---

## 🎯 Sprint Structure

### Week 1: LangGraph Research Agent (Core)
**Goal:** Build autonomous research agent with retry loops

### Week 2: Portfolio Builder Integration
**Goal:** Connect research to GitHub issue generation

### Week 3: Polish & Launch
**Goal:** UI, testing, documentation, demo

---

## 📦 GitHub Issues Breakdown

### 🏷️ Labels to Create First

```
Priority:
- priority-critical (red)
- priority-high (orange)
- priority-medium (yellow)
- priority-low (blue)

Type:
- type-feature (green)
- type-bug (red)
- type-docs (blue)
- type-refactor (purple)

Component:
- component-langgraph (pink)
- component-mcp (cyan)
- component-ui (yellow)
- component-portfolio-builder (green)

Status:
- status-blocked (red)
- status-in-progress (yellow)
- status-review (purple)
```

---

## 📋 Issues to Create

### **WEEK 1: LangGraph Research Agent**

---

#### Issue #0: Setup Official GitHub MCP Server ✅ **Re-scoped**
**Priority:** Critical
**Labels:** `priority-critical`, `type-feature`, `component-mcp`
**Estimate:** 3 hours
**Completed:** October 12, 2025

**Description (updated):**
Original scope required the official Anthropic GitHub MCP server, but Docker access is unavailable in current environments. We replaced this dependency with a GitHub REST API client that delivers the same functionality (search, read files, create issues) and keeps the workflow deployable on Vercel and local dev without Docker.

**Tasks:**
- [x] Install `@modelcontextprotocol/sdk` package
- [x] Install `@modelcontextprotocol/server-github` package (optional, retained for future experiments)
- [x] Create MCP client configuration file
- [x] Configure GitHub token for MCP authentication
- [x] Create MCP tools wrapper for LangGraph
- [x] Build GitHub REST API wrapper (`lib/github/github-client.ts`) as production fallback
- [x] Verify search/issue flows via REST API (LangGraph node + Portfolio Builder)
- [x] Update package.json with MCP dependencies
- [x] Update README with GitHub MCP setup instructions

**Acceptance Criteria:**
- ✅ GitHub REST API client powers LangGraph node & Portfolio Builder
- ✅ MCP client remains available behind feature flag (requires Docker)
- ✅ README documents REST-first workflow (no Docker prerequisites)

**Implementation Notes:**
- GitHub MCP requires Docker (`ghcr.io/github/github-mcp-server`)
- Implemented GitHub REST API client as fallback for Vercel deployment
- Full documentation in `docs/GITHUB_MCP_STATUS.md`
- Token verified working with GitHub API

**Files Created/Modified:**
- `package.json`
- `lib/mcp/github/client.ts` (optional MCP client retained for future use)
- `lib/mcp/github/types.ts`
- `lib/github/github-client.ts` (REST production client)
- `docs/GITHUB_MCP_STATUS.md`
- `README.md`

**Example Setup (current production path):**
```typescript
// lib/github/github-client.ts (excerpt)
const API_BASE_URL = 'https://api.github.com';

export class GitHubClient {
  constructor(private token?: string) {}

  private async makeRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        'User-Agent': 'skillbridge-agents',
        Authorization: this.token ? `Bearer ${this.token}` : undefined,
        Accept: 'application/vnd.github+json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
```

---

#### Issue #1: Setup LangGraph Dependencies
**Priority:** Critical
**Labels:** `priority-critical`, `type-feature`, `component-langgraph`
**Estimate:** 2 hours

**Description:**
Install and configure LangGraph for autonomous agent development.

**Tasks:**
- [ ] Install `@langchain/langgraph` package
- [ ] Install `@langchain/core` package
- [ ] Install `@langchain/openai` package
- [ ] Configure OpenAI API key
- [ ] Create basic test to verify LangGraph works
- [ ] Update package.json with new dependencies
- [ ] Update README with LangGraph setup instructions

**Acceptance Criteria:**
- LangGraph imports work without errors
- Can create basic StateGraph
- Test passes confirming setup

**Files to Create/Modify:**
- `package.json`
- `lib/agents/langgraph/test-setup.ts`
- `README.md`

---

#### Issue #2: Design Research Agent State Schema
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`, `component-langgraph`  
**Estimate:** 3 hours

**Description:**
Define the state structure for the research agent that will be maintained across all nodes.

**Tasks:**
- [ ] Create `ResearchState` TypeScript interface
- [ ] Define input schema (skill gap, user context)
- [ ] Define output schema (recommendations, confidence)
- [ ] Create state transformation types
- [ ] Add validation logic for state
- [ ] Document state flow in comments

**Acceptance Criteria:**
- Complete TypeScript interface for ResearchState
- All fields properly typed
- Validation functions work
- Documentation clear

**Files to Create:**
- `lib/agents/langgraph/types.ts`
- `lib/agents/langgraph/state.ts`

**Example State:**
```typescript
interface ResearchState {
  // Input
  skillGap: string;
  detectedLanguage: string;
  userContext: string;
  
  // Search phase
  searchQuery: string;
  searchResults: Resource[];
  
  // Evaluation phase
  evaluatedResults: ScoredResource[];
  examples: GitHubProject[];
  
  // Decision phase
  confidence: number;
  iterationCount: number;
  
  // Output
  recommendations: Recommendation[];
}
```

---

#### Issue #3: Implement Web Search Node
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`, `component-langgraph`, `component-mcp`  
**Estimate:** 4 hours

**Description:**
Create the first LangGraph node that searches for learning resources using web search.

**Tasks:**
- [ ] Create `searchResourcesNode` function
- [ ] Integrate web search MCP tool
- [ ] Build search query from skill gap
- [ ] Parse search results
- [ ] Extract metadata (title, URL, description)
- [ ] Handle search errors gracefully
- [ ] Add logging for debugging
- [ ] Write unit tests

**Acceptance Criteria:**
- Node executes successfully
- Returns 20+ search results
- Handles errors without crashing
- Tests pass

**Files to Create:**
- `lib/agents/langgraph/nodes/search-resources.ts`
- `lib/agents/langgraph/nodes/search-resources.test.ts`

---

#### Issue #4: Implement Quality Evaluation Node
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-langgraph`  
**Estimate:** 5 hours

**Description:**
Create node that scores and ranks learning resources by quality.

**Tasks:**
- [ ] Create `evaluateQualityNode` function
- [ ] Implement scoring algorithm:
  - Rating score (30%)
  - Recency score (30%)
  - Completeness score (20%)
  - Author credibility (10%)
  - Community validation (10%)
- [ ] Extract ratings from results
- [ ] Check publication dates
- [ ] Detect if has code examples
- [ ] Sort by total score
- [ ] Return top 10 results
- [ ] Add tests for scoring logic

**Acceptance Criteria:**
- Scoring algorithm works correctly
- Resources ranked by quality
- Returns top 10 results
- Tests cover edge cases

**Files to Create:**
- `lib/agents/langgraph/nodes/evaluate-quality.ts`
- `lib/agents/langgraph/utils/scoring.ts`
- `lib/agents/langgraph/nodes/evaluate-quality.test.ts`

---

#### Issue #5a: Build Custom Template Creator MCP Server
**Priority:** High
**Labels:** `priority-high`, `type-feature`, `component-mcp`
**Estimate:** 6 hours

**Description:**
Create a custom MCP server that extracts clean, reusable templates from GitHub repositories by removing custom business logic and replacing it with placeholders.

**Tasks:**
- [ ] Install MCP SDK dependencies
- [ ] Create `template-creator` MCP server in `lib/mcp/template-creator/server.ts`
- [ ] Implement `extract_template` tool
  - Parse repository files
  - Remove business logic
  - Replace values with placeholders (e.g., {{PROJECT_NAME}})
  - Preserve structure and types
- [ ] Implement `analyze_structure` tool
  - Identify key files and patterns
  - Calculate template worthiness score
  - Recommend file patterns for extraction
- [ ] Implement `generate_boilerplate` tool
  - Generate starter code based on technology
  - Include common patterns and best practices
- [ ] Add error handling and logging
- [ ] Create package.json and build configuration
- [ ] Write integration tests

**Acceptance Criteria:**
- MCP server runs on stdio transport
- All three tools work correctly
- Template extraction removes business logic
- Placeholders are clearly marked
- Template worthiness score is accurate
- Tests pass

**Files to Create:**
- `lib/mcp/template-creator/server.ts`
- `lib/mcp/template-creator/client.ts`
- `lib/mcp/template-creator/package.json`
- `lib/mcp/template-creator/tsconfig.json`
- `lib/mcp/template-creator/examples/usage-example.ts`

**Example Tool Call:**
```typescript
// Extract template from a Next.js repo
const result = await mcpClient.callTool('extract_template', {
  repoUrl: 'https://github.com/vercel/next.js/examples/with-typescript',
  filePatterns: ['*.ts', '*.tsx', 'package.json'],
  options: {
    preserveStructure: true,
    removeBusinessLogic: true
  }
});
```

---

#### Issue #5b: Implement GitHub Examples Search Node (GitHub REST API) ✅ **COMPLETE**
**Priority:** High
**Labels:** `priority-high`, `type-feature`, `component-langgraph`, `component-github`
**Estimate:** 4 hours
**Completed:** October 8, 2025

**Description:**
Create node that finds example GitHub projects using the GitHub REST API (no Docker dependency).

**Tasks:**
- [x] Create `searchGitHubExamplesNode` function
- [x] Import GitHub REST API client from Issue #0 (fallback for Vercel)
- [x] Use GitHub REST API `search/repositories` endpoint
- [x] Build search query from skill gap (e.g., "jest testing language:typescript stars:>100")
- [x] Parse API response
- [x] Filter by language (match user's stack)
- [x] Sort by stars (handled by GitHub search API)
- [x] Extract: name, stars, description, URL
- [x] Limit to top 10 results
- [x] Handle rate limits and API errors
- [x] Write tests with real API calls
- [x] Add conditional edges for retry logic
- [x] Integrate into LangGraph workflow

**Acceptance Criteria:**
- ✅ GitHub search works correctly (tested with 3 different queries)
- ✅ Finds relevant GitHub examples (10 high-quality projects per query)
- ✅ Properly sorted by stars
- ✅ API errors handled gracefully (fallback to empty results)
- ✅ Tests pass (React Auth: 10 examples, Flask API: 10 examples, ML: 10 examples)
- ✅ Conditional edges implemented (retry if < 3 examples, max 2 iterations)
- ✅ Connected to LangGraph workflow

**Implementation Notes:**
- Used GitHub REST API instead of MCP for Vercel compatibility
- Added quality scoring algorithm (stars, description, forks, recency)
- Implemented search query builder with qualifiers (language, stars, pushed date)
- Added conditional flow based on open_deep_research patterns
- Full documentation in `docs/LANGGRAPH_NODES_STATUS.md`

**Files to Create:**
- `lib/agents/langgraph/nodes/search-examples.ts`
- `lib/agents/langgraph/nodes/search-examples.test.ts`

**Example Implementation:**
```typescript
// lib/agents/langgraph/nodes/search-examples.ts
import { GitHubMCPClient } from '@/lib/mcp/github-mcp-client';

export async function searchExamplesNode(state: ResearchState) {
  const mcpClient = new GitHubMCPClient();
  await mcpClient.connect();

  const searchQuery = `${state.skillGap} language:${state.detectedLanguage} stars:>100`;

  const result = await mcpClient.callTool('search_repositories', {
    query: searchQuery,
    per_page: 10,
    sort: 'stars',
    order: 'desc'
  });

  const examples = result.content[0].text; // Parse MCP response

  return {
    ...state,
    examples: JSON.parse(examples).items.slice(0, 10)
  };
}
```

---

#### Issue #5c: Implement Template Creation Node (Using Custom Template Creator MCP)
**Priority:** High
**Labels:** `priority-high`, `type-feature`, `component-langgraph`, `component-mcp`
**Estimate:** 5 hours

**Description:**
Create LangGraph node that uses the custom Template Creator MCP to extract clean templates from top example repositories. This provides users with ready-to-use starter code.

**Tasks:**
- [ ] Create `createTemplatesNode` function
- [ ] Import Template Creator MCP client from Issue #5a
- [ ] Iterate through top 3 example repositories from previous node
- [ ] For each repo:
  - Call `analyze_structure` to check template worthiness
  - If worthiness >= 70%, call `extract_template`
  - Store extracted template with metadata
- [ ] Generate template README with usage instructions
- [ ] Format templates for GitHub issue inclusion
- [ ] Handle MCP errors gracefully
- [ ] Add comprehensive logging
- [ ] Write tests with mocked MCP responses

**Acceptance Criteria:**
- Template Creator MCP called correctly
- Top 3 examples processed
- Templates extracted with placeholders
- Template worthiness filtering works (>= 70%)
- README generated for each template
- MCP errors handled gracefully
- Tests pass

**Files to Create:**
- `lib/agents/langgraph/nodes/create-templates.ts`
- `lib/agents/langgraph/nodes/create-templates.test.ts`

**Integration with LangGraph:**
```typescript
// Updated ResearchState
interface ResearchState {
  // ... existing fields
  examples: GitHubExample[];      // From Issue #5b
  templates: ExtractedTemplate[];  // NEW - from this node
  // ... rest of state
}

// Updated workflow
search → evaluate → examples → templates → confidence → synthesize
```

**Example Output:**
```typescript
{
  templates: [
    {
      sourceRepo: "https://github.com/vercel/next.js/examples/with-typescript",
      files: [
        { path: "package.json", content: "...", placeholders: ["PROJECT_NAME"] },
        { path: "tsconfig.json", content: "...", placeholders: [] }
      ],
      structure: "...",
      instructions: ["Replace {{PROJECT_NAME}}", "Install dependencies"],
      placeholders: {
        "PROJECT_NAME": "Your project name",
        "PROJECT_DESCRIPTION": "Brief description"
      },
      templateWorthiness: 0.85
    }
  ]
}
```

**Benefits:**
- Users get clean, ready-to-use starter code
- No need to manually extract patterns from examples
- Placeholders make customization easy
- Template quality score ensures high-quality output

---

#### Issue #6: Implement Confidence Calculation Node
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`, `component-langgraph`  
**Estimate:** 3 hours

**Description:**
Create node that calculates research quality confidence score.

**Tasks:**
- [ ] Create `calculateConfidenceNode` function
- [ ] Implement confidence algorithm:
  - Resource quality: 40%
  - Resource quantity: 20%
  - Example quality: 30%
  - Relevance: 10%
- [ ] Calculate final confidence score (0-1)
- [ ] Add confidence thresholds
- [ ] Log confidence breakdown
- [ ] Write tests

**Acceptance Criteria:**
- Confidence score calculated correctly
- Returns value between 0 and 1
- Breakdown is logged
- Tests validate algorithm

**Files to Create:**
- `lib/agents/langgraph/nodes/calculate-confidence.ts`
- `lib/agents/langgraph/nodes/calculate-confidence.test.ts`

---

#### Issue #7: Implement Synthesis Node
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-langgraph`  
**Estimate:** 4 hours

**Description:**
Create final node that synthesizes all research into recommendations.

**Tasks:**
- [ ] Create `synthesizeNode` function
- [ ] Combine top resources + examples
- [ ] Generate learning path
- [ ] Create actionable recommendations
- [ ] Format output for Portfolio Builder
- [ ] Add metadata (confidence, sources)
- [ ] Write tests

**Acceptance Criteria:**
- Produces complete recommendations
- Includes top 3 resources
- Includes top 3 examples
- Learning path is coherent
- Tests pass

**Files to Create:**
- `lib/agents/langgraph/nodes/synthesize.ts`
- `lib/agents/langgraph/utils/learning-path.ts`
- `lib/agents/langgraph/nodes/synthesize.test.ts`

---

#### Issue #8: Build LangGraph Workflow
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`, `component-langgraph`  
**Estimate:** 4 hours

**Description:**
Connect all nodes into a complete LangGraph workflow with conditional edges.

**Tasks:**
- [ ] Create `ResearchAgent` class
- [ ] Initialize StateGraph
- [ ] Add all nodes to graph
- [ ] Connect nodes with edges
- [ ] Add conditional edge for retry logic
- [ ] Set entry point
- [ ] Compile graph
- [ ] Add error handling
- [ ] Write integration tests

**Acceptance Criteria:**
- All nodes connected correctly
- Conditional retry works
- Agent executes end-to-end
- Integration tests pass

**Files to Create:**
- `lib/agents/langgraph/research-agent.ts`
- `lib/agents/langgraph/research-agent.test.ts`

**Graph Structure (Updated with Templates Node):**
```
search → evaluate → examples → templates → confidence
                                               ↓
                                    (if < 0.7) ↓ (if >= 0.7)
                                               ↓
                                     retry ←  decision → synthesize
```

**Node Summary:**
1. `search` - Find learning resources (web search)
2. `evaluate` - Score and rank resources
3. `examples` - Find GitHub example projects (GitHub MCP)
4. `templates` - Extract clean templates (Custom Template Creator MCP) **NEW**
5. `confidence` - Calculate quality score
6. `decision` - Retry or proceed
7. `synthesize` - Generate final recommendations

---

#### Issue #9: Add Conditional Retry Logic
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`, `component-langgraph`  
**Estimate:** 3 hours

**Description:**
Implement the key agentic feature: autonomous decision to retry or proceed.

**Tasks:**
- [ ] Create retry decision function
- [ ] Check confidence threshold (0.7)
- [ ] Check iteration count (max 3)
- [ ] Refine search query on retry
- [ ] Add different search strategies
- [ ] Log retry decisions
- [ ] Test retry scenarios

**Acceptance Criteria:**
- Retries when confidence < 70%
- Stops after 3 iterations
- Query refinement improves results
- Tests cover all paths

**Files to Modify:**
- `lib/agents/langgraph/research-agent.ts`
- Add tests in `research-agent.test.ts`

---

#### Issue #10: Test LangGraph Agent End-to-End
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-langgraph`  
**Estimate:** 3 hours

**Description:**
Comprehensive testing of the complete research agent.

**Tasks:**
- [ ] Test with "pytest testing" skill gap
- [ ] Test with "Docker containers" skill gap
- [ ] Test with "GraphQL APIs" skill gap
- [ ] Verify confidence scores are reasonable
- [ ] Verify retry logic triggers correctly
- [ ] Verify final recommendations are useful
- [ ] Test error handling
- [ ] Document test results

**Acceptance Criteria:**
- 3+ different skill gaps tested
- All tests pass
- Confidence scores > 70% for most
- Retry works when needed
- Results are actionable

**Files to Create:**
- `lib/agents/langgraph/__tests__/integration.test.ts`
- `docs/research-agent-testing.md`

---

### **WEEK 2: Portfolio Builder Integration**

---

#### Issue #11: Enhance Portfolio Builder Agent
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-portfolio-builder`  
**Estimate:** 4 hours

**Description:**
Update Portfolio Builder to consume research results from LangGraph agent.

**Tasks:**
- [ ] Modify Portfolio Builder to accept research results
- [ ] Update issue template to include research
- [ ] Add resource links section
- [ ] Add example projects section
- [ ] Add confidence score display
- [ ] Update tests

**Acceptance Criteria:**
- Portfolio Builder accepts research input
- Issue templates include research
- Tests pass

**Files to Modify:**
- `lib/agents/portfolio-builder-agent.ts`

---

#### Issue #12: Generate Research-Backed Issue Body
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-portfolio-builder`  
**Estimate:** 3 hours

**Description:**
Create issue body template that includes all research findings.

**Tasks:**
- [ ] Create issue template function
- [ ] Add research findings section
- [ ] Add top resources with ratings
- [ ] Add example projects with links
- [ ] Add action checklist
- [ ] Add code template placeholder
- [ ] Add confidence score
- [ ] Format markdown properly

**Acceptance Criteria:**
- Issue body is well-formatted
- All research included
- Markdown renders correctly
- Looks professional

**Files to Create:**
- `lib/agents/portfolio-builder/templates/issue-template.ts`

---

#### Issue #13: Integrate GitHub Issue Creation (Using Official GitHub MCP)
**Priority:** Critical
**Labels:** `priority-critical`, `type-feature`, `component-mcp`
**Estimate:** 5 hours

**Description:**
Connect to Official Anthropic GitHub MCP server to actually create issues in user repositories.

**Tasks:**
- [ ] Import GitHub MCP client from Issue #0
- [ ] Use MCP `create_issue` tool
- [ ] Pass user's GitHub OAuth token to MCP (for authenticated requests)
- [ ] Format issue title and body from research results
- [ ] Add labels to issues via MCP
- [ ] Set assignee (user) if supported
- [ ] Parse MCP response to get issue URL and number
- [ ] Handle errors (permissions, rate limits, invalid repo)
- [ ] Return issue URL and metadata
- [ ] Add comprehensive logging
- [ ] Write tests with mocked MCP responses

**Acceptance Criteria:**
- GitHub MCP `create_issue` tool called correctly
- Issues created successfully in test repo
- Labels applied correctly
- User's OAuth token used (not global GITHUB_TOKEN)
- Error handling works (permissions, not found, rate limit)
- Tests pass with mocked MCP

**Files to Create:**
- `lib/agents/portfolio-builder/github-integration.ts`
- `lib/agents/portfolio-builder/github-integration.test.ts`

**Example Implementation:**
```typescript
// lib/agents/portfolio-builder/github-integration.ts
import { GitHubMCPClient } from '@/lib/mcp/github-mcp-client';

export async function createGitHubIssue(
  repo: string, // Format: "owner/repo"
  title: string,
  body: string,
  labels: string[],
  userAccessToken: string // From OAuth session
) {
  const mcpClient = new GitHubMCPClient(userAccessToken);
  await mcpClient.connect();

  try {
    const result = await mcpClient.callTool('create_issue', {
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      title,
      body,
      labels,
      assignees: [repo.split('/')[0]] // Assign to repo owner
    });

    const issueData = JSON.parse(result.content[0].text);

    return {
      success: true,
      issueUrl: issueData.html_url,
      issueNumber: issueData.number
    };
  } catch (error) {
    console.error('GitHub MCP create_issue failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Important:** This requires user OAuth tokens (from Issue #40-50), not just GITHUB_TOKEN!

---

#### Issue #14: Connect Analysis → Research → Action
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`  
**Estimate:** 5 hours

**Description:**
Build complete pipeline from skill gap detection to issue creation.

**Tasks:**
- [ ] Create orchestration function
- [ ] Call Gap Analyzer (existing)
- [ ] For each gap, call Research Agent
- [ ] For each research result, call Portfolio Builder
- [ ] Store results in database
- [ ] Return complete results
- [ ] Add error handling for each step
- [ ] Write integration tests

**Acceptance Criteria:**
- Complete pipeline works end-to-end
- All three phases execute
- Results stored correctly
- Integration tests pass

**Files to Create:**
- `lib/agents/orchestrator.ts`
- `lib/agents/orchestrator.test.ts`

---

#### Issue #15: Add Code Template Generation
**Priority:** Medium  
**Labels:** `priority-medium`, `type-feature`, `component-portfolio-builder`  
**Estimate:** 4 hours

**Description:**
Generate starter code templates based on research findings.

**Tasks:**
- [ ] Create template generator function
- [ ] Add templates for common skills:
  - Testing (pytest, jest)
  - Documentation (README)
  - CI/CD (GitHub Actions)
- [ ] Fill templates with user context
- [ ] Add templates to GitHub issues
- [ ] Write tests

**Acceptance Criteria:**
- Templates generated correctly
- Context-aware (user's stack)
- Included in issues
- Tests pass

**Files to Create:**
- `lib/agents/portfolio-builder/templates/code-templates.ts`
- `lib/agents/portfolio-builder/templates/code-templates.test.ts`

---

#### Issue #16: Test Portfolio Builder with Real GitHub
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-portfolio-builder`  
**Estimate:** 3 hours

**Description:**
Test issue creation with real GitHub repositories.

**Tasks:**
- [ ] Create test repository
- [ ] Generate token with issue permissions
- [ ] Run full pipeline on test repo
- [ ] Verify issues created correctly
- [ ] Verify issue content is complete
- [ ] Verify labels applied
- [ ] Clean up test issues
- [ ] Document testing process

**Acceptance Criteria:**
- Issues created in real GitHub repo
- Content matches expectations
- All sections present
- Professional formatting

**Files to Create:**
- `docs/portfolio-builder-testing.md`

---

### **WEEK 3: UI, Polish & Launch**

---

#### Issue #17: Create Results Display UI
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-ui`  
**Estimate:** 6 hours

**Description:**
Build UI to display analysis, research, and generated issues.

**Tasks:**
- [ ] Create results page component
- [ ] Section 1: Skill gaps detected
- [ ] Section 2: Research transparency (confidence, sources)
- [ ] Section 3: Generated GitHub issues
- [ ] Show research process (steps taken)
- [ ] Show confidence scores
- [ ] Link to GitHub issues
- [ ] Mobile responsive
- [ ] Add loading states

**Acceptance Criteria:**
- UI displays all results
- Professional design
- Mobile responsive
- Loading states work

**Files to Create:**
- `components/results/results-display.tsx`
- `components/results/research-card.tsx`
- `components/results/issue-card.tsx`

---

#### Issue #18: Add Real-Time Progress Indicators
**Priority:** Medium  
**Labels:** `priority-medium`, `type-feature`, `component-ui`  
**Estimate:** 4 hours

**Description:**
Show user what the agent is doing in real-time.

**Tasks:**
- [ ] Create progress component
- [ ] Show current phase (analysis/research/action)
- [ ] Show agent status messages
- [ ] Show progress percentage
- [ ] Animate transitions
- [ ] Add completion checkmarks
- [ ] Test with real workflow

**Acceptance Criteria:**
- Progress updates in real-time
- User knows what's happening
- Animations smooth
- Completion clear

**Files to Create:**
- `components/progress/agent-progress.tsx`
- `components/progress/phase-indicator.tsx`

---

#### Issue #19: Simplify Input Form
**Priority:** High  
**Labels:** `priority-high`, `type-feature`, `component-ui`  
**Estimate:** 3 hours

**Description:**
Create simple, focused input for GitHub URL.

**Tasks:**
- [ ] Single-page layout
- [ ] Large GitHub URL input
- [ ] "Analyze & Improve" button
- [ ] Validation for GitHub URLs
- [ ] Example links
- [ ] Error messages
- [ ] Loading state

**Acceptance Criteria:**
- Clean, simple design
- URL validation works
- User-friendly
- Examples helpful

**Files to Create:**
- `app/v1/page.tsx`
- `components/input/github-url-input.tsx`

---

#### Issue #20: Add Error Handling & User Feedback
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`  
**Estimate:** 4 hours

**Description:**
Comprehensive error handling and user messaging.

**Tasks:**
- [ ] Handle GitHub API errors
- [ ] Handle research failures
- [ ] Handle issue creation failures
- [ ] Show user-friendly error messages
- [ ] Add retry buttons
- [ ] Log errors for debugging
- [ ] Add error boundary components

**Acceptance Criteria:**
- All errors caught gracefully
- User never sees crashes
- Error messages are helpful
- Retry works

**Files to Create:**
- `lib/utils/error-handling.ts`
- `components/error/error-boundary.tsx`

---

#### Issue #21: Write Comprehensive Documentation
**Priority:** High  
**Labels:** `priority-high`, `type-docs`  
**Estimate:** 5 hours

**Description:**
Document entire V1 system for submission and future development.

**Tasks:**
- [ ] Update main README
- [ ] Document LangGraph agent architecture
- [ ] Document MCP integrations
- [ ] Add setup instructions
- [ ] Add usage guide
- [ ] Add troubleshooting section
- [ ] Add API documentation
- [ ] Add code comments

**Acceptance Criteria:**
- Documentation complete
- Setup instructions work
- Examples included
- Professional quality

**Files to Create/Modify:**
- `README.md`
- `docs/langgraph-architecture.md`
- `docs/mcp-integration.md`
- `docs/setup-guide.md`

---

#### Issue #22: Create Demo Video
**Priority:** High  
**Labels:** `priority-high`, `type-docs`  
**Estimate:** 4 hours

**Description:**
Record 5-minute demo video for capstone submission.

**Tasks:**
- [ ] Write video script
- [ ] Prepare demo repository
- [ ] Record screen capture
- [ ] Add voiceover narration
- [ ] Show complete workflow:
  - Input GitHub URL
  - Watch agent research
  - See GitHub issues created
- [ ] Edit video
- [ ] Upload to YouTube
- [ ] Add to README

**Acceptance Criteria:**
- Video < 5 minutes
- Shows complete workflow
- Professional quality
- Narration clear

**Deliverables:**
- Video script document
- Uploaded video (YouTube/Vimeo)
- Video link in README

---

#### Issue #23: Performance Testing
**Priority:** Medium  
**Labels:** `priority-medium`, `type-feature`  
**Estimate:** 3 hours

**Description:**
Ensure system performs within acceptable limits.

**Tasks:**
- [ ] Test end-to-end latency
- [ ] Measure research time per skill gap
- [ ] Measure issue creation time
- [ ] Test with 5+ different repositories
- [ ] Identify bottlenecks
- [ ] Optimize slow parts
- [ ] Document performance metrics

**Acceptance Criteria:**
- End-to-end < 60 seconds
- Research < 30 seconds per gap
- All requests succeed
- Performance documented

**Files to Create:**
- `docs/performance-testing.md`

---

#### Issue #24: Final Integration Testing
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`  
**Estimate:** 4 hours

**Description:**
Complete end-to-end testing with multiple repositories.

**Tasks:**
- [ ] Test with Python/Flask repo
- [ ] Test with JavaScript/React repo
- [ ] Test with mixed-language repo
- [ ] Test with empty repo (edge case)
- [ ] Test with private repo
- [ ] Verify all issues created
- [ ] Verify research quality
- [ ] Document test results

**Acceptance Criteria:**
- 5+ repos tested successfully
- All issues created correctly
- Research quality high
- Test results documented

**Files to Create:**
- `docs/integration-testing.md`
- `docs/test-results.md`

---

#### Issue #25: Deploy to Production
**Priority:** Critical  
**Labels:** `priority-critical`, `type-feature`  
**Estimate:** 3 hours

**Description:**
Deploy V1 to production (Vercel).

**Tasks:**
- [ ] Configure production environment variables
- [ ] Test build locally
- [ ] Deploy to Vercel
- [ ] Configure custom domain (if available)
- [ ] Test production deployment
- [ ] Monitor for errors
- [ ] Update README with live URL

**Acceptance Criteria:**
- Deployed successfully
- Live URL works
- No production errors
- README updated

**Deployment Checklist:**
- [ ] OPENAI_API_KEY set
- [ ] GITHUB_TOKEN set
- [ ] WEB_SEARCH_MCP_URL set
- [ ] Build succeeds
- [ ] All routes work

---

Issue #26: Setup Prisma and Vercel Postgres Database

  Priority: CriticalLabels: priority-critical, type-feature, component-databaseEstimate: 2
  hours

  Description:
  Install and configure Prisma ORM with Vercel Postgres free tier (no credit card required).

  Tasks:
  - Install Prisma CLI and client (@prisma/client, prisma)
  - Install Vercel Postgres adapter (@vercel/postgres)
  - Initialize Prisma (npx prisma init)
  - Create Vercel Postgres database (Free Tier - 256MB)
    - Go to Vercel Dashboard → Storage → Create Database
    - Select "Postgres"
    - Choose free tier (no payment required)
  - Copy DATABASE_URL from Vercel to .env.local
  - Add POSTGRES_URL for connection pooling
  - Test database connection with npx prisma db push
  - Update .gitignore for Prisma artifacts
  - Update README with Vercel Postgres setup instructions
  - Document free tier limits (256MB storage, 60 compute hours/month)

  Acceptance Criteria:
  - Prisma installed and initialized
  - Vercel Postgres database created (free tier)
  - Database connection successful
  - Can run npx prisma studio
  - Documentation updated with free tier info

  Files to Create/Modify:
  - prisma/schema.prisma
  - .env.local
  - .env.example
  - README.md
  - package.json

  Environment Variables:
  # Vercel Postgres (Free Tier - No Credit Card Required)
  DATABASE_URL="postgres://..."           # Direct connection
  POSTGRES_URL="postgres://..."           # Connection pooling (recommended)
  POSTGRES_PRISMA_URL="postgres://..."    # Prisma-optimized URL

  Free Tier Limits:
  - ✅ 256 MB storage (enough for 1000s of skill gaps)
  - ✅ 60 compute hours/month
  - ✅ No credit card required
  - ✅ Perfect for V1 capstone + early production

  ---
  Issue #27: Design Database Schema (Optimized for Free Tier)

  Priority: CriticalLabels: priority-critical, type-feature, component-databaseEstimate: 4
  hours

  Description:
  Design complete Prisma schema optimized for Vercel Postgres free tier (256MB limit).

  Tasks:
  - Create User model (id, githubUsername, email, createdAt, updatedAt)
  - Create SkillGap model (id, userId, repository, overallScore, skillLevel, createdAt)
  - Create Technology model (id, skillGapId, type, name)
  - Create SkillGapItem model (id, skillGapId, skillName, currentLevel, targetLevel, gap,
  priority)
  - Create Recommendation model (id, skillGapId, text, priority, completed)
  - Create ResearchResult model (id, skillGapId, confidence, resources, examples) for future 
  LangGraph
  - Create GitHubIssue model (id, skillGapId, issueUrl, status, createdAt)
  - Define relationships between models
  - Add indexes for performance (careful with free tier storage)
  - Use String @db.Text instead of unlimited String to save space
  - Add constraints and validations
  - Document schema in comments
  - Optimize for 256MB storage limit

  Acceptance Criteria:
  - Complete schema defined
  - All relationships mapped
  - Indexes optimized (not excessive)
  - Schema uses space-efficient types
  - Schema validates with npx prisma validate
  - Estimated storage per user < 1MB

  Files to Create:
  - prisma/schema.prisma
  - docs/database-schema.md

  Example Schema Structure (Space-Optimized):
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("POSTGRES_PRISMA_URL") // Uses connection pooling
    directUrl = env("POSTGRES_URL_NON_POOLING") // Direct connection
  }

  model User {
    id             String      @id @default(cuid())
    githubUsername String?     @unique
    email          String?     @unique
    createdAt      DateTime    @default(now())
    updatedAt      DateTime    @updatedAt
    skillGaps      SkillGap[]
  }

  model SkillGap {
    id                String           @id @default(cuid())
    userId            String
    user              User             @relation(fields: [userId], references: [id], 
  onDelete: Cascade)
    repository        String           @db.VarChar(255)
    overallScore      Int
    skillLevel        String           @db.VarChar(50)
    createdAt         DateTime         @default(now())
    lastAccessed      DateTime         @default(now())
    technologies      Technology[]
    skillGapItems     SkillGapItem[]
    recommendations   Recommendation[]
    researchResults   ResearchResult?
    githubIssues      GitHubIssue[]
    
    @@index([userId])
    @@index([createdAt])
  }

  // Use VarChar limits to save space on free tier

  Free Tier Optimization Tips:
  - Use @db.VarChar(N) instead of unlimited Text where possible
  - Limit indexes to frequently queried fields only
  - Store large text (resources, examples) as JSON in single column
  - Expected storage: ~500KB per skill gap analysis

  ---
  Issue #28: Run Initial Database Migration

  Priority: CriticalLabels: priority-critical, type-feature, component-databaseEstimate: 2
  hours

  Description:
  Create and run first Prisma migration to set up database tables on Vercel Postgres free
  tier.

  Tasks:
  - Generate migration from schema (npx prisma migrate dev --name init)
  - Review generated SQL migration files
  - Apply migration to Vercel Postgres database
  - Verify all tables created correctly in Vercel dashboard
  - Test with Prisma Studio (npx prisma studio)
  - Generate Prisma Client
  - Check database size in Vercel dashboard (should be <5MB after init)
  - Update .gitignore for migration artifacts
  - Document migration process for Vercel Postgres

  Acceptance Criteria:
  - Migration runs successfully on Vercel Postgres
  - All tables exist in database
  - Prisma Studio shows empty tables
  - Prisma Client generated
  - Database size well within 256MB limit

  Files to Create:
  - prisma/migrations/*/migration.sql
  - docs/migration-guide.md

  Vercel Postgres Commands:
  # Development (local connection to Vercel Postgres)
  npx prisma migrate dev --name init

  # Production (Vercel deployment)
  npx prisma migrate deploy

  ---
  Issue #29: Create Database Migration Script for Existing Data

  Priority: HighLabels: priority-high, type-feature, component-databaseEstimate: 5 hours

  Description:
  Build script to migrate existing JSON file data to Vercel Postgres database.

  Tasks:
  - Create migration script file
  - Read existing .data/skill-gaps.json
  - Read existing .data/user-sessions.json
  - Parse JSON data
  - Transform to Prisma schema format
  - Create users from unique userIds
  - Create skill gaps with relationships
  - Create technologies, skill gap items, recommendations
  - Handle data validation errors
  - Backup original JSON files to .data.backup/
  - Log migration progress and final database size
  - Verify data integrity after migration
  - Check Vercel Postgres storage usage after migration
  - Write tests for migration script

  Acceptance Criteria:
  - Script migrates all existing data to Vercel Postgres
  - No data loss
  - Relationships properly linked
  - Original files backed up
  - Database size stays within free tier (< 256MB)
  - Tests pass

  Files to Create:
  - scripts/migrate-to-database.ts
  - scripts/verify-migration.ts
  - .data.backup/ (backup directory)

  Storage Check:
  // After migration, log storage usage
  console.log('Migration complete. Check Vercel dashboard for storage usage.');
  console.log('Free tier limit: 256 MB');

  ---
  Issue #30: Refactor SkillGapStorage to Use Prisma

  Priority: CriticalLabels: priority-critical, type-refactor, component-databaseEstimate: 6
  hours

  Description:
  Replace file-based storage implementation with Prisma database operations connected to
  Vercel Postgres.

  Tasks:
  - Create Prisma client singleton (lib/db.ts) with Vercel Postgres config
  - Refactor storeSkillGap() to use Prisma
  - Refactor getLatestSkillGap() to use Prisma with efficient queries
  - Refactor getSkillGap() to use Prisma
  - Refactor getUserSkillGaps() to use Prisma with pagination (for free tier efficiency)
  - Refactor getSkillGapSummary() to use Prisma
  - Refactor getSkillDetails() to use Prisma
  - Remove all file system operations
  - Add transaction support for complex operations
  - Add proper error handling for Vercel Postgres connection issues
  - Update TypeScript types
  - Write unit tests for each method

  Acceptance Criteria:
  - All methods use Prisma connected to Vercel Postgres
  - API remains backward compatible
  - Queries optimized for free tier performance
  - Tests pass
  - No more JSON file reads/writes

  Files to Modify:
  - lib/storage/skill-gap-storage.ts

  Files to Create:
  - lib/db.ts (Prisma client singleton)

  Example (Vercel Postgres Optimized):
  // lib/db.ts
  import { PrismaClient } from '@prisma/client'

  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
  }

  export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

  ---
  Issue #31: Update Gap Analyzer to Use Database

  Priority: HighLabels: priority-high, type-refactor, component-databaseEstimate: 3 hours

  Description:
  Update Gap Analyzer agent to use Prisma for storing analysis results in Vercel Postgres.

  Tasks:
  - Import Prisma client
  - Update skill gap storage calls
  - Add database error handling for Vercel Postgres
  - Update TypeScript types if needed
  - Test with real GitHub analysis
  - Verify data persists correctly in Vercel Postgres
  - Update integration tests

  Acceptance Criteria:
  - Gap Analyzer stores to Vercel Postgres database
  - All analysis data captured
  - Tests pass
  - No breaking changes

  Files to Modify:
  - lib/agents/gap-analyzer.ts

  ---
  Issue #32: Update GitHub Agent to Use Database

  Priority: HighLabels: priority-high, type-refactor, component-databaseEstimate: 3 hours

  Description:
  Update GitHub Agent to store issue creation results in Vercel Postgres database.

  Tasks:
  - Import Prisma client
  - Store GitHub issue URLs in database
  - Link issues to skill gaps
  - Track issue status (open/closed)
  - Add database error handling
  - Test issue creation flow
  - Update tests

  Acceptance Criteria:
  - GitHub issues tracked in Vercel Postgres database
  - Linked to correct skill gaps
  - Status tracking works
  - Tests pass

  Files to Modify:
  - lib/agents/github-agent.ts

  ---
  Issue #33: Update API Routes to Use Prisma

  Priority: CriticalLabels: priority-critical, type-refactor, component-databaseEstimate: 5
  hours

  Description:
  Update all API routes to use Prisma with Vercel Postgres instead of file-based storage.

  Tasks:
  - Update chat API route
  - Update skill assessment API routes
  - Update GitHub demo API routes
  - Update RAG agent API routes
  - Add pagination for list endpoints (free tier optimization)
  - Add filtering capabilities
  - Improve error handling for database connection issues
  - Update response types
  - Test all API routes with Vercel Postgres
  - Update API documentation

  Acceptance Criteria:
  - All routes use Prisma connected to Vercel Postgres
  - Pagination works (limit 50 items per page for efficiency)
  - Filtering works
  - Error handling improved
  - Tests pass

  Files to Modify:
  - app/api/*/route.ts (all API routes)

  ---
  Issue #34: Add Database Seeding

  Priority: MediumLabels: priority-medium, type-feature, component-databaseEstimate: 3 hours

  Description:
  Create seed script for populating Vercel Postgres database with test data.

  Tasks:
  - Create seed script (prisma/seed.ts)
  - Add test users (2-3 for free tier testing)
  - Add sample skill gaps (5-10 samples)
  - Add sample technologies
  - Add sample recommendations
  - Configure Prisma to run seed
  - Check database size after seeding (should be <10MB)
  - Document seeding process
  - Test seed script with Vercel Postgres

  Acceptance Criteria:
  - Seed script runs successfully on Vercel Postgres
  - Test data populated
  - Can reset database easily
  - Database size stays minimal (<10MB after seed)
  - Documented

  Files to Create:
  - prisma/seed.ts
  - docs/database-seeding.md

  package.json addition:
  {
    "prisma": {
      "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
    }
  }

  ---
  Issue #35: Add Database Query Optimization for Free Tier

  Priority: MediumLabels: priority-medium, type-feature, component-databaseEstimate: 4 hours

  Description:
  Optimize database queries for Vercel Postgres free tier performance (60 compute hours/month
   limit).

  Tasks:
  - Analyze query patterns
  - Add selective indexes (minimize storage impact)
  - Use Prisma's select to fetch only needed fields
  - Use Prisma's include efficiently for joins
  - Implement query result caching where appropriate
  - Add database query logging in development
  - Test query performance with Vercel Postgres
  - Monitor compute hours usage
  - Document optimization decisions

  Acceptance Criteria:
  - Common queries optimized
  - Minimal indexes (storage-conscious)
  - Query times < 100ms
  - Compute hours stay within free tier
  - Documentation complete

  Files to Modify:
  - prisma/schema.prisma
  - lib/storage/skill-gap-storage.ts

  Free Tier Optimization:
  // Fetch only needed fields to reduce compute time
  const skillGap = await prisma.skillGap.findUnique({
    where: { id },
    select: {
      id: true,
      repository: true,
      overallScore: true,
      // Only include what you need
    }
  })

  ---
  Issue #36: Add User Management System

  Priority: MediumLabels: priority-medium, type-feature, component-databaseEstimate: 5 hours

  Description:
  Create basic user management for tracking multiple users in Vercel Postgres.

  Tasks:
  - Create user CRUD operations
  - Add user creation from GitHub username
  - Link skill gaps to users correctly
  - Add user profile retrieval
  - Add user stats (total skill gaps, progress)
  - Create user management API routes
  - Write tests

  Acceptance Criteria:
  - Users can be created and retrieved from Vercel Postgres
  - Skill gaps properly linked to users
  - User stats accurate
  - Tests pass

  Files to Create:
  - lib/users/user-service.ts
  - app/api/users/route.ts

  ---
  Issue #37: Database Integration Testing

  Priority: HighLabels: priority-high, type-feature, component-databaseEstimate: 4 hours

  Description:
  Comprehensive testing of Vercel Postgres database integration across all features.

  Tasks:
  - Test skill gap creation with Vercel Postgres
  - Test GitHub analysis with database
  - Test retrieval operations
  - Test data relationships
  - Test with multiple users
  - Test error scenarios (connection failures, timeouts)
  - Test concurrent operations
  - Test migration rollback
  - Monitor storage usage during tests
  - Document test results

  Acceptance Criteria:
  - All integration tests pass with Vercel Postgres
  - No data corruption
  - Concurrent operations safe
  - Edge cases handled
  - Storage stays within free tier

  Files to Create:
  - __tests__/database-integration.test.ts
  - docs/database-testing.md

  ---
  Issue #38: Update Documentation for Vercel Postgres

  Priority: MediumLabels: priority-medium, type-docs, component-databaseEstimate: 3 hours

  Description:
  Update all documentation to reflect Vercel Postgres free tier architecture.

  Tasks:
  - Update README with Vercel Postgres setup (free tier)
  - Update CLAUDE.md with database context
  - Create database schema documentation
  - Document Vercel Postgres free tier limits
  - Document common database operations
  - Add troubleshooting guide for Vercel Postgres
  - Update deployment instructions
  - Add database backup/restore guide (Vercel-specific)
  - Document how to monitor storage/compute usage

  Acceptance Criteria:
  - All docs updated for Vercel Postgres
  - Setup instructions clear (no credit card mention)
  - Free tier limits documented
  - Troubleshooting comprehensive
  - Deployment guide complete

  Files to Create/Modify:
  - README.md
  - CLAUDE.md
  - docs/database-architecture.md
  - docs/vercel-postgres-setup.md
  - docs/database-troubleshooting.md
  - docs/deployment-with-database.md

  README Addition:
  ## Database: Vercel Postgres (Free Tier)

  SkillBridge.ai uses Vercel Postgres free tier:
  - ✅ 256 MB storage (supports 1000s of skill gap analyses)
  - ✅ 60 compute hours/month
  - ✅ **No credit card required**
  - ✅ Perfect for V1 capstone + early production

  ### Setup (2 minutes)
  1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
  2. Navigate to Storage → Create Database → Postgres
  3. Select **Free Tier**
  4. Copy `POSTGRES_PRISMA_URL` to `.env.local`
  5. Run `npx prisma migrate deploy`

  **That's it!** No payment info needed.

  ---
  Issue #39: Deploy Vercel Postgres to Production

  Priority: CriticalLabels: priority-critical, type-feature, component-databaseEstimate: 2
  hours

  Description:
  Set up production Vercel Postgres database (free tier) and deploy with migrations.

  Tasks:
  - Create Vercel Postgres database in production project
    - Go to Vercel project → Storage tab
    - Click "Create Database" → Select "Postgres"
    - Choose Free Tier (no credit card)
  - Vercel auto-injects environment variables (POSTGRES_PRISMA_URL, etc.)
  - Run migrations in production via Vercel build
  - Add prisma generate && prisma migrate deploy to build script
  - Test production database connection
  - Verify storage usage (<10MB initial)
  - Set up monitoring for storage/compute hours in Vercel dashboard
  - Update deployment documentation

  Acceptance Criteria:
  - Production Vercel Postgres running (free tier)
  - Migrations applied automatically on deployment
  - Application connects successfully
  - Storage/compute monitoring active
  - All routes work in production

  Deployment Checklist:
  - Vercel Postgres created in project (free tier)
  - Environment variables auto-injected by Vercel
  - package.json build script includes Prisma commands
  - Migrations run on deploy
  - Storage usage visible in Vercel dashboard
  - All routes work in production

  package.json update:
  {
    "scripts": {
      "build": "prisma generate && prisma migrate deploy && next build",
      "vercel-build": "prisma generate && prisma migrate deploy && next build"
    }
  }

Issue #40: Register GitHub OAuth Application

  Priority: CriticalLabels: priority-critical, type-feature, component-authEstimate: 1 hour

  Description:
  Register SkillBridge.ai as a GitHub OAuth App to enable user authentication and private repo access.

  Tasks:
  - Go to GitHub Settings → Developer settings → OAuth Apps
  - Click "New OAuth App"
  - Fill in application details:
    - Application name: SkillBridge.ai (or SkillBridge.ai Dev for development)
    - Homepage URL: http://localhost:3000 (dev) / https://your-domain.vercel.app (prod)
    - Authorization callback URL: http://localhost:3000/api/auth/github/callback
    - Application description: "AI-powered career development platform"
  - Generate Client ID and Client Secret
  - Add credentials to .env.local
  - Add credentials to .env.example (with placeholder values)
  - Document OAuth app settings
  - Create separate OAuth app for production (later)

  Acceptance Criteria:
  - GitHub OAuth app registered
  - Client ID and Secret obtained
  - Environment variables configured
  - Documentation complete

  Files to Modify:
  - .env.local
  - .env.example
  - README.md

  Environment Variables:
  # GitHub OAuth (Free - No Credit Card)
  GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
  GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
  NEXTAUTH_SECRET=generate_random_secret_here  # Generate: openssl rand -base64 32
  NEXTAUTH_URL=http://localhost:3000

  OAuth Scopes to Request:
  - user:email - Read user email addresses
  - read:user - Read user profile data
  - repo - Full control of private repositories (for analysis)

  ---
  Issue #41: Install and Configure NextAuth.js

  Priority: CriticalLabels: priority-critical, type-feature, component-authEstimate: 3 hours

  Description:
  Install NextAuth.js for handling GitHub OAuth authentication in Next.js 15.

  Tasks:
  - Install NextAuth.js v5 (beta - supports Next.js 15)
    - pnpm add next-auth@beta
    - pnpm add @auth/prisma-adapter (for database sessions)
  - Create NextAuth configuration file
  - Configure GitHub provider with OAuth credentials
  - Set up session strategy (JWT or database)
  - Configure callback URLs
  - Add NextAuth API route handler
  - Test authentication flow locally
  - Handle token storage for GitHub API calls
  - Add error handling for OAuth failures

  Acceptance Criteria:
  - NextAuth.js installed and configured
  - GitHub provider working
  - Users can login with GitHub
  - Tokens stored securely
  - Error handling works

  Files to Create:
  - lib/auth/config.ts (NextAuth configuration)
  - app/api/auth/[...nextauth]/route.ts (NextAuth API handler)
  - lib/auth/options.ts (Auth options and callbacks)

  Example Configuration:
  // lib/auth/config.ts
  import NextAuth from "next-auth"
  import GitHub from "next-auth/providers/github"
  import { PrismaAdapter } from "@auth/prisma-adapter"
  import { prisma } from "@/lib/db"

  export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: "user:email read:user repo"
          }
        }
      })
    ],
    callbacks: {
      async session({ session, token, user }) {
        // Add GitHub access token to session
        if (token.accessToken) {
          session.accessToken = token.accessToken as string
        }
        return session
      },
      async jwt({ token, account }) {
        // Store access token in JWT
        if (account) {
          token.accessToken = account.access_token
        }
        return token
      }
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    }
  })

  // app/api/auth/[...nextauth]/route.ts
  import { handlers } from "@/lib/auth/config"

  export const { GET, POST } = handlers

  ---
  Issue #42: Update Prisma Schema for NextAuth

  Priority: CriticalLabels: priority-critical, type-refactor, component-databaseEstimate: 2 hours

  Description:
  Add NextAuth required tables to Prisma schema for user sessions and OAuth accounts.

  Tasks:
  - Add NextAuth models to prisma/schema.prisma:
    - Account (OAuth connections)
    - Session (user sessions)
    - Update User model with NextAuth fields
  - Generate migration (npx prisma migrate dev --name add-nextauth)
  - Apply migration to Vercel Postgres
  - Verify tables created correctly
  - Test NextAuth with new schema
  - Update existing User model relations

  Acceptance Criteria:
  - NextAuth tables exist in database
  - Migration runs successfully
  - User model compatible with NextAuth
  - No breaking changes to existing functionality

  Files to Modify:
  - prisma/schema.prisma

  Schema Addition:
  // Update existing User model
  model User {
    id             String      @id @default(cuid())
    name           String?
    email          String?     @unique
    emailVerified  DateTime?
    image          String?
    githubUsername String?     @unique
    createdAt      DateTime    @default(now())
    updatedAt      DateTime    @updatedAt

    // Relations
    accounts       Account[]
    sessions       Session[]
    skillGaps      SkillGap[]
  }

  // NextAuth required models
  model Account {
    id                String  @id @default(cuid())
    userId            String
    type              String
    provider          String
    providerAccountId String
    refresh_token     String? @db.Text
    access_token      String? @db.Text
    expires_at        Int?
    token_type        String?
    scope             String?
    id_token          String? @db.Text
    session_state     String?

    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([provider, providerAccountId])
    @@index([userId])
  }

  model Session {
    id           String   @id @default(cuid())
    sessionToken String   @unique
    userId       String
    expires      DateTime
    user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([userId])
  }

  model VerificationToken {
    identifier String
    token      String   @unique
    expires    DateTime

    @@unique([identifier, token])
  }

  ---
  Issue #43: Create Authentication UI Components

  Priority: HighLabels: priority-high, type-feature, component-uiEstimate: 4 hours

  Description:
  Build user-facing authentication UI with "Login with GitHub" button and user profile display.

  Tasks:
  - Create login page (app/auth/signin/page.tsx)
  - Create "Login with GitHub" button component
  - Create user profile dropdown component
  - Create sign out functionality
  - Add authentication status indicator
  - Create protected route wrapper
  - Add loading states during OAuth flow
  - Style components with shadcn/ui
  - Add error page for OAuth failures
  - Test full login/logout flow

  Acceptance Criteria:
  - Login page displays correctly
  - GitHub login button works
  - User profile shows after login
  - Logout works
  - Protected routes redirect to login
  - Error handling works

  Files to Create:
  - app/auth/signin/page.tsx
  - app/auth/error/page.tsx
  - components/auth/login-button.tsx
  - components/auth/user-nav.tsx
  - components/auth/auth-provider.tsx

  Example Components:
  // components/auth/login-button.tsx
  'use client'

  import { signIn } from "next-auth/react"
  import { Button } from "@/components/ui/button"
  import { Github } from "lucide-react"

  export function LoginButton() {
    return (
      <Button 
        onClick={() => signIn('github', { callbackUrl: '/' })}
        className="gap-2"
      >
        <Github className="h-5 w-5" />
        Login with GitHub
      </Button>
    )
  }

  // components/auth/user-nav.tsx
  'use client'

  import { signOut, useSession } from "next-auth/react"
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

  export function UserNav() {
    const { data: session } = useSession()

    if (!session?.user) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
              <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // app/auth/signin/page.tsx
  import { LoginButton } from "@/components/auth/login-button"

  export default function SignInPage() {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to SkillBridge.ai
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with GitHub to analyze your repositories and track your skill development
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    )
  }

  ---
  Issue #44: Update GitHubClient to Use User Access Tokens

  Priority: CriticalLabels: priority-critical, type-refactor, component-githubEstimate: 4 hours

  Description:
  Modify GitHubClient to accept user-specific OAuth tokens instead of global GITHUB_TOKEN.

  Tasks:
  - Update GitHubClient constructor to accept optional token parameter
  - Modify all API routes to pass user's access token from session
  - Update GitHub Agent to use session token
  - Add token validation before GitHub API calls
  - Handle expired/invalid tokens gracefully
  - Add automatic token refresh (if using refresh tokens)
  - Update all components using GitHubClient
  - Test with authenticated user
  - Test error scenarios (expired token, revoked access)

  Acceptance Criteria:
  - GitHubClient uses user-specific tokens
  - Private repos accessible per-user
  - Expired tokens handled gracefully
  - All API routes updated
  - Tests pass

  Files to Modify:
  - lib/github/github-client.ts
  - lib/agents/github-agent.ts
  - All API routes using GitHub
  - app/api/*/route.ts

  Example Changes:
  // lib/github/github-client.ts
  export class GitHubClient {
    private token: string;

    constructor(token?: string) {
      // Now prioritizes passed token over env variable
      this.token = token || process.env.GITHUB_TOKEN || '';
    }

    // ... rest of class
  }

  // Usage in API route:
  import { auth } from "@/lib/auth/config"
  import { GitHubClient } from "@/lib/github/github-client"

  export async function GET(req: Request) {
    const session = await auth()

    if (!session?.accessToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubClient = new GitHubClient(session.accessToken as string)
    const repos = await githubClient.getUserRepositories(session.user.githubUsername)

    return Response.json({ repos })
  }

  ---
  Issue #45: Add Session Management and Protected Routes

  Priority: HighLabels: priority-high, type-feature, component-authEstimate: 3 hours

  Description:
  Implement session management and protect routes that require authentication.

  Tasks:
  - Create session provider for client components
  - Wrap app with NextAuth SessionProvider
  - Create middleware for route protection
  - Protect API routes (check authentication)
  - Protect pages (redirect to login if not authenticated)
  - Add loading states for session checks
  - Handle session expiration
  - Add session refresh logic
  - Test protected routes
  - Document authentication flow

  Acceptance Criteria:
  - Protected routes require login
  - API routes check authentication
  - Session persists across page reloads
  - Unauthorized access redirects to login
  - Tests pass

  Files to Create:
  - middleware.ts (Next.js middleware)
  - lib/auth/session-provider.tsx
  - lib/auth/protected-route.tsx

  Example Middleware:
  // middleware.ts
  import { auth } from "@/lib/auth/config"
  import { NextResponse } from "next/server"

  export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnLoginPage = req.nextUrl.pathname.startsWith('/auth')
    const isPublicPage = req.nextUrl.pathname === '/' ||
                         req.nextUrl.pathname === '/about' ||
                         req.nextUrl.pathname === '/privacy'

    // Allow public pages and login page
    if (isPublicPage || isOnLoginPage) {
      return NextResponse.next()
    }

    // Redirect to login if not authenticated
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    return NextResponse.next()
  })

  export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
  }

  // lib/auth/session-provider.tsx
  'use client'

  import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

  export function SessionProvider({ children }: { children: React.ReactNode }) {
    return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
  }

  // Wrap app in app/layout.tsx:
  import { SessionProvider } from "@/lib/auth/session-provider"

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body>
          <SessionProvider>
            {children}
          </SessionProvider>
        </body>
      </html>
    )
  }

  ---
  Issue #46: Update Skill Gap Storage with User Authentication

  Priority: HighLabels: priority-high, type-refactor, component-databaseEstimate: 3 hours

  Description:
  Update skill gap storage to associate analyses with authenticated users.

  Tasks:
  - Modify storeSkillGap() to use authenticated user ID
  - Update getLatestSkillGap() to filter by authenticated user
  - Update all skill gap queries to be user-specific
  - Add user ownership validation
  - Prevent users from accessing other users' data
  - Update API routes to use session user ID
  - Test with multiple authenticated users
  - Add user-specific data cleanup

  Acceptance Criteria:
  - Skill gaps associated with correct users
  - Users can only access their own data
  - All queries filter by user ID
  - Multi-user isolation works
  - Tests pass

  Files to Modify:
  - lib/storage/skill-gap-storage.ts
  - All API routes using skill gap storage

  Example Update:
  // Before:
  async storeSkillGap(userId: string, ...) {
    // userId was passed manually
  }

  // After:
  async storeSkillGap(githubAnalysis: GitHubAnalysis, skillAssessment: GapAnalysisResult) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const userId = session.user.id
    // Use authenticated user's ID
  }

  ---
  Issue #47: Add User Dashboard with GitHub Connection Status

  Priority: MediumLabels: priority-medium, type-feature, component-uiEstimate: 4 hours

  Description:
  Create user dashboard showing GitHub connection status, permissions, and recent analyses.

  Tasks:
  - Create dashboard page (app/dashboard/page.tsx)
  - Show user's GitHub profile info
  - Display GitHub connection status
  - Show token scopes and permissions
  - List recent skill gap analyses
  - Add "Reconnect GitHub" button (if token expired)
  - Show private repo access status
  - Add navigation to dashboard from header
  - Style with shadcn/ui components
  - Make responsive for mobile

  Acceptance Criteria:
  - Dashboard displays user info
  - GitHub status visible
  - Recent analyses listed
  - Reconnect functionality works
  - Mobile responsive

  Files to Create:
  - app/dashboard/page.tsx
  - components/dashboard/github-status.tsx
  - components/dashboard/recent-analyses.tsx

  Example Dashboard:
  // app/dashboard/page.tsx
  import { auth } from "@/lib/auth/config"
  import { redirect } from "next/navigation"
  import { UserNav } from "@/components/auth/user-nav"
  import { GitHubStatus } from "@/components/dashboard/github-status"
  import { RecentAnalyses } from "@/components/dashboard/recent-analyses"

  export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
      redirect('/auth/signin')
    }

    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <UserNav />
        </div>

        <div className="grid gap-6">
          <GitHubStatus session={session} />
          <RecentAnalyses userId={session.user.id} />
        </div>
      </div>
    )
  }

  ---
  Issue #48: Handle OAuth Token Refresh and Expiration

  Priority: MediumLabels: priority-medium, type-feature, component-authEstimate: 4 hours

  Description:
  Implement token refresh logic and handle expired OAuth tokens gracefully.

  Tasks:
  - Configure NextAuth to store refresh tokens
  - Implement automatic token refresh callback
  - Add token expiration checking
  - Show user notification when token expires
  - Add "Reconnect GitHub" flow
  - Handle GitHub API errors for expired tokens
  - Test token refresh flow
  - Add token refresh logging
  - Document refresh token behavior

  Acceptance Criteria:
  - Tokens refresh automatically when possible
  - Expired tokens handled gracefully
  - User notified when manual reconnection needed
  - No crashes from expired tokens
  - Tests pass

  Files to Modify:
  - lib/auth/config.ts (add refresh callback)
  - lib/github/github-client.ts (handle 401 errors)

  Example Token Refresh:
  // lib/auth/config.ts
  import { JWT } from "next-auth/jwt"

  async function refreshAccessToken(token: JWT) {
    try {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken as string,
        }),
      })

      const refreshedTokens = await response.json()

      if (!response.ok) throw refreshedTokens

      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      }
    } catch (error) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
      }
    }
  }

  export const authOptions = {
    // ... other config
    callbacks: {
      async jwt({ token, account }) {
        // Initial sign in
        if (account) {
          return {
            accessToken: account.access_token,
            accessTokenExpires: account.expires_at! * 1000,
            refreshToken: account.refresh_token,
            user: token.user,
          }
        }

        // Return previous token if not expired
        if (Date.now() < (token.accessTokenExpires as number)) {
          return token
        }

        // Refresh token
        return refreshAccessToken(token)
      },
    },
  }

  ---
  Issue #49: Add OAuth Security Best Practices

  Priority: HighLabels: priority-high, type-feature, component-authEstimate: 3 hours

  Description:
  Implement security best practices for OAuth implementation.

  Tasks:
  - Add CSRF protection (NextAuth includes this)
  - Implement state parameter validation
  - Add secure session cookies configuration
  - Enable HTTPS-only cookies in production
  - Add rate limiting to auth endpoints
  - Implement account linking prevention (if needed)
  - Add security headers
  - Validate redirect URLs
  - Add logging for security events
  - Document security measures

  Acceptance Criteria:
  - CSRF protection enabled
  - Secure cookies configured
  - Rate limiting works
  - Security headers set
  - Security audit passed

  Files to Modify:
  - lib/auth/config.ts
  - middleware.ts
  - next.config.js

  Security Configuration:
  // lib/auth/config.ts
  export const authOptions = {
    // ... other config
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
      sessionToken: {
        name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
    // Add security callbacks
    callbacks: {
      async signIn({ account, profile }) {
        // Validate GitHub account
        if (account?.provider === "github") {
          return !!profile?.email // Require email
        }
        return true
      },
    },
  }

  ---
  Issue #50: Testing OAuth Flow End-to-End

  Priority: CriticalLabels: priority-critical, type-feature, component-authEstimate: 4 hours

  Description:
  Comprehensive testing of OAuth authentication flow with multiple scenarios.

  Tasks:
  - Test first-time GitHub login
  - Test returning user login
  - Test logout functionality
  - Test session persistence
  - Test expired token handling
  - Test revoked GitHub access
  - Test with private repositories
  - Test with multiple users
  - Test protected route access
  - Test API authentication
  - Document test results
  - Create test user accounts for QA

  Acceptance Criteria:
  - All OAuth flows work correctly
  - Edge cases handled gracefully
  - Multi-user tested
  - Private repo access works
  - Test documentation complete

  Files to Create:
  - __tests__/auth/oauth-flow.test.ts
  - docs/oauth-testing.md

  Test Scenarios:
  1. ✅ New user signs in with GitHub
  2. ✅ User accesses private repository
  3. ✅ User logs out and back in
  4. ✅ Token expires and refreshes
  5. ✅ User revokes GitHub access
  6. ✅ Protected route redirects to login
  7. ✅ Multiple users with separate data

  ---
  Issue #51: Update Documentation for OAuth Authentication

  Priority: HighLabels: priority-high, type-docs, component-authEstimate: 3 hours

  Description:
  Create comprehensive documentation for OAuth setup, usage, and troubleshooting.

  Tasks:
  - Update README with OAuth setup instructions
  - Create OAuth flow diagram
  - Document GitHub OAuth app registration
  - Write user guide for authentication
  - Add developer setup guide
  - Create troubleshooting guide
  - Document security considerations
  - Add FAQ for common OAuth issues
  - Update CLAUDE.md with OAuth context
  - Create video walkthrough (optional)

  Acceptance Criteria:
  - Complete OAuth setup guide
  - User and developer docs separate
  - Troubleshooting comprehensive
  - Security documented
  - Diagrams included

  Files to Create/Modify:
  - README.md
  - docs/oauth-setup.md
  - docs/oauth-user-guide.md
  - docs/oauth-troubleshooting.md
  - docs/oauth-security.md
  - CLAUDE.md

  README Section:
  ## 🔐 Authentication (GitHub OAuth)

  SkillBridge.ai uses GitHub OAuth for secure, multi-user authentication.

  ### For Users

  1. Click "Login with GitHub" on the home page
  2. Authorize SkillBridge.ai to access your repositories
  3. You'll be redirected back and logged in
  4. Your private repositories are now accessible for analysis!

  **Permissions:** We request access to:
  - ✅ Read your profile (username, email)
  - ✅ Access your repositories (public and private)
  - ❌ We never write to your repositories without permission

  ### For Developers

  1. **Register GitHub OAuth App:**
     ```bash
     # Go to: https://github.com/settings/developers
     # Create new OAuth App with:
     # - Homepage: http://localhost:3000
     # - Callback: http://localhost:3000/api/auth/github/callback

  2. Add credentials to .env.local:
  GITHUB_CLIENT_ID=your_client_id
  GITHUB_CLIENT_SECRET=your_client_secret
  NEXTAUTH_SECRET=your_random_secret
  NEXTAUTH_URL=http://localhost:3000
  3. Generate NextAuth secret:
  openssl rand -base64 32
  4. Run migrations:
  npx prisma migrate dev
  5. Start development server:
  pnpm dev

  Security

  - ✅ Tokens stored securely in database
  - ✅ HTTPS-only in production
  - ✅ CSRF protection enabled
  - ✅ Session cookies httpOnly
  - ✅ Automatic token refresh

  Troubleshooting

  "OAuth app not found"
  - Check GITHUB_CLIENT_ID is correct
  - Verify callback URL matches exactly

  "Unauthorized" errors
  - Token may have expired - log out and back in
  - GitHub access may have been revoked

  Private repos not showing
  - Ensure you granted repo permission during login
  - Try disconnecting and reconnecting

  See docs/oauth-troubleshooting.md for more help.
