import path from 'node:path';

import fs from 'fs-extra';

import { loadSecurityPolicy } from '../config/runtime.js';
import { loadCatalogItemById, loadWhitelist, saveQuarantine, saveWhitelist } from '../catalog/repository.js';
import { getStaleRegistries, loadSyncState } from '../catalog/sync-state.js';
import { writeJsonFile, readJsonFile } from '../lib/json.js';
import { logger } from '../lib/logger.js';
import { SecurityReportSchema, type QuarantineEntry, type SecurityReport } from '../lib/validation/contracts.js';
import { buildAssessment, isBlockedTier } from './assessment.js';

export async function verifyWhitelist(): Promise<{ reportPath: string; report: SecurityReport }> {
  const [whitelist, policy, syncState] = await Promise.all([loadWhitelist(), loadSecurityPolicy(), loadSyncState()]);

  const passed: string[] = [];
  const failed: SecurityReport['failed'] = [];

  for (const id of whitelist) {
    const record = await loadCatalogItemById(id);
    if (!record) {
      failed.push({
        id,
        riskTier: 'critical',
        riskScore: 100,
        reasons: ['Catalog item missing']
      });
      continue;
    }

    const assessment = buildAssessment(record, policy);

    if (isBlockedTier(assessment.riskTier, policy)) {
      failed.push({
        id,
        riskTier: assessment.riskTier,
        riskScore: assessment.riskScore,
        reasons: assessment.reasons
      });
      continue;
    }

    passed.push(id);
  }

  const report = SecurityReportSchema.parse({
    generatedAt: new Date().toISOString(),
    staleRegistries: getStaleRegistries(syncState),
    passed,
    failed
  });

  const date = report.generatedAt.slice(0, 10);
  const reportPath = path.resolve(`data/security-reports/${date}/report.json`);
  await fs.ensureDir(path.dirname(reportPath));
  await writeJsonFile(reportPath, report);
  logger.info(`Whitelist verification report written: ${reportPath}`);

  return { reportPath, report };
}

export async function applyQuarantineFromReport(reportFilePath: string): Promise<{
  removedFromWhitelist: string[];
  quarantined: QuarantineEntry[];
}> {
  const raw = await readJsonFile<unknown>(reportFilePath);
  const report = SecurityReportSchema.parse(raw);

  const whitelist = await loadWhitelist();
  const removedFromWhitelist: string[] = [];

  report.failed.forEach((failure) => {
    if (whitelist.delete(failure.id)) {
      removedFromWhitelist.push(failure.id);
    }
  });

  await saveWhitelist(whitelist);

  const now = new Date().toISOString();
  const quarantined: QuarantineEntry[] = report.failed.map((failure) => ({
    id: failure.id,
    reason: failure.reasons.join(' | '),
    quarantinedAt: now
  }));

  await saveQuarantine(quarantined);

  return { removedFromWhitelist, quarantined };
}
