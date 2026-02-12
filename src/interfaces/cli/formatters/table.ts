import { colorRisk, colors } from './colors.js';

export interface TableColumn<Row extends Record<string, unknown>> {
  key: keyof Row;
  header: string;
  width: number;
}

export function scoreBar(score: number, size = 10): string {
  const clamped = Math.max(0, Math.min(100, score));
  const filled = Math.round((clamped / 100) * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

export function renderTable<Row extends Record<string, unknown>>(
  columns: TableColumn<Row>[],
  rows: Row[],
  options: { riskKey?: keyof Row } = {}
): string {
  const header = columns
    .map((column) => pad(column.header, column.width))
    .join('  ');

  const divider = columns
    .map((column) => '-'.repeat(column.width))
    .join('  ');

  const body = rows.map((row) => {
    return columns
      .map((column) => {
        const value = String(row[column.key] ?? '');
        const clipped = clip(value, column.width);
        if (options.riskKey && column.key === options.riskKey) {
          return pad(colorRisk(value.toLowerCase(), clipped), column.width);
        }
        return pad(clipped, column.width);
      })
      .join('  ');
  });

  return [colors.bold(header), colors.gray(divider), ...body].join('\n');
}

function clip(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }

  if (width <= 1) {
    return value.slice(0, width);
  }

  return `${value.slice(0, width - 1)}…`;
}

function pad(value: string, width: number): string {
  if (value.length >= width) {
    return value;
  }
  return `${value}${' '.repeat(width - value.length)}`;
}
