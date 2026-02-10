import { dedupe, extractStringArray, readNestedString, readString, toCount, toScore } from './shared.js';

export function adaptClaudePluginsEntries(sourceId: string, entries: unknown[]): unknown[] {
  return entries
    .map((entry) => mapClaudePluginEntry(sourceId, entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function mapClaudePluginEntry(sourceId: string, entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const slug = readString(record, ['slug', 'id', 'name']);
  if (!slug) {
    return null;
  }

  const name = readString(record, ['title', 'name']) ?? slug;
  const description = readString(record, ['description', 'summary']) ?? `Claude plugin ${name}`;
  const capabilities = dedupe(
    extractStringArray(record, ['capabilities', 'tools']).concat(extractStringArray(record, ['tags']))
  );

  const compatibility = dedupe(
    extractStringArray(record, ['compatibility', 'targets']).concat(['claude'])
  );

  const installUrl = readNestedString(record, ['install', 'url']) ?? readString(record, ['url']);
  const instructions = readNestedString(record, ['install', 'instructions']) ?? 'Enable from Claude plugin catalog.';

  return {
    id: slug.startsWith('claude-plugin:') ? slug : `claude-plugin:${slug}`,
    kind: 'claude-plugin',
    provider: 'anthropic',
    name,
    description,
    capabilities,
    compatibility,
    source: sourceId,
    install: {
      kind: 'manual',
      instructions,
      ...(installUrl ? { url: installUrl } : {})
    },
    adoptionSignal: toScore(record.adoptionSignal),
    maintenanceSignal: toScore(record.maintenanceSignal),
    provenanceSignal: toScore(record.provenanceSignal, 95),
    freshnessSignal: toScore(record.freshnessSignal, 65),
    securitySignals: {
      knownVulnerabilities: toCount(record.knownVulnerabilities),
      suspiciousPatterns: toCount(record.suspiciousPatterns),
      injectionFindings: toCount(record.injectionFindings),
      exfiltrationSignals: toCount(record.exfiltrationSignals),
      integrityAlerts: toCount(record.integrityAlerts)
    }
  };
}
