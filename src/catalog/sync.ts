import { loadRegistries } from '../config/runtime.js';
import { logger } from '../lib/logger.js';
import type { CatalogMcpServer, CatalogSkill } from '../lib/validation/contracts.js';
import { mergeMcpsById, normalizeMcps } from '../mcps/normalize.js';
import { mergeSkillsById, normalizeSkills } from '../skills/normalize.js';
import { adaptRegistryEntries } from './adapter.js';
import { resolveRegistryEntries } from './remote-registry.js';
import { getUpdatedSince, loadSyncState, saveSyncState, setUpdatedSince } from './sync-state.js';

import { saveMcpsCatalog, saveSkillsCatalog } from './repository.js';

export async function syncCatalogs(today = new Date().toISOString().slice(0, 10)): Promise<{
  skills: CatalogSkill[];
  mcps: CatalogMcpServer[];
}> {
  const registries = await loadRegistries();
  let syncState = await loadSyncState();

  const allSkills: CatalogSkill[] = [];
  const allMcps: CatalogMcpServer[] = [];

  for (const registry of registries) {
    const updatedSince = registry.remote?.supportsUpdatedSince
      ? getUpdatedSince(syncState, registry.id)
      : undefined;
    const entries = await resolveRegistryEntries(registry, { updatedSince });
    const adaptedEntries = adaptRegistryEntries(registry, entries);

    if (registry.kind === 'skill') {
      allSkills.push(...normalizeSkills(adaptedEntries, registry.id, today));
    }

    if (registry.kind === 'mcp') {
      allMcps.push(...normalizeMcps(adaptedEntries, registry.id, today));
    }

    if (registry.remote?.supportsUpdatedSince && entries !== registry.entries) {
      syncState = setUpdatedSince(syncState, registry.id, new Date().toISOString());
    }
  }

  const mergedSkills = mergeSkillsById(allSkills);
  const mergedMcps = mergeMcpsById(allMcps);

  await Promise.all([saveSkillsCatalog(mergedSkills), saveMcpsCatalog(mergedMcps)]);
  await saveSyncState(syncState);

  logger.info(`Synced ${mergedSkills.length} skills and ${mergedMcps.length} MCP servers`);

  return { skills: mergedSkills, mcps: mergedMcps };
}
