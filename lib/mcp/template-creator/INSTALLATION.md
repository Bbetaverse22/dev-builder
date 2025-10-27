# Template Creator MCP - Installation Instructions

## 📦 Prerequisites

The Template Creator MCP requires the MCP SDK which hasn't been installed yet in the main project.

## 🚀 Installation Steps

### Step 1: Install MCP SDK in Main Project

```bash
# From project root
pnpm add @modelcontextprotocol/sdk
```

### Step 2: Install Template Creator Dependencies

```bash
# Navigate to template creator directory
cd lib/mcp/template-creator

# Install local dependencies
pnpm install

# Build the server
pnpm build
```

### Step 3: Verify Installation

```bash
# Run the example
pnpm tsx examples/usage-example.ts
```

## ⚠️ Current Status

**TypeScript Errors Expected:**

The following errors will appear until `@modelcontextprotocol/sdk` is installed:

```
error TS2307: Cannot find module '@modelcontextprotocol/sdk/client/index.js'
error TS2307: Cannot find module '@modelcontextprotocol/sdk/server/index.js'
```

**This is normal!** These will resolve once you run:

```bash
pnpm add @modelcontextprotocol/sdk
```

## 📋 Checklist

Before implementing Issue #5a, ensure:

- [ ] MCP SDK installed (`@modelcontextprotocol/sdk`)
- [ ] Template Creator dependencies installed
- [ ] Build succeeds (`pnpm build`)
- [ ] Examples run (`pnpm tsx examples/usage-example.ts`)
- [ ] No TypeScript errors in main project

## 🔗 Related

- **Issue #5a**: Build Custom Template Creator MCP Server
- **V1 Development Plan**: See full implementation timeline
