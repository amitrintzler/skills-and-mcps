import { describe, expect, it } from 'vitest';

import { renderCsv } from '../../src/interfaces/cli/formatters/csv.js';
import { renderMarkdown } from '../../src/interfaces/cli/formatters/markdown.js';
import { renderTable, scoreBar } from '../../src/interfaces/cli/formatters/table.js';

describe('cli formatters', () => {
  it('renders score bars', () => {
    expect(scoreBar(100, 5)).toBe('█████');
    expect(scoreBar(0, 5)).toBe('░░░░░');
  });

  it('renders a text table', () => {
    const output = renderTable(
      [
        { key: 'id', header: 'ID', width: 10 },
        { key: 'kind', header: 'TYPE', width: 8 }
      ],
      [{ id: 'skill:abc', kind: 'skill' }]
    );

    expect(output).toContain('ID');
    expect(output).toContain('skill:abc');
  });

  it('renders csv and markdown deterministically', () => {
    const headers = ['id', 'kind'];
    const rows = [['skill:abc', 'skill']];

    expect(renderCsv(headers, rows)).toBe('id,kind\nskill:abc,skill\n');
    expect(renderMarkdown(headers, rows)).toContain('| id | kind |');
  });
});
