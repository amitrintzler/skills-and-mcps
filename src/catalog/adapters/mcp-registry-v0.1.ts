import { dedupe, extractStringArray, readNestedString, readString } from './shared.js';

export function adaptMcpRegistryEntries(sourceId: string, entries: unknown[]): unknown[] {
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

  const target = readNestedString(firstPackage, ['identifier']) ?? readNestedString(firstPackage, ['name']) ?? name;

  return {
    id: `mcp:${name}`,
    kind: 'mcp',
    provider: 'mcp',
    name: title,
    description,
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
    provenanceSignal: 90,
    freshnessSignal: 60,
    securitySignals: {
      knownVulnerabilities: 0,
      suspiciousPatterns: 0,
      injectionFindings: 0,
      exfiltrationSignals: 0,
      integrityAlerts: 0
    }
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
