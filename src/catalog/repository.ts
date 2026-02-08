import path from 'node:path';

import fs from 'fs-extra';

import { readJsonFile, writeJsonFile } from '../lib/json.js';
import {
  CatalogMcpServerSchema,
  CatalogSkillSchema,
  QuarantineFileSchema,
  WhitelistFileSchema,
  type CatalogMcpServer,
  type CatalogSkill,
  type QuarantineEntry
} from '../lib/validation/contracts.js';

export const SKILLS_PATH = 'data/catalog/skills.json';
export const MCPS_PATH = 'data/catalog/mcps.json';
export const WHITELIST_PATH = 'data/whitelist/approved.json';
export const QUARANTINE_PATH = 'data/quarantine/quarantined.json';

export async function loadSkillsCatalog(): Promise<CatalogSkill[]> {
  const raw = await readJsonFile<unknown[]>(SKILLS_PATH);
  return raw.map((entry) => CatalogSkillSchema.parse(entry));
}

export async function loadMcpsCatalog(): Promise<CatalogMcpServer[]> {
  const raw = await readJsonFile<unknown[]>(MCPS_PATH);
  return raw.map((entry) => CatalogMcpServerSchema.parse(entry));
}

export async function saveSkillsCatalog(records: CatalogSkill[]): Promise<void> {
  await writeJsonFile(SKILLS_PATH, records);
}

export async function saveMcpsCatalog(records: CatalogMcpServer[]): Promise<void> {
  await writeJsonFile(MCPS_PATH, records);
}

export async function loadWhitelist(): Promise<Set<string>> {
  if (!(await fs.pathExists(path.resolve(WHITELIST_PATH)))) {
    return new Set();
  }

  const raw = await readJsonFile<unknown>(WHITELIST_PATH);
  const parsed = WhitelistFileSchema.parse(raw);
  return new Set(parsed.approved);
}

export async function saveWhitelist(ids: Iterable<string>): Promise<void> {
  const approved = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
  await writeJsonFile(WHITELIST_PATH, { approved });
}

export async function loadQuarantine(): Promise<QuarantineEntry[]> {
  if (!(await fs.pathExists(path.resolve(QUARANTINE_PATH)))) {
    return [];
  }

  const raw = await readJsonFile<unknown>(QUARANTINE_PATH);
  const parsed = QuarantineFileSchema.parse(raw);
  return parsed.quarantined;
}

export async function saveQuarantine(entries: QuarantineEntry[]): Promise<void> {
  const existing = await loadQuarantine();
  const deduped = new Map<string, QuarantineEntry>();

  existing.forEach((entry) => deduped.set(entry.id, entry));
  entries.forEach((entry) => deduped.set(entry.id, entry));

  const sorted = Array.from(deduped.values()).sort((a, b) => a.id.localeCompare(b.id));
  await writeJsonFile(QUARANTINE_PATH, { quarantined: sorted });
}

export async function loadCatalogById(
  id: string
): Promise<{ kind: 'skill'; item: CatalogSkill } | { kind: 'mcp'; item: CatalogMcpServer } | null> {
  const [skills, mcps] = await Promise.all([loadSkillsCatalog(), loadMcpsCatalog()]);
  const skill = skills.find((entry) => entry.id === id);
  if (skill) {
    return { kind: 'skill', item: skill };
  }

  const mcp = mcps.find((entry) => entry.id === id);
  if (mcp) {
    return { kind: 'mcp', item: mcp };
  }

  return null;
}
