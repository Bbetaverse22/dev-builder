# Template Creator MCP

A custom Model Context Protocol (MCP) server that extracts clean, reusable templates from GitHub repositories by intelligently removing custom business logic and replacing it with placeholders.

## 🎯 Purpose

When SkillBridge.ai's research agent finds high-quality example repositories, this MCP server:
1. **Analyzes** the repository structure
2. **Extracts** clean template code
3. **Removes** custom business logic
4. **Replaces** specific values with placeholders (e.g., `{{PROJECT_NAME}}`)
5. **Generates** usage instructions

Users get ready-to-use starter code instead of having to manually extract patterns from examples.

## 🚀 Features

### 1. **extract_template**
Extract clean templates from repositories with placeholder replacement.

```typescript
const template = await client.extractTemplate(
  'https://github.com/vercel/next.js/examples/with-typescript',
  ['*.ts', '*.tsx', 'package.json'],
  {
    preserveStructure: true,
    keepComments: true,
    includeTypes: true,
    removeBusinessLogic: true
  }
);
```

**Output:**
- Template files with placeholders
- Directory structure
- Setup instructions
- Placeholder descriptions

### 2. **analyze_structure**
Analyze repository to identify template-worthy files.

```typescript
const analysis = await client.analyzeStructure(
  'https://github.com/facebook/jest'
);
```

**Output:**
- Main language and framework
- Key files and directories
- Template worthiness score (0-1)
- Recommended file patterns
- Insights and recommendations

### 3. **generate_boilerplate**
Generate boilerplate code based on technology and features.

```typescript
const boilerplate = await client.generateBoilerplate(
  'express',
  ['authentication', 'database', 'testing'],
  true // TypeScript
);
```

**Output:**
- Generated file structure
- Boilerplate code files
- Setup instructions
- Configuration templates

## 📦 Installation

```bash
# Install dependencies
cd lib/mcp/template-creator
pnpm install

# Build the server
pnpm build

# Run in development mode
pnpm dev
```

## 🔧 Usage

### Standalone Usage

```typescript
import { getTemplateCreatorClient } from '@/lib/mcp/template-creator/client';

// Connect to MCP server
const client = await getTemplateCreatorClient();

// Complete workflow: analyze + extract
const result = await client.createTemplateFromRepo(
  'https://github.com/shadcn-ui/ui',
  {
    preserveStructure: true,
    keepComments: true,
    includeTypes: true,
    removeBusinessLogic: true
  }
);

console.log(`Template Quality: ${result.analysis.templateWorthiness}`);
console.log(`Files: ${result.template.files.length}`);
```

### Integration with LangGraph

```typescript
import { createTemplatesNode } from '@/lib/agents/langgraph/nodes/create-templates';

// In your LangGraph workflow
const updatedState = await createTemplatesNode(state);

// Access extracted templates
console.log(`Created ${updatedState.templates.length} templates`);
```

## 🎨 Example Output

### Extracted Template

```json
{
  "sourceRepo": "https://github.com/vercel/next.js/examples/with-typescript",
  "files": [
    {
      "path": "package.json",
      "content": "{\n  \"name\": \"{{PROJECT_NAME}}\",\n  \"version\": \"1.0.0\"\n}",
      "description": "Package configuration with placeholders",
      "placeholders": ["PROJECT_NAME"]
    }
  ],
  "structure": "└── {{PROJECT_NAME}}/\n    ├── src/\n    └── package.json",
  "instructions": [
    "Replace all {{PLACEHOLDER}} values with your specific values",
    "Update dependencies to match your project requirements"
  ],
  "placeholders": {
    "PROJECT_NAME": "Your project name",
    "PROJECT_DESCRIPTION": "Brief description of your project"
  },
  "templateWorthiness": 0.85
}
```

## 🔗 Integration with SkillBridge.ai Workflow

```
┌─────────────────────────────────────────────────────┐
│  LangGraph Research Agent                           │
│  (Issue #1-10 in V1_DEVELOPMENT_PLAN.md)           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│  GitHub MCP (Official)                              │
│  Finds example repositories                         │
│  Returns: Top 10 high-quality examples             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│  Template Creator MCP (Custom) ← YOU ARE HERE       │
│  Extracts clean templates from examples             │
│  Returns: Ready-to-use starter code                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│  Portfolio Builder Agent                            │
│  Creates GitHub issues with templates               │
│  Users get code + instructions                      │
└─────────────────────────────────────────────────────┘
```

## 🧪 Testing

```bash
# Run example usage
pnpm tsx examples/usage-example.ts

# Run tests (when implemented)
pnpm test
```

## 📝 Configuration

The MCP server uses these environment variables:

```bash
# Optional: GitHub token for higher API rate limits
GITHUB_TOKEN=your_github_token_here
```

## 🎯 Benefits

### For Users
- ✅ Get clean, ready-to-use starter code
- ✅ No need to manually extract patterns
- ✅ Clear placeholders for customization
- ✅ Quality-scored templates
- ✅ Instant setup instructions

### For SkillBridge.ai
- ✅ Truly "MCP-native" architecture
- ✅ Custom MCP demonstrates technical depth
- ✅ Differentiates from competitors
- ✅ Shows innovation beyond basic tool usage
- ✅ Perfect for capstone demonstration

## 🏗️ Architecture Decisions

### Why Custom MCP?

**Option 1: Use existing tools** (e.g., GitHub API directly)
- ❌ Not MCP-native
- ❌ Tight coupling
- ❌ Hard to extend

**Option 2: Custom MCP Server** ✅ (Chosen)
- ✅ True MCP-native architecture
- ✅ Standardized interface
- ✅ Reusable across projects
- ✅ Can be published as standalone package
- ✅ Shows technical sophistication

### Why Template Extraction?

Example repositories are great for learning, but they have a problem:
- ❌ Full of custom business logic
- ❌ Specific to their use case
- ❌ Hard to adapt to your needs

**Template Creator solves this:**
- ✅ Removes business logic
- ✅ Preserves structure and patterns
- ✅ Adds clear placeholders
- ✅ Includes usage instructions

## 📚 API Reference

### TemplateCreatorClient

#### `connect(): Promise<void>`
Connect to the MCP server.

#### `disconnect(): Promise<void>`
Disconnect from the MCP server.

#### `extractTemplate(repoUrl, filePatterns, options): Promise<ExtractedTemplate>`
Extract template from repository.

**Parameters:**
- `repoUrl` (string): GitHub repository URL
- `filePatterns` (string[]): File patterns to include
- `options` (object): Extraction options

**Returns:** `ExtractedTemplate` object

#### `analyzeStructure(repoUrl, depth): Promise<StructureAnalysis>`
Analyze repository structure.

**Parameters:**
- `repoUrl` (string): GitHub repository URL
- `depth` (number): Directory depth to analyze

**Returns:** `StructureAnalysis` object

#### `generateBoilerplate(technology, features, typescript): Promise<Boilerplate>`
Generate boilerplate code.

**Parameters:**
- `technology` (string): Technology/framework
- `features` (string[]): Features to include
- `typescript` (boolean): Use TypeScript

**Returns:** `Boilerplate` object

#### `createTemplateFromRepo(repoUrl, options): Promise<{analysis, template}>`
High-level method: analyze + extract in one call.

**Parameters:**
- `repoUrl` (string): GitHub repository URL
- `options` (object): Extraction options

**Returns:** Analysis and template objects

## 🤝 Contributing

This MCP server is part of SkillBridge.ai V1. To extend functionality:

1. Add new tools to `server.ts`
2. Implement tool handlers
3. Update client wrapper
4. Add tests
5. Update documentation

## 📄 License

Part of SkillBridge.ai project.

## 🔗 Related

- [V1 Development Plan](../../../V1_DEVELOPMENT_PLAN.md)
- Issue #5a: Build Custom Template Creator MCP Server
- Issue #5c: Implement Template Creation Node
- [Official MCP Documentation](https://modelcontextprotocol.io)
