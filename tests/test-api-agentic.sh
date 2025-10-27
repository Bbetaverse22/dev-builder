#!/bin/bash

# Test script for agentic gap analyzer API endpoint

echo "🧪 Testing Agentic Gap Analyzer API"
echo "=================================="
echo ""

# Test 1: Fast Mode (No AI)
echo "Test 1: Fast Mode (heuristic only)"
echo "-----------------------------------"
curl -X POST http://localhost:3000/api/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze-github-agentic",
    "repositoryUrl": "https://github.com/vercel/swr",
    "deepAnalysis": false
  }' | jq '.analysisMode, .hasDeepAnalysis, .result.languages[0:3]'

echo -e "\n\n"

# Test 2: Deep Mode (With AI)
echo "Test 2: Deep Mode (with AI analysis)"
echo "-------------------------------------"
echo "This will show real-time logs in the terminal running npm run dev"
echo ""

curl -X POST http://localhost:3000/api/gap-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze-github-agentic",
    "repositoryUrl": "https://github.com/vercel/swr",
    "deepAnalysis": true,
    "userContext": {
      "targetRole": "Senior Full-Stack Developer",
      "professionalGoals": "Improve code quality and architecture"
    }
  }' | jq '{
    analysisMode: .analysisMode,
    usedFallback: .usedFallback,
    hasDeepAnalysis: .hasDeepAnalysis,
    fallbackReason: .fallbackReason,
    codeQuality: .result.agenticAnalysis.overallQuality,
    confidence: .result.agenticAnalysis.confidence,
    readmeQuality: .result.readmeAnalysis.qualityScore
  }'

echo ""
echo "✅ Check the terminal running 'npm run dev' for detailed logs!"

