import { NextRequest, NextResponse } from 'next/server';
import { getTemplateCreatorClient, closeTemplateCreatorClient } from '@/lib/mcp/template-creator';
import { Octokit } from '@octokit/rest';
import path from 'path';

export async function POST(request: NextRequest) {
  let templateClient = null;
  
  try {
    const body = await request.json();
    const exampleUrl = typeof body.exampleUrl === 'string' ? body.exampleUrl.trim() : '';

    if (!exampleUrl) {
      return NextResponse.json({ error: 'exampleUrl is required' }, { status: 400 });
    }

    console.log('[Template Generator API] Processing request for:', exampleUrl);

    // Get the template creator client
    templateClient = await getTemplateCreatorClient();

    // Determine file patterns based on skill or feature
    const filePatterns = getFilePatternsForSkill(body.skillName, body.featureName);

    // Extract template from the example repository
    const template = await templateClient.extractTemplate(
      exampleUrl,
      filePatterns,
      {
        preserveStructure: true,
        keepComments: true,
        includeTypes: true,
        removeBusinessLogic: true,
      }
    );

    // Generate a unique template ID
    const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate branch name for template - sanitize to remove URL components
    const rawFeatureName = body.featureName || body.skillName || 'example';
    const featureName = rawFeatureName.includes('github.com')
      ? rawFeatureName.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '-') || 'example'
      : rawFeatureName;
    const branchName = `template-${featureName.toLowerCase().replace(/\s+/g, '-').substring(0, 50)}-${Date.now()}`;
    const templateDirectory = `templates/${featureName.toLowerCase().replace(/\s+/g, '-')}`;
    
    const metadata = template.metadata;
    const metadataInsights: string[] = [];

    if (metadata) {
      if (metadata.modeUsed === 'skeleton') {
        metadataInsights.push('Skeleton mode removed business logic and inserted TODO markers.');
      } else {
        metadataInsights.push('Copier mode used; review files for proprietary logic before publishing.');
      }

      if (metadata.fallbackReason) {
        metadataInsights.push(`Fallback reason: ${metadata.fallbackReason}`);
      }

      if (metadata.droppedFiles.length > 0) {
        metadataInsights.push(`Omitted ${metadata.droppedFiles.length} file(s) flagged as business logic or oversized.`);
      }
    }

    const result: any = {
      success: true,
      templateId,
      sourceName: body.featureName || body.skillName || 'Template',
      sourceUrl: exampleUrl,
      templateDirectory,
      branchName,
      instructions: template.instructions || [
        'Replace placeholders with your specific values',
        'Update package.json with your project details',
        'Install dependencies: npm install',
        'Customize the code for your specific use case'
      ],
      analysisSummary: {
        framework: metadata?.modeUsed === 'skeleton' ? 'Skeleton Template' : 'Direct Copy',
        templateWorthiness: Math.max(
          15,
          Math.min(
            100,
            metadata
              ? Math.round(
                  ((metadata.totalFilesConsidered - metadata.droppedFiles.length) /
                    Math.max(metadata.totalFilesConsidered, 1)) *
                    100
                )
              : 85
          )
        ),
        insights:
          metadataInsights.length > 0
            ? metadataInsights
            : [
                'Template extracted from high-quality example',
                'Ready for customization and learning',
                'Includes best practices and patterns',
              ],
      },
      template: {
        ...template,
        sourceRepo: exampleUrl,
        skillName: body.skillName,
        featureName: body.featureName,
        extractedAt: new Date().toISOString(),
      },
      metadata,
      action: body.action || 'preview',
    };

    // If action is create-pr, create a pull request
    if (body.action === 'create-pr') {
      if (!body.repositoryUrl) {
        return NextResponse.json(
          { error: 'repositoryUrl is required for PR creation' },
          { status: 400 }
        );
      }

      try {
        const prResult = await createPullRequest(template, {
          repositoryUrl: body.repositoryUrl,
          pullRequestTitle: body.pullRequestTitle || `Add ${body.skillName || 'template'} example`,
          pullRequestBody: body.pullRequestBody || generatePRBody(template, body),
          skillName: body.skillName,
          featureName: body.featureName,
        });

        result.action = 'create-pr';
        result.pullRequest = prResult;
        result.branchName = prResult.branchName || branchName;
      } catch (error) {
        console.error('[Template Generator API] PR creation failed:', error);
        return NextResponse.json(
          {
            success: false,
            message: `Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[Template Generator API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate template example',
      },
      { status: 500 }
    );
  } finally {
    // Clean up the client connection
    if (templateClient) {
      try {
        await closeTemplateCreatorClient();
      } catch (error) {
        console.warn('[Template Generator API] Error closing client:', error);
      }
    }
  }
}

/**
 * Get file patterns based on skill name and feature
 */
function getFilePatternsForSkill(skillName?: string, featureName?: string): string[] {
  const patterns = new Set<string>();
  let hasSpecificPatterns = false;

  // Add common patterns
  patterns.add('package.json');
  patterns.add('README.md');
  patterns.add('*.md');

  if (skillName) {
    const skill = skillName.toLowerCase();
    
    if (skill.includes('testing') || skill.includes('test')) {
      patterns.add('**/*.test.*');
      patterns.add('**/*.spec.*');
      patterns.add('**/tests/**/*');
      patterns.add('**/test/**/*');
      patterns.add('jest.config.*');
      patterns.add('vitest.config.*');
      patterns.add('pytest.ini');
      patterns.add('**/examples/**/*');
      patterns.add('**/example/**/*');
      hasSpecificPatterns = true;
    }
    
    if (skill.includes('api') || skill.includes('backend')) {
      patterns.add('**/api/**/*');
      patterns.add('**/routes/**/*');
      patterns.add('**/controllers/**/*');
      patterns.add('**/middleware/**/*');
      patterns.add('**/server/**/*');
      patterns.add('**/src/**/*');
      hasSpecificPatterns = true;
    }
    
    if (skill.includes('frontend') || skill.includes('react') || skill.includes('ui')) {
      patterns.add('**/components/**/*');
      patterns.add('**/pages/**/*');
      patterns.add('**/app/**/*');
      patterns.add('**/src/**/*');
      patterns.add('**/*.tsx');
      patterns.add('**/*.jsx');
      hasSpecificPatterns = true;
    }
    
    if (skill.includes('database') || skill.includes('db')) {
      patterns.add('**/migrations/**/*');
      patterns.add('**/models/**/*');
      patterns.add('**/schema/**/*');
      patterns.add('**/*.sql');
      hasSpecificPatterns = true;
    }
    
    if (skill.includes('devops') || skill.includes('ci') || skill.includes('cd')) {
      patterns.add('.github/workflows/**/*');
      patterns.add('Dockerfile');
      patterns.add('docker-compose.yml');
      patterns.add('**/*.yml');
      patterns.add('**/*.yaml');
      hasSpecificPatterns = true;
    }
  }

  if (featureName) {
    const feature = featureName.toLowerCase();
    
    if (feature.includes('auth') || feature.includes('login')) {
      patterns.add('**/auth/**/*');
      patterns.add('**/login/**/*');
      patterns.add('**/user/**/*');
      patterns.add('**/authentication/**/*');
      hasSpecificPatterns = true;
    }
    
    if (feature.includes('api') || feature.includes('rest')) {
      patterns.add('**/api/**/*');
      patterns.add('**/routes/**/*');
      patterns.add('**/endpoints/**/*');
      hasSpecificPatterns = true;
    }
    
    if (feature.includes('test')) {
      patterns.add('**/*.test.*');
      patterns.add('**/*.spec.*');
      patterns.add('**/test/**/*');
      patterns.add('**/tests/**/*');
      hasSpecificPatterns = true;
    }
  }

  // Always add code file patterns to ensure we get actual code, not just docs
  patterns.add('**/*.ts');
  patterns.add('**/*.tsx');
  patterns.add('**/*.js');
  patterns.add('**/*.jsx');
  patterns.add('**/*.py');
  patterns.add('**/*.go');
  patterns.add('**/*.java');
  patterns.add('**/*.rs');
  patterns.add('**/src/**/*');
  patterns.add('**/lib/**/*');

  console.log('[Template API] Generated patterns:', Array.from(patterns));
  return Array.from(patterns);
}

/**
 * Create a pull request with template files
 */
async function createPullRequest(
  template: any,
  options: {
    repositoryUrl: string;
    pullRequestTitle: string;
    pullRequestBody: string;
    skillName?: string;
    featureName?: string;
  }
): Promise<{
  success: boolean;
  pullRequestUrl?: string;
  branchName?: string;
  number?: number;
  error?: string;
}> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN must be set to create pull requests');
  }

  const { owner, repo } = parseRepositoryUrl(options.repositoryUrl);

  // Create branch name - sanitize to remove URL components if present
  const rawFeatureName = options.featureName || options.skillName || 'example';
  // Extract repo name if it's a URL
  const featureName = rawFeatureName.includes('github.com')
    ? rawFeatureName.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '-') || 'example'
    : rawFeatureName;
  const branchName = `template-${featureName.toLowerCase().replace(/\s+/g, '-').substring(0, 50)}-${Date.now()}`;

  const octokit = new Octokit({ auth: token });

  // Get repository info
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const baseBranch = repoData.default_branch ?? 'main';

  // Get base branch SHA
  const { data: baseRef } = await octokit.git.getRef({ 
    owner, 
    repo, 
    ref: `heads/${baseBranch}` 
  });
  const baseSha = baseRef.object.sha;

  try {
    // Create new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Determine template directory
    const templateDir = `templates/${featureName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Create template files with proper structure
    const templateFiles = [
      // README.md with setup instructions
      {
        path: `${templateDir}/README.md`,
        content: `# ${options.featureName || options.skillName || 'Template'} Example

This template was extracted from: ${options.repositoryUrl}

## 🚀 Quick Start

1. **Copy the template files** to your project
2. **Replace placeholders** with your specific values:
   - \`{{PROJECT_NAME}}\` - Your project name
   - \`{{YOUR_NAME}}\` - Your name/company
   - \`{{YOUR_EMAIL}}\` - Your email
   - \`{{YOUR_DESCRIPTION}}\` - Project description

3. **Install dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

4. **Customize** the code for your specific use case

## 📁 Template Structure

${template.files.map((file: any) => `- \`${file.path}\` - ${file.description || 'Template file'}`).join('\n')}

## 🎯 Learning Goals

This template helps you learn:
- ${options.skillName || 'Best practices'}
- ${options.featureName || 'Implementation patterns'}
- Code organization and structure

## 📚 Next Steps

1. Study the template files
2. Implement your own version
3. Compare with the original: ${options.repositoryUrl}
4. Experiment with variations

---
*Generated by Dev-Builder AI Template Creator*
`,
      },
      // Template files with placeholders
      ...template.files.map((file: any) => ({
        path: `${templateDir}/${file.path}`,
        content: file.content,
      })),
      // Example usage file
      {
        path: `${templateDir}/example-usage.md`,
        content: `# Example Usage

## How to Use This Template

1. **Study the structure** - Look at how the files are organized
2. **Understand the patterns** - See how the code is structured
3. **Replace placeholders** - Update with your specific values
4. **Customize** - Modify to fit your needs

## Key Files to Focus On

${template.files.slice(0, 3).map((file: any) => `- **${file.path}** - ${file.description || 'Main implementation file'}`).join('\n')}

## Common Customizations

- Update package.json with your project details
- Replace API endpoints with your own
- Modify styling to match your brand
- Add your own business logic

---
*This template is for learning purposes. Always review and customize before using in production.*
`,
      },
    ];

    // Create blobs for each file
    const blobs = await Promise.all(
      templateFiles.map((file: any) =>
        octokit.git.createBlob({
          owner,
          repo,
          content: file.content,
          encoding: 'utf-8',
        })
      )
    );

    // Create tree with template files in the template directory
    const fileTree = templateFiles.map((file: any, index: number) => {
      console.log(`[Template PR] Adding file: ${file.path}`);
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobs[index].data.sha,
      };
    });

    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseSha,
      tree: fileTree,
    });

    // Create commit
    const commitMessage = `Add ${options.featureName || options.skillName || 'template'} learning template

📚 Template Structure:
- README.md with setup instructions
- Template files with placeholders ({{PROJECT_NAME}}, {{YOUR_NAME}}, etc.)
- Example usage guide
- Learning-focused documentation

🎯 Purpose: Learn ${options.skillName || 'best practices'} through hands-on template
📖 Source: Extracted from ${options.repositoryUrl}
🔧 Ready for: Customization and learning

${options.pullRequestBody}`;
    
    console.log(`[Template PR] Creating commit with ${templateFiles.length} template files`);
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.sha,
      parents: [baseSha],
    });

    // Update branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commit.sha,
    });

    // Create pull request
    const { data: pullRequest } = await octokit.pulls.create({
      owner,
      repo,
      title: options.pullRequestTitle,
      head: branchName,
      base: baseBranch,
      body: options.pullRequestBody,
    });

    return {
      success: true,
      pullRequestUrl: pullRequest.html_url,
      branchName,
      number: pullRequest.number,
    };

  } catch (error) {
    console.error('[Template Generator API] PR creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse repository URL to extract owner and repo
 */
function parseRepositoryUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Generate PR body with template information
 */
function generatePRBody(template: any, body: any): string {
  let prBody = `## 📋 Template Example Added\n\n`;
  
  if (body.skillName) {
    prBody += `**Skill**: ${body.skillName}\n`;
  }
  if (body.featureName) {
    prBody += `**Feature**: ${body.featureName}\n`;
  }
  
  prBody += `**Source Repository**: ${body.exampleUrl}\n\n`;
  
  prBody += `## 📁 Files Added\n\n`;
  prBody += `This PR adds ${template.files.length} template files:\n\n`;
  
  template.files.slice(0, 10).forEach((file: any) => {
    prBody += `- \`${file.path}\` - ${file.description}\n`;
  });
  
  if (template.files.length > 10) {
    prBody += `- ... and ${template.files.length - 10} more files\n`;
  }
  
  prBody += `\n## 🚀 Quick Start Guide\n\n`;
  prBody += `### Step 1: Review the Template\n`;
  prBody += `- Browse through the added files to understand the structure\n`;
  prBody += `- Check the \`README.md\` or documentation files for setup instructions\n\n`;
  
  prBody += `### Step 2: Customize for Your Project\n`;
  prBody += `- **Replace placeholders** with your specific values\n`;
  prBody += `- **Update package.json** with your project details (name, description, etc.)\n`;
  prBody += `- **Install dependencies**: \`npm install\` or \`yarn install\`\n`;
  prBody += `- **Customize the code** for your specific use case\n\n`;
  
  prBody += `### Step 3: Test and Learn\n`;
  prBody += `- Run the example: \`npm start\` or \`npm run dev\`\n`;
  prBody += `- Experiment with the code to understand how it works\n`;
  prBody += `- Modify and extend the functionality\n\n`;
  
  if (Object.keys(template.placeholders).length > 0) {
    prBody += `## 🔧 Placeholders to Replace\n\n`;
    Object.entries(template.placeholders).forEach(([key, description]) => {
      prBody += `- \`{{${key}}}\`: ${description}\n`;
    });
    prBody += `\n`;
  }
  
  prBody += `## 📚 Learning Path\n\n`;
  prBody += `This template is designed to help you learn **${body.skillName || 'new skills'}** through hands-on practice:\n\n`;
  prBody += `- **Understand** the code structure and patterns\n`;
  prBody += `- **Experiment** with different configurations\n`;
  prBody += `- **Build** upon the foundation with your own features\n`;
  prBody += `- **Apply** what you learn to other projects\n\n`;
  
  prBody += `---\n\n`;
  prBody += `🤖 Generated with [Dev-Builder AI](https://github.com/Bbetaverse22/dev-builder) - AI-Powered Developer Career Growth\n`;
  
  return prBody;
}
