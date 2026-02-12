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
      expect(signals.inferredArchetype).toBeTruthy();
      expect(signals.inferenceConfidence).toBeGreaterThan(0);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('infers capabilities from repository structure and dependencies', async () => {
    const tempRoot = path.resolve('tmp-cli-capability-scan');
    await fs.mkdir(path.join(tempRoot, '.github', 'workflows'), { recursive: true });

    try {
      await Promise.all([
        fs.writeFile(
          path.join(tempRoot, 'package.json'),
          JSON.stringify(
            {
              name: 'scan-fixture',
              version: '1.0.0',
              dependencies: {
                zod: '^3.0.0',
                playwright: '^1.0.0'
              },
              scripts: {
                security: 'npm audit'
              }
            },
            null,
            2
          ),
          'utf8'
        ),
        fs.writeFile(path.join(tempRoot, '.github', 'workflows', 'codeql.yml'), 'name: codeql\n', 'utf8')
      ]);

      const signals = await detectProjectSignals(tempRoot);

      expect(signals.inferredCapabilities).toEqual(
        expect.arrayContaining(['security', 'guardrails', 'automation', 'browser-control', 'code-scanning'])
      );
      expect(signals.scanEvidence.length).toBeGreaterThan(0);
      expect(signals.archetypeScores.length).toBeGreaterThan(0);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('supports optional llm hinting with explicit fallback evidence', async () => {
    const tempRoot = path.resolve('tmp-cli-llm-scan');
    await fs.mkdir(tempRoot, { recursive: true });
    try {
      await fs.writeFile(
        path.join(tempRoot, 'package.json'),
        JSON.stringify({ name: 'x', version: '1.0.0' }, null, 2),
        'utf8'
      );

      const previous = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const signals = await detectProjectSignals(tempRoot, { llm: true });
      if (previous !== undefined) {
        process.env.OPENAI_API_KEY = previous;
      }

      expect(signals.scanEvidence.some((line) => line.includes('LLM enrichment requested'))).toBe(true);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
