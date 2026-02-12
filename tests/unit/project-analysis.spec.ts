import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectProjectSignals } from '../../src/recommendation/project-analysis.js';

describe('project analysis', () => {
  it('detects multi-language project signals', async () => {
    const tempRoot = path.resolve('tmp-cli-project-analysis');
    await fs.mkdir(tempRoot, { recursive: true });
    try {
      await Promise.all([
        fs.writeFile(path.join(tempRoot, 'go.mod'), 'module test\n', 'utf8'),
        fs.writeFile(path.join(tempRoot, 'Cargo.toml'), '[package]\nname="x"\n', 'utf8'),
        fs.writeFile(path.join(tempRoot, 'pom.xml'), '<project/>\n', 'utf8'),
        fs.writeFile(path.join(tempRoot, 'Gemfile'), 'source "https://rubygems.org"\n', 'utf8')
      ]);

      const signals = await detectProjectSignals(tempRoot);

      expect(signals.stack).toEqual(expect.arrayContaining(['go', 'rust', 'java', 'ruby']));
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
