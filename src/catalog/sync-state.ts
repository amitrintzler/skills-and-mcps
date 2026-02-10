import fs from 'fs-extra';

import { readJsonFile, writeJsonFile } from '../lib/json.js';

const SYNC_STATE_PATH = 'data/catalog/sync-state.json';

interface RegistrySyncState {
  lastUpdatedSince?: string;
  lastSuccessfulSyncAt?: string;
}

interface SyncStateFile {
  registries: Record<string, RegistrySyncState>;
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

  const registries = (raw as { registries?: Record<string, RegistrySyncState> }).registries;
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

export function setSuccessfulSync(state: SyncStateFile, registryId: string, timestamp: string): SyncStateFile {
  return {
    registries: {
      ...state.registries,
      [registryId]: {
        ...(state.registries[registryId] ?? {}),
        lastSuccessfulSyncAt: timestamp
      }
    }
  };
}

export function getStaleRegistries(
  state: SyncStateFile,
  now = new Date(),
  staleAfterHours = 48
): string[] {
  const staleCutoffMs = now.getTime() - staleAfterHours * 60 * 60 * 1000;

  return Object.entries(state.registries)
    .filter(([, value]) => {
      if (!value.lastSuccessfulSyncAt) {
        return true;
      }
      const stamp = Date.parse(value.lastSuccessfulSyncAt);
      return !Number.isFinite(stamp) || stamp < staleCutoffMs;
    })
    .map(([registryId]) => registryId)
    .sort((a, b) => a.localeCompare(b));
}
