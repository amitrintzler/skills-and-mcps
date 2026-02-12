import { describe, expect, it } from 'vitest';

import { readCsvList, readKinds, readLimit, readSort } from '../../src/interfaces/cli/options.js';

describe('cli options', () => {
  it('parses kinds and csv flags', () => {
    expect(readKinds(['--kind', 'skill,mcp'])).toEqual(['skill', 'mcp']);
    expect(readCsvList(['--provider', 'openai,github'], '--provider')).toEqual(['openai', 'github']);
  });

  it('parses sort and limit', () => {
    expect(readSort(['--sort', 'trust'])).toBe('trust');
    expect(readLimit(['--limit', '25'])).toBe(25);
  });

  it('throws on invalid sort and limit', () => {
    expect(() => readSort(['--sort', 'weird'])).toThrow();
    expect(() => readLimit(['--limit', '0'])).toThrow();
  });
});
