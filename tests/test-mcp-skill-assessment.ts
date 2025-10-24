import { GitHubMCPClient } from '../lib/mcp/github';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  const testRepo = process.argv[2] || 'vercel/next.js';
  const [owner, repo] = testRepo.split('/');

  if (!owner || !repo) {
    console.error('Usage: npx tsx scripts/test-mcp-skill-assessment.ts <owner>/<repo>');
    console.error('Example: npx tsx scripts/test-mcp-skill-assessment.ts vercel/next.js');
    process.exit(1);
  }

  console.log(`\n🧪 Testing MCP Skill Assessment for ${owner}/${repo}\n`);

  const client = new GitHubMCPClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to GitHub MCP server\n');

    console.log('📊 Building skill assessment...\n');
    const assessment = await client.getSkillAssessment(owner, repo);

    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 ASSESSMENT SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(assessment.summary);
    console.log('');

    if (assessment.recommendations && assessment.recommendations.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('💡 RECOMMENDATIONS');
      console.log('═══════════════════════════════════════════════════════');
      assessment.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
      console.log('');
    }

    if (assessment.skills && assessment.skills.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🎯 DETECTED SKILLS');
      console.log('═══════════════════════════════════════════════════════');
      assessment.skills.forEach((skill) => {
        console.log(`\n📌 ${skill.name}`);
        console.log(`   Category: ${skill.category}`);
        console.log(`   Level: ${skill.currentLevel || skill.current_level}/5 → ${skill.targetLevel || skill.target_level}/5`);
        console.log(`   Importance: ${skill.importance}/10`);
        console.log(`   Confidence: ${((skill.confidence || 0) * 100).toFixed(0)}%`);
        if (skill.description) {
          console.log(`   Description: ${skill.description}`);
        }
        if (skill.recommendations && skill.recommendations.length > 0) {
          console.log(`   Tips:`);
          skill.recommendations.forEach((rec) => {
            console.log(`      • ${rec}`);
          });
        }
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Test Complete!');
    console.log('═══════════════════════════════════════════════════════\n');

    await client.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();

