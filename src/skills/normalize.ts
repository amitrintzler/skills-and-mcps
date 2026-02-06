import { CatalogSkillSchema, type CatalogSkill } from '../lib/validation/contracts.js';

export function normalizeSkills(records: unknown[], sourceId: string, today: string): CatalogSkill[] {
  return records
    .map((entry) =>
      CatalogSkillSchema.parse({
        ...ensureObject(entry),
        source: ensureObject(entry).source ?? sourceId,
        lastSeenAt: ensureObject(entry).lastSeenAt ?? today
      })
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid skill registry entry: expected object');
  }
  return value as Record<string, unknown>;
}

export function mergeSkillsById(skills: CatalogSkill[]): CatalogSkill[] {
  const state = new Map<string, CatalogSkill>();

  for (const skill of skills) {
    const existing = state.get(skill.id);
    if (!existing) {
      state.set(skill.id, skill);
      continue;
    }

    state.set(skill.id, {
      ...existing,
      description:
        skill.description.length > existing.description.length ? skill.description : existing.description,
      capabilities: dedupe([...existing.capabilities, ...skill.capabilities]),
      compatibility: dedupe([...existing.compatibility, ...skill.compatibility]),
      maintenanceSignal: Math.max(existing.maintenanceSignal, skill.maintenanceSignal),
      adoptionSignal: Math.max(existing.adoptionSignal, skill.adoptionSignal),
      lastSeenAt: skill.lastSeenAt >= existing.lastSeenAt ? skill.lastSeenAt : existing.lastSeenAt
    });
  }

  return Array.from(state.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
