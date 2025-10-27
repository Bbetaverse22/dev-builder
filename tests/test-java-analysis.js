// Test script to verify our Java project analysis
const { GapAnalyzerAgent } = require('../lib/agents/gap-analyzer.ts');

async function testJavaAnalysis() {
  const gapAnalyzer = new GapAnalyzerAgent();
  
  try {
    console.log('Testing Java project analysis...');
    console.log('Repository: https://github.com/Bbetaverse22/ticketing-project-beta');
    
    // Test the GitHub analysis
    const githubAnalysis = await gapAnalyzer.analyzeGitHubRepository('https://github.com/Bbetaverse22/ticketing-project-beta');
    
    console.log('\n=== GitHub Analysis Results ===');
    console.log('Repository:', githubAnalysis.repository);
    console.log('Languages:', githubAnalysis.languages);
    console.log('Frameworks:', githubAnalysis.frameworks);
    console.log('Technologies:', githubAnalysis.technologies);
    console.log('Tools:', githubAnalysis.tools);
    console.log('Skill Level:', githubAnalysis.skillLevel);
    console.log('Recommendations:', githubAnalysis.recommendations);
    
    // Test the automatic skill assessment
    console.log('\n=== Automatic Skill Assessment ===');
    const skillAssessment = await gapAnalyzer.generateAutomaticSkillAssessment(githubAnalysis);
    
    console.log('Overall Score:', skillAssessment.overallScore + '%');
    console.log('Skill Gaps Count:', skillAssessment.skillGaps.length);
    console.log('\nTop Skill Gaps:');
    skillAssessment.skillGaps.slice(0, 5).forEach((gap, index) => {
      console.log(`${index + 1}. ${gap.skill.name}: ${gap.skill.currentLevel}/5 → ${gap.skill.targetLevel}/5 (Gap: ${gap.gap})`);
    });
    
    console.log('\nLearning Path:');
    skillAssessment.learningPath.slice(0, 3).forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
    
    console.log('\nRecommendations:');
    skillAssessment.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
  } catch (error) {
    console.error('Error during analysis:', error.message);
  }
}

testJavaAnalysis();
