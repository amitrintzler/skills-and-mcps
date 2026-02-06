import path from 'node:path';
import fs from 'fs-extra';

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const fullPath = path.resolve(filePath);
  return fs.readJson(fullPath);
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const fullPath = path.resolve(filePath);
  await fs.ensureFile(fullPath);
  await fs.writeJson(fullPath, data, { spaces: 2 });
}
