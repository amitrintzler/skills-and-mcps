import { describe, expect, it } from 'vitest';

import { adaptRegistryEntries } from '../../src/catalog/adapter.js';
import { RegistrySchema } from '../../src/lib/validation/contracts.js';

describe('adaptRegistryEntries', () => {
  it('maps mcp-registry-v0.1 entries into internal catalog shape', () => {
    const registry = RegistrySchema.parse({
      id: 'official-mcp-registry',
      kind: 'mcp',
      sourceType: 'public-index',
      adapter: 'mcp-registry-v0.1',
      enabled: true,
      entries: []
    });

    const result = adaptRegistryEntries(registry, [
      {
        server: {
          name: 'filesystem',
          title: 'Filesystem MCP',
          description: 'Access local files',
          packages: [
            {
              registryType: 'npm',
              identifier: '@mcp/filesystem',
              transport: { type: 'stdio' }
            }
          ],
          capabilities: ['file-read', 'file-write'],
          authModel: 'none'
        }
      }
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'mcp:filesystem',
        kind: 'mcp',
        provider: 'mcp',
        name: 'Filesystem MCP',
        description: 'Access local files',
        transport: 'stdio',
        authModel: 'none',
        capabilities: ['file-read', 'file-write'],
        compatibility: ['general', 'node'],
        source: 'official-mcp-registry',
        install: {
          kind: 'skill.sh',
          target: '@mcp/filesystem',
          args: []
        },
        adoptionSignal: 50,
        maintenanceSignal: 65,
        provenanceSignal: 90
      })
    ]);
  });

  it('maps MCP wrapper entries with remotes and streamable-http transport', () => {
    const registry = RegistrySchema.parse({
      id: 'official-mcp-registry',
      kind: 'mcp',
      sourceType: 'public-index',
      adapter: 'mcp-registry-v0.1',
      enabled: true,
      entries: []
    });

    const result = adaptRegistryEntries(registry, [
      {
        server: {
          name: 'agency.lona/trading',
          description: 'Trading MCP',
          remotes: [{ type: 'streamable-http', url: 'https://mcp.lona.agency/mcp' }],
          websiteUrl: 'https://lona.agency'
        },
        _meta: {
          'io.modelcontextprotocol.registry/official': {
            publishedAt: '2026-02-24T00:07:27.525636Z'
          }
        }
      }
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'mcp:agency.lona/trading',
        kind: 'mcp',
        provider: 'mcp',
        transport: 'http',
        authModel: 'custom',
        install: expect.objectContaining({
          kind: 'manual',
          url: 'https://lona.agency'
        })
      })
    ]);
  });

  it('maps OpenAI curated skills from GitHub directory entries', () => {
    const registry = RegistrySchema.parse({
      id: 'openai-skills-curated',
      kind: 'skill',
      sourceType: 'vendor-feed',
      adapter: 'openai-skills-github-v1',
      enabled: true,
      entries: []
    });

    const result = adaptRegistryEntries(registry, [
      {
        name: 'gh-fix-ci',
        path: 'skills/.curated/gh-fix-ci',
        type: 'dir',
        html_url: 'https://github.com/openai/skills/tree/main/skills/.curated/gh-fix-ci'
      },
      {
        name: 'README.md',
        path: 'skills/.curated/README.md',
        type: 'file'
      }
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'skill:gh-fix-ci',
        kind: 'skill',
        provider: 'openai',
        install: expect.objectContaining({
          kind: 'manual'
        })
      })
    ]);
  });

  it('maps claude plugin entries', () => {
    const registry = RegistrySchema.parse({
      id: 'official-claude-plugins',
      kind: 'claude-plugin',
      sourceType: 'vendor-feed',
      adapter: 'claude-plugins-v0.1',
      enabled: true,
      entries: []
    });

    const result = adaptRegistryEntries(registry, [
      {
        slug: 'workspace-ops',
        title: 'Workspace Ops',
        description: 'Manage docs and tasks',
        tools: ['search', 'tickets']
      }
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'claude-plugin:workspace-ops',
        kind: 'claude-plugin',
        provider: 'anthropic'
      })
    ]);
  });

  it('maps copilot extension entries', () => {
    const registry = RegistrySchema.parse({
      id: 'official-copilot-extensions',
      kind: 'copilot-extension',
      sourceType: 'vendor-feed',
      adapter: 'copilot-extensions-v0.1',
      enabled: true,
      entries: []
    });

    const result = adaptRegistryEntries(registry, [
      {
        slug: 'repo-security',
        title: 'Repo Security',
        description: 'Security insights',
        tools: ['security']
      }
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'copilot-extension:repo-security',
        kind: 'copilot-extension',
        provider: 'github',
        install: expect.objectContaining({ kind: 'gh-cli' })
      })
    ]);
  });
});
