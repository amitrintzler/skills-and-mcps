import { dedupe, extractStringArray, readNestedString, readNestedStringArray, readString, toCount, toScore } from './shared.js';

export function adaptOpenAiSkillsEntries(sourceId: string, entries: unknown[]): unknown[] {
  return entries
    .map((entry) => mapOpenAiSkillEntry(sourceId, entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function mapOpenAiSkillEntry(sourceId: string, entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const slug = readString(record, ['slug', 'id', 'name']);
  if (!slug) {
    return null;
  }

  const name = readString(record, ['title', 'name']) ?? slug;
  const description = readString(record, ['description', 'summary']) ?? `Skill ${name}`;
  const capabilities = dedupe(
    extractStringArray(record, ['capabilities', 'tags']).concat(extractStringArray(record, ['features']))
  );
  const compatibility = dedupe(
    extractStringArray(record, ['compatibility', 'runtimes']).concat(extractStringArray(record, ['frameworks']))
  );

  const installTarget =
    readNestedString(record, ['install', 'target']) ?? readString(record, ['package', 'name']) ?? slug;
  const installArgs = readNestedStringArray(record, ['install', 'args']);

  return {
    id: slug.startsWith('skill:') ? slug : `skill:${slug}`,
    kind: 'skill',
    provider: 'openai',
    name,
    description,
    capabilities,
    compatibility: compatibility.length > 0 ? compatibility : ['general'],
    source: sourceId,
    install: {
      kind: 'skill.sh',
      target: installTarget,
      args: installArgs
    },
    adoptionSignal: toScore(record.adoptionSignal),
    maintenanceSignal: toScore(record.maintenanceSignal),
    provenanceSignal: toScore(record.provenanceSignal, 75),
    freshnessSignal: toScore(record.freshnessSignal, 55),
    securitySignals: {
      knownVulnerabilities: toCount(record.knownVulnerabilities),
      suspiciousPatterns: toCount(record.suspiciousPatterns),
      injectionFindings: toCount(record.injectionFindings),
      exfiltrationSignals: toCount(record.exfiltrationSignals),
      integrityAlerts: toCount(record.integrityAlerts)
    }
  };
}
