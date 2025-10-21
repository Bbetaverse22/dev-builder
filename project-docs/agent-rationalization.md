## Agent Rationalization Plan

### Core Scope
Product requirements focus on:
- GitHub repository/profile analysis
- Skill gap identification and persistence
- Portfolio improvement recommendations
- Template extraction for remediation
- Learning resource research tied to skill gaps and targets

### Agents to Keep
| Agent | Purpose | Reason to Keep |
| --- | --- | --- |
| `GapAnalyzerAgent` | Converts GitHub data or manual skills into structured gap reports | Core skill assessment engine; feeds storage and other agents |
| `GitHubAgent` | Provides GitHub SDK tools (analysis, repos, practice issues) | Required for repository/profile data and practice opportunity discovery |
| `PortfolioBuilderAgent` | Audits repos, surfaces weaknesses, generates improvement tasks/issues | Directly supports portfolio recommendations |
| `TemplateExampleGenerator` | Interfaces with Template Creator MCP to extract code scaffolds | Essential for remediation workflows |
| `langgraph/research-agent` | Gathers learning resources and examples based on stored gaps | Drives learning recommendations aligned with target roles |
| `skillGapStoragePrisma` | Persists analyses and seeds research flows | Single source of truth for stored assessments and LangGraph seeds |

### Recently Removed Components
| Component | Former Role | Notes |
| --- | --- | --- |
| `CoordinatorAgent` & chat UI stack | Conversational routing/tool sharing | Replaced by direct API orchestration triggered from the Activate Agent flow |
| `EnhancedSkillAssessment` | Adaptive quiz engine | Retired to keep scope aligned with GitHub-centered assessments |
| `SkillSupervisorAgent` | Orchestration scaffold | Removed once single-pass workflows were adopted |
| Legacy `skillGapStorage` (file) | File persistence fallback | All storage now flows through Prisma-backed tables |

### Follow-Up Steps
1. Monitor analytics/error logs to confirm Prisma storage covers all agent hand-offs.
2. Periodically review LangGraph nodes for unused template-specific hooks.
3. Keep this plan updated as new agents or services are introduced.
