import { spawn } from 'node:child_process';

import { loadSecurityPolicy } from '../config/runtime.js';
import { loadCatalogById } from '../catalog/repository.js';
import { logger } from '../lib/logger.js';
import { writeJsonFile } from '../lib/json.js';
import { InstallAuditSchema, type InstallAudit } from '../lib/validation/contracts.js';
import { buildAssessment, isBlockedTier, isWarnTier } from '../security/assessment.js';

export interface InstallOptions {
  id: string;
  overrideRisk: boolean;
  yes: boolean;
}

export async function installWithSkillSh(options: InstallOptions): Promise<InstallAudit> {
  const record = await loadCatalogById(options.id);
  if (!record) {
    throw new Error(`Catalog entry not found: ${options.id}`);
  }

  if (record.item.install.kind !== 'skill.sh') {
    throw new Error(`No skill.sh installer mapping for ${options.id}`);
  }

  const policy = await loadSecurityPolicy();
  const assessment = buildAssessment(record.item, policy);

  if (isBlockedTier(assessment.riskTier, policy) && !options.overrideRisk) {
    await persistAudit({
      id: options.id,
      requestedAt: new Date().toISOString(),
      policyDecision: 'blocked',
      overrideUsed: false,
      installer: 'skill.sh',
      exitCode: 1
    });

    throw new Error(
      `Blocked by security policy (${assessment.riskTier}, score=${assessment.riskScore}). Use --override-risk to force.`
    );
  }

  if (isWarnTier(assessment.riskTier, policy)) {
    logger.warn(`Security warning for ${options.id}: ${assessment.riskTier} (${assessment.riskScore})`);
  }

  const commandArgs = buildSkillShInstallArgs(record.item.install.target, record.item.install.args, options.yes);
  const exitCode = await executeSkillSh(commandArgs);

  return persistAudit({
    id: options.id,
    requestedAt: new Date().toISOString(),
    policyDecision: options.overrideRisk ? 'override-allowed' : 'allowed',
    overrideUsed: options.overrideRisk,
    installer: 'skill.sh',
    exitCode
  });
}

export function buildSkillShInstallArgs(target: string, args: string[], yes: boolean): string[] {
  const commandArgs = ['install', target, ...args];
  if (yes) {
    commandArgs.push('--yes');
  }
  return commandArgs;
}

async function executeSkillSh(args: string[]): Promise<number> {
  if (process.env.SKILLS_MCPS_INSTALL_DRY_RUN === '1') {
    logger.info(`Dry-run skill.sh ${args.join(' ')}`);
    return 0;
  }

  return new Promise<number>((resolve, reject) => {
    const child = spawn('skill.sh', args, {
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute skill.sh: ${error.message}`));
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function persistAudit(record: InstallAudit): Promise<InstallAudit> {
  const parsed = InstallAuditSchema.parse(record);
  const stamp = parsed.requestedAt.replace(/[:.]/g, '-');
  const file = `data/security-reports/audits/${stamp}-${parsed.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  await writeJsonFile(file, parsed);
  return parsed;
}
