# Security Notes

- Never commit secrets; keep credentials in `.env.local` or GitHub Actions secrets.
- Use `config/security-policy.json` for risk thresholds and gate behavior.
- Keep a daily record of whitelist verification reports in `data/security-reports/`.
- Quarantine state is authoritative for blocking recommendations/installs.
- Review and rotate signing/integrity controls quarterly.
