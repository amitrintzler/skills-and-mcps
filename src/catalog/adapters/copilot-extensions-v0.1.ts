import { dedupe, extractStringArray, readNestedStringArray, readString, toCount, toScore } from './shared.js';

export function adaptCopilotExtensionsEntries(sourceId: string, entries: unknown[]): unknown[] {
  return entries
    .map((entry) => mapCopilotExtensionEntry(sourceId, entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function mapCopilotExtensionEntry(sourceId: string, entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const slug = readString(record, ['slug', 'id', 'name']);
  if (!slug) {
    return null;
  }

  const name = readString(record, ['title', 'name']) ?? slug;
  const description = readString(record, ['description', 'summary']) ?? `Copilot extension ${name}`;
  const capabilities = dedupe(
    extractStringArray(record, ['capabilities', 'tools']).concat(extractStringArray(record, ['tags']))
  );

  const compatibility = dedupe(
    extractStringArray(record, ['compatibility', 'targets']).concat(['copilot', 'github'])
  );

  const installTarget = readString(record, ['installId', 'name']) ?? slug;
  const installArgs = readNestedStringArray(record, ['install', 'args']);

  return {
    id: slug.startsWith('copilot-extension:') ? slug : `copilot-extension:${slug}`,
    kind: 'copilot-extension',
    provider: 'github',
    name,
    description,
    capabilities,
    compatibility,
    source: sourceId,
    install: {
      kind: 'gh-cli',
      target: 'copilot-extension',
      args: installArgs.length > 0 ? installArgs : ['install', installTarget]
    },
    adoptionSignal: toScore(record.adoptionSignal),
    maintenanceSignal: toScore(record.maintenanceSignal),
    provenanceSignal: toScore(record.provenanceSignal, 96),
    freshnessSignal: toScore(record.freshnessSignal, 70),
    securitySignals: {
      knownVulnerabilities: toCount(record.knownVulnerabilities),
      suspiciousPatterns: toCount(record.suspiciousPatterns),
      injectionFindings: toCount(record.injectionFindings),
      exfiltrationSignals: toCount(record.exfiltrationSignals),
      integrityAlerts: toCount(record.integrityAlerts)
    }
  };
}
