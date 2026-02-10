# Skills + MCP + Plugin Security Intelligence Framework

[![CI](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/ci.yml/badge.svg)](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/ci.yml)
[![Catalog Sync](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/catalog-sync.yml/badge.svg)](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/catalog-sync.yml)
[![Daily Security](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/daily-security.yml/badge.svg)](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/daily-security.yml)
[![CodeQL](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/security-codeql.yml/badge.svg)](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/security-codeql.yml)
[![Dependency Review](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/security-dependency-review.yml/badge.svg)](https://github.com/amitrintzler/skills-and-mcps/actions/workflows/security-dependency-review.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.17-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

A CLI-first intelligence layer for discovering, ranking, and safely installing:
- Skills
- MCP servers
- Claude plugins
- Copilot extensions

The project combines catalog freshness, project-fit ranking, and strict security policy gates in one workflow.

## Why This Project

Most teams currently use fragmented registries and manual trust checks. This framework gives you one source of truth with operational guardrails.

| Capability | What it gives you |
| --- | --- |
| Unified Catalog | One normalized catalog across multiple ecosystems |
| Trust-First Ranking | Fit + trust signals, minus security penalties |
| Safe Installation | Block/warn policy enforcement before install |
| Continuous Validation | CI and scheduled scans keep catalog and policy aligned |
| Auditability | Security reports, quarantines, and install audit records |

## How It Works

```text
Provider Registries -> Sync + Normalize -> Unified Catalog (data/catalog/items.json)
      -> Recommend (fit + trust + risk)
      -> Assess
      -> Install (policy-aware)
      -> Daily verify/quarantine automation
```

## Quick Start

1. Install dependencies
```bash
npm install
```

2. Sync all enabled catalog sources
```bash
npm run sync
```

3. Inspect live health
```bash
npm run status
```

4. Get recommendations for your project
```bash
npm run dev -- recommend --project . --format table
```

5. Install an item with policy checks
```bash
npm run dev -- install --id mcp:filesystem --yes
```

## CLI Commands

| Command | Purpose |
| --- | --- |
| `npm run about` | Show project identity, scope, and ranking model |
| `npm run status` | Show catalog totals, provider mix, whitelist/quarantine, stale registries |
| `npm run sync` | Refresh catalog from enabled registries |
| `npm run dev -- recommend ...` | Rank items by project fit + trust/risk model |
| `npm run dev -- assess --id <id>` | Show detailed risk assessment |
| `npm run dev -- install --id <id> [--yes] [--override-risk]` | Policy-aware install |
| `npm run whitelist:verify` | Verify approved items against current risk policy |
| `npm run quarantine:apply -- --report <path>` | Apply quarantine from a report |

### Recommend examples

```bash
npm run dev -- recommend --project . --format table
npm run dev -- recommend --project . --format json --kind skill,mcp,claude-plugin,copilot-extension
```

## Risk Model

| Tier | Score | Default install policy |
| --- | --- | --- |
| low | 0-24 | allow |
| medium | 25-49 | allow with warning |
| high | 50-74 | block |
| critical | 75-100 | block |

Use `--override-risk` when you intentionally accept risk. All installs generate audit records under `data/security-reports/audits/`.

## Configuration

| File | Purpose |
| --- | --- |
| `config/registries.json` | Source registries and adapter mapping |
| `config/providers.json` | Provider policy (enabled, official-only, auth env, poll settings) |
| `config/security-policy.json` | Risk scoring weights + block/warn gate thresholds |
| `config/ranking-policy.json` | Ranking weights, penalties, tie-break behavior |

### Remote registry fields

- `remote.url`: HTTP JSON endpoint
- `remote.format`: `json-array` or `catalog-json`
- `remote.entryPath`: optional dot path for `catalog-json`
- `remote.supportsUpdatedSince`: enable incremental pulls
- `remote.updatedSinceParam`: query parameter name (default `updated_since`)
- `remote.pagination`: cursor pagination settings
- `remote.authEnv`: bearer token environment variable name
- `remote.fallbackToLocal`: use local `entries` when remote fetch fails

Incremental sync state is stored in `data/catalog/sync-state.json`.

## CI and Security

### Quality and policy validation

- `.github/workflows/ci.yml`
- Runs lint, test, build on Node 18 and 20
- Verifies whitelist policy and offline sync reproducibility

### Security scans (blocking)

- `.github/workflows/security-codeql.yml` (CodeQL)
- `.github/workflows/security-dependency-review.yml` (PR dependency risk)
- `.github/workflows/security-secrets.yml` (gitleaks)
- `.github/workflows/security-sbom-trivy.yml` (SBOM + Trivy)

### Scheduled operations

- `.github/workflows/daily-security.yml` (verify + quarantine automation)
- `.github/workflows/catalog-sync.yml` (daily catalog refresh)

### Dependency automation

- `.github/dependabot.yml` (weekly npm and GitHub Actions updates)

### Security gate policy

| Check | Scope | Enforcement |
| --- | --- | --- |
| CodeQL | JS/TS code scanning | blocking |
| Dependency Review | PR dependency changes | blocking on High/Critical |
| Secrets (gitleaks) | Repository secret leakage | blocking |
| Trivy SCA | Filesystem vulnerability scan | blocking on High/Critical |
| Whitelist Verify | Catalog/policy alignment | blocking in CI |

## Data Contracts

Primary runtime contracts are validated with Zod:
- `CatalogItem`
- `RiskAssessment`
- `Recommendation`
- `InstallAudit`

## Backward Compatibility

Legacy command aliases are still supported:
- `ingest` -> `sync`
- `validate` -> `whitelist verify`

## Security and Operations Docs

- `docs/security/threat-model.md`
- `docs/security/scoring.md`
- `docs/ci/daily-quarantine.md`

## Marketing Asset

`src/commands/ExplainerVideo.tsx` contains the Remotion explainer composition used for project storytelling/demo content.
