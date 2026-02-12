import { spawn } from 'node:child_process';
import { spawnSync } from 'node:child_process';

import { loadSecurityPolicy } from '../config/runtime.js';
import { loadCatalogItemById } from '../catalog/repository.js';
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
  const record = await loadCatalogItemById(options.id);
  if (!record) {
    throw new Error(`Catalog entry not found: ${options.id}`);
  }

  const policy = await loadSecurityPolicy();
  const assessment = buildAssessment(record, policy);

  if (isBlockedTier(assessment.riskTier, policy) && !options.overrideRisk) {
    await persistAudit({
      id: options.id,
      requestedAt: new Date().toISOString(),
      policyDecision: 'blocked',
      overrideUsed: false,
      installer: record.install.kind,
      exitCode: 1
    });

    throw new Error(
      `Blocked by security policy (${assessment.riskTier}, score=${assessment.riskScore}). Use --override-risk to force.`
    );
  }

  if (isWarnTier(assessment.riskTier, policy)) {
    logger.warn(`Security warning for ${options.id}: ${assessment.riskTier} (${assessment.riskScore})`);
  }

  const exitCode = await executeInstall(record.install, options.yes);

  return persistAudit({
    id: options.id,
    requestedAt: new Date().toISOString(),
    policyDecision: options.overrideRisk ? 'override-allowed' : 'allowed',
    overrideUsed: options.overrideRisk,
    installer: record.install.kind,
    exitCode
  });
}

async function executeInstall(
  install: { kind: 'skill.sh'; target: string; args: string[] } | { kind: 'gh-cli'; target: string; args: string[] } | { kind: 'manual'; instructions: string; url?: string },
  yes: boolean
): Promise<number> {
  if (install.kind === 'manual') {
    logger.info(`Manual install required: ${install.instructions}${install.url ? ` (${install.url})` : ''}`);
    return 0;
  }

  if (install.kind === 'skill.sh') {
    ensureBinaryAvailable('skill.sh', 'skill.sh is required. Install it and verify with: skill.sh --version');
    const commandArgs = buildSkillShInstallArgs(install.target, install.args, yes);
    return executeCommand('skill.sh', commandArgs, 'skill.sh');
  }

  ensureBinaryAvailable('gh', 'gh CLI is required for gh-cli installers. Install it and verify with: gh --version');
  const commandArgs = buildGhInstallArgs(install.target, install.args, yes);
  return executeCommand('gh', commandArgs, 'gh');
}

export function buildSkillShInstallArgs(target: string, args: string[], yes: boolean): string[] {
  const commandArgs = ['install', target, ...args];
  if (yes) {
    commandArgs.push('--yes');
  }
  return commandArgs;
}

export function buildGhInstallArgs(target: string, args: string[], yes: boolean): string[] {
  const commandArgs = [...args];
  if (commandArgs.length === 0) {
    commandArgs.push(target);
  }
  if (yes) {
    commandArgs.push('--yes');
  }
  return commandArgs;
}

async function executeCommand(binary: string, args: string[], label: string): Promise<number> {
  if (process.env.SKILLS_MCPS_INSTALL_DRY_RUN === '1') {
    logger.info(`Dry-run ${label} ${args.join(' ')}`);
    return 0;
  }

  return new Promise<number>((resolve, reject) => {
    const child = spawn(binary, args, {
      stdio: 'inherit'
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute ${label}: ${error.message}`));
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

function ensureBinaryAvailable(binary: string, suggestion: string): void {
  const result = spawnSync('which', [binary], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${binary} is not available in PATH. ${suggestion}`);
  }
}

async function persistAudit(record: InstallAudit): Promise<InstallAudit> {
  const parsed = InstallAuditSchema.parse(record);
  const stamp = parsed.requestedAt.replace(/[:.]/g, '-');
  const file = `data/security-reports/audits/${stamp}-${parsed.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  await writeJsonFile(file, parsed);
  return parsed;
}
