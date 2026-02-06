import { readJsonFile } from '../lib/json.js';
import type { McpRecord, SkillRecord } from '../models/records.js';
import { McpSchema, SkillSchema } from '../models/records.js';

interface ValidationResult<T> {
  dataset: string;
  valid: boolean;
  count: number;
  errors: string[];
  records?: T[];
}

export async function validateCuratedSkills(): Promise<ValidationResult<SkillRecord>> {
  try {
    const raw = await readJsonFile<unknown[]>('data/curated/skills.json');
    const parsed = raw.map((entry, index) => {
      try {
        return SkillSchema.parse(entry);
      } catch (error) {
        throw new Error(`skills[${index}] ${error}`);
      }
    });

    return {
      dataset: 'skills',
      valid: true,
      count: parsed.length,
      errors: [],
      records: parsed
    };
  } catch (error) {
    return {
      dataset: 'skills',
      valid: false,
      count: 0,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export async function validateCuratedMcps(
  skillIds: Set<string>
): Promise<ValidationResult<McpRecord>> {
  try {
    const raw = await readJsonFile<unknown[]>('data/curated/mcps.json');
    const parsed = raw.map((entry, index) => {
      try {
        const record = McpSchema.parse(entry);
        const missingLinks = record.skillLinks.filter((link) => !skillIds.has(link));
        if (missingLinks.length) {
          throw new Error(`references missing skills: ${missingLinks.join(', ')}`);
        }
        return record;
      } catch (error) {
        throw new Error(`mcps[${index}] ${error}`);
      }
    });

    return {
      dataset: 'mcps',
      valid: true,
      count: parsed.length,
      errors: [],
      records: parsed
    };
  } catch (error) {
    return {
      dataset: 'mcps',
      valid: false,
      count: 0,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}
