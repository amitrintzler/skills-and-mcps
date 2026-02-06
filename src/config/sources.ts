import path from 'node:path';
import fs from 'fs-extra';

export type Dataset = 'skills' | 'mcps';

export interface SourceDescriptor {
  id: string;
  file: string;
  priority: number;
  attribution?: string;
}

interface SourcesConfig {
  skills: SourceDescriptor[];
  mcps: SourceDescriptor[];
}

const CONFIG_PATH = path.resolve('config/sources.json');

export async function loadSourcesConfig(): Promise<SourcesConfig> {
  const exists = await fs.pathExists(CONFIG_PATH);
  if (!exists) {
    throw new Error(`Missing config at ${CONFIG_PATH}`);
  }

  const raw = await fs.readJson(CONFIG_PATH);
  return {
    skills: normalize(raw.skills ?? []),
    mcps: normalize(raw.mcps ?? [])
  };
}

function normalize(list: SourceDescriptor[]): SourceDescriptor[] {
  return list.map((item) => ({
    ...item,
    priority: Number.isFinite(item.priority) ? item.priority : 0
  }));
}
