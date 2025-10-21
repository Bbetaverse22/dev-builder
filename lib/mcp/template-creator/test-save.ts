#!/usr/bin/env tsx

/**
 * Test script that extracts template AND saves files to disk
 *
 * Usage:
 *   pnpm tsx lib/mcp/template-creator/test-save.ts <github-url> [feature-name]
 *
 * Example:
 *   pnpm tsx lib/mcp/template-creator/test-save.ts https://github.com/shadcn-ui/ui "shadcn-ui-components"
 */

import { TemplateExampleGenerator } from '@/lib/agents/template-example-generator';

async function main() {
  const repoUrl = process.argv[2];
  const featureName = process.argv[3];

  if (!repoUrl) {
    console.error('❌ Please provide a GitHub repository URL');
    console.log('Usage: pnpm tsx lib/mcp/template-creator/test-save.ts <github-url> [feature-name]');
    console.log('\nExample:');
    console.log('  pnpm tsx lib/mcp/template-creator/test-save.ts https://github.com/shadcn-ui/ui "shadcn-components"');
    process.exit(1);
  }

  console.log(`\n🔍 Extracting and saving template from: ${repoUrl}`);
  if (featureName) {
    console.log(`📦 Feature name: ${featureName}`);
  }
  console.log('');

  const generator = new TemplateExampleGenerator();

  try {
    const result = await generator.generate({
      exampleUrl: repoUrl,
      featureName: featureName,
      skillName: featureName,
    });

    if (!result.success) {
      console.error(`\n❌ Failed: ${result.reason}\n`);
      process.exit(1);
    }

    // Display results
    console.log('✅ Template created and saved!\n');

    console.log('📂 SAVED TO:');
    console.log(`   ${result.templateDirectory}\n`);

    console.log('📊 ANALYSIS:');
    console.log(`   Framework: ${result.analysisSummary.framework}`);
    console.log(`   Template Worthiness: ${(result.analysisSummary.templateWorthiness * 100).toFixed(0)}%`);
    console.log(`   Insights: ${result.analysisSummary.insights.slice(0, 3).join(', ')}\n`);

    console.log('📦 TEMPLATE:');
    console.log(`   Files saved: ${result.files.length}`);
    console.log(`   Branch name: ${result.branchName}\n`);

    console.log('📄 FILES (first 10):');
    result.files.slice(0, 10).forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path}`);
    });
    if (result.files.length > 10) {
      console.log(`   ... and ${result.files.length - 10} more files`);
    }

    console.log('\n📋 NEXT STEPS:');
    result.instructions.forEach((instruction, index) => {
      console.log(`   ${index + 1}. ${instruction}`);
    });

    console.log('\n✨ Template ready to use!\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
