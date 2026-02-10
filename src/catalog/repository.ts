import path from 'node:path';

import fs from 'fs-extra';

import { readJsonFile, writeJsonFile } from '../lib/json.js';
import {
  CatalogItemSchema,
  CatalogMcpServerSchema,
  CatalogSkillSchema,
  QuarantineFileSchema,
  WhitelistFileSchema,
  type CatalogItem,
  type CatalogMcpServer,
  type CatalogSkill,
  type QuarantineEntry
} from '../lib/validation/contracts.js';

export const ITEMS_PATH = 'data/catalog/items.json';
export const SKILLS_PATH = 'data/catalog/skills.json';
export const MCPS_PATH = 'data/catalog/mcps.json';
export const WHITELIST_PATH = 'data/whitelist/approved.json';
export const QUARANTINE_PATH = 'data/quarantine/quarantined.json';

export async function loadCatalogItems(): Promise<CatalogItem[]> {
  if (!(await fs.pathExists(path.resolve(ITEMS_PATH)))) {
    return loadLegacyItems();
  }

  const raw = await readJsonFile<unknown[]>(ITEMS_PATH);
  return raw.map((entry) => CatalogItemSchema.parse(entry));
}

async function loadLegacyItems(): Promise<CatalogItem[]> {
  const [skills, mcps] = await Promise.all([loadSkillsCatalog(), loadMcpsCatalog()]);
  return [...skills, ...mcps];
}

export async function loadSkillsCatalog(): Promise<CatalogSkill[]> {
  const raw = await readJsonFile<unknown[]>(SKILLS_PATH);
  return raw.map((entry) => {
    const value = ensureObject(entry);
    return CatalogSkillSchema.parse({ ...value, kind: 'skill', provider: readProvider(entry, 'openai') });
  });
}

export async function loadMcpsCatalog(): Promise<CatalogMcpServer[]> {
  const raw = await readJsonFile<unknown[]>(MCPS_PATH);
  return raw.map((entry) => {
    const value = ensureObject(entry);
    return CatalogMcpServerSchema.parse({ ...value, kind: 'mcp', provider: readProvider(entry, 'mcp') });
  });
}

function readProvider(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }
  const provider = (value as Record<string, unknown>).provider;
  return typeof provider === 'string' && provider.trim().length > 0 ? provider.trim() : fallback;
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export async function saveCatalogItems(records: CatalogItem[]): Promise<void> {
  await writeJsonFile(ITEMS_PATH, records);
}

export async function saveSkillsCatalog(records: CatalogSkill[]): Promise<void> {
  await writeJsonFile(SKILLS_PATH, records);
}

export async function saveMcpsCatalog(records: CatalogMcpServer[]): Promise<void> {
  await writeJsonFile(MCPS_PATH, records);
}

export async function saveLegacyCatalogViews(records: CatalogItem[]): Promise<void> {
  const skills = records
    .filter((item): item is CatalogSkill => item.kind === 'skill')
    .map((item) => CatalogSkillSchema.parse(item));
  const mcps = records
    .filter((item): item is CatalogMcpServer => item.kind === 'mcp')
    .map((item) => CatalogMcpServerSchema.parse(item));

  await Promise.all([saveSkillsCatalog(skills), saveMcpsCatalog(mcps)]);
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
  const deduped = new Map<string, QuarantineEntry>();
  entries.forEach((entry) => deduped.set(entry.id, entry));

  const sorted = Array.from(deduped.values()).sort((a, b) => a.id.localeCompare(b.id));
  await writeJsonFile(QUARANTINE_PATH, { quarantined: sorted });
}

export async function loadCatalogItemById(id: string): Promise<CatalogItem | null> {
  const records = await loadCatalogItems();
  return records.find((entry) => entry.id === id) ?? null;
}

export async function loadCatalogById(
  id: string
): Promise<{ kind: 'skill'; item: CatalogSkill } | { kind: 'mcp'; item: CatalogMcpServer } | { kind: CatalogItem['kind']; item: CatalogItem } | null> {
  const found = await loadCatalogItemById(id);
  if (!found) {
    return null;
  }

  if (found.kind === 'skill') {
    return { kind: 'skill', item: CatalogSkillSchema.parse(found) };
  }

  if (found.kind === 'mcp') {
    return { kind: 'mcp', item: CatalogMcpServerSchema.parse(found) };
  }

  return { kind: found.kind, item: found };
}
