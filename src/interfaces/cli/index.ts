import path from 'node:path';
import fs from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { loadRegistries, loadSecurityPolicy } from '../../config/runtime.js';
import { syncCatalogs } from '../../catalog/sync.js';
import { getStaleRegistries, loadSyncState } from '../../catalog/sync-state.js';
import { loadCatalogItemById, loadCatalogItems, loadQuarantine, loadWhitelist } from '../../catalog/repository.js';
import { installWithSkillSh } from '../../install/skillsh.js';
import { logger } from '../../lib/logger.js';
import { CatalogKindSchema, type CatalogItem, type CatalogKind, type Recommendation } from '../../lib/validation/contracts.js';
import { detectProjectSignals } from '../../recommendation/project-analysis.js';
import { recommend } from '../../recommendation/engine.js';
import { loadRequirementsProfile } from '../../recommendation/requirements.js';
import { assessRisk, buildAssessment } from '../../security/assessment.js';
import { applyQuarantineFromReport, verifyWhitelist } from '../../security/whitelist.js';
import { runDoctorChecks } from './doctor.js';
import { renderCsv } from './formatters/csv.js';
import { renderJson } from './formatters/json.js';
import { renderMarkdown } from './formatters/markdown.js';
import { colorRisk, colors } from './formatters/colors.js';
import { renderTable, scoreBar } from './formatters/table.js';
import { printHint, printJson } from './output.js';
import { hasFlag, readCsvList, readFlag, readKinds, readLimit, readSort, type SortKey } from './options.js';

interface LocalCliConfig {
  defaultKinds: CatalogKind[];
  defaultProviders: string[];
  riskPosture: 'balanced' | 'strict';
  outputStyle: 'rich-table' | 'json';
  initializedAt: string;
}

export async function runCli(argv: string[]): Promise<void> {
  const [command = 'help', ...rest] = argv;

  switch (command) {
    case 'about':
      await handleAbout();
      return;
    case 'status':
      await handleStatus(rest);
      return;
    case 'init':
      await handleInit(rest);
      return;
    case 'doctor':
      await handleDoctor(rest);
      return;
    case 'list':
      await handleList(rest);
      return;
    case 'show':
      await handleShow(rest);
      return;
    case 'search':
      await handleSearch(rest);
      return;
    case 'scan':
      await handleScan(rest);
      return;
    case 'top':
      await handleTop(rest);
      return;
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

async function handleAbout(): Promise<void> {
  const packageRaw = await fs.readFile(path.resolve('package.json'), 'utf8');
  const pkg = JSON.parse(packageRaw) as { name?: string; version?: string; description?: string };

  console.log(`${pkg.name ?? 'skills-and-mcps'} v${pkg.version ?? '0.0.0'}`);
  if (pkg.description) {
    console.log(pkg.description);
  }
  console.log('Scope: skills, MCP servers, Claude plugins, Copilot extensions');
  console.log('Ranking: trust-first (fit + trust - risk penalties + freshness bonus)');
  console.log('Sources: official-first provider registries with local fallback');
}

async function handleStatus(args: string[]): Promise<void> {
  const verbose = hasFlag(args, '--verbose');
  const [items, whitelist, quarantine, syncState, policy] = await Promise.all([
    loadCatalogItems(),
    loadWhitelist(),
    loadQuarantine(),
    loadSyncState(),
    loadSecurityPolicy()
  ]);

  const kindCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();
  items.forEach((item) => {
    kindCounts.set(item.kind, (kindCounts.get(item.kind) ?? 0) + 1);
    providerCounts.set(item.provider, (providerCounts.get(item.provider) ?? 0) + 1);
  });

  console.log('Catalog Status');
  console.log(`Items: ${items.length}`);
  console.log(
    `Kinds: skill=${kindCounts.get('skill') ?? 0}, mcp=${kindCounts.get('mcp') ?? 0}, claude-plugin=${kindCounts.get('claude-plugin') ?? 0}, copilot-extension=${kindCounts.get('copilot-extension') ?? 0}`
  );
  console.log(
    `Providers: ${Array.from(providerCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => `${name}=${count}`)
      .join(', ')}`
  );
  console.log(`Whitelist approved: ${whitelist.size}`);
  console.log(`Quarantined: ${quarantine.length}`);

  const stale = getStaleRegistries(syncState);
  console.log(`Stale registries (>48h): ${stale.length === 0 ? 'none' : stale.join(', ')}`);

  if (verbose) {
    console.log('\nRegistry Sync State');
    Object.entries(syncState.registries)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([id, state]) => {
        console.log(`- ${id}: lastSuccessfulSyncAt=${state.lastSuccessfulSyncAt ?? 'n/a'}, updatedSince=${state.lastUpdatedSince ?? 'n/a'}`);
      });

    const risks = items
      .map((item) => ({ id: item.id, assessment: buildAssessment(item, policy) }))
      .sort((a, b) => b.assessment.riskScore - a.assessment.riskScore)
      .slice(0, 5);

    console.log('\nTop Risks');
    risks.forEach((entry) => {
      console.log(`- ${entry.id}: ${entry.assessment.riskTier} (${entry.assessment.riskScore.toFixed(0)})`);
    });
  }
}

async function handleInit(args: string[]): Promise<void> {
  const project = readFlag(args, '--project') ?? '.';
  const root = path.resolve(project);

  const [signals, items] = await Promise.all([detectProjectSignals(root), loadCatalogItems()]);
  const providers = Array.from(new Set(items.map((item) => item.provider))).sort((a, b) => a.localeCompare(b));

  let defaultKinds: CatalogKind[] = ['skill', 'mcp'];
  if (signals.stack.includes('node')) {
    defaultKinds = ['skill', 'mcp', 'copilot-extension'];
  }

  const defaults: LocalCliConfig = {
    defaultKinds,
    defaultProviders: providers,
    riskPosture: 'balanced',
    outputStyle: 'rich-table',
    initializedAt: new Date().toISOString()
  };

  if (stdout.isTTY) {
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      const kindsAnswer = await rl.question(
        `Default kinds [${defaults.defaultKinds.join(',')}] (comma list): `
      );
      if (kindsAnswer.trim().length > 0) {
        defaults.defaultKinds = kindsAnswer
          .split(',')
          .map((v) => CatalogKindSchema.parse(v.trim()));
      }

      const providerAnswer = await rl.question(
        `Default providers [${defaults.defaultProviders.join(',')}] (comma list): `
      );
      if (providerAnswer.trim().length > 0) {
        defaults.defaultProviders = providerAnswer
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      }

      const riskAnswer = await rl.question('Risk posture [balanced|strict] (default balanced): ');
      if (riskAnswer.trim() === 'strict') {
        defaults.riskPosture = 'strict';
      }

      const formatAnswer = await rl.question('Default output [rich-table|json] (default rich-table): ');
      if (formatAnswer.trim() === 'json') {
        defaults.outputStyle = 'json';
      }

      const syncAnswer = await rl.question('Run initial sync now? [Y/n]: ');
      if (syncAnswer.trim().toLowerCase() !== 'n') {
        await syncCatalogs();
      }
    } finally {
      rl.close();
    }
  } else {
    logger.info('Non-interactive shell detected; writing default .skills-mcps.json');
  }

  const file = path.join(root, '.skills-mcps.json');
  await fs.writeFile(file, `${JSON.stringify(defaults, null, 2)}\n`, 'utf8');

  console.log(`Initialized local CLI config: ${file}`);
  printHint('Run `npm run dev -- doctor` to verify local setup.');
}

async function handleDoctor(args: string[]): Promise<void> {
  const project = readFlag(args, '--project') ?? '.';
  const checks = await runDoctorChecks(project);

  const table = renderTable(
    [
      { key: 'name', header: 'CHECK', width: 22 },
      { key: 'status', header: 'STATUS', width: 8 },
      { key: 'message', header: 'MESSAGE', width: 48 },
      { key: 'suggestion', header: 'SUGGESTION', width: 42 }
    ],
    checks.map((check) => ({
      ...check,
      status:
        check.status === 'pass'
          ? colors.green('pass')
          : check.status === 'warn'
            ? colors.yellow('warn')
            : colors.red('fail'),
      suggestion: check.suggestion ?? ''
    }))
  );

  console.log(table);

  const failCount = checks.filter((c) => c.status === 'fail').length;
  if (failCount > 0) {
    printHint('Resolve failing checks before installation workflows.');
    throw new Error(`Doctor found ${failCount} failing checks.`);
  }
}

async function handleList(args: string[]): Promise<void> {
  const kinds = readKinds(args);
  const providers = readCsvList(args, '--provider');
  const search = readFlag(args, '--search')?.toLowerCase();
  const blockedFilter = readFlag(args, '--blocked');
  const riskTierFilter = readFlag(args, '--risk-tier');
  const limit = readLimit(args, 50);
  const sort = readSort(args, 'name');
  const format = readFlag(args, '--format') ?? 'table';

  const [items, quarantine, policy] = await Promise.all([loadCatalogItems(), loadQuarantine(), loadSecurityPolicy()]);
  const quarantined = new Set(quarantine.map((entry) => entry.id));

  let filtered = items.map((item) => {
    const assessment = buildAssessment(item, policy);
    const blocked = quarantined.has(item.id) || ['high', 'critical'].includes(assessment.riskTier);
    return {
      item,
      assessment,
      blocked
    };
  });

  if (kinds?.length) {
    const set = new Set(kinds);
    filtered = filtered.filter((entry) => set.has(entry.item.kind));
  }

  if (providers?.length) {
    const set = new Set(providers.map((p) => p.toLowerCase()));
    filtered = filtered.filter((entry) => set.has(entry.item.provider.toLowerCase()));
  }

  if (search) {
    filtered = filtered.filter((entry) => {
      const text = `${entry.item.id} ${entry.item.name} ${entry.item.capabilities.join(' ')}`.toLowerCase();
      return text.includes(search);
    });
  }

  if (blockedFilter) {
    const required = blockedFilter === 'true';
    filtered = filtered.filter((entry) => entry.blocked === required);
  }

  if (riskTierFilter) {
    filtered = filtered.filter((entry) => entry.assessment.riskTier === riskTierFilter);
  }

  filtered = sortCatalogRows(filtered, sort).slice(0, limit ?? 50);

  if (format === 'json') {
    printJson(
      filtered.map((entry) => ({
        id: entry.item.id,
        kind: entry.item.kind,
        provider: entry.item.provider,
        riskTier: entry.assessment.riskTier,
        riskScore: entry.assessment.riskScore,
        blocked: entry.blocked
      }))
    );
    return;
  }

  console.log(
    renderTable(
      [
        { key: 'id', header: 'ID', width: 32 },
        { key: 'kind', header: 'TYPE', width: 18 },
        { key: 'provider', header: 'PROVIDER', width: 12 },
        { key: 'risk', header: 'RISK', width: 12 },
        { key: 'blocked', header: 'BLOCKED', width: 8 }
      ],
      filtered.map((entry) => ({
        id: entry.item.id,
        kind: entry.item.kind,
        provider: entry.item.provider,
        risk: `${entry.assessment.riskTier}(${entry.assessment.riskScore.toFixed(0)})`,
        blocked: String(entry.blocked)
      }))
    )
  );

  printHint('Use `show --id <catalog-id>` for full detail.');
}

async function handleShow(args: string[]): Promise<void> {
  const id = readFlag(args, '--id');
  if (!id) {
    throw new Error('Usage: show --id <catalog-id>');
  }

  const [item, whitelist, quarantine] = await Promise.all([loadCatalogItemById(id), loadWhitelist(), loadQuarantine()]);
  if (!item) {
    throw new Error(`Catalog item not found: ${id}`);
  }

  const assessment = await assessRisk(item);
  const isQuarantined = quarantine.some((entry) => entry.id === item.id);

  printJson({
    ...item,
    risk: {
      tier: assessment.riskTier,
      score: assessment.riskScore,
      reasons: assessment.reasons
    },
    policyStatus: {
      approvedInWhitelist: whitelist.has(item.id),
      quarantined: isQuarantined
    }
  });

  printHint(`Install with: npm run dev -- install --id ${item.id} --yes`);
}

async function handleSearch(args: string[]): Promise<void> {
  const query = args[0]?.trim();
  if (!query) {
    throw new Error('Usage: search <query>');
  }

  const items = await loadCatalogItems();
  const needle = query.toLowerCase();

  const matches = items
    .map((item) => ({ item, score: computeSearchScore(item, needle) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, 20);

  if (matches.length === 0) {
    console.log(`No matches for "${query}".`);
    return;
  }

  console.log(
    renderTable(
      [
        { key: 'id', header: 'ID', width: 32 },
        { key: 'kind', header: 'TYPE', width: 18 },
        { key: 'provider', header: 'PROVIDER', width: 12 },
        { key: 'score', header: 'MATCH', width: 8 },
        { key: 'name', header: 'NAME', width: 34 }
      ],
      matches.map((entry) => ({
        id: entry.item.id,
        kind: entry.item.kind,
        provider: entry.item.provider,
        score: entry.score.toFixed(0),
        name: entry.item.name
      }))
    )
  );

  printHint('Use `show --id <catalog-id>` for full detail.');
}

async function handleScan(args: string[]): Promise<void> {
  const project = readFlag(args, '--project') ?? '.';
  const format = readFlag(args, '--format') ?? 'table';
  const llm = hasFlag(args, '--llm');
  const out = readFlag(args, '--out');

  const scan = await detectProjectSignals(path.resolve(project), { llm });
  const payload = {
    project: path.resolve(project),
    inferredArchetype: scan.inferredArchetype,
    inferenceConfidence: scan.inferenceConfidence,
    stack: scan.stack,
    compatibilityTags: scan.compatibilityTags,
    inferredCapabilities: scan.inferredCapabilities,
    archetypeScores: scan.archetypeScores,
    evidence: scan.scanEvidence
  };

  if (out) {
    await fs.writeFile(path.resolve(out), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`Wrote scan report to ${path.resolve(out)}`);
  }

  if (format === 'json') {
    printJson(payload);
    return;
  }

  console.log('Repository Scan');
  console.log(`Archetype: ${scan.inferredArchetype}`);
  console.log(`Confidence: ${scan.inferenceConfidence}%`);
  console.log(`Stack: ${scan.stack.join(', ') || 'none'}`);
  console.log(`Compatibility tags: ${scan.compatibilityTags.join(', ') || 'none'}`);
  console.log(`Inferred capabilities: ${scan.inferredCapabilities.join(', ') || 'none'}`);
  console.log('');

  if (scan.archetypeScores.length > 0) {
    console.log(
      renderTable(
        [
          { key: 'name', header: 'ARCHETYPE', width: 36 },
          { key: 'score', header: 'SCORE', width: 8 }
        ],
        scan.archetypeScores.slice(0, 8).map((row) => ({
          name: row.name,
          score: String(row.score)
        }))
      )
    );
    console.log('');
  }

  if (scan.scanEvidence.length > 0) {
    console.log('Evidence');
    scan.scanEvidence.slice(0, 16).forEach((line) => console.log(`- ${line}`));
    if (scan.scanEvidence.length > 16) {
      console.log(`- ...and ${scan.scanEvidence.length - 16} more`);
    }
  }

  printHint('Use `recommend --project . --explain-scan` to turn scan signals into ranked recommendations.');
}

async function handleTop(args: string[]): Promise<void> {
  const project = readFlag(args, '--project') ?? '.';
  const requirementsFile = readFlag(args, '--requirements');
  const kinds = readKinds(args);
  const limit = readLimit(args, 10) ?? 10;
  const llm = hasFlag(args, '--llm');

  const [projectSignals, requirements] = await Promise.all([
    detectProjectSignals(path.resolve(project), { llm }),
    loadRequirementsProfile(requirementsFile)
  ]);

  const ranked = await recommend({ projectSignals, requirements, kinds });
  const safe = ranked.filter((entry) => !entry.blocked).slice(0, limit);

  renderRecommendationsTable(safe, 'table');
  printHint('Use `show --id <catalog-id>` or `assess --id <catalog-id>` for deep inspection.');
}

async function handleSync(args: string[]): Promise<void> {
  const kinds = readKinds(args);
  const dryRun = hasFlag(args, '--dry-run');

  if (dryRun) {
    const registries = await loadRegistries();
    const selected = kinds?.length ? registries.filter((registry) => kinds.includes(registry.kind)) : registries;
    console.log('Sync Dry Run');
    selected.forEach((registry) => {
      console.log(`- ${registry.id} (${registry.kind}) entries=${registry.entries.length} remote=${registry.remote ? 'yes' : 'no'}`);
    });
    printHint('Run without --dry-run to persist synced catalogs.');
    return;
  }

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
  const providers = readCsvList(args, '--provider');
  const limit = readLimit(args);
  const onlySafe = hasFlag(args, '--only-safe');
  const sort = readSort(args);
  const exportFormat = readFlag(args, '--export');
  const exportPath = readFlag(args, '--out');
  const explainScan = hasFlag(args, '--explain-scan');
  const llm = hasFlag(args, '--llm');

  const [projectSignals, requirements] = await Promise.all([
    detectProjectSignals(path.resolve(project), { llm }),
    loadRequirementsProfile(requirementsFile)
  ]);

  if (explainScan) {
    const previewEvidence = projectSignals.scanEvidence.slice(0, 12);
    console.log('Project Scan');
    console.log(
      `- archetype: ${projectSignals.inferredArchetype} (${projectSignals.inferenceConfidence}% confidence)`
    );
    console.log(`- stack: ${projectSignals.stack.join(', ') || 'none'}`);
    console.log(`- compatibility tags: ${projectSignals.compatibilityTags.join(', ') || 'none'}`);
    console.log(
      `- inferred capabilities: ${projectSignals.inferredCapabilities.join(', ') || 'none'}`
    );
    if (previewEvidence.length > 0) {
      console.log('- evidence:');
      previewEvidence.forEach((line) => console.log(`  - ${line}`));
      if (projectSignals.scanEvidence.length > previewEvidence.length) {
        console.log(`  - ...and ${projectSignals.scanEvidence.length - previewEvidence.length} more`);
      }
    }
    console.log('');
  }

  let ranked = await recommend({ projectSignals, requirements, kinds });

  if (providers?.length) {
    const set = new Set(providers.map((provider) => provider.toLowerCase()));
    ranked = ranked.filter((entry) => set.has(entry.provider.toLowerCase()));
  }

  if (onlySafe) {
    ranked = ranked.filter((entry) => !entry.blocked);
  }

  ranked = sortRecommendations(ranked, sort);

  if (limit) {
    ranked = ranked.slice(0, limit);
  }

  if (format === 'json') {
    console.log(renderJson(ranked));
  } else {
    renderRecommendationsTable(ranked, format);
  }

  if (exportFormat) {
    if (!exportPath) {
      throw new Error('Missing --out for export. Example: --export csv --out recommendations.csv');
    }
    await exportRecommendations(ranked, exportFormat, exportPath);
    console.log(`Exported ${ranked.length} recommendations to ${exportPath}`);
  }

  printHint('Next: run `show --id <catalog-id>` or `install --id <catalog-id> --yes`.');
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
  console.log(renderJson(assessment));
}

async function handleInstall(args: string[]): Promise<void> {
  const id = readFlag(args, '--id');
  if (!id) {
    throw new Error('Missing --id for install');
  }

  const overrideRisk = hasFlag(args, '--override-risk');
  const yes = hasFlag(args, '--yes');

  const audit = await installWithSkillSh({ id, overrideRisk, yes });
  console.log(renderJson(audit));
}

async function handleWhitelist(args: string[]): Promise<void> {
  const subcommand = args[0];
  if (subcommand !== 'verify') {
    throw new Error('Usage: whitelist verify');
  }
  const allowFailures = hasFlag(args, '--allow-failures');

  const result = await verifyWhitelist();
  console.log(
    renderJson({
      reportPath: result.reportPath,
      failed: result.report.failed.length,
      staleRegistries: result.report.staleRegistries
    })
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
  console.log(renderJson(result));
}

function sortRecommendations(recommendations: Recommendation[], sort: SortKey): Recommendation[] {
  const sorted = [...recommendations];

  if (sort === 'name') {
    sorted.sort((a, b) => a.id.localeCompare(b.id));
    return sorted;
  }

  if (sort === 'trust') {
    sorted.sort((a, b) => b.scoreBreakdown.trustScore - a.scoreBreakdown.trustScore || b.rankScore - a.rankScore);
    return sorted;
  }

  if (sort === 'risk') {
    sorted.sort((a, b) => a.riskScore - b.riskScore || b.rankScore - a.rankScore);
    return sorted;
  }

  if (sort === 'fit') {
    sorted.sort((a, b) => b.scoreBreakdown.fitScore - a.scoreBreakdown.fitScore || b.rankScore - a.rankScore);
    return sorted;
  }

  sorted.sort((a, b) => b.rankScore - a.rankScore || a.id.localeCompare(b.id));
  return sorted;
}

function sortCatalogRows<T extends { item: CatalogItem; assessment: { riskScore: number }; blocked: boolean }>(
  rows: T[],
  sort: SortKey
): T[] {
  const copy = [...rows];
  if (sort === 'name') {
    copy.sort((a, b) => a.item.id.localeCompare(b.item.id));
    return copy;
  }
  if (sort === 'risk') {
    copy.sort((a, b) => a.assessment.riskScore - b.assessment.riskScore || a.item.id.localeCompare(b.item.id));
    return copy;
  }
  if (sort === 'trust') {
    copy.sort((a, b) => b.item.maintenanceSignal + b.item.provenanceSignal - (a.item.maintenanceSignal + a.item.provenanceSignal));
    return copy;
  }
  return copy.sort((a, b) => a.item.id.localeCompare(b.item.id));
}

function renderRecommendationsTable(recommendations: Recommendation[], format: string): void {
  if (format !== 'table') {
    console.log(renderJson(recommendations));
    return;
  }

  const rows = recommendations.map((entry) => {
    const riskLabel = `${entry.riskTier}(${entry.riskScore.toFixed(0)})`;
    return {
      id: entry.id,
      kind: entry.kind,
      provider: entry.provider,
      rank: `${entry.rankScore.toFixed(1)} ${scoreBar(entry.rankScore, 8)}`,
      trust: `${entry.scoreBreakdown.trustScore.toFixed(1)} ${scoreBar(entry.scoreBreakdown.trustScore, 8)}`,
      fit: `${entry.scoreBreakdown.fitScore.toFixed(1)}`,
      risk: colorRisk(entry.riskTier, riskLabel),
      blocked: entry.blocked ? colors.red('true') : colors.green('false')
    };
  });

  console.log(
    renderTable(
      [
        { key: 'id', header: 'ID', width: 32 },
        { key: 'kind', header: 'TYPE', width: 18 },
        { key: 'provider', header: 'PROVIDER', width: 10 },
        { key: 'rank', header: 'RANK', width: 18 },
        { key: 'trust', header: 'TRUST', width: 18 },
        { key: 'fit', header: 'FIT', width: 6 },
        { key: 'risk', header: 'RISK', width: 16 },
        { key: 'blocked', header: 'BLOCKED', width: 8 }
      ],
      rows
    )
  );
}

async function exportRecommendations(
  recommendations: Recommendation[],
  exportFormat: string,
  outputPath: string
): Promise<void> {
  const headers = ['id', 'kind', 'provider', 'rankScore', 'trustScore', 'fitScore', 'riskTier', 'riskScore', 'blocked'];
  const rows = recommendations.map((entry) => [
    entry.id,
    entry.kind,
    entry.provider,
    entry.rankScore.toFixed(1),
    entry.scoreBreakdown.trustScore.toFixed(1),
    entry.scoreBreakdown.fitScore.toFixed(1),
    entry.riskTier,
    entry.riskScore.toFixed(0),
    String(entry.blocked)
  ]);

  let content: string;
  if (exportFormat === 'csv') {
    content = renderCsv(headers, rows);
  } else if (exportFormat === 'md') {
    content = renderMarkdown(headers, rows);
  } else {
    throw new Error(`Unsupported export format: ${exportFormat}. Expected csv or md.`);
  }

  await fs.writeFile(path.resolve(outputPath), content, 'utf8');
}

function computeSearchScore(item: CatalogItem, query: string): number {
  let score = 0;

  const id = item.id.toLowerCase();
  const name = item.name.toLowerCase();
  const capabilities = item.capabilities.map((capability) => capability.toLowerCase());

  if (id === query) {
    score += 120;
  }
  if (id.includes(query)) {
    score += 60;
  }
  if (name.includes(query)) {
    score += 50;
  }
  if (capabilities.some((capability) => capability.includes(query))) {
    score += 30;
  }

  return score;
}

function printHelp(): void {
  logger.info('Commands:');
  logger.info('  about');
  logger.info('  init [--project .]');
  logger.info('  doctor [--project .]');
  logger.info('  status [--verbose]');
  logger.info('  sync [--kind skill,mcp,claude-plugin,copilot-extension] [--dry-run]');
  logger.info('  list [--kind ...] [--provider ...] [--risk-tier low|medium|high|critical] [--blocked true|false] [--search q] [--limit n] [--sort name|risk|trust] [--format json|table]');
  logger.info('  search <query>');
  logger.info('  scan [--project .] [--format table|json] [--out scan-report.json] [--llm]');
  logger.info('  show --id <catalog-id>');
  logger.info('  top [--project .] [--requirements requirements.yml] [--kind ...] [--limit n] [--llm]');
  logger.info('  recommend --project . --requirements requirements.yml --format json|table [--kind ...] [--provider ...] [--limit n] [--sort score|trust|risk|fit|name] [--only-safe] [--explain-scan] [--llm] [--export csv|md --out file]');
  logger.info('  assess --id <catalog-id>');
  logger.info('  install --id <catalog-id> [--yes] [--override-risk]');
  logger.info('  whitelist verify');
  logger.info('  quarantine apply --report <path>');
}
