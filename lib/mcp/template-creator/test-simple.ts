#!/usr/bin/env tsx

/**
 * Simple test: Provide a GitHub repo, get a template back
 *
 * Usage:
 *   pnpm tsx lib/mcp/template-creator/test-simple.ts <github-url>
 *
 * Example:
 *   pnpm tsx lib/mcp/template-creator/test-simple.ts https://github.com/vercel/next.js
 */

import { TemplateCreatorClient } from './client';

async function main() {
  const repoUrl = process.argv[2];

  if (!repoUrl) {
    console.error('❌ Please provide a GitHub repository URL');
    console.log('Usage: pnpm tsx lib/mcp/template-creator/test-simple.ts <github-url>');
    process.exit(1);
  }

  console.log(`\n🔍 Extracting template from: ${repoUrl}\n`);

  const client = new TemplateCreatorClient();

  try {
    // Connect and create template
    await client.connect();
    const result = await client.createTemplateFromRepo(repoUrl, {
      preserveStructure: true,
      keepComments: true,
      includeTypes: true,
      removeBusinessLogic: false,
    });

    // Display results
    console.log('✅ Template created successfully!\n');
    console.log('📊 ANALYSIS:');
    console.log(`   Framework: ${result.analysis.framework}`);
    console.log(`   Language: ${result.analysis.mainLanguage}`);
    console.log(`   Template Worthiness: ${(result.analysis.templateWorthiness * 100).toFixed(0)}%`);
    console.log(`   Insights: ${result.analysis.insights.join(', ')}\n`);

    console.log('📦 TEMPLATE:');
    console.log(`   Files extracted: ${result.template.files.length}`);
    console.log(`   Placeholders: ${Object.keys(result.template.placeholders).join(', ')}\n`);

    console.log('📄 FILES:');
    result.template.files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path} (${file.content.length} chars)`);
    });

    console.log('\n📋 INSTRUCTIONS:');
    result.template.instructions.forEach((instruction, index) => {
      console.log(`   ${index + 1}. ${instruction}`);
    });

    console.log('\n🎯 PLACEHOLDERS:');
    Object.entries(result.template.placeholders).forEach(([key, desc]) => {
      console.log(`   {{${key}}}: ${desc}`);
    });

    console.log('\n✨ Template ready to use!\n');

    await client.disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    await client.disconnect();
    process.exit(1);
  }
}

main();
