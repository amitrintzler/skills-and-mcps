import { describe, expect, it } from 'vitest';

import { recommend } from '../../src/recommendation/engine.js';

describe('recommend', () => {
  it('returns ranked results with risk metadata and score breakdown', async () => {
    const ranked = await recommend({
      projectSignals: { stack: ['node'], compatibilityTags: ['node'] },
      requirements: {
        useCase: 'agent',
        stack: ['node'],
        deployment: 'local',
        securityPosture: 'balanced',
        requiredCapabilities: ['security', 'guardrails']
      }
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]).toHaveProperty('id');
    expect(ranked[0]).toHaveProperty('riskTier');
    expect(ranked[0]).toHaveProperty('installMethod');
    expect(ranked[0]).toHaveProperty('scoreBreakdown');
  });

  it('supports filtering by kind', async () => {
    const ranked = await recommend({
      projectSignals: { stack: ['node'], compatibilityTags: ['node'] },
      requirements: {
        useCase: 'agent',
        stack: ['node'],
        deployment: 'local',
        securityPosture: 'balanced',
        requiredCapabilities: []
      },
      kinds: ['copilot-extension']
    });

    expect(ranked.length).toBeGreaterThan(0);
    expect(new Set(ranked.map((item) => item.kind))).toEqual(new Set(['copilot-extension']));
  });
});
