import { CatalogMcpServerSchema, type CatalogMcpServer } from '../lib/validation/contracts.js';

export function normalizeMcps(records: unknown[], sourceId: string, today: string): CatalogMcpServer[] {
  return records
    .map((entry) =>
      CatalogMcpServerSchema.parse({
        ...ensureObject(entry),
        source: ensureObject(entry).source ?? sourceId,
        lastSeenAt: ensureObject(entry).lastSeenAt ?? today
      })
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid MCP registry entry: expected object');
  }
  return value as Record<string, unknown>;
}

export function mergeMcpsById(mcps: CatalogMcpServer[]): CatalogMcpServer[] {
  const state = new Map<string, CatalogMcpServer>();

  for (const mcp of mcps) {
    const existing = state.get(mcp.id);
    if (!existing) {
      state.set(mcp.id, mcp);
      continue;
    }

    state.set(mcp.id, {
      ...existing,
      capabilities: dedupe([...existing.capabilities, ...mcp.capabilities]),
      compatibility: dedupe([...existing.compatibility, ...mcp.compatibility]),
      maintenanceSignal: Math.max(existing.maintenanceSignal, mcp.maintenanceSignal),
      adoptionSignal: Math.max(existing.adoptionSignal, mcp.adoptionSignal),
      lastSeenAt: mcp.lastSeenAt >= existing.lastSeenAt ? mcp.lastSeenAt : existing.lastSeenAt
    });
  }

  return Array.from(state.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
