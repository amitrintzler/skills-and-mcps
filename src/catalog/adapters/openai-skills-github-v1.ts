import { dedupe, readString } from './shared.js';

export function adaptOpenAiSkillsGitHubEntries(sourceId: string, entries: unknown[]): unknown[] {
  return entries
    .map((entry) => mapGitHubSkillEntry(sourceId, entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function mapGitHubSkillEntry(sourceId: string, entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const type = readString(record, ['type'])?.toLowerCase();
  const path = readString(record, ['path']) ?? '';
  const slug = readString(record, ['name']) ?? path.split('/').at(-1);

  if (!slug || type !== 'dir') {
    return null;
  }

  if (path && !/^skills\/\.curated\/[^/]+$/.test(path)) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  const htmlUrl = readString(record, ['html_url']) ?? `https://github.com/openai/skills/tree/main/skills/.curated/${normalizedSlug}`;
  const capabilityHints = inferCapabilitiesFromSlug(normalizedSlug);

  return {
    id: normalizedSlug.startsWith('skill:') ? normalizedSlug : `skill:${normalizedSlug}`,
    kind: 'skill',
    provider: 'openai',
    name: toTitle(normalizedSlug),
    description: `OpenAI curated Codex skill: ${normalizedSlug}.`,
    capabilities: capabilityHints,
    compatibility: inferCompatibilityFromSlug(normalizedSlug),
    source: sourceId,
    install: {
      kind: 'manual',
      instructions: `Install with skill-installer from openai/skills path skills/.curated/${normalizedSlug}`,
      url: htmlUrl
    },
    adoptionSignal: 72,
    maintenanceSignal: 82,
    provenanceSignal: 96,
    freshnessSignal: 80,
    securitySignals: {
      knownVulnerabilities: 0,
      suspiciousPatterns: 0,
      injectionFindings: 0,
      exfiltrationSignals: 0,
      integrityAlerts: 0
    },
    metadata: {
      githubPath: path || `skills/.curated/${normalizedSlug}`,
      githubUrl: htmlUrl
    }
  };
}

function inferCapabilitiesFromSlug(slug: string): string[] {
  const tokens = slug.split(/[-_/]/g).filter(Boolean);
  const capabilities: string[] = [];

  if (tokens.some((token) => ['security', 'threat', 'ownership'].includes(token))) {
    capabilities.push('security');
  }
  if (tokens.some((token) => ['deploy', 'release', 'render', 'vercel', 'netlify', 'cloudflare'].includes(token))) {
    capabilities.push('automation');
  }
  if (tokens.some((token) => ['docs', 'document', 'spec', 'meeting', 'knowledge', 'notion', 'linear'].includes(token))) {
    capabilities.push('docs');
  }
  if (tokens.some((token) => ['playwright', 'screenshot', 'web', 'browser'].includes(token))) {
    capabilities.push('browser-control');
  }
  if (tokens.some((token) => ['speech', 'transcribe', 'sora', 'imagegen', 'pdf', 'spreadsheet'].includes(token))) {
    capabilities.push('content');
  }
  if (capabilities.length === 0) {
    capabilities.push('automation');
  }

  return dedupe(capabilities);
}

function inferCompatibilityFromSlug(slug: string): string[] {
  const compatibility = ['general'];
  if (slug.includes('github') || slug.includes('gh-')) {
    compatibility.push('github');
  }
  if (slug.includes('notion')) {
    compatibility.push('notion');
  }
  if (slug.includes('linear')) {
    compatibility.push('linear');
  }
  if (slug.includes('playwright') || slug.includes('web-game')) {
    compatibility.push('node');
  }
  return dedupe(compatibility);
}

function toTitle(slug: string): string {
  return slug
    .split(/[-_/]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}
