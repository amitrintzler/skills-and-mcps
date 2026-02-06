# Skills + MCP Security Intelligence Framework

CLI-first open-source framework for discovering public skills and Model Context Protocol (MCP) servers, generating project-aware recommendations, and installing safely through `skill.sh`.

## Remotion Explainer Video
Use this structure to produce a high-impact 90-second Remotion video for the GitHub page.

### Video Goal
Show why this framework is the fastest and safest way to discover, evaluate, and install skills/MCP servers.

### Storyboard (90 seconds)
1. Problem (0-12s)
- Teams waste time searching scattered registries.
- Security risk is unclear before installation.

2. Solution (12-28s)
- Introduce this framework as a single intelligence hub.
- Show `sync`, `recommend`, `assess`, and `install` in quick CLI cuts.

3. Key Benefit 1: Better Recommendations (28-45s)
- Recommendations combine project manifest signals + requirements.
- Ranked output includes fit reasons and risk metadata.

4. Key Benefit 2: Security-First Installs (45-62s)
- Risk scoring with tier + score + reasons.
- High/critical risks blocked by default.
- `skill.sh` integration gives low-friction installs.

5. Key Benefit 3: Continuous Trust (62-78s)
- Daily CI verifies whitelist entries.
- Unsafe items are auto-quarantined and surfaced in PRs.

6. Outcome / CTA (78-90s)
- Faster onboarding, safer defaults, better tooling choices.
- Call to action: `npm run sync` then `npm run dev -- recommend --project .`

### Voiceover Script
“Finding the right skills and MCP servers is slow, fragmented, and often risky.  
This framework gives you one trusted pipeline: sync the latest catalog, get recommendations based on your real project and requirements, assess risk with clear scoring, then install through skill.sh with minimal effort.  
Security is built in. High-risk entries are blocked by default, and daily CI continuously revalidates the whitelist, quarantining unsafe entries automatically.  
The result is simple: faster decisions, safer installs, and better outcomes for every team using MCP and skills in production.”

## What This Project Does
- Syncs latest public catalog data from configured registries.
- Recommends the best skills/MCP servers from project manifests + requirements profile.
- Enforces risk-aware installs with tiered security policy.
- Verifies a whitelist daily and auto-quarantines unsafe entries.

## Core Commands
- `npm run sync`
- `npm run dev -- recommend --project . --requirements requirements.yml --format json`
- `npm run dev -- assess --id mcp:filesystem`
- `npm run dev -- install --id mcp:filesystem --yes`
- `npm run whitelist:verify`
- `npm run quarantine:apply -- --report data/security-reports/YYYY-MM-DD/report.json`

## Install and Run
1. `npm install`
2. `npm run sync`
3. `npm run dev -- recommend --project . --format table`

## Risk Tiers
| Tier | Score | Default Install Policy |
| --- | --- | --- |
| low | 0-24 | allow |
| medium | 25-49 | allow with warning |
| high | 50-74 | block |
| critical | 75-100 | block |

Use `--override-risk` to bypass default block rules. Every install writes an audit record to `data/security-reports/audits/`.

## Configuration
- `config/registries.json`: discovery/crawl source inputs.
- `config/security-policy.json`: scoring and block/warn gates.
- `config/recommendation-weights.json`: ranking weights.

### Remote Registry Ingestion
Each registry can optionally define:
- `remote.url`: HTTP JSON endpoint
- `remote.format`: `json-array` or `catalog-json`
- `remote.entryPath`: optional dot path for `catalog-json`
- `remote.supportsUpdatedSince`: enable incremental pulls
- `remote.updatedSinceParam`: query parameter name (default `updated_since`)
- `remote.pagination`: cursor-based pagination settings
- `remote.authEnv`: optional bearer token environment variable name
- `remote.fallbackToLocal`: use embedded `entries` when remote fetch fails

Current MCP source is wired to the official endpoint:
- `https://registry.modelcontextprotocol.io/v0.1/servers`

Incremental state is persisted in `data/catalog/sync-state.json`.

## Data Contracts
Catalog and runtime data are validated with Zod:
- `CatalogSkill`
- `CatalogMcpServer`
- `RiskAssessment`
- `Recommendation`
- `InstallAudit`

## Daily CI Security
Workflow: `.github/workflows/daily-security.yml`
- Sync catalog
- Verify whitelist against risk policy
- Apply quarantine from report
- Open/update PR with whitelist/quarantine diffs

## Backward Compatibility
Legacy commands are preserved as shims:
- `ingest` -> `sync`
- `validate` -> `whitelist verify`

## Security Docs
- `docs/security/threat-model.md`
- `docs/security/scoring.md`
- `docs/ci/daily-quarantine.md`
