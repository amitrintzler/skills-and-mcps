import { logger } from '../lib/logger.js';
import type { Registry, RemoteRegistryConfig } from '../lib/validation/contracts.js';

interface FetchLikeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

interface FetchLike {
  (input: string, init?: RequestInit): Promise<FetchLikeResponse>;
}

export async function resolveRegistryEntries(
  registry: Registry,
  options: { updatedSince?: string } = {},
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<unknown[]> {
  if (!registry.remote) {
    return registry.entries;
  }

  try {
    const parsed = await fetchRemoteRegistryEntries(registry, options, fetchImpl);

    if (parsed.length === 0 && registry.entries.length > 0) {
      logger.warn(
        `Remote registry ${registry.id} returned no entries; using ${registry.entries.length} local fallback entries`
      );
      return registry.entries;
    }

    return parsed;
  } catch (error) {
    if (registry.remote.fallbackToLocal && registry.entries.length > 0) {
      logger.warn(
        `Remote registry ${registry.id} fetch failed; using ${registry.entries.length} local fallback entries`,
        error
      );
      return registry.entries;
    }

    throw error;
  }
}

export async function fetchRemoteRegistryEntries(
  registry: Registry,
  options: { updatedSince?: string } = {},
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<unknown[]> {
  if (!registry.remote) {
    throw new Error(`Registry ${registry.id} has no remote definition`);
  }

  const allEntries: unknown[] = [];
  let cursor: string | undefined;

  do {
    const payload = await fetchRemoteRegistryPayload(registry, fetchImpl, {
      cursor,
      updatedSince: options.updatedSince
    });
    const parsed = extractEntries(payload, registry.remote.format, registry.remote.entryPath, registry.kind);
    allEntries.push(...parsed);
    cursor = resolveNextCursor(payload, registry.remote.pagination?.nextCursorPath);
  } while (cursor && registry.remote.pagination);

  return allEntries;
}

async function fetchRemoteRegistryPayload(
  registry: Registry,
  fetchImpl: FetchLike,
  params: { cursor?: string; updatedSince?: string }
): Promise<unknown> {
  const remote = registry.remote;
  if (!remote) {
    throw new Error(`Registry ${registry.id} has no remote definition`);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (remote.authEnv) {
    const token = process.env[remote.authEnv];
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutMs = remote.timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = buildRemoteUrl(remote, params);
    const response = await fetchImpl(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Remote registry ${registry.id} request failed with ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function extractEntries(
  payload: unknown,
  format: RemoteRegistryConfig['format'],
  entryPath: string | undefined,
  kind: Registry['kind']
): unknown[] {
  if (format === 'json-array') {
    if (!Array.isArray(payload)) {
      throw new Error('Expected remote payload to be an array');
    }
    return payload;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Expected remote payload to be an object for catalog-json format');
  }

  const base = payload as Record<string, unknown>;
  const resolved = entryPath ? resolveByPath(base, entryPath) : base[kind === 'skill' ? 'skills' : 'mcps'];

  if (!Array.isArray(resolved)) {
    throw new Error(`Expected resolved catalog entries to be an array at path: ${entryPath ?? kind}`);
  }

  return resolved;
}

function resolveByPath(value: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.').filter((segment) => segment.length > 0);
  let current: unknown = value;

  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function resolveNextCursor(payload: unknown, path = 'next_cursor'): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const resolved = resolveByPath(payload as Record<string, unknown>, path);
  return typeof resolved === 'string' && resolved.trim().length > 0 ? resolved : undefined;
}

function buildRemoteUrl(
  remote: RemoteRegistryConfig,
  params: { cursor?: string; updatedSince?: string }
): string {
  const url = new URL(remote.url);

  if (remote.supportsUpdatedSince && params.updatedSince) {
    url.searchParams.set(remote.updatedSinceParam, params.updatedSince);
  }

  if (remote.pagination?.limitParam && remote.pagination.limit) {
    url.searchParams.set(remote.pagination.limitParam, String(remote.pagination.limit));
  }

  if (remote.pagination && params.cursor) {
    url.searchParams.set(remote.pagination.cursorParam, params.cursor);
  }

  return url.toString();
}
