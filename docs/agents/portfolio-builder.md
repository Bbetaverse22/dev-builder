## Portfolio Builder Agent Overview

The portfolio builder agent inspects GitHub repositories for portfolio readiness, detects weaknesses, and produces prioritized improvement recommendations. It uses **GitHub MCP integration** for issue creation and enriches suggestions with research results and code templates.

## Responsibilities
- Fetch repository metadata via GitHub REST API and MCP
- Run focused quality checks: README, tests, CI/CD, documentation, license
- Assemble strengths, weaknesses, and overall portfolio quality score
- Generate actionable improvement recommendations
- **MCP-Powered**: Create GitHub issues with improvement tasks directly in the repository
- Merge skill-gap insights from Gap Analyzer
- Include research results from LangGraph Research Agent
- Attach code templates via Template Creator MCP

## Effectiveness Assessment
- Performs pragmatic quality checks that quickly highlight missing fundamentals for recruiter-facing portfolios.
- Integrates with the research agent to surface targeted resources and exemplars, giving learners a direct next step.
- Template extraction pipelines lower friction for users by offering ready-to-use code scaffolds tied to specific weaknesses.

## Optimization Opportunities
- **Check Extensibility:** Factor rule checks into a registry so new weakness detectors can be added without modifying core logic.
- **Parallel Fetches:** Expand concurrent GitHub requests (contents, workflows, tests) to reduce latency on large repos.
- **Scoring Model:** Tune the static weighting scheme or derive weights from usage analytics to better reflect perceived value.
- **Error Handling:** Wrap GitHub errors with clear remediation hints (e.g., missing token, private repo access) for end users.
- **Logging:** Replace console usage with structured logging and surface context to the UI for transparency.

## De-Scoping Considerations
- If portfolio remediation is no longer a product focus, this agent could be retired; however, other experiences relying on recommendations or template extraction would need alternative pathways.
- For teams standardizing on external developer-experience tooling, this agent's checks could be replicated via GitHub Actions or third-party auditing services.

## Related Documentation
- [Gap Analyzer](gap-analyzer.md) - Provides skill context for recommendations
- [Research Agent](langgraph-research-agent.md) - Supplies learning resources
- [Template Generator](template-example-generator.md) - Creates code scaffolds
- [GitHub Agent](github-agent.md) - MCP integration for issue creation
