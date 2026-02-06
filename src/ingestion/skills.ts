import type { SourceDescriptor } from '../config/sources.js';
import { loadSourcesConfig } from '../config/sources.js';
import { readJsonFile, writeJsonFile } from '../lib/json.js';
import { logger } from '../lib/logger.js';
import type { SkillRecord } from '../models/records.js';
import { SkillSchema } from '../models/records.js';

interface SkillSourceRecord {
  source: SourceDescriptor;
  record: SkillRecord;
}

const OUTPUT_PATH = 'data/curated/skills.json';

export async function ingestSkills(): Promise<SkillRecord[]> {
  const { skills } = await loadSourcesConfig();
  const records = await loadSkillRecords(skills);
  const merged = mergeSkillRecords(records);
  await writeJsonFile(OUTPUT_PATH, merged);
  logger.info(`Wrote ${merged.length} skills to ${OUTPUT_PATH}`);
  return merged;
}

async function loadSkillRecords(descriptors: SourceDescriptor[]): Promise<SkillSourceRecord[]> {
  const perSource = await Promise.all(
    descriptors.map(async (descriptor) => {
      const payload = await readJsonFile<unknown[]>(descriptor.file);
      return payload.map((record) => ({
        source: descriptor,
        record: SkillSchema.parse(record)
      }));
    })
  );

  return perSource.flat();
}

function mergeSkillRecords(records: SkillSourceRecord[]): SkillRecord[] {
  const state = new Map<string, { priority: number; record: SkillRecord }>();

  for (const entry of records) {
    const existing = state.get(entry.record.id);
    if (!existing) {
      state.set(entry.record.id, { priority: entry.source.priority, record: entry.record });
      continue;
    }

    const preferIncoming = shouldPreferIncoming(entry, existing);
    if (preferIncoming) {
      state.set(entry.record.id, {
        priority: entry.source.priority,
        record: mergeSkill(entry.record, existing.record)
      });
    } else {
      state.set(entry.record.id, {
        priority: existing.priority,
        record: mergeSkill(existing.record, entry.record)
      });
    }
  }

  return Array.from(state.values())
    .map((entry) => entry.record)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function shouldPreferIncoming(
  entry: SkillSourceRecord,
  existing: { priority: number; record: SkillRecord }
): boolean {
  if (entry.source.priority !== existing.priority) {
    return entry.source.priority > existing.priority;
  }

  return entry.record.lastValidated >= existing.record.lastValidated;
}

function mergeSkill(primary: SkillRecord, secondary: SkillRecord): SkillRecord {
  const mergedProficiencyLevels = dedupeStrings([
    ...primary.proficiencyLevels,
    ...secondary.proficiencyLevels
  ]);

  return {
    ...primary,
    description:
      secondary.description.length > primary.description.length ? secondary.description : primary.description,
    aliases: dedupeStrings([...primary.aliases, ...secondary.aliases]),
    proficiencyLevels:
      mergedProficiencyLevels.length > 0
        ? (mergedProficiencyLevels as [string, ...string[]])
        : primary.proficiencyLevels,
    taxonomyPath: primary.taxonomyPath.length ? primary.taxonomyPath : secondary.taxonomyPath,
    lastValidated: primary.lastValidated >= secondary.lastValidated ? primary.lastValidated : secondary.lastValidated
  };
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export type { SkillSourceRecord };
export { mergeSkillRecords, mergeSkill, dedupeStrings };
