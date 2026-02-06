import { describe, expect, it } from 'vitest';

import { recommend } from '../../src/recommendation/engine.js';

describe('recommend', () => {
  it('returns ranked results with risk metadata', async () => {
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
    expect(ranked[0]).toHaveProperty('installMethod', 'skill.sh');
  });
});
