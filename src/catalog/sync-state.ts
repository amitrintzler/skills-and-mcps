import fs from 'fs-extra';

import { readJsonFile, writeJsonFile } from '../lib/json.js';

const SYNC_STATE_PATH = 'data/catalog/sync-state.json';

interface SyncStateFile {
  registries: Record<string, { lastUpdatedSince?: string }>;
}

const EMPTY_STATE: SyncStateFile = { registries: {} };

export async function loadSyncState(): Promise<SyncStateFile> {
  if (!(await fs.pathExists(SYNC_STATE_PATH))) {
    return EMPTY_STATE;
  }

  const raw = await readJsonFile<unknown>(SYNC_STATE_PATH);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return EMPTY_STATE;
  }

  const registries = (raw as { registries?: Record<string, { lastUpdatedSince?: string }> }).registries;
  return { registries: registries ?? {} };
}

export async function saveSyncState(state: SyncStateFile): Promise<void> {
  await writeJsonFile(SYNC_STATE_PATH, state);
}

export function getUpdatedSince(state: SyncStateFile, registryId: string): string | undefined {
  return state.registries[registryId]?.lastUpdatedSince;
}

export function setUpdatedSince(state: SyncStateFile, registryId: string, timestamp: string): SyncStateFile {
  return {
    registries: {
      ...state.registries,
      [registryId]: {
        ...(state.registries[registryId] ?? {}),
        lastUpdatedSince: timestamp
      }
    }
  };
}
