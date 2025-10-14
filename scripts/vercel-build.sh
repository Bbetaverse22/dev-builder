#!/bin/bash

echo "Starting Vercel build with dependency exclusions..."

# Remove large dependencies that cause bundle size issues
echo "Removing large dependencies..."
rm -rf .pnpm-store
rm -rf node_modules/.pnpm
rm -rf node_modules/tsx
rm -rf node_modules/@langchain
rm -rf node_modules/@langgraph
rm -rf node_modules/@modelcontextprotocol

# Remove development files
echo "Removing development files..."
rm -rf examples/generated
rm -rf tests
rm -rf docs
rm -rf scripts

# Remove MCP dependencies
echo "Removing MCP dependencies..."
rm -rf lib/mcp/template-creator/node_modules
rm -rf lib/mcp/template-creator/dist

# Run the build
echo "Running Next.js build..."
pnpm build

echo "Vercel build completed!"
