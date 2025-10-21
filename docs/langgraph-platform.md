# LangGraph Platform Guide

## Overview

LangGraph Platform provides a local development server with a visual UI for building, testing, and debugging your agent workflows.

## Requirements

### ✅ What You Need (Already Have)
- `OPENAI_API_KEY` in `.env.local`
- LangGraph dependencies installed
- `langgraph.json` configuration file

### ❌ What You DON'T Need
- **No LangSmith API key required** for local development
- **No LangGraph Cloud account** needed
- **No additional model configuration** - uses your existing OpenAI key

## Starting the Platform

### Development Mode (Recommended)

```bash
pnpm langgraph:dev
```

This starts:
- Local API server on `http://localhost:2024`
- Visual Studio UI automatically opens in your browser
- Hot reloading on code changes

### Features

- 🎨 **Visual Graph Inspector**: See your agent workflow visually
- 🐛 **Step-by-Step Debugging**: Execute nodes one at a time
- 📊 **Execution Traces**: View input/output for each step
- 🔄 **Hot Reload**: Changes to `research-agent.ts` auto-reload
- 🧪 **Test Interface**: Send test inputs and see results

## Configuration

### `langgraph.json`

```json
{
  "dependencies": ["."],
  "graphs": {
    "research_agent": "./lib/agents/langgraph/research-agent.ts:graph"
  },
  "env": ".env.local"
}
```

- **dependencies**: Where to look for code
- **graphs**: Exported graph definitions
- **env**: Environment variables file

## Optional: LangSmith Integration

If you want cloud tracing and monitoring (optional):

1. Sign up at [smith.langchain.com](https://smith.langchain.com)
2. Get API key
3. Add to `.env.local`:
   ```env
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_langsmith_api_key
   LANGCHAIN_PROJECT=skillbridge-agents
   ```

**But this is NOT required for development!**

## Ports

- **API Server**: `localhost:2024` (configurable with `--port`)
- **Studio UI**: Opens automatically in browser

## Development Workflow

1. **Start the platform**:
   ```bash
   pnpm langgraph:dev
   ```

2. **Edit your graph**:
   - Make changes to `lib/agents/langgraph/research-agent.ts`
   - Platform auto-reloads

3. **Test in UI**:
   - Select graph: `research_agent`
   - Input test data
   - Watch execution step-by-step

4. **Debug**:
   - Click on any node to see input/output
   - Step through execution
   - Inspect state at each step

## Production Deployment

When ready for production, you can:

1. **Build Docker image**:
   ```bash
   pnpm langgraph:build
   ```

2. **Deploy to LangGraph Cloud** (optional):
   - Requires LangGraph Cloud account
   - Provides hosted API endpoint
   - Auto-scaling and monitoring

## Troubleshooting

**"Module not found" errors:**
- Make sure `OPENAI_API_KEY` is in `.env.local`
- Check that graph exports are correct

**Port already in use:**
- Use `--port` flag: `langgraphjs dev --port 3000`

**Browser doesn't open:**
- Use `--no-browser` and visit `http://localhost:2024` manually

## Summary

✅ **For V1 Development**: Just run `pnpm langgraph:dev` - no extra setup needed!

✅ **For V2 Production**: Consider LangGraph Cloud deployment

✅ **For Monitoring**: Add LangSmith (optional)
