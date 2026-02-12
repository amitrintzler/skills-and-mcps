import { CatalogKindSchema, type CatalogKind } from '../../lib/validation/contracts.js';

export type SortKey = 'score' | 'trust' | 'risk' | 'fit' | 'name';

export function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

export function readKinds(args: string[]): CatalogKind[] | undefined {
  const value = readFlag(args, '--kind');
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((kind) => CatalogKindSchema.parse(kind));
}

export function readCsvList(args: string[], flag: string): string[] | undefined {
  const value = readFlag(args, flag);
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function readLimit(args: string[], defaultValue?: number): number | undefined {
  const value = readFlag(args, '--limit');
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --limit value: ${value}`);
  }

  return parsed;
}

export function readSort(args: string[], defaultValue: SortKey = 'score'): SortKey {
  const value = readFlag(args, '--sort');
  if (!value) {
    return defaultValue;
  }

  if (value === 'score' || value === 'trust' || value === 'risk' || value === 'fit' || value === 'name') {
    return value;
  }

  throw new Error(`Invalid --sort value: ${value}. Expected one of: score, trust, risk, fit, name`);
}
