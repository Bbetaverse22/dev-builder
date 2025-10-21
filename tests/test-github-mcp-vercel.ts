/**
 * GitHub MCP Integration Tests for Vercel Deployment
 * 
 * Tests the MCP server endpoint and client integration
 */

import { GitHubMCPClient } from '../lib/mcp/github';

// Test configuration
const TEST_CONFIG = {
  // Use a test repository for issue/PR creation
  testRepo: {
    owner: 'your-username', // Replace with your GitHub username
    repo: 'test-repo',      // Replace with a test repository you own
  },
  // MCP server URL (will be set from environment)
  serverUrl: process.env.GITHUB_MCP_SERVER_URL || 'http://localhost:3000/api/github-mcp',
};

async function testMCPIntegration() {
  console.log('🧪 Testing GitHub MCP Integration on Vercel...\n');
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Health check
    console.log('📡 Test 1: Health Check');
    const healthResponse = await fetch(TEST_CONFIG.serverUrl, { method: 'GET' });
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
    
    // Test 2: MCP Client Connection
    console.log('\n🔌 Test 2: MCP Client Connection');
    const client = new GitHubMCPClient({
      serverUrl: TEST_CONFIG.serverUrl,
    });
    
    await client.connect();
    console.log('✅ MCP client connected successfully');
    
    // Test 3: List Available Tools
    console.log('\n🛠️  Test 3: List Available Tools');
    const tools = await client.getTools();
    console.log('✅ Available tools:', Object.keys(tools));
    
    // Verify expected tools are available
    const expectedTools = ['create_issue', 'create_pull_request', 'update_issue', 'add_comment'];
    const availableToolNames = Object.keys(tools);
    
    for (const expectedTool of expectedTools) {
      if (!availableToolNames.includes(expectedTool)) {
        console.warn(`⚠️  Expected tool '${expectedTool}' not found in available tools`);
      } else {
        console.log(`✅ Tool '${expectedTool}' is available`);
      }
    }
    
    // Test 4: Create Test Issue (if test repo is configured)
    if (TEST_CONFIG.testRepo.owner !== 'your-username' && TEST_CONFIG.testRepo.repo !== 'test-repo') {
      console.log('\n📝 Test 4: Create Test Issue');
      
      const testIssueTitle = `Test Issue from MCP - ${new Date().toISOString()}`;
      const testIssueBody = `This is a test issue created via GitHub MCP integration.

**Test Details:**
- Created at: ${new Date().toISOString()}
- Server: ${TEST_CONFIG.serverUrl}
- Purpose: Validate MCP integration

This issue can be safely deleted after testing.`;

      try {
        const issue = await client.createIssue(
          TEST_CONFIG.testRepo.owner,
          TEST_CONFIG.testRepo.repo,
          testIssueTitle,
          testIssueBody,
          {
            labels: ['test', 'mcp-integration'],
          }
        );
        
        console.log('✅ Test issue created successfully:', issue.html_url);
        console.log(`   Issue #${issue.number}: ${issue.title}`);
        
        // Test 5: Add Comment to Issue
        console.log('\n💬 Test 5: Add Comment to Issue');
        
        const commentBody = `This is a test comment added via MCP integration.

**Comment Details:**
- Added at: ${new Date().toISOString()}
- Purpose: Validate MCP comment functionality

This comment can be safely deleted after testing.`;

        const comment = await client.addComment(
          TEST_CONFIG.testRepo.owner,
          TEST_CONFIG.testRepo.repo,
          issue.number,
          commentBody
        );
        
        console.log('✅ Test comment added successfully:', comment.html_url);
        
        // Test 6: Update Issue
        console.log('\n✏️  Test 6: Update Issue');
        
        const updatedTitle = `${testIssueTitle} (Updated)`;
        const updatedBody = `${testIssueBody}

**Update:**
- Updated at: ${new Date().toISOString()}
- Status: Testing MCP update functionality`;

        const updatedIssue = await client.updateIssue(
          TEST_CONFIG.testRepo.owner,
          TEST_CONFIG.testRepo.repo,
          issue.number,
          {
            title: updatedTitle,
            body: updatedBody,
            labels: ['test', 'mcp-integration', 'updated'],
          }
        );
        
        console.log('✅ Test issue updated successfully:', updatedIssue.html_url);
        console.log(`   Updated Issue #${updatedIssue.number}: ${updatedIssue.title}`);
        
      } catch (issueError) {
        console.error('❌ Issue creation/management failed:', issueError);
        allTestsPassed = false;
      }
    } else {
      console.log('\n⏭️  Test 4-6: Skipped (test repository not configured)');
      console.log('   To test issue/PR creation, update TEST_CONFIG.testRepo with your repository details');
    }
    
    // Test 7: Disconnect
    console.log('\n🔌 Test 7: Disconnect');
    await client.disconnect();
    console.log('✅ MCP client disconnected successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    allTestsPassed = false;
  }
  
  // Test Summary
  console.log('\n📊 Test Summary');
  if (allTestsPassed) {
    console.log('✅ All tests passed! GitHub MCP integration is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the errors above.');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Deploy to Vercel: git push origin main');
  console.log('2. Update GITHUB_MCP_SERVER_URL in Vercel environment variables');
  console.log('3. Run this test against the production URL');
  
  return allTestsPassed;
}

// Test MCP Server Response Format
async function testMCPServerResponse() {
  console.log('\n🔍 Testing MCP Server Response Format...');
  
  try {
    const response = await fetch(TEST_CONFIG.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'tools/list',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`MCP server response failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ MCP server response format:', JSON.stringify(data, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ MCP server response test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting GitHub MCP Integration Tests\n');
  console.log(`📍 Server URL: ${TEST_CONFIG.serverUrl}`);
  console.log(`📍 Test Repo: ${TEST_CONFIG.testRepo.owner}/${TEST_CONFIG.testRepo.repo}\n`);
  
  const serverTestPassed = await testMCPServerResponse();
  const integrationTestPassed = await testMCPIntegration();
  
  const allPassed = serverTestPassed && integrationTestPassed;
  
  console.log('\n🎯 Final Result:');
  if (allPassed) {
    console.log('✅ All tests passed! Ready for deployment.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please fix the issues before deploying.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { testMCPIntegration, testMCPServerResponse, runAllTests };
