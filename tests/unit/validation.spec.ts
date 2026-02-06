import { describe, expect, it } from 'vitest';

import { McpSchema, SkillSchema } from '../../src/models/records.js';

describe('SkillSchema', () => {
  it('rejects invalid taxonomy paths', () => {
    const run = () =>
      SkillSchema.parse({
        id: 'skill:bad',
        name: 'Bad',
        description: 'Bad',
        taxonomyPath: [],
        aliases: [],
        proficiencyLevels: ['x'],
        lastValidated: '2024-05-01'
      });

    expect(run).toThrowError();
  });
});

describe('McpSchema', () => {
  it('requires ascending range order', () => {
    const run = () =>
      McpSchema.parse({
        jobFamily: 'Bad',
        level: 'Senior',
        currency: 'USD',
        baseRange: { min: 200, mid: 150, max: 180 },
        geoModifier: { Remote: 1 },
        skillLinks: ['skill:test'],
        lastBenchmark: '2024-05-01'
      });

    expect(run).toThrowError();
  });
});
