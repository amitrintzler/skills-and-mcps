import fs from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { getPackagePath } from '../../src/lib/paths.js';
import { RegistriesFileSchema } from '../../src/lib/validation/contracts.js';

describe('registry configuration', () => {
  it('uses supported plugin sources and removes dead plugin APIs', async () => {
    const raw = await fs.readFile(getPackagePath('config/registries.json'), 'utf8');
    const parsed = RegistriesFileSchema.parse(JSON.parse(raw));
    const byId = new Map(parsed.registries.map((registry) => [registry.id, registry]));

    expect(byId.has('github-copilot-plugins-official')).toBe(true);
    expect(byId.has('github-awesome-copilot-marketplace')).toBe(true);
    expect(byId.has('anthropic-claude-connectors-scrape')).toBe(true);

    expect(byId.get('official-claude-plugins')?.remote).toBeUndefined();
    expect(byId.get('official-copilot-extensions')?.remote).toBeUndefined();

    expect(byId.get('github-copilot-plugins-official')?.remote?.url).toContain(
      'raw.githubusercontent.com/github/copilot-plugins'
    );
    expect(byId.get('github-awesome-copilot-marketplace')?.remote?.url).toContain(
      'raw.githubusercontent.com/github/awesome-copilot'
    );
    expect(byId.get('anthropic-claude-connectors-scrape')?.remote?.url).toBe(
      'https://claude.com/connectors'
    );
  });
});
