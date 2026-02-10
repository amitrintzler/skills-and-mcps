export function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function extractStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }

    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }

  return [];
}

export function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

export function readNestedString(record: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = record;

  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' && current.trim().length > 0 ? current.trim() : undefined;
}

export function readNestedStringArray(record: Record<string, unknown>, path: string[]): string[] {
  let current: unknown = record;

  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return [];
    }
    current = (current as Record<string, unknown>)[key];
  }

  if (!Array.isArray(current)) {
    return [];
  }

  return current
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

export function toScore(value: unknown, fallback = 50): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, parsed));
}

export function toCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}
