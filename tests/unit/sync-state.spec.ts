import { describe, expect, it } from 'vitest';

import { getStaleRegistries } from '../../src/catalog/sync-state.js';

describe('getStaleRegistries', () => {
  it('marks registries stale after 48h', () => {
    const now = new Date('2026-02-10T12:00:00.000Z');
    const stale = getStaleRegistries(
      {
        registries: {
          fresh: { lastSuccessfulSyncAt: '2026-02-10T11:00:00.000Z' },
          stale: { lastSuccessfulSyncAt: '2026-02-07T11:00:00.000Z' },
          missing: {}
        }
      },
      now,
      48
    );

    expect(stale).toEqual(['missing', 'stale']);
  });
});
