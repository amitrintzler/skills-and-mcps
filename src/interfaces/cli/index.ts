import path from 'node:path';

import { syncCatalogs } from '../../catalog/sync.js';
import { loadCatalogItemById } from '../../catalog/repository.js';
import { installWithSkillSh } from '../../install/skillsh.js';
import { logger } from '../../lib/logger.js';
import { CatalogKindSchema, type CatalogKind } from '../../lib/validation/contracts.js';
import { detectProjectSignals } from '../../recommendation/project-analysis.js';
import { recommend } from '../../recommendation/engine.js';
import { loadRequirementsProfile } from '../../recommendation/requirements.js';
import { assessRisk } from '../../security/assessment.js';
import { applyQuarantineFromReport, verifyWhitelist } from '../../security/whitelist.js';

export async function runCli(argv: string[]): Promise<void> {
  const [command = 'help', ...rest] = argv;

  switch (command) {
    case 'sync':
      await handleSync(rest);
      return;
    case 'recommend':
      await handleRecommend(rest);
      return;
    case 'assess':
      await handleAssess(rest);
      return;
    case 'install':
      await handleInstall(rest);
      return;
    case 'whitelist':
      await handleWhitelist(rest);
      return;
    case 'quarantine':
      await handleQuarantine(rest);
      return;
    case 'help':
    default:
      printHelp();
  }
}

async function handleSync(args: string[]): Promise<void> {
  const kinds = readKinds(args);
  const result = await syncCatalogs(undefined, { kinds });

  if (result.staleRegistries.length > 0) {
    logger.warn(`Stale registries: ${result.staleRegistries.join(', ')}`);
  }
}

async function handleRecommend(args: string[]): Promise<void> {
  const project = readFlag(args, '--project') ?? '.';
  const requirementsFile = readFlag(args, '--requirements');
  const format = readFlag(args, '--format') ?? 'table';
  const kinds = readKinds(args);

  const [projectSignals, requirements] = await Promise.all([
    detectProjectSignals(path.resolve(project)),
    loadRequirementsProfile(requirementsFile)
  ]);

  const ranked = await recommend({ projectSignals, requirements, kinds });

  if (format === 'json') {
    console.log(JSON.stringify(ranked, null, 2));
    return;
  }

  console.log('ID\tTYPE\tPROVIDER\tSCORE\tTRUST\tFIT\tRISK\tBLOCKED');
  ranked.forEach((entry) => {
    console.log(
      `${entry.id}\t${entry.kind}\t${entry.provider}\t${entry.rankScore.toFixed(1)}\t${entry.scoreBreakdown.trustScore.toFixed(
        1
      )}\t${entry.scoreBreakdown.fitScore.toFixed(1)}\t${entry.riskTier}(${entry.riskScore.toFixed(0)})\t${entry.blocked}`
    );
  });
}

async function handleAssess(args: string[]): Promise<void> {
  const id = readFlag(args, '--id');
  if (!id) {
    throw new Error('Missing --id for assess');
  }

  const found = await loadCatalogItemById(id);
  if (!found) {
    throw new Error(`Catalog item not found: ${id}`);
  }

  const assessment = await assessRisk(found);
  console.log(JSON.stringify(assessment, null, 2));
}

async function handleInstall(args: string[]): Promise<void> {
  const id = readFlag(args, '--id');
  if (!id) {
    throw new Error('Missing --id for install');
  }

  const overrideRisk = hasFlag(args, '--override-risk');
  const yes = hasFlag(args, '--yes');

  const audit = await installWithSkillSh({ id, overrideRisk, yes });
  console.log(JSON.stringify(audit, null, 2));
}

async function handleWhitelist(args: string[]): Promise<void> {
  const subcommand = args[0];
  if (subcommand !== 'verify') {
    throw new Error('Usage: whitelist verify');
  }
  const allowFailures = hasFlag(args, '--allow-failures');

  const result = await verifyWhitelist();
  console.log(
    JSON.stringify(
      {
        reportPath: result.reportPath,
        failed: result.report.failed.length,
        staleRegistries: result.report.staleRegistries
      },
      null,
      2
    )
  );
  if (result.report.failed.length > 0 && !allowFailures) {
    throw new Error(`Whitelist verification failed (${result.report.failed.length} entries)`);
  }
}

async function handleQuarantine(args: string[]): Promise<void> {
  const subcommand = args[0];
  if (subcommand !== 'apply') {
    throw new Error('Usage: quarantine apply --report <path>');
  }

  const report = readFlag(args, '--report');
  if (!report) {
    throw new Error('Missing --report for quarantine apply');
  }

  const result = await applyQuarantineFromReport(report);
  console.log(JSON.stringify(result, null, 2));
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function readKinds(args: string[]): CatalogKind[] | undefined {
  const value = readFlag(args, '--kind');
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((kind) => CatalogKindSchema.parse(kind));
}

function printHelp(): void {
  logger.info('Commands:');
  logger.info('  sync [--kind skill,mcp,claude-plugin,copilot-extension]');
  logger.info(
    '  recommend --project . --requirements requirements.yml --format json|table [--kind skill,mcp,claude-plugin,copilot-extension]'
  );
  logger.info('  assess --id <catalog-id>');
  logger.info('  install --id <catalog-id> [--yes] [--override-risk]');
  logger.info('  whitelist verify');
  logger.info('  quarantine apply --report <path>');
}
