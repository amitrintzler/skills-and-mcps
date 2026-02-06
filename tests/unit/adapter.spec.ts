import { describe, expect, it } from 'vitest';

import { adaptRegistryEntries } from '../../src/catalog/adapter.js';
import { RegistrySchema } from '../../src/lib/validation/contracts.js';

describe('adaptRegistryEntries', () => {
  it('maps mcp-registry-v0.1 entries into internal MCP catalog shape', () => {
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
        name: 'Filesystem MCP',
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
        securitySignals: {
          knownVulnerabilities: 0,
          suspiciousPatterns: 0,
          injectionFindings: 0,
          exfiltrationSignals: 0,
          integrityAlerts: 0
        },
        description: 'Access local files'
      }
    ]);
  });
});
