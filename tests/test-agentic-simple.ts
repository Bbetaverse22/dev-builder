/**
 * Simple test to verify AI SDK is working in the new agentic gap analyzer
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

import { GapAnalyzerAgent } from '@/lib/agents/gap-analyzer';

async function testAgenticSimple() {
  console.log('🧪 Testing NEW Agentic Gap Analyzer\n');

  const analyzer = new GapAnalyzerAgent();
  const testRepo = 'https://github.com/vercel/next.js';

  try {
    console.log('Test 1: Fast Mode (No AI) ⚡');
    console.log('─'.repeat(50));
    const fastStart = Date.now();
    const fast = await analyzer.analyzeGitHubRepositoryAgentic(testRepo, {
      deepAnalysis: false
    });
    console.log(`✅ Completed in ${Date.now() - fastStart}ms`);
    console.log(`   Mode: ${fast.analysisMode}`);
    console.log(`   Has AI Analysis: ${!!fast.agenticAnalysis}`);
    console.log(`   Languages: ${fast.languages.join(', ')}\n`);

    console.log('Test 2: Deep Mode (With AI) 🤖');
    console.log('─'.repeat(50));
    
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not set - will use fallback\n');
    } else {
      console.log('✅ OPENAI_API_KEY found\n');
    }

    const deepStart = Date.now();
    const deep = await analyzer.analyzeGitHubRepositoryAgentic(testRepo, {
      deepAnalysis: true
    });
    console.log(`✅ Completed in ${Date.now() - deepStart}ms`);
    console.log(`   Mode: ${deep.analysisMode}`);
    console.log(`   Used Fallback: ${deep.analysisMode === 'fallback' ? 'YES ⚠️' : 'NO ✅'}`);
    
    if (deep.fallbackReason) {
      console.log(`   Fallback Reason: ${deep.fallbackReason}`);
    }
    
    console.log(`   Has AI Code Analysis: ${!!deep.agenticAnalysis}`);
    console.log(`   Has AI README Analysis: ${!!deep.readmeAnalysis}`);
    
    if (deep.agenticAnalysis) {
      console.log('\n📊 AI Code Analysis Results:');
      console.log(`   Quality Score: ${deep.agenticAnalysis.overallQuality}/100`);
      console.log(`   Confidence: ${(deep.agenticAnalysis.confidence * 100).toFixed(0)}%`);
      console.log(`   Skill Level: ${deep.agenticAnalysis.skillLevel}`);
      console.log(`   Code Smells: ${deep.agenticAnalysis.codeSmells.length}`);
      console.log(`   Architecture: ${deep.agenticAnalysis.architecturePatterns.join(', ') || 'None detected'}`);
      console.log('\n✅ AI SDK IS WORKING! 🎉');
    } else {
      console.log('\n⚠️  AI analysis not available (using fallback)');
      console.log('   This is expected if OPENAI_API_KEY is not set');
    }

    if (deep.readmeAnalysis) {
      console.log('\n📝 README Analysis:');
      console.log(`   Quality: ${deep.readmeAnalysis.qualityScore}/100`);
      console.log(`   Clarity: ${deep.readmeAnalysis.clarity}/100`);
      console.log(`   Completeness: ${deep.readmeAnalysis.completeness}/100`);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('Summary:');
    console.log('─'.repeat(50));
    
    if (deep.analysisMode === 'agentic') {
      console.log('✅ AI SDK is being used successfully!');
      console.log('✅ New agentic gap analyzer is working!');
    } else if (deep.analysisMode === 'fallback') {
      console.log('⚠️  AI SDK fallback was triggered');
      console.log('   Reason:', deep.fallbackReason);
      console.log('   But heuristic analysis still works! ✅');
    } else {
      console.log('⚡ Fast mode - AI not attempted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run
testAgenticSimple()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

