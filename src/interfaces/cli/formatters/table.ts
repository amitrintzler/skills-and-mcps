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
  options: { riskKey?: keyof Row; wrap?: boolean } = {}
): string {
  const header = columns
    .map((column) => pad(column.header, column.width))
    .join('  ');

  const divider = columns
    .map((column) => '-'.repeat(column.width))
    .join('  ');

  const body = rows.flatMap((row) => renderRow(columns, row, options));

  return [colors.bold(header), colors.gray(divider), ...body].join('\n');
}

function renderRow<Row extends Record<string, unknown>>(
  columns: TableColumn<Row>[],
  row: Row,
  options: { riskKey?: keyof Row; wrap?: boolean }
): string[] {
  if (!options.wrap) {
    return [
      columns
        .map((column) => {
          const value = String(row[column.key] ?? '');
          const clipped = clip(value, column.width);
          if (options.riskKey && column.key === options.riskKey) {
            return pad(colorRisk(value.toLowerCase(), clipped), column.width);
          }
          return pad(clipped, column.width);
        })
        .join('  ')
    ];
  }

  const wrappedCells = columns.map((column) => {
    const value = String(row[column.key] ?? '');
    return wrapToWidth(value, column.width);
  });
  const rowHeight = wrappedCells.reduce((max, cell) => Math.max(max, cell.length), 1);

  const lines: string[] = [];
  for (let line = 0; line < rowHeight; line += 1) {
    lines.push(
      columns
        .map((column, index) => {
          const raw = wrappedCells[index][line] ?? '';
          if (options.riskKey && column.key === options.riskKey) {
            return pad(colorRisk(String(row[column.key] ?? '').toLowerCase(), raw), column.width);
          }
          return pad(raw, column.width);
        })
        .join('  ')
    );
  }

  return lines;
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

function wrapToWidth(value: string, width: number): string[] {
  if (value.length <= width) {
    return [value];
  }

  const output: string[] = [];
  let remaining = value;

  while (remaining.length > width) {
    let cut = remaining.lastIndexOf(' ', width);
    if (cut <= 0) {
      cut = width;
    }
    output.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }

  output.push(remaining);
  return output;
}
