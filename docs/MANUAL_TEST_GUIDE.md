# 🧪 Manual Testing Guide for Agentic Gap Analyzer

## ✅ Prerequisites

- [x] Dev server running: `pnpm dev`
- [x] Server at: http://localhost:3000
- [x] OPENAI_API_KEY in .env.local
- [x] GITHUB_TOKEN in .env.local (to avoid rate limits)

---

## 🌐 Test Using Browser/Postman/Insomnia

### Test 1: Fast Mode (No AI) ⚡

**Endpoint:** `POST http://localhost:3000/api/gap-analysis`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "action": "analyze-github-agentic",
  "repositoryUrl": "https://github.com/vercel/swr",
  "deepAnalysis": false
}
```

**Expected Response:**
```json
{
  "success": true,
  "analysisMode": "fast",
  "hasDeepAnalysis": false,
  "result": {
    "languages": ["TypeScript", "JavaScript"],
    "frameworks": ["Node.js", "TypeScript"],
    "skillLevel": "advanced",
    "recommendations": [...]
  }
}
```

**Expected Logs (in terminal running pnpm dev):**
```
[GapAnalyzer Agentic] Starting analysis for https://github.com/vercel/swr
[GapAnalyzer Agentic] ✅ Heuristic analysis complete
[GapAnalyzer Agentic] Fast mode - returning heuristic results
[API] ✅ Agentic analysis completed successfully (mode: fast)
```

---

### Test 2: Deep Mode (With AI) 🤖

**Endpoint:** `POST http://localhost:3000/api/gap-analysis`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "action": "analyze-github-agentic",
  "repositoryUrl": "https://github.com/vercel/swr",
  "deepAnalysis": true,
  "userContext": {
    "targetRole": "Senior Full-Stack Developer",
    "professionalGoals": "Improve code quality and architecture"
  }
}
```

**Expected Response (AI Success):**
```json
{
  "success": true,
  "analysisMode": "agentic",
  "usedFallback": false,
  "hasDeepAnalysis": true,
  "result": {
    "languages": ["TypeScript", "JavaScript"],
    "skillLevel": "advanced",
    "agenticAnalysis": {
      "overallQuality": 85,
      "confidence": 0.87,
      "skillLevel": "advanced",
      "architecturePatterns": ["Clean Architecture", "..."],
      "codeSmells": [...],
      "bestPractices": [...],
      "recommendations": [...]
    },
    "readmeAnalysis": {
      "qualityScore": 88,
      "clarity": 90,
      "completeness": 85,
      "strengths": [...],
      "weaknesses": [...],
      "suggestions": [...]
    }
  }
}
```

**Expected Response (Fallback):**
```json
{
  "success": true,
  "analysisMode": "fallback",
  "usedFallback": true,
  "fallbackReason": "OPENAI_API_KEY not configured",
  "message": "Analysis completed using fallback mode. OPENAI_API_KEY not configured",
  "hasDeepAnalysis": false,
  "result": {
    "languages": ["TypeScript"],
    "skillLevel": "intermediate",
    "recommendations": [...]
  }
}
```

**Expected Logs (AI Success):**
```
[GapAnalyzer Agentic] Starting analysis for https://github.com/vercel/swr
[GapAnalyzer Agentic] ✅ Heuristic analysis complete
[GapAnalyzer Agentic] Deep mode - attempting AI analysis...
[GapAnalyzer Agentic] Fetching README...
[GapAnalyzer Agentic] Analyzing README quality with AI...
[GapAnalyzer Agentic] ✅ README analysis: 88/100
[GapAnalyzer Agentic] Selecting code files...
[GapAnalyzer Agentic] Found file: src/index.ts
[GapAnalyzer Agentic] Selected 1 files
[GapAnalyzer Agentic] Running AI code analysis...
[GapAnalyzer Agentic] Analyzing code quality with AI...
[GapAnalyzer Agentic] ✅ Code quality: 85/100 (confidence: 0.87)
[GapAnalyzer Agentic] ✅ Full agentic analysis complete
[API] ✅ Agentic analysis completed successfully (mode: agentic)
```

**Expected Logs (Fallback):**
```
[GapAnalyzer Agentic] Starting analysis for https://github.com/vercel/swr
[GapAnalyzer Agentic] ✅ Heuristic analysis complete
[GapAnalyzer Agentic] Deep mode - attempting AI analysis...
[GapAnalyzer Agentic] ⚠️ README analysis failed: OPENAI_API_KEY not configured
[GapAnalyzer Agentic] ⚠️ AI code analysis failed: OPENAI_API_KEY not configured
[GapAnalyzer Agentic] ⚠️ Returning fallback results: No code files found
[API] ⚠️ Agentic analysis used fallback: No code files found
```

---

## 🔍 How to Know If AI SDK Is Working

### ✅ AI SDK is Working:
- **Confidence**: 0.7-0.95 (high)
- **Code Smells**: Actual issues detected
- **Architecture Patterns**: Specific patterns identified
- **README Quality**: Detailed feedback with specific suggestions
- **analysisMode**: `"agentic"`
- **usedFallback**: `false`

### ⚠️ Fallback Mode (AI Not Working):
- **Confidence**: 0.3 (low)
- **Code Smells**: Empty array
- **Architecture Patterns**: Empty array
- **README Quality**: Generic heuristic scores
- **analysisMode**: `"fallback"`
- **usedFallback**: `true`
- **fallbackReason**: Explains why

---

## 🧪 Test Using curl (Terminal)

### Fast Mode:
```bash
curl -X POST http://localhost:3000/api/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze-github-agentic",
    "repositoryUrl": "https://github.com/vercel/swr",
    "deepAnalysis": false
  }'
```

### Deep Mode:
```bash
curl -X POST http://localhost:3000/api/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze-github-agentic",
    "repositoryUrl": "https://github.com/vercel/swr",
    "deepAnalysis": true,
    "userContext": {
      "targetRole": "Senior Full-Stack Developer",
      "professionalGoals": "Improve architecture"
    }
  }'
```

---

## 🐛 Troubleshooting

### "GitHub API rate limit exceeded"
**Solution:** Make sure `GITHUB_TOKEN` is in `.env.local` and restart server with `pnpm dev`

### "OPENAI_API_KEY not configured"
**Solution:** Add your OpenAI API key to `.env.local` and restart server

### "Request timeout"
**Possible causes:**
- Network/firewall blocking api.openai.com
- VPN interference
- Slow internet
**Solution:** The fallback will work automatically

### No logs appearing
**Where to look:** Logs appear in the **terminal where you ran `pnpm dev`**, NOT where you run curl

### Low confidence (0.3) despite having API key
**Reason:** AI analysis failed and fallback was used
**Check:** Look for warning logs starting with `[GapAnalyzer Agentic] ⚠️`

---

## 📊 Comparing Endpoints

| Endpoint | Uses AI? | Speed | Cost |
|----------|---------|-------|------|
| `analyze-github` (old) | ❌ No | ~1s | $0 |
| `analyze-github-agentic` (fast mode) | ❌ No | ~1s | $0 |
| `analyze-github-agentic` (deep mode) | ✅ Yes | ~10-20s | ~$0.002 |

---

## ✅ Success Checklist

After running deep mode test, you should have:
- [ ] Response received (not 500 error)
- [ ] `analysisMode` is `"agentic"` or `"fallback"`
- [ ] If agentic: `confidence` > 0.7
- [ ] If agentic: `agenticAnalysis` object exists
- [ ] If agentic: `readmeAnalysis` object exists
- [ ] Logs visible in terminal running `pnpm dev`
- [ ] If fallback: `fallbackReason` explains why

---

## 🎯 Quick Test Commands

```bash
# Check if server is running
curl -s http://localhost:3000/api/gap-analysis \
  -X POST -H "Content-Type: application/json" \
  -d '{"action":"get-categories"}' | head -c 100

# Test fast mode (should work immediately)
curl -X POST http://localhost:3000/api/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{"action":"analyze-github-agentic","repositoryUrl":"https://github.com/vercel/swr","deepAnalysis":false}'

# Test deep mode (watch terminal for logs!)
curl -X POST http://localhost:3000/api/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{"action":"analyze-github-agentic","repositoryUrl":"https://github.com/vercel/swr","deepAnalysis":true}'
```

---

## 📝 Notes

- The **logs are the best indicator** of what's happening
- Look for emoji indicators: ✅ (success), ⚠️ (warning/fallback), ❌ (error)
- The system **always returns results** even if AI fails
- Fallback mode means the implementation is working correctly
- To see AI in action, you need both OPENAI_API_KEY and working network access to api.openai.com

---

**Ready to test? Run `pnpm dev` and start making requests!** 🚀

