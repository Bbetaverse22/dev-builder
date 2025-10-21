/**
 * Example: Conditional Template Creation Workflow
 *
 * This example demonstrates how to use the template creation nodes
 * with user approval and conditional execution.
 *
 * Workflow:
 * 1. User specifies if they want templates (templateCreationRequested)
 * 2. If yes, templates are created in-memory
 * 3. User previews templates
 * 4. User approves or rejects
 * 5. If approved, templates are saved to disk
 */

import {
  createTemplatesNode,
  previewTemplatesNode,
  saveTemplatesNode,
  approveTemplates,
  rejectTemplates,
  shouldCreateTemplates,
} from '../nodes/create-templates';

interface ResearchState {
  // Input
  skillGap: string;
  detectedLanguage: string;
  userContext: string;

  // Search phase
  searchQuery: string;
  searchResults: any[];

  // Evaluation phase
  evaluatedResults: any[];
  examples: Array<{
    name: string;
    url: string;
    stars: number;
    description: string;
    language: string;
  }>;

  // Template phase
  templates: any[];
  templateCreationRequested?: boolean;
  templateApproval?: 'pending' | 'approved' | 'rejected';
  templatesSaved?: boolean;

  // Decision phase
  confidence: number;
  iterationCount: number;

  // Output
  recommendations: any[];
}

/**
 * Example 1: Workflow WITH Template Creation
 */
async function exampleWithTemplates() {
  console.log('\n🎯 Example 1: User Wants Templates\n');
  console.log('='.repeat(60));

  // Initial state - user requests templates
  let state: ResearchState = {
    skillGap: 'Learn React authentication',
    detectedLanguage: 'typescript',
    userContext: 'Building a SaaS application',
    searchQuery: 'react authentication examples',
    searchResults: [],
    evaluatedResults: [],
    examples: [
      {
        name: 'next-auth',
        url: 'https://github.com/nextauthjs/next-auth',
        stars: 15000,
        description: 'Authentication for Next.js',
        language: 'TypeScript',
      },
      {
        name: 'clerk-nextjs',
        url: 'https://github.com/clerk/javascript',
        stars: 5000,
        description: 'User management for Next.js',
        language: 'TypeScript',
      },
    ],
    templates: [],
    templateCreationRequested: true, // ✅ User wants templates!
    confidence: 0,
    iterationCount: 0,
    recommendations: [],
  };

  console.log('✅ User requested template creation');
  console.log(`   Skill Gap: ${state.skillGap}`);
  console.log(`   Examples Found: ${state.examples.length}\n`);

  // Step 1: Create templates (in-memory only)
  console.log('📝 Step 1: Creating Templates\n');
  state = { ...state, ...(await createTemplatesNode(state)) };

  // Step 2: Preview templates
  console.log('\n📝 Step 2: Previewing Templates\n');
  await previewTemplatesNode(state);

  // Step 3: User decision (simulate user approval)
  console.log('📝 Step 3: User Decision\n');
  console.log('💭 User is reviewing templates...');
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate thinking

  const userApproves = true; // ✅ Simulate user approval

  if (userApproves) {
    console.log('✅ User approved templates!\n');
    state = { ...state, ...approveTemplates(state) };

    // Step 4: Save templates to disk
    console.log('📝 Step 4: Saving Templates\n');
    state = { ...state, ...(await saveTemplatesNode(state)) };

    console.log('🎉 Workflow Complete!');
    console.log(`   Templates Saved: ${state.templatesSaved}`);
    console.log(`   Location: ./generated-templates/\n`);
  } else {
    console.log('❌ User rejected templates\n');
    state = { ...state, ...rejectTemplates(state) };

    console.log('🔄 Workflow Complete (no templates saved)');
    console.log(`   Templates in memory: ${state.templates.length}\n`);
  }

  console.log('='.repeat(60));
}

/**
 * Example 2: Workflow WITHOUT Template Creation
 */
async function exampleWithoutTemplates() {
  console.log('\n🎯 Example 2: User Does NOT Want Templates\n');
  console.log('='.repeat(60));

  // Initial state - user does NOT request templates
  let state: ResearchState = {
    skillGap: 'Learn React authentication',
    detectedLanguage: 'typescript',
    userContext: 'Building a SaaS application',
    searchQuery: 'react authentication examples',
    searchResults: [],
    evaluatedResults: [],
    examples: [
      {
        name: 'next-auth',
        url: 'https://github.com/nextauthjs/next-auth',
        stars: 15000,
        description: 'Authentication for Next.js',
        language: 'TypeScript',
      },
    ],
    templates: [],
    templateCreationRequested: false, // ❌ User does NOT want templates
    confidence: 0,
    iterationCount: 0,
    recommendations: [],
  };

  console.log('❌ User did NOT request template creation');
  console.log(`   Skill Gap: ${state.skillGap}`);
  console.log(`   Examples Found: ${state.examples.length}\n`);

  // Step 1: Try to create templates (will be skipped)
  console.log('📝 Step 1: Checking if templates should be created\n');
  if (shouldCreateTemplates(state)) {
    state = { ...state, ...(await createTemplatesNode(state)) };
  } else {
    console.log('⏭️  Template creation skipped (not requested)\n');
  }

  console.log('🎉 Workflow Complete!');
  console.log(`   Templates Created: ${state.templates.length}`);
  console.log(`   User got recommendations without templates\n`);

  console.log('='.repeat(60));
}

/**
 * Example 3: User Rejects Templates After Preview
 */
async function exampleRejectAfterPreview() {
  console.log('\n🎯 Example 3: User Rejects After Preview\n');
  console.log('='.repeat(60));

  // Initial state - user requests templates
  let state: ResearchState = {
    skillGap: 'Learn React authentication',
    detectedLanguage: 'typescript',
    userContext: 'Building a SaaS application',
    searchQuery: 'react authentication examples',
    searchResults: [],
    evaluatedResults: [],
    examples: [
      {
        name: 'next-auth',
        url: 'https://github.com/nextauthjs/next-auth',
        stars: 15000,
        description: 'Authentication for Next.js',
        language: 'TypeScript',
      },
    ],
    templates: [],
    templateCreationRequested: true, // ✅ User wants to see templates
    confidence: 0,
    iterationCount: 0,
    recommendations: [],
  };

  console.log('✅ User requested template creation\n');

  // Step 1: Create templates
  console.log('📝 Step 1: Creating Templates\n');
  state = { ...state, ...(await createTemplatesNode(state)) };

  // Step 2: Preview templates
  console.log('📝 Step 2: Previewing Templates\n');
  await previewTemplatesNode(state);

  // Step 3: User rejects after preview
  console.log('📝 Step 3: User Decision\n');
  console.log('💭 User is reviewing templates...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('❌ User decided not to save templates\n');
  state = { ...state, ...rejectTemplates(state) };

  // Step 4: Try to save (will be skipped)
  console.log('📝 Step 4: Attempting to Save\n');
  state = { ...state, ...(await saveTemplatesNode(state)) };

  console.log('🎉 Workflow Complete!');
  console.log(`   Templates Saved: ${state.templatesSaved || false}`);
  console.log(`   Templates in Memory: ${state.templates.length}`);
  console.log(`   Templates cleared after rejection\n`);

  console.log('='.repeat(60));
}

/**
 * Main: Run all examples
 */
async function main() {
  console.log('\n' + '█'.repeat(60));
  console.log('   CONDITIONAL TEMPLATE CREATION - EXAMPLES');
  console.log('█'.repeat(60));

  try {
    // Example 1: User wants templates and approves
    await exampleWithTemplates();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Example 2: User doesn't want templates
    await exampleWithoutTemplates();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Example 3: User wants templates but rejects after preview
    await exampleRejectAfterPreview();

    console.log('\n' + '█'.repeat(60));
    console.log('   ALL EXAMPLES COMPLETE');
    console.log('█'.repeat(60) + '\n');

    console.log('📚 Key Takeaways:\n');
    console.log('1. Templates are only created if templateCreationRequested = true');
    console.log('2. Created templates stay in-memory until approved');
    console.log('3. Preview shows templates before saving');
    console.log('4. Save only happens if user approves');
    console.log('5. Templates are saved to ./generated-templates/\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples
main();
