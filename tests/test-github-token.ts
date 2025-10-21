/**
 * GitHub Token Verification Test
 *
 * Verifies that the GITHUB_TOKEN has the correct permissions
 * and can access the GitHub API.
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function testGitHubToken() {
  console.log('\n🔑 GitHub Token Verification\n');
  console.log('='.repeat(60));

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('❌ GITHUB_TOKEN not found in environment');
    process.exit(1);
  }

  console.log(`✅ Token found (length: ${token.length})`);
  console.log(`   First 20 chars: ${token.substring(0, 20)}...`);

  // Test 1: Get authenticated user
  console.log('\n📡 Test 1: Get authenticated user...');
  try {
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!userResponse.ok) {
      console.error(`❌ Failed: ${userResponse.status} ${userResponse.statusText}`);
      const error = await userResponse.text();
      console.error(`   Error: ${error}`);
      process.exit(1);
    }

    const user = await userResponse.json();
    console.log(`✅ Authenticated as: ${user.login}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Public repos: ${user.public_repos}`);
  } catch (error) {
    console.error('❌ Request failed:', error);
    process.exit(1);
  }

  // Test 2: Search repositories
  console.log('\n🔍 Test 2: Search repositories...');
  try {
    const searchResponse = await fetch(
      'https://api.github.com/search/repositories?q=react+stars:>1000&per_page=3',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!searchResponse.ok) {
      console.error(`❌ Failed: ${searchResponse.status} ${searchResponse.statusText}`);
      process.exit(1);
    }

    const searchResults = await searchResponse.json();
    console.log(`✅ Found ${searchResults.total_count} repositories`);
    console.log(`   Top 3:`);
    searchResults.items.slice(0, 3).forEach((repo: any, i: number) => {
      console.log(`   ${i + 1}. ${repo.full_name} (⭐ ${repo.stargazers_count})`);
    });
  } catch (error) {
    console.error('❌ Request failed:', error);
    process.exit(1);
  }

  // Test 3: Get file contents
  console.log('\n📄 Test 3: Get file contents...');
  try {
    const fileResponse = await fetch(
      'https://api.github.com/repos/facebook/react/contents/package.json',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!fileResponse.ok) {
      console.error(`❌ Failed: ${fileResponse.status} ${fileResponse.statusText}`);
      process.exit(1);
    }

    const fileData = await fileResponse.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const pkg = JSON.parse(content);

    console.log(`✅ File retrieved: ${fileData.name}`);
    console.log(`   Package: ${pkg.name}@${pkg.version}`);
    console.log(`   License: ${pkg.license}`);
  } catch (error) {
    console.error('❌ Request failed:', error);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All Tests Passed!');
  console.log('\nYour GitHub token has the necessary permissions for:');
  console.log('  ✅ User authentication');
  console.log('  ✅ Repository search');
  console.log('  ✅ File content retrieval');
  console.log('\n' + '='.repeat(60) + '\n');
}

testGitHubToken();
