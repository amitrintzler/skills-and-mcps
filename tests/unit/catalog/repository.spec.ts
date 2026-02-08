import { describe, expect, it, vi, beforeEach } from 'vitest';
import { saveQuarantine } from '../../../src/catalog/repository.js';
import * as jsonUtils from '../../../src/lib/json.js';
import fs from 'fs-extra';

vi.mock('../../../src/lib/json.js', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn()
}));

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn()
  }
}));

describe('saveQuarantine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges new entries with existing ones and dedupes by id', async () => {
    const existing = [
      { id: 'mcp:a', reason: 'Old reason', quarantinedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'mcp:b', reason: 'Old reason B', quarantinedAt: '2026-01-01T00:00:00.000Z' }
    ];

    const newEntries = [
      { id: 'mcp:b', reason: 'New reason B', quarantinedAt: '2026-02-01T00:00:00.000Z' },
      { id: 'mcp:c', reason: 'New reason C', quarantinedAt: '2026-02-01T00:00:00.000Z' }
    ];

    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(jsonUtils.readJsonFile).mockResolvedValue({ quarantined: existing } as never);

    await saveQuarantine(newEntries as any);

    expect(jsonUtils.writeJsonFile).toHaveBeenCalledWith(
      expect.stringContaining('quarantined.json'),
      {
        quarantined: [
          { id: 'mcp:a', reason: 'Old reason', quarantinedAt: '2026-01-01T00:00:00.000Z' },
          { id: 'mcp:b', reason: 'New reason B', quarantinedAt: '2026-02-01T00:00:00.000Z' },
          { id: 'mcp:c', reason: 'New reason C', quarantinedAt: '2026-02-01T00:00:00.000Z' }
        ]
      }
    );
  });
});
