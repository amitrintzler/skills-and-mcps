# Threat Model

## Assets
- Local workstation filesystem and credentials.
- CI secrets and release integrity.
- Catalog trust metadata used for recommendations.

## Primary Threats
- Malicious skill/MCP package execution.
- Prompt/command/config injection through tool metadata.
- Data exfiltration via outbound endpoints.
- Supply chain tampering and unsigned package artifacts.

## Controls
- Structured risk scoring across five scanner families.
- Default install blocks for `high` and `critical` tiers.
- Daily whitelist verification and quarantine automation.
- Immutable security report snapshots under `data/security-reports/`.

## Residual Risk
- Open-crawl discovery can ingest noisy or adversarial metadata.
- `--override-risk` intentionally allows operator bypass.
- Scanner heuristics should be reviewed and tuned continuously.
