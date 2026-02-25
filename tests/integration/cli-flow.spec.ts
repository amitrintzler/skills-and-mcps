import fs from 'node:fs/promises';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ITEMS_PATH, loadWhitelist, MCPS_PATH, QUARANTINE_PATH, SKILLS_PATH, WHITELIST_PATH } from '../../src/catalog/repository.js';
import { syncCatalogs } from '../../src/catalog/sync.js';
import { installWithSkillSh } from '../../src/install/skillsh.js';
import { detectProjectSignals } from '../../src/recommendation/project-analysis.js';
import { recommend } from '../../src/recommendation/engine.js';
import { loadRequirementsProfile } from '../../src/recommendation/requirements.js';
import { applyQuarantineFromReport, verifyWhitelist } from '../../src/security/whitelist.js';

const SYNC_STATE_PATH = 'data/catalog/sync-state.json';
const SNAPSHOT_PATHS = [WHITELIST_PATH, QUARANTINE_PATH, ITEMS_PATH, SKILLS_PATH, MCPS_PATH, SYNC_STATE_PATH];
const PER_TEST_RESTORE_PATHS = [WHITELIST_PATH, QUARANTINE_PATH];
type FileSnapshot = { exists: boolean; content: string };
const snapshots = new Map<string, FileSnapshot>();

async function snapshotFile(filePath: string): Promise<void> {
  if (snapshots.has(filePath)) {
    return;
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    snapshots.set(filePath, { exists: true, content });
  } catch (error) {
    const maybeFsError = error as NodeJS.ErrnoException;
    if (maybeFsError.code === 'ENOENT') {
      snapshots.set(filePath, { exists: false, content: '' });
      return;
    }
    throw error;
  }
}

async function restoreFile(filePath: string): Promise<void> {
  const snapshot = snapshots.get(filePath);
  if (!snapshot) {
    return;
  }

  if (!snapshot.exists) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.writeFile(filePath, snapshot.content, 'utf8');
}

beforeAll(async () => {
  await Promise.all(SNAPSHOT_PATHS.map((filePath) => snapshotFile(filePath)));

  const prevOffline = process.env.SKILLS_MCPS_SYNC_OFFLINE;
  const prevToday = process.env.SKILLS_MCPS_SYNC_TODAY;
  const effectiveToday = prevToday || new Date().toISOString().slice(0, 10);
  process.env.SKILLS_MCPS_SYNC_OFFLINE = '1';
  process.env.SKILLS_MCPS_SYNC_TODAY = effectiveToday;
  await syncCatalogs(effectiveToday);

  if (prevOffline === undefined) {
    delete process.env.SKILLS_MCPS_SYNC_OFFLINE;
  } else {
    process.env.SKILLS_MCPS_SYNC_OFFLINE = prevOffline;
  }

  if (prevToday === undefined) {
    delete process.env.SKILLS_MCPS_SYNC_TODAY;
  } else {
    process.env.SKILLS_MCPS_SYNC_TODAY = prevToday;
  }
});

afterEach(async () => {
  await Promise.all(PER_TEST_RESTORE_PATHS.map((filePath) => restoreFile(filePath)));
});

afterAll(async () => {
  await Promise.all(SNAPSHOT_PATHS.map((filePath) => restoreFile(filePath)));
});

describe('integration flow', () => {
  it('runs recommendation using project manifest + requirements file', async () => {
    const projectSignals = await detectProjectSignals('tests/fixtures/project-node');
    const requirements = await loadRequirementsProfile('tests/fixtures/requirements.yml');
    const ranked = await recommend({ projectSignals, requirements });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.some((item) => item.id === 'skill:secure-prompting')).toBe(true);
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
    const { reportPath, report } = await verifyWhitelist();
    const outcome = await applyQuarantineFromReport(reportPath);
    const whitelist = await loadWhitelist();

    expect(Array.isArray(report.staleRegistries)).toBe(true);
    expect(outcome.quarantined).toBeDefined();
    outcome.removedFromWhitelist.forEach((id) => expect(whitelist.has(id)).toBe(false));
  });

  it('filters recommendations by requested kinds', async () => {
    const projectSignals = await detectProjectSignals('tests/fixtures/project-node');
    const requirements = await loadRequirementsProfile('tests/fixtures/requirements.yml');
    const ranked = await recommend({ projectSignals, requirements, kinds: ['claude-plugin'] });

    expect(ranked.length).toBeGreaterThan(0);
    expect(new Set(ranked.map((item) => item.kind))).toEqual(new Set(['claude-plugin']));
  });
});
