## Template Example Generator Overview

This agent leverages the **Template Creator MCP** to extract reusable code templates from exemplar repositories and optionally raise GitHub pull requests with the generated files. It provides ready-to-use code scaffolds for learning and portfolio improvement.

## Responsibilities
- Validate template-worthiness via `analyzeStructure` and bail out when the source lacks sufficient quality.
- Build deterministic slugs/branch names, create local directories under `examples/generated`, and persist extracted files safely.
- Aggregate recommended glob patterns and request template extraction with structure preservation, comments, and type metadata.
- Provide CLI instructions for committing the generated template, and support automated PR creation through Octokit when tokens are available.

## Effectiveness Assessment
- Handles filesystem safety checks (path sanitization, directory whitelisting) to prevent malicious template paths.
- Templates include placeholders, instructions, and analysis summaries, giving users context alongside code scaffolds.
- PR creation flow gracefully handles branch collisions by auto-renaming, reducing manual recovery work.

## Optimization Opportunities
- **Pattern Tuning:** Allow callers to pass custom include/exclude lists so extraction can be scoped for specific stacks.
- **Partial Extraction:** Support filtering by template categories (e.g., frontend vs. backend) to reduce noise in large repos.
- **Observability:** Capture MCP latency and template-worthiness scores for analytics on source quality.
- **Cleanup:** Offer an option to remove generated directories when runs fail or after publishing to keep storage tidy.

## De-Scoping Considerations
- If template generation is no longer needed, dependent flows (portfolio builder recommendations, learning modules) must be updated to avoid referencing template attachments.
- External template services could replace this agent, but the surrounding code should keep the instruction and slug-generation utilities to maintain workflow consistency.

## Related Documentation
- [Portfolio Builder](portfolio-builder.md) - Uses templates for improvement recommendations
- [Research Agent](langgraph-research-agent.md) - Provides exemplar repositories
- [GitHub Agent](github-agent.md) - Creates PRs with template files
