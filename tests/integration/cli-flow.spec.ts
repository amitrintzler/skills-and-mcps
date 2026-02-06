import fs from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { loadWhitelist, QUARANTINE_PATH, WHITELIST_PATH } from '../../src/catalog/repository.js';
import { installWithSkillSh } from '../../src/install/skillsh.js';
import { detectProjectSignals } from '../../src/recommendation/project-analysis.js';
import { recommend } from '../../src/recommendation/engine.js';
import { loadRequirementsProfile } from '../../src/recommendation/requirements.js';
import { applyQuarantineFromReport, verifyWhitelist } from '../../src/security/whitelist.js';

let whitelistBackup = '';
let quarantineBackup = '';

async function backupState(): Promise<void> {
  if (!whitelistBackup) {
    whitelistBackup = await fs.readFile(WHITELIST_PATH, 'utf8');
  }
  if (!quarantineBackup) {
    quarantineBackup = await fs.readFile(QUARANTINE_PATH, 'utf8');
  }
}

afterEach(async () => {
  if (whitelistBackup) {
    await fs.writeFile(WHITELIST_PATH, whitelistBackup, 'utf8');
  }
  if (quarantineBackup) {
    await fs.writeFile(QUARANTINE_PATH, quarantineBackup, 'utf8');
  }
});

describe('integration flow', () => {
  it('runs recommendation using project manifest + requirements file', async () => {
    const projectSignals = await detectProjectSignals('tests/fixtures/project-node');
    const requirements = await loadRequirementsProfile('tests/fixtures/requirements.yml');
    const ranked = await recommend({ projectSignals, requirements });

    expect(ranked[0].id).toBe('skill:secure-prompting');
    expect(ranked.some((item) => item.blocked)).toBe(true);
  });

  it('blocks install for high-risk item unless override is provided', async () => {
    process.env.SKILLS_MCPS_INSTALL_DRY_RUN = '1';

    await expect(
      installWithSkillSh({ id: 'mcp:remote-browser', overrideRisk: false, yes: true })
    ).rejects.toThrow('Blocked by security policy');

    const audit = await installWithSkillSh({ id: 'mcp:remote-browser', overrideRisk: true, yes: true });
    expect(audit.policyDecision).toBe('override-allowed');
  });

  it('quarantines failed whitelist entries from verification report', async () => {
    await backupState();

    const { reportPath } = await verifyWhitelist();
    const outcome = await applyQuarantineFromReport(reportPath);
    const whitelist = await loadWhitelist();

    expect(outcome.quarantined).toBeDefined();
    outcome.removedFromWhitelist.forEach((id) => expect(whitelist.has(id)).toBe(false));
  });
});
