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
    ]);

    expect(result).toEqual([
      {
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
        maintenanceSignal: 50,
        provenanceSignal: 90,
        freshnessSignal: 60,
        securitySignals: {
          knownVulnerabilities: 0,
          suspiciousPatterns: 0,
          injectionFindings: 0,
          exfiltrationSignals: 0,
          integrityAlerts: 0
        }
      }
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
