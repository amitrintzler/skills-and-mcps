import { dedupe, readString, sanitizeUrl, slugify, stripHtml, toCount, toScore } from './shared.js';

const TRUSTED_HOSTS = ['github.com', 'raw.githubusercontent.com'];

export function adaptCopilotPluginMarketplaceEntries(sourceId: string, entries: unknown[]): unknown[] {
  const seen = new Set<string>();
  const mapped: Record<string, unknown>[] = [];

  for (const entry of entries) {
    const candidate = mapCopilotMarketplaceEntry(sourceId, entry);
    if (!candidate) {
      continue;
    }
    const candidateId = candidate.id;
    if (typeof candidateId !== 'string') {
      continue;
    }
    if (seen.has(candidateId)) {
      continue;
    }
    seen.add(candidateId);
    mapped.push(candidate);
  }

  return mapped;
}

function mapCopilotMarketplaceEntry(
  sourceId: string,
  entry: unknown
): Record<string, unknown> | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const rawName = readString(record, ['name', 'title', 'id']);
  if (!rawName) {
    return null;
  }

  const slug = slugify(rawName);
  if (!slug) {
    return null;
  }

  const description =
    stripHtml(readString(record, ['description']) ?? `Copilot extension plugin ${rawName}`, 320) ||
    `Copilot extension plugin ${rawName}`;
  const source = sanitizeUrl(readString(record, ['source', 'url', 'homepage']), TRUSTED_HOSTS);
  const version = readString(record, ['version']);
  const skills = extractSkills(record.skills);
  const capabilities = dedupe(
    extractTags(record)
      .concat(skills)
      .concat(['automation'])
  );

  return {
    id: `copilot-extension:${slug}`,
    kind: 'copilot-extension',
    provider: 'github',
    name: rawName.trim().slice(0, 120),
    description,
    capabilities,
    compatibility: ['copilot', 'github'],
    source: sourceId,
    install: {
      kind: 'manual',
      instructions: 'Enable this plugin from GitHub Copilot marketplace settings.',
      ...(source ? { url: source } : {})
    },
    adoptionSignal: toScore(record.adoptionSignal, 62),
    maintenanceSignal: toScore(record.maintenanceSignal, version ? 76 : 68),
    provenanceSignal: toScore(record.provenanceSignal, 88),
    freshnessSignal: toScore(record.freshnessSignal, version ? 74 : 64),
    securitySignals: {
      knownVulnerabilities: toCount(record.knownVulnerabilities),
      suspiciousPatterns: toCount(record.suspiciousPatterns),
      injectionFindings: toCount(record.injectionFindings),
      exfiltrationSignals: toCount(record.exfiltrationSignals),
      integrityAlerts: toCount(record.integrityAlerts)
    },
    metadata: {
      catalogType: 'plugin',
      sourceRepo: sourceId.includes('awesome') ? 'github/awesome-copilot' : 'github/copilot-plugins',
      rawVersion: version ?? 'unknown',
      sourceConfidence: sourceId.includes('awesome') ? 'vetted-curated' : 'official'
    }
  };
}

function extractTags(record: Record<string, unknown>): string[] {
  const tags: string[] = [];
  const raw = record.tags;
  if (Array.isArray(raw)) {
    for (const tag of raw) {
      if (typeof tag === 'string' && tag.trim().length > 0) {
        tags.push(tag.trim().toLowerCase());
      }
    }
  }

  const category = readString(record, ['category']);
  if (category) {
    tags.push(category.toLowerCase());
  }

  return dedupe(tags);
}

function extractSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const skills: string[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const name = readString(record, ['name']);
    if (name) {
      skills.push(name.toLowerCase());
    }
    const commands = record.commands;
    if (Array.isArray(commands)) {
      for (const command of commands) {
        if (typeof command === 'string' && command.trim().length > 0) {
          skills.push(command.trim().toLowerCase());
        }
      }
    }
  }

  return dedupe(skills);
}
