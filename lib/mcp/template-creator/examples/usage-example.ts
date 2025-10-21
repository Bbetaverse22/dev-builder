/**
 * Template Creator MCP - Usage Examples
 *
 * Demonstrates how to use the Template Creator MCP in your application
 */

import { getTemplateCreatorClient, closeTemplateCreatorClient } from '../client';

async function example1_ExtractTemplate() {
  console.log('\n📦 Example 1: Extract Template from Repository\n');

  const client = await getTemplateCreatorClient();

  // Extract template from a Next.js example repo
  const template = await client.extractTemplate(
    'https://github.com/vercel/next.js/tree/canary/examples/with-typescript',
    ['*.ts', '*.tsx', 'package.json', 'tsconfig.json'],
    {
      preserveStructure: true,
      keepComments: true,
      includeTypes: true,
      removeBusinessLogic: true,
    }
  );

  console.log('Template extracted successfully!');
  console.log(`Files: ${template.files.length}`);
  console.log(`Placeholders: ${Object.keys(template.placeholders).length}`);
  console.log('\nInstructions:');
  template.instructions.forEach((instruction, i) => {
    console.log(`  ${i + 1}. ${instruction}`);
  });
}

async function example2_AnalyzeStructure() {
  console.log('\n🔍 Example 2: Analyze Repository Structure\n');

  const client = await getTemplateCreatorClient();

  // Analyze a popular testing repo
  const analysis = await client.analyzeStructure(
    'https://github.com/facebook/jest',
    3
  );

  console.log(`Repository: ${analysis.repoUrl}`);
  console.log(`Main Language: ${analysis.mainLanguage}`);
  console.log(`Framework: ${analysis.framework}`);
  console.log(`Template Worthiness: ${(analysis.templateWorthiness * 100).toFixed(0)}%`);
  console.log('\nKey Files:');
  analysis.keyFiles.forEach((file) => console.log(`  - ${file}`));
  console.log('\nInsights:');
  analysis.insights.forEach((insight) => console.log(`  • ${insight}`));
}

async function example3_GenerateBoilerplate() {
  console.log('\n🎨 Example 3: Generate Boilerplate Code\n');

  const client = await getTemplateCreatorClient();

  // Generate Express.js boilerplate with authentication
  const boilerplate = await client.generateBoilerplate(
    'express',
    ['authentication', 'database', 'testing'],
    true // TypeScript
  );

  console.log(`Technology: ${boilerplate.technology}`);
  console.log(`Features: ${boilerplate.features.join(', ')}`);
  console.log(`\nGenerated Files (${boilerplate.files.length}):`);
  boilerplate.files.forEach((file) => {
    console.log(`  - ${file.path}: ${file.description}`);
  });
  console.log('\nSetup Instructions:');
  boilerplate.setupInstructions.forEach((instruction, i) => {
    console.log(`  ${i + 1}. ${instruction}`);
  });
}

async function example4_CompleteWorkflow() {
  console.log('\n🚀 Example 4: Complete Template Creation Workflow\n');

  const client = await getTemplateCreatorClient();

  // Complete workflow: analyze + extract
  const result = await client.createTemplateFromRepo(
    'https://github.com/shadcn-ui/ui',
    {
      preserveStructure: true,
      keepComments: true,
      includeTypes: true,
      removeBusinessLogic: true,
    }
  );

  console.log('Analysis:');
  console.log(`  Template Worthiness: ${(result.analysis.templateWorthiness * 100).toFixed(0)}%`);
  console.log(`  Main Language: ${result.analysis.mainLanguage}`);
  console.log(`  Framework: ${result.analysis.framework}`);

  console.log('\nTemplate:');
  console.log(`  Files: ${result.template.files.length}`);
  console.log(`  Placeholders: ${Object.keys(result.template.placeholders).length}`);

  console.log('\nStructure:');
  console.log(result.template.structure);
}

async function example5_LangGraphIntegration() {
  console.log('\n🤖 Example 5: Integration with LangGraph Agent\n');

  const client = await getTemplateCreatorClient();

  // Simulate LangGraph research agent finding example repos
  const exampleRepos = [
    {
      name: 'next-auth-example',
      url: 'https://github.com/nextauthjs/next-auth-example',
      stars: 1500,
      description: 'Example implementation of NextAuth.js',
      language: 'TypeScript',
    },
    {
      name: 'prisma-examples',
      url: 'https://github.com/prisma/prisma-examples',
      stars: 3200,
      description: 'Prisma example projects',
      language: 'TypeScript',
    },
  ];

  console.log('Found example repositories during research:');
  exampleRepos.forEach((repo, i) => {
    console.log(`  ${i + 1}. ${repo.name} (⭐ ${repo.stars})`);
  });

  console.log('\nExtracting templates...');

  const templates = [];
  for (const repo of exampleRepos.slice(0, 2)) {
    // Top 2 only
    console.log(`\n📦 Processing: ${repo.name}`);

    const analysis = await client.analyzeStructure(repo.url);

    if (analysis.templateWorthiness >= 0.7) {
      const { template } = await client.createTemplateFromRepo(repo.url);

      templates.push({
        source: repo.name,
        files: template.files.length,
        quality: analysis.templateWorthiness,
      });

      console.log(`  ✅ Template extracted (quality: ${(analysis.templateWorthiness * 100).toFixed(0)}%)`);
    } else {
      console.log(`  ⚠️  Skipped (quality too low: ${(analysis.templateWorthiness * 100).toFixed(0)}%)`);
    }
  }

  console.log('\n📊 Template Creation Summary:');
  console.log(`  Total templates created: ${templates.length}`);
  templates.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.source}: ${t.files} files (${(t.quality * 100).toFixed(0)}% quality)`);
  });
}

// Run all examples
async function runAllExamples() {
  try {
    await example1_ExtractTemplate();
    await example2_AnalyzeStructure();
    await example3_GenerateBoilerplate();
    await example4_CompleteWorkflow();
    await example5_LangGraphIntegration();
  } catch (error) {
    console.error('Error running examples:', error);
  } finally {
    await closeTemplateCreatorClient();
    console.log('\n✅ All examples completed!\n');
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
