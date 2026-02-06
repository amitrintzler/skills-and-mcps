import type { SourceDescriptor } from '../config/sources.js';
import { loadSourcesConfig } from '../config/sources.js';
import { readJsonFile, writeJsonFile } from '../lib/json.js';
import { logger } from '../lib/logger.js';
import type { McpRecord } from '../models/records.js';
import { McpSchema } from '../models/records.js';

interface McpSourceRecord {
  source: SourceDescriptor;
  record: McpRecord;
}

const OUTPUT_PATH = 'data/curated/mcps.json';

export async function ingestMcps(): Promise<McpRecord[]> {
  const { mcps } = await loadSourcesConfig();
  const records = await loadMcpRecords(mcps);
  const merged = mergeMcpRecords(records);
  await writeJsonFile(OUTPUT_PATH, merged);
  logger.info(`Wrote ${merged.length} MCP rows to ${OUTPUT_PATH}`);
  return merged;
}

async function loadMcpRecords(descriptors: SourceDescriptor[]): Promise<McpSourceRecord[]> {
  const perSource = await Promise.all(
    descriptors.map(async (descriptor) => {
      const payload = await readJsonFile<unknown[]>(descriptor.file);
      return payload.map((record) => ({
        source: descriptor,
        record: McpSchema.parse(record)
      }));
    })
  );

  return perSource.flat();
}

function mergeMcpRecords(records: McpSourceRecord[]): McpRecord[] {
  const state = new Map<string, { priority: number; record: McpRecord }>();

  for (const entry of records) {
    const key = `${entry.record.jobFamily}:${entry.record.level}`;
    const existing = state.get(key);
    if (!existing) {
      state.set(key, { priority: entry.source.priority, record: entry.record });
      continue;
    }

    const preferIncoming = shouldPreferIncoming(entry, existing);
    if (preferIncoming) {
      state.set(key, {
        priority: entry.source.priority,
        record: mergeMcp(entry.record, existing.record)
      });
    } else {
      state.set(key, {
        priority: existing.priority,
        record: mergeMcp(existing.record, entry.record)
      });
    }
  }

  return Array.from(state.values())
    .map((entry) => entry.record)
    .sort((a, b) => a.jobFamily.localeCompare(b.jobFamily) || a.level.localeCompare(b.level));
}

function shouldPreferIncoming(
  entry: McpSourceRecord,
  existing: { priority: number; record: McpRecord }
): boolean {
  if (entry.source.priority !== existing.priority) {
    return entry.source.priority > existing.priority;
  }

  return entry.record.lastBenchmark >= existing.record.lastBenchmark;
}

function mergeMcp(primary: McpRecord, secondary: McpRecord): McpRecord {
  const mergedSkillLinks = dedupeStrings([...primary.skillLinks, ...secondary.skillLinks]);

  return {
    ...primary,
    baseRange: normalizeRange(primary.baseRange, secondary.baseRange),
    geoModifier: { ...secondary.geoModifier, ...primary.geoModifier },
    skillLinks: mergedSkillLinks.length > 0 ? (mergedSkillLinks as [string, ...string[]]) : primary.skillLinks,
    lastBenchmark: primary.lastBenchmark >= secondary.lastBenchmark ? primary.lastBenchmark : secondary.lastBenchmark
  };
}

function normalizeRange(
  preferred: McpRecord['baseRange'],
  secondary: McpRecord['baseRange']
): McpRecord['baseRange'] {
  const min = Math.min(preferred.min, secondary.min);
  const max = Math.max(preferred.max, secondary.max);
  const mid = Math.max(min, Math.min(preferred.mid, max));
  return { min, mid, max };
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export { mergeMcpRecords, mergeMcp, dedupeStrings, normalizeRange };
export type { McpSourceRecord };
