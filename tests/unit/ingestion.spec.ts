import { describe, expect, it } from 'vitest';

import { mergeMcp, normalizeRange } from '../../src/ingestion/mcps.js';
import { mergeSkill } from '../../src/ingestion/skills.js';
import type { McpRecord, SkillRecord } from '../../src/models/records.js';

const sampleSkillA: SkillRecord = {
  id: 'skill:test',
  name: 'Test',
  description: 'One',
  taxonomyPath: ['A'],
  aliases: ['alpha'],
  proficiencyLevels: ['Novice'],
  lastValidated: '2024-05-01'
};

const sampleSkillB: SkillRecord = {
  id: 'skill:test',
  name: 'Test',
  description: 'A much longer description',
  taxonomyPath: ['A'],
  aliases: ['beta'],
  proficiencyLevels: ['Expert'],
  lastValidated: '2024-05-10'
};

describe('mergeSkill', () => {
  it('keeps primary metadata but unions aliases/proficiency and picks latest validation', () => {
    const merged = mergeSkill(sampleSkillB, sampleSkillA);
    expect(merged.aliases).toEqual(['alpha', 'beta']);
    expect(merged.proficiencyLevels).toEqual(['Expert', 'Novice']);
    expect(merged.lastValidated).toBe('2024-05-10');
    expect(merged.description).toBe('A much longer description');
  });
});

const baseRangeRecord = {
  jobFamily: 'Example',
  level: 'Senior',
  currency: 'USD',
  baseRange: { min: 100, mid: 120, max: 150 },
  geoModifier: { Remote: 1 },
  skillLinks: ['skill:test'],
  lastBenchmark: '2024-05-01'
} satisfies McpRecord;

const secondaryRangeRecord = {
  ...baseRangeRecord,
  baseRange: { min: 110, mid: 130, max: 160 },
  lastBenchmark: '2024-05-15'
};

describe('mergeMcp', () => {
  it('blends range bounds and unions skill links', () => {
    const merged = mergeMcp(secondaryRangeRecord, baseRangeRecord);
    expect(merged.baseRange).toEqual({ min: 100, mid: 130, max: 160 });
    expect(merged.skillLinks).toEqual(['skill:test']);
    expect(merged.lastBenchmark).toBe('2024-05-15');
  });
});

describe('normalizeRange', () => {
  it('keeps ordering when preferred range tightens bounds', () => {
    const normalized = normalizeRange(
      { min: 120, mid: 130, max: 150 },
      { min: 100, mid: 140, max: 200 }
    );
    expect(normalized).toEqual({ min: 100, mid: 130, max: 200 });
  });
});
