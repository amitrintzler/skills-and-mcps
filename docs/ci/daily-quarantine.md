# Daily Quarantine Automation

Workflow: `.github/workflows/daily-security.yml`

## Sequence
1. `npm run sync`
2. `npm run whitelist:verify`
3. Find latest report in `data/security-reports/*/report.json`
4. `npm run quarantine:apply -- --report <latest>`
5. Open/update PR with whitelist and quarantine changes

## Expected Outcome
- Entries that now fail policy are removed from whitelist.
- Failed entries are added to quarantine with reasons and timestamp.
- Recommendations/install flow treats quarantined IDs as blocked.

## Manual Re-approval
- Remove or reduce offending signals.
- Re-run verification locally.
- Open PR to remove from `data/quarantine/quarantined.json` and add back to whitelist.
- CODEOWNERS approval is required.
