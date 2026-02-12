export function renderCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((line) => line.map(escapeCell).join(','));
  return `${lines.join('\n')}\n`;
}

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
