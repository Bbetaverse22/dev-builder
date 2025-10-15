/**
 * Create Templates Node for LangGraph Research Agent
 *
 * This node uses the custom Template Creator MCP to extract clean,
 * reusable templates from example GitHub repositories found during research.
 */

import { getTemplateCreatorClient } from '@/lib/mcp/template-creator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Research State Interface
 * (This should match your actual ResearchState from types.ts)
 */
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
  examples: GitHubExample[];

  // Template phase (NEW)
  templates: ExtractedTemplate[];
  templateCreationRequested?: boolean; // User wants templates?
  templateApproval?: 'pending' | 'approved' | 'rejected'; // Approval status
  templatesSaved?: boolean; // Were templates saved to disk?

  // Decision phase
  confidence: number;
  iterationCount: number;

  // Output
  recommendations: any[];
}

interface GitHubExample {
  name: string;
  url: string;
  stars: number;
  description: string;
  language: string;
  topics?: string[];
}

interface ExtractedTemplate {
  sourceRepo: string;
  files: TemplateFile[];
  structure: string;
  instructions: string[];
  placeholders: Record<string, string>;
  templateWorthiness: number;
}

interface TemplateFile {
  path: string;
  content: string;
  description: string;
  placeholders: string[];
}

/**
 * Conditional Router: Should we create templates?
 *
 * This function determines if template creation should be executed based on user preference.
 */
export function shouldCreateTemplates(state: ResearchState): boolean {
  // Only create templates if explicitly requested by user
  return state.templateCreationRequested === true;
}

/**
 * Create Templates Node (with conditional execution)
 *
 * Takes the top GitHub examples and extracts clean templates from them.
 * This gives users ready-to-use starter code without business logic.
 *
 * IMPORTANT: Templates are created in-memory only. They will NOT be saved
 * to disk unless user approves via saveTemplatesNode().
 */
export async function createTemplatesNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  // Check if template creation was requested
  if (!state.templateCreationRequested) {
    console.log('⏭️  Skipping template creation (not requested by user)');
    return {
      ...state,
      templates: [],
    };
  }

  console.log('🎨 Creating templates from example repositories...');
  console.log('⚠️  Templates will be kept in memory until approved for saving');

  const templates: ExtractedTemplate[] = [];
  const topExamples = state.examples.slice(0, 3); // Only top 3 examples

  try {
    const templateClient = await getTemplateCreatorClient();

    for (const example of topExamples) {
      console.log(`📦 Extracting template from: ${example.name}`);

      try {
        // Analyze repository structure first
        const analysis = await templateClient.analyzeStructure(example.url);

        // Only extract if template-worthy (>= 70% score)
        if (analysis.templateWorthiness >= 0.7) {
          const { template } = await templateClient.createTemplateFromRepo(
            example.url,
            {
              preserveStructure: true,
              keepComments: true,
              includeTypes: true,
              removeBusinessLogic: true,
            }
          );

          templates.push({
            sourceRepo: example.url,
            files: template.files,
            structure: template.structure,
            instructions: template.instructions,
            placeholders: template.placeholders,
            templateWorthiness: analysis.templateWorthiness,
          });

          console.log(
            `✅ Template extracted from ${example.name} (score: ${analysis.templateWorthiness})`
          );
        } else {
          console.log(
            `⚠️  Skipping ${example.name} - low template worthiness (${analysis.templateWorthiness})`
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to extract template from ${example.name}:`,
          error
        );
        // Continue with next example
      }
    }

    console.log(`✅ Created ${templates.length} templates (in-memory)`);
    console.log(`💡 Templates ready for preview. Awaiting user approval to save.`);

    return {
      ...state,
      templates,
      templateApproval: 'pending', // Mark as pending approval
      templatesSaved: false,
    };
  } catch (error) {
    console.error('❌ Template creation failed:', error);

    // Return state with empty templates on error
    return {
      ...state,
      templates: [],
      templateApproval: 'rejected',
      templatesSaved: false,
    };
  }
}

/**
 * Helper: Generate README for template usage
 */
export function generateTemplateReadme(template: ExtractedTemplate): string {
  return `# Template from ${template.sourceRepo}

## Overview

This is a clean template extracted from a high-quality example project.
All custom business logic has been removed and replaced with placeholders.

**Template Quality Score:** ${(template.templateWorthiness * 100).toFixed(0)}%

## Structure

\`\`\`
${template.structure}
\`\`\`

## Setup Instructions

${template.instructions.map((instruction, i) => `${i + 1}. ${instruction}`).join('\n')}

## Placeholders

The following placeholders need to be replaced with your values:

${Object.entries(template.placeholders)
  .map(([key, description]) => `- **{{${key}}}**: ${description}`)
  .join('\n')}

## Files Included

${template.files.map((file) => `- \`${file.path}\` - ${file.description}`).join('\n')}

## Usage

1. Copy the template files to your project
2. Replace all \`{{PLACEHOLDER}}\` values
3. Install dependencies: \`npm install\`
4. Start development: \`npm run dev\`

---

Generated by SkillBridge.ai Template Creator MCP
`;
}

/**
 * Helper: Format template for GitHub issue inclusion
 */
export function formatTemplateForIssue(template: ExtractedTemplate): string {
  return `
## 📦 Ready-to-Use Template

I've extracted a clean template from [this example project](${template.sourceRepo}).

**Template Quality:** ${(template.templateWorthiness * 100).toFixed(0)}%

### Quick Start

\`\`\`bash
# 1. Copy template files to your project
# 2. Replace placeholders (see below)
# 3. Install dependencies
npm install
\`\`\`

### Placeholders to Replace

${Object.entries(template.placeholders)
  .map(([key, desc]) => `- \`{{${key}}}\`: ${desc}`)
  .join('\n')}

### Files Included

${template.files.slice(0, 5).map((f) => `- \`${f.path}\``).join('\n')}
${template.files.length > 5 ? `- ... and ${template.files.length - 5} more files` : ''}

<details>
<summary>View Template Structure</summary>

\`\`\`
${template.structure}
\`\`\`

</details>
`;
}

/**
 * Preview Templates Node
 *
 * Shows user a preview of templates before saving to disk.
 * Returns formatted preview for user to review.
 */
export async function previewTemplatesNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  if (!state.templates || state.templates.length === 0) {
    console.log('⚠️  No templates to preview');
    return state;
  }

  console.log('\n📋 Template Preview\n');
  console.log('='.repeat(60));

  state.templates.forEach((template, i) => {
    console.log(`\n📦 Template ${i + 1}/${state.templates.length}`);
    console.log(`Source: ${template.sourceRepo}`);
    console.log(`Quality: ${(template.templateWorthiness * 100).toFixed(0)}%`);
    console.log(`Files: ${template.files.length}`);
    console.log(`Placeholders: ${Object.keys(template.placeholders).length}`);
    console.log('\nFiles included:');
    template.files.slice(0, 5).forEach((file) => {
      console.log(`  • ${file.path}`);
    });
    if (template.files.length > 5) {
      console.log(`  ... and ${template.files.length - 5} more files`);
    }
    console.log('');
  });

  console.log('='.repeat(60));
  console.log('💡 Templates are ready in memory.');
  console.log('⏸️  Waiting for user approval to save to disk.\n');

  return state;
}

/**
 * Save Templates Node
 *
 * Only executes if user has approved template saving.
 * Saves templates to disk in ./generated-templates/ directory.
 */
export async function saveTemplatesNode(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  // Check approval status
  if (state.templateApproval !== 'approved') {
    console.log('⏭️  Skipping template save (not approved by user)');
    return state;
  }

  if (!state.templates || state.templates.length === 0) {
    console.log('⚠️  No templates to save');
    return state;
  }

  console.log('\n💾 Saving templates to disk...\n');

  const OUTPUT_DIR = './generated-templates';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

  try {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const savedPaths: string[] = [];

    for (let i = 0; i < state.templates.length; i++) {
      const template = state.templates[i];
      const repoName = template.sourceRepo.split('/').pop() || `template-${i + 1}`;
      const templateDir = path.join(OUTPUT_DIR, `${timestamp}-${repoName}`);

      // Create template directory
      fs.mkdirSync(templateDir, { recursive: true });

      // Save each file
      for (const file of template.files) {
        const filePath = path.join(templateDir, file.path);
        const fileDir = path.dirname(filePath);

        // Create subdirectories if needed
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, file.content, 'utf-8');
      }

      // Save README
      const readme = generateTemplateReadme(template);
      fs.writeFileSync(path.join(templateDir, 'README.md'), readme, 'utf-8');

      // Save structure
      fs.writeFileSync(
        path.join(templateDir, 'STRUCTURE.txt'),
        template.structure,
        'utf-8'
      );

      savedPaths.push(templateDir);
      console.log(`✅ Saved: ${templateDir}`);
    }

    console.log(`\n🎉 All ${state.templates.length} templates saved!`);
    console.log(`📂 Location: ${OUTPUT_DIR}/\n`);

    return {
      ...state,
      templatesSaved: true,
      templateApproval: 'approved',
    };
  } catch (error) {
    console.error('❌ Failed to save templates:', error);
    return {
      ...state,
      templatesSaved: false,
    };
  }
}

/**
 * Approve Templates (User Action)
 *
 * Call this function when user approves template saving.
 */
export function approveTemplates(state: ResearchState): Partial<ResearchState> {
  console.log('✅ User approved template saving');
  return {
    ...state,
    templateApproval: 'approved',
  };
}

/**
 * Reject Templates (User Action)
 *
 * Call this function when user rejects template saving.
 */
export function rejectTemplates(state: ResearchState): Partial<ResearchState> {
  console.log('❌ User rejected template saving');
  return {
    ...state,
    templateApproval: 'rejected',
    templates: [], // Clear templates from memory
  };
}
