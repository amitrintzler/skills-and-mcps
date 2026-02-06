import path from 'node:path';

import fs from 'fs-extra';

import { RequirementsProfileSchema, type RequirementsProfile } from '../lib/validation/contracts.js';

export async function loadRequirementsProfile(filePath?: string): Promise<RequirementsProfile> {
  if (!filePath) {
    return RequirementsProfileSchema.parse({});
  }

  const fullPath = path.resolve(filePath);
  const raw = await fs.readFile(fullPath, 'utf8');

  if (filePath.endsWith('.json')) {
    return RequirementsProfileSchema.parse(JSON.parse(raw));
  }

  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
    return RequirementsProfileSchema.parse(parseSimpleYaml(raw));
  }

  throw new Error(`Unsupported requirements format: ${filePath}`);
}

function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let activeArrayKey: string | null = null;

  const lines = content
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      if (!activeArrayKey) {
        throw new Error('Invalid YAML: array item without key');
      }
      const value = trimmed.slice(2).trim();
      const current = (result[activeArrayKey] as string[]) ?? [];
      current.push(stripQuotes(value));
      result[activeArrayKey] = current;
      continue;
    }

    const separator = trimmed.indexOf(':');
    if (separator === -1) {
      throw new Error(`Invalid YAML line: ${line}`);
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();

    if (rawValue === '') {
      result[key] = [];
      activeArrayKey = key;
      continue;
    }

    activeArrayKey = null;
    result[key] = stripQuotes(rawValue);
  }

  return result;
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
