# Testing Guide: Learning Resources Tab Fixes

## Quick Verification Checklist

### ✅ Test 1: Fresh Analysis with Results
**Goal**: Verify that a new analysis generates fresh learning resources

1. Open browser DevTools Console (F12 → Console tab)
2. Clear localStorage: `localStorage.clear()`
3. Navigate to `/agentic/skill-gaps`
4. Enter a GitHub repo URL (e.g., `https://github.com/vercel/next.js`)
5. Run the analysis
6. Wait for completion
7. Navigate to `/agentic/learning` (Learning Resources tab)
8. **Expected Results**:
   - ✅ Learning resources are displayed (not empty)
   - ✅ Resources are relevant to the repository's tech stack
   - ✅ Console shows: `[LearningDisplay] Analysis status: { hasCompletedAnalysis: true, researchResults: X, ... }`
   - ✅ No "No Learning Resources" empty state

### ✅ Test 2: Multiple Analyses Show Different Results
**Goal**: Verify that running analysis on different repos gives different results

1. Run analysis on Repository A (e.g., Python/Django project)
2. Note the learning resources shown
3. Navigate back to Skill Gaps
4. Run analysis on Repository B (e.g., React/TypeScript project)
5. Navigate to Learning Resources
6. **Expected Results**:
   - ✅ Resources are different from Repository A
   - ✅ Resources are relevant to Repository B's tech stack
   - ✅ No duplicate resources from Repository A
   - ✅ Console shows different `researchResults` count

### ✅ Test 3: Empty Results Handling
**Goal**: Verify that empty results are handled gracefully

1. Run analysis on a repo with very niche tech (if results are empty)
2. Navigate to Learning Resources
3. **Expected Results**:
   - ✅ Empty state is shown with clear messaging
   - ✅ "Clear Cache" button is visible
   - ✅ "Run New Analysis" button is visible
   - ✅ Console shows: `researchResults: 0, githubExamples: 0`

### ✅ Test 4: Clear Cache Functionality
**Goal**: Verify that Clear Cache button works

1. With existing analysis results shown
2. Click "Clear Cache" button (visible in empty state)
3. **Expected Results**:
   - ✅ Page reloads
   - ✅ Shows "No Learning Resources Yet" state
   - ✅ localStorage is cleared (check with `localStorage.getItem('skillbridge_analysis_results')` → should be `null`)

### ✅ Test 5: Navigation Persistence
**Goal**: Verify results persist across navigation

1. Run analysis successfully
2. Navigate: Skill Gaps → Learning Resources → Portfolio → Learning Resources
3. **Expected Results**:
   - ✅ Same results shown consistently
   - ✅ No re-fetching or flickering
   - ✅ localStorage contains the same data

### ✅ Test 6: Force Refresh API Parameter
**Goal**: Verify that the API respects forceRefresh parameter

1. Open browser DevTools Console
2. Run this code:
```javascript
fetch('/api/research', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skillGap: 'Testing',
    detectedLanguage: 'JavaScript',
    forceRefresh: true
  })
}).then(r => r.json()).then(console.log)
```
3. Check server logs (terminal running `npm run dev`)
4. **Expected Results**:
   - ✅ Server logs show: `[Research Agent] Force refresh: true`
   - ✅ Server logs show: `[loadLatestStateNode] Force refresh enabled, skipping storage load`
   - ✅ API returns fresh results

## Console Debug Output

### Healthy State (with results)
```javascript
[LearningDisplay] Analysis status: {
  hasCompletedAnalysis: true,
  researchResults: 8,
  githubExamples: 5,
  repoUrl: "https://github.com/user/repo"
}
```

### Empty State (no results)
```javascript
[LearningDisplay] Analysis status: {
  hasCompletedAnalysis: true,
  researchResults: 0,
  githubExamples: 0,
  repoUrl: "https://github.com/user/repo"
}
```

### No Analysis Yet
```javascript
[LearningDisplay] Analysis status: {
  hasCompletedAnalysis: false,
  researchResults: 0,
  githubExamples: 0,
  repoUrl: undefined
}
```

## Server Logs to Check

### Successful Research Flow
```
[Research Agent] Starting workflow for: Testing
[Research Agent] Force refresh: true
[loadLatestStateNode] Force refresh enabled, skipping storage load
🔍 Running searchResourcesNode
   Skill gap: Testing
   Primary language: JavaScript
   Seed queries: ...
[Research Agent] Workflow complete
  Resources: 8
  Examples: 5
  Recommendations: 10
  Confidence: 85%
```

### Empty Results Flow
```
[Research Agent] Starting workflow for: Very Niche Skill
[Research Agent] Force refresh: true
[loadLatestStateNode] Force refresh enabled, skipping storage load
🔍 Running searchResourcesNode
   Skill gap: Very Niche Skill
   Primary language: unknown
   Seed queries: ...
[Research Agent] Workflow complete
  Resources: 0
  Examples: 0
  Recommendations: 0
  Confidence: 20%
```

## Known Issues (Expected Behavior)

### Issue: Research takes 30-60 seconds
**Status**: Expected
**Reason**: The research agent performs web scraping, GitHub API calls, and LLM processing
**Workaround**: Progress indicators are shown during analysis

### Issue: Empty results for niche tech stacks
**Status**: Expected
**Reason**: Limited web resources or GitHub projects for very niche technologies
**Workaround**: Try a more popular tech stack or check API rate limits

### Issue: Firecrawl API errors
**Status**: Expected if API key is missing or rate limited
**Reason**: Firecrawl API is used for web scraping
**Workaround**: LLM fallback will generate synthetic resources

## Troubleshooting

### Problem: Still seeing same/old results
**Solution**:
1. Clear localStorage: `localStorage.clear()`
2. Clear browser cache (Ctrl+Shift+Delete)
3. Hard reload (Ctrl+Shift+R)
4. Check server logs for `forceRefresh: true`

### Problem: Empty state shown despite successful analysis
**Solution**:
1. Check console for `[LearningDisplay] Analysis status`
2. Verify `researchResults` and `githubExamples` counts
3. Check if `hasCompletedAnalysis` is true
4. Try clicking "Clear Cache" and re-running analysis

### Problem: API returns 500 error
**Solution**:
1. Check server logs for error details
2. Verify environment variables (OPENAI_API_KEY, FIRECRAWL_API_KEY)
3. Check database connection (Prisma)
4. Verify LangGraph installation

## Testing Different Tech Stacks

### Good Test Repositories
- **React/TypeScript**: `https://github.com/shadcn-ui/ui`
- **Python/Django**: `https://github.com/django/django`
- **Node/Express**: `https://github.com/expressjs/express`
- **Java/Spring**: `https://github.com/spring-projects/spring-boot`
- **Go**: `https://github.com/gin-gonic/gin`

### Expected Results by Tech Stack
| Tech Stack | Expected Resources | Expected Examples |
|-----------|-------------------|-------------------|
| React/TS | 8-15 | 5-10 |
| Python/Django | 8-12 | 5-8 |
| Node/Express | 10-15 | 6-10 |
| Java/Spring | 6-10 | 4-7 |
| Go | 5-8 | 3-6 |

## Success Criteria

The fixes are considered successful if:

1. ✅ Running analysis on different repos produces different, relevant results
2. ✅ No duplicate or stale results from previous analyses
3. ✅ Empty states are clear and actionable
4. ✅ Console debug output helps diagnose issues
5. ✅ Clear Cache functionality works
6. ✅ Results persist correctly across navigation
7. ✅ Server logs show `forceRefresh: true` for each analysis

## Related Documentation

- [LEARNING_RESOURCES_FIX.md](./LEARNING_RESOURCES_FIX.md) - Detailed technical explanation
- [CAPSTONE_PROGRESS_REPORT.md](./CAPSTONE_PROGRESS_REPORT.md) - Overall project status
- [LANGGRAPH_NODES_STATUS.md](./LANGGRAPH_NODES_STATUS.md) - Research agent implementation

## Support

If you encounter issues not covered by this guide:
1. Check browser console for errors
2. Check server logs (terminal running `npm run dev`)
3. Review [LEARNING_RESOURCES_FIX.md](./LEARNING_RESOURCES_FIX.md) for technical details
4. Verify all environment variables are set correctly

