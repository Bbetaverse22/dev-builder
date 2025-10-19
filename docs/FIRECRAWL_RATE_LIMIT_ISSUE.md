## Firecrawl Rate-Limit Handling Regression

- **Status:** Open
- **Reported On:** 2025-10-19
- **Owner:** TBD

### Summary
- Agentic research runs hit Firecrawl's per-minute cap.
- searchResourcesNode keeps retrying; Firecrawl returns 429-rate-limit errors.
- Workflow exits with zero learning resources/examples despite remaining credits.

### Impact
- Learning Resources and GitHub Examples sections remain empty.
- Portfolio pipeline later consumes empty research payloads.
- Credits drain quickly due to repeated throttled calls.

### Reproduction
1. Run Skill Gap Analysis on repo `https://github.com/Bbetaverse22/ticketing-project-beta`.
2. Observe Firecrawl queries in logs; after ~6 requests/minute, Firecrawl returns rate-limit errors.
3. Research agent completes with 0 resources/examples; UI shows stored repo but empty data.

### Notes
- Recent throttle patch adds 1.5s spacing and halts iterations on rate-limit detection, but further tuning (backoff, cached results, or provider swap) is required.
- Consider disabling Firecrawl temporarily or upgrading plan until adaptive throttling is implemented.
