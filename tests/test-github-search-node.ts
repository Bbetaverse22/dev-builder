/**
 * Test GitHub Examples Search Node
 *
 * Tests the searchGitHubExamplesNode independently before integrating
 * into the full LangGraph workflow.
 *
 * Run with: pnpm tsx test-github-search-node.ts
 */

import { config } from 'dotenv';
import { searchGitHubExamplesNode } from '../lib/agents/langgraph/nodes/search-github-examples';
import type { ResearchState } from '../lib/agents/langgraph/research-agent';

// Load environment variables
config({ path: '.env.local' });

async function testGitHubSearchNode() {
  console.log('\n🧪 Testing GitHub Examples Search Node\n');
  console.log('='.repeat(60));

  // Test case 1: React authentication
  console.log('\n📋 Test 1: React Authentication\n');

  const state1: ResearchState = {
    skillGap: 'React authentication',
    detectedLanguage: 'TypeScript',
    userContext: 'Learning how to implement authentication in React apps',
    iterationCount: 0,
  };

  try {
    const result1 = await searchGitHubExamplesNode(state1);
    console.log('\n✅ Test 1 Results:');
    console.log(`   Found ${result1.examples?.length || 0} examples`);
    if (result1.examples && result1.examples.length > 0) {
      console.log('\n   Top 3:');
      result1.examples.slice(0, 3).forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.name} (⭐ ${ex.stars})`);
        console.log(`      ${ex.description.substring(0, 80)}...`);
        console.log(`      URL: ${ex.url}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test case 2: Python Flask API
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test 2: Python Flask REST API\n');

  const state2: ResearchState = {
    skillGap: 'Flask REST API',
    detectedLanguage: 'Python',
    userContext: 'Building RESTful APIs with Flask',
    iterationCount: 0,
  };

  try {
    const result2 = await searchGitHubExamplesNode(state2);
    console.log('\n✅ Test 2 Results:');
    console.log(`   Found ${result2.examples?.length || 0} examples`);
    if (result2.examples && result2.examples.length > 0) {
      console.log('\n   Top 3:');
      result2.examples.slice(0, 3).forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.name} (⭐ ${ex.stars})`);
        console.log(`      ${ex.description.substring(0, 80)}...`);
        console.log(`      URL: ${ex.url}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  // Test case 3: Edge case - no language
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test 3: Machine Learning (no specific language)\n');

  const state3: ResearchState = {
    skillGap: 'machine learning neural networks',
    detectedLanguage: 'unknown',
    userContext: 'Learning neural network basics',
    iterationCount: 0,
  };

  try {
    const result3 = await searchGitHubExamplesNode(state3);
    console.log('\n✅ Test 3 Results:');
    console.log(`   Found ${result3.examples?.length || 0} examples`);
    if (result3.examples && result3.examples.length > 0) {
      console.log('\n   Top 3:');
      result3.examples.slice(0, 3).forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.name} (⭐ ${ex.stars})`);
        console.log(`      ${ex.description.substring(0, 80)}...`);
        console.log(`      URL: ${ex.url}\n`);
      });
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('='.repeat(60));
  console.log('\n✅ All tests completed!\n');
}

// Run tests
console.log('\n' + '█'.repeat(60));
console.log('   GITHUB EXAMPLES SEARCH NODE - TEST SUITE');
console.log('█'.repeat(60));

testGitHubSearchNode().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
