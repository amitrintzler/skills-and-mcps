# Security Scoring

Risk score is normalized to `0-100` from weighted scanner findings.

## Formula
```
score = min(100,
  vulnerabilities * vulnerabilityWeight +
  suspiciousPatterns * suspiciousWeight +
  injectionFindings * injectionWeight +
  exfiltrationSignals * exfiltrationWeight +
  integrityAlerts * integrityWeight
)
```

Weights are configured in `config/security-policy.json`.

## Tiers
- `low`: 0-24
- `medium`: 25-49
- `high`: 50-74
- `critical`: 75-100

## Policy Effects
- `low`: install allowed.
- `medium`: install allowed with warning.
- `high` and `critical`: install blocked unless `--override-risk`.

## Output Contract
Assessment output includes:
- `riskScore`
- `riskTier`
- `reasons[]`
- `scannerResults` by category
- `assessedAt`
