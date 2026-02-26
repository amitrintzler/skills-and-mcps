import fs from 'fs-extra';

import { readJsonFile, writeJsonFile } from '../lib/json.js';
import { getPackagePath, getStatePath } from '../lib/paths.js';
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

const ITEMS_REL_PATH = 'data/catalog/items.json';
const SKILLS_REL_PATH = 'data/catalog/skills.json';
const MCPS_REL_PATH = 'data/catalog/mcps.json';
const WHITELIST_REL_PATH = 'data/whitelist/approved.json';
const QUARANTINE_REL_PATH = 'data/quarantine/quarantined.json';

export function getItemsPath(): string {
  return getStatePath(ITEMS_REL_PATH);
}

export function getSkillsPath(): string {
  return getStatePath(SKILLS_REL_PATH);
}

export function getMcpsPath(): string {
  return getStatePath(MCPS_REL_PATH);
}

export function getWhitelistPath(): string {
  return getStatePath(WHITELIST_REL_PATH);
}

export function getQuarantinePath(): string {
  return getStatePath(QUARANTINE_REL_PATH);
}

function getDefaultItemsPath(): string {
  return getPackagePath(ITEMS_REL_PATH);
}

function getDefaultSkillsPath(): string {
  return getPackagePath(SKILLS_REL_PATH);
}

function getDefaultMcpsPath(): string {
  return getPackagePath(MCPS_REL_PATH);
}

function getDefaultWhitelistPath(): string {
  return getPackagePath(WHITELIST_REL_PATH);
}

function getDefaultQuarantinePath(): string {
  return getPackagePath(QUARANTINE_REL_PATH);
}

export async function loadCatalogItems(): Promise<CatalogItem[]> {
  const primaryPath = getItemsPath();
  if (await fs.pathExists(primaryPath)) {
    return parseCatalogItems(await readJsonFile<unknown[]>(primaryPath));
  }

  const fallbackPath = getDefaultItemsPath();
  if (await fs.pathExists(fallbackPath)) {
    return parseCatalogItems(await readJsonFile<unknown[]>(fallbackPath));
  }

  return loadLegacyItems();
}

async function loadLegacyItems(): Promise<CatalogItem[]> {
  const [skills, mcps] = await Promise.all([loadSkillsCatalog(), loadMcpsCatalog()]);
  return [...skills, ...mcps];
}

export async function loadSkillsCatalog(): Promise<CatalogSkill[]> {
  const raw = await readArrayFromStateOrPackage(getSkillsPath(), getDefaultSkillsPath());
  return raw.map((entry) => {
    const value = ensureObject(entry);
    return CatalogSkillSchema.parse({ ...value, kind: 'skill', provider: readProvider(entry, 'openai') });
  });
}

export async function loadMcpsCatalog(): Promise<CatalogMcpServer[]> {
  const raw = await readArrayFromStateOrPackage(getMcpsPath(), getDefaultMcpsPath());
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
  await writeJsonFile(getItemsPath(), records);
}

export async function saveSkillsCatalog(records: CatalogSkill[]): Promise<void> {
  await writeJsonFile(getSkillsPath(), records);
}

export async function saveMcpsCatalog(records: CatalogMcpServer[]): Promise<void> {
  await writeJsonFile(getMcpsPath(), records);
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
  const raw = await readObjectFromStateOrPackage(getWhitelistPath(), getDefaultWhitelistPath());
  if (!raw) {
    return new Set();
  }

  const parsed = WhitelistFileSchema.parse(raw);
  return new Set(parsed.approved);
}

export async function saveWhitelist(ids: Iterable<string>): Promise<void> {
  const approved = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
  await writeJsonFile(getWhitelistPath(), { approved });
}

export async function loadQuarantine(): Promise<QuarantineEntry[]> {
  const raw = await readObjectFromStateOrPackage(getQuarantinePath(), getDefaultQuarantinePath());
  if (!raw) {
    return [];
  }

  const parsed = QuarantineFileSchema.parse(raw);
  return parsed.quarantined;
}

export async function saveQuarantine(entries: QuarantineEntry[]): Promise<void> {
  const deduped = new Map<string, QuarantineEntry>();
  entries.forEach((entry) => deduped.set(entry.id, entry));

  const sorted = Array.from(deduped.values()).sort((a, b) => a.id.localeCompare(b.id));
  await writeJsonFile(getQuarantinePath(), { quarantined: sorted });
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

async function readArrayFromStateOrPackage(statePath: string, packagePath: string): Promise<unknown[]> {
  const preferred = await readObjectFromStateOrPackage(statePath, packagePath);
  if (!preferred) {
    return [];
  }

  return Array.isArray(preferred) ? preferred : [];
}

async function readObjectFromStateOrPackage(statePath: string, packagePath: string): Promise<unknown | null> {
  if (await fs.pathExists(statePath)) {
    return readJsonFile<unknown>(statePath);
  }

  if (await fs.pathExists(packagePath)) {
    return readJsonFile<unknown>(packagePath);
  }

  return null;
}

function parseCatalogItems(raw: unknown[]): CatalogItem[] {
  return raw.map((entry) => CatalogItemSchema.parse(entry));
}
