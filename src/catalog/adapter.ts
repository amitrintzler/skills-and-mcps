import type { Registry } from '../lib/validation/contracts.js';

export function adaptRegistryEntries(registry: Registry, entries: unknown[]): unknown[] {
  if (registry.adapter === 'mcp-registry-v0.1') {
    return adaptMcpRegistryEntries(registry.id, entries);
  }

  return entries;
}

function adaptMcpRegistryEntries(sourceId: string, entries: unknown[]): unknown[] {
  return entries
    .map((entry) => mapMcpRegistryEntry(sourceId, entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function mapMcpRegistryEntry(sourceId: string, entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const name = readString(record, ['name', 'id']);
  if (!name) {
    return null;
  }

  const title = readString(record, ['title', 'displayName']) ?? name;
  const description = readString(record, ['description']) ?? `MCP server ${name}`;
  const packages = Array.isArray(record.packages) ? (record.packages as unknown[]) : [];

  const packageRecords = packages
    .filter((pkg) => pkg && typeof pkg === 'object' && !Array.isArray(pkg))
    .map((pkg) => pkg as Record<string, unknown>);

  const firstPackage = packageRecords[0] ?? {};
  const transport = normalizeTransport(readNestedString(firstPackage, ['transport', 'type']) ?? readString(record, ['transport']));
  const authModel = normalizeAuthModel(readString(record, ['authModel', 'auth']));

  const compatibility = dedupe(
    packageRecords.flatMap((pkg) => detectCompatibilityFromPackage(pkg)).concat(['general'])
  );

  const capabilities = dedupe(
    extractStringArray(record, ['capabilities', 'tools']).concat(extractStringArray(record, ['tags']))
  );

  const target =
    readNestedString(firstPackage, ['identifier']) ??
    readNestedString(firstPackage, ['name']) ??
    name;

  return {
    id: `mcp:${name}`,
    name: title,
    transport,
    authModel,
    capabilities,
    compatibility,
    source: sourceId,
    install: {
      kind: 'skill.sh',
      target,
      args: []
    },
    adoptionSignal: 50,
    maintenanceSignal: 50,
    securitySignals: {
      knownVulnerabilities: 0,
      suspiciousPatterns: 0,
      injectionFindings: 0,
      exfiltrationSignals: 0,
      integrityAlerts: 0
    },
    description
  };
}

function normalizeTransport(value: string | undefined): 'stdio' | 'http' | 'sse' | 'websocket' {
  const normalized = value?.toLowerCase();
  if (normalized === 'http') {
    return 'http';
  }
  if (normalized === 'sse') {
    return 'sse';
  }
  if (normalized === 'websocket' || normalized === 'ws') {
    return 'websocket';
  }
  return 'stdio';
}

function normalizeAuthModel(value: string | undefined): 'none' | 'api_key' | 'oauth' | 'custom' {
  const normalized = value?.toLowerCase();
  if (normalized === 'none' || normalized === 'noauth') {
    return 'none';
  }
  if (normalized === 'api_key' || normalized === 'apikey' || normalized === 'bearer') {
    return 'api_key';
  }
  if (normalized === 'oauth' || normalized === 'oauth2') {
    return 'oauth';
  }
  return 'custom';
}

function detectCompatibilityFromPackage(pkg: Record<string, unknown>): string[] {
  const words = [
    readString(pkg, ['registryType']) ?? '',
    readString(pkg, ['runtime']) ?? '',
    readString(pkg, ['name']) ?? '',
    readString(pkg, ['identifier']) ?? ''
  ]
    .join(' ')
    .toLowerCase();

  const tags: string[] = [];
  if (words.includes('npm') || words.includes('node')) {
    tags.push('node');
  }
  if (words.includes('pypi') || words.includes('python')) {
    tags.push('python');
  }
  if (words.includes('docker') || words.includes('container')) {
    tags.push('container');
  }

  return tags;
}

function extractStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }

    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }

  return [];
}

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function readNestedString(record: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = record;

  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' && current.trim().length > 0 ? current.trim() : undefined;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((a, b) =>
    a.localeCompare(b)
  );
}
