import { describe, expect, it } from 'vitest';

import { buildSkillShInstallArgs } from '../../src/install/skillsh.js';

describe('buildSkillShInstallArgs', () => {
  it('builds arguments with yes flag when requested', () => {
    expect(buildSkillShInstallArgs('mcp-filesystem', ['--transport', 'stdio'], true)).toEqual([
      'install',
      'mcp-filesystem',
      '--transport',
      'stdio',
      '--yes'
    ]);
  });

  it('builds arguments without yes flag by default', () => {
    expect(buildSkillShInstallArgs('secure-prompting', [], false)).toEqual(['install', 'secure-prompting']);
  });
});
