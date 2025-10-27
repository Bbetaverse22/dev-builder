/**
 * Test script for Agentic Gap Analyzer
 * Tests the new AI-powered analysis features using AI SDK
 */

import { GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';

async function testAgenticAnalysis() {
  console.log('🤖 Testing Agentic Gap Analyzer with AI SDK\n');

  const analyzer = new GapAnalyzerAgent();
  
  // Test repository (use your own or a popular one)
  const testRepo = 'https://github.com/vercel/next.js';
  
  console.log(`📊 Analyzing repository: ${testRepo}\n`);

  try {
    // Test 1: Fast heuristic analysis (no AI)
    console.log('=== Test 1: Fast Heuristic Analysis (No AI) ===');
    const startFast = Date.now();
    const fastAnalysis = await analyzer.analyzeGitHubRepositoryAgentic(testRepo, {
      deepAnalysis: false
    });
    const fastTime = Date.now() - startFast;
    
    console.log(`✅ Fast analysis complete in ${fastTime}ms`);
    console.log(`   Languages: ${fastAnalysis.languages.join(', ')}`);
    console.log(`   Frameworks: ${fastAnalysis.frameworks.join(', ')}`);
    console.log(`   Skill Level: ${fastAnalysis.skillLevel}`);
    console.log(`   Has Agentic Analysis: ${!!fastAnalysis.agenticAnalysis}\n`);

    // Test 2: Deep agentic analysis (with AI)
    console.log('=== Test 2: Deep Agentic Analysis (With AI) ===');
    const startDeep = Date.now();
    const deepAnalysis = await analyzer.analyzeGitHubRepositoryAgentic(testRepo, {
      deepAnalysis: true
    });
    const deepTime = Date.now() - startDeep;
    
    console.log(`✅ Deep analysis complete in ${deepTime}ms`);
    console.log(`   Languages: ${deepAnalysis.languages.join(', ')}`);
    console.log(`   Skill Level: ${deepAnalysis.skillLevel}`);
    
    if (deepAnalysis.agenticAnalysis) {
      console.log('\n📊 AI Code Analysis:');
      console.log(`   Quality Score: ${deepAnalysis.agenticAnalysis.overallQuality}/100`);
      console.log(`   Confidence: ${(deepAnalysis.agenticAnalysis.confidence * 100).toFixed(0)}%`);
      console.log(`   Architecture Patterns: ${deepAnalysis.agenticAnalysis.architecturePatterns.join(', ')}`);
      console.log(`   Code Smells Found: ${deepAnalysis.agenticAnalysis.codeSmells.length}`);
      
      if (deepAnalysis.agenticAnalysis.codeSmells.length > 0) {
        console.log('\n   Top Code Issues:');
        deepAnalysis.agenticAnalysis.codeSmells.slice(0, 3).forEach((smell, i) => {
          console.log(`   ${i + 1}. [${smell.severity.toUpperCase()}] ${smell.type}`);
          console.log(`      ${smell.description}`);
          console.log(`      💡 ${smell.suggestion}`);
        });
      }
      
      console.log('\n   Best Practices:');
      deepAnalysis.agenticAnalysis.bestPractices.slice(0, 3).forEach(bp => {
        const status = bp.implemented ? '✅' : '❌';
        console.log(`   ${status} ${bp.name} (${bp.importance})`);
        if (!bp.implemented && bp.suggestion) {
          console.log(`      💡 ${bp.suggestion}`);
        }
      });
      
      console.log('\n   Top Recommendations:');
      deepAnalysis.agenticAnalysis.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    if (deepAnalysis.readmeAnalysis) {
      console.log('\n📝 README Analysis:');
      console.log(`   Quality Score: ${deepAnalysis.readmeAnalysis.qualityScore}/100`);
      console.log(`   Clarity: ${deepAnalysis.readmeAnalysis.clarity}/100`);
      console.log(`   Completeness: ${deepAnalysis.readmeAnalysis.completeness}/100`);
      console.log(`   Has Installation: ${deepAnalysis.readmeAnalysis.hasInstallation ? '✅' : '❌'}`);
      console.log(`   Has Examples: ${deepAnalysis.readmeAnalysis.hasUsageExamples ? '✅' : '❌'}`);
      
      console.log('\n   Strengths:');
      deepAnalysis.readmeAnalysis.strengths.forEach(s => console.log(`   ✅ ${s}`));
      
      console.log('\n   Weaknesses:');
      deepAnalysis.readmeAnalysis.weaknesses.forEach(w => console.log(`   ⚠️ ${w}`));
      
      console.log('\n   Suggestions:');
      deepAnalysis.readmeAnalysis.suggestions.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s}`);
      });
    }

    // Test 3: Generate AI recommendations
    if (deepAnalysis.agenticAnalysis) {
      console.log('\n=== Test 3: AI-Generated Recommendations ===');
      const recommendations = await analyzer.generateAgenticRecommendations(
        deepAnalysis,
        deepAnalysis.agenticAnalysis,
        deepAnalysis.readmeAnalysis,
        {
          targetRole: 'Senior Full-Stack Developer',
          professionalGoals: 'Improve code quality and architecture skills'
        }
      );
      
      console.log('🎯 Personalized Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log('\n✅ All tests complete!');
    console.log(`\n⏱️ Performance Comparison:`);
    console.log(`   Fast (no AI): ${fastTime}ms`);
    console.log(`   Deep (with AI): ${deepTime}ms`);
    console.log(`   Speed difference: ${((deepTime / fastTime) - 1) * 100}% slower (but much smarter!)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAgenticAnalysis()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testAgenticAnalysis };

