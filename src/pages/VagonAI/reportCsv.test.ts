import { describe, expect, it } from 'vitest';
import type { ResultTable } from '../../hooks/useChat';
import { reportFileName, reportTableToCsv } from './reportCsv';

const table: ResultTable = {
  columns: [
    { key: 'group', label: 'Carrier', align: 'start' },
    { key: 'spend', label: 'Spend', align: 'end' },
  ],
  rows: [
    { key: 'a', cells: ['Acme, Inc.', '€3,000'] },
    { key: 'b', cells: ['=HYPERLINK("x")', '€100'] },
    { key: 'c', cells: ['Μεταφορές Α.Ε.', '-€5'] },
  ],
  totals: ['Total', '€3,095'],
};

describe('reportTableToCsv', () => {
  const csv = reportTableToCsv(table);

  it('starts with a BOM so Excel reads UTF-8', () => {
    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('quotes commas and defuses formulas in names, but leaves figures alone', () => {
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Carrier,Spend');
    expect(lines[1]).toBe('"Acme, Inc.","€3,000"');
    expect(lines[2]).toBe(`"'=HYPERLINK(""x"")",€100`);
    expect(lines[3]).toBe('Μεταφορές Α.Ε.,-€5');
    expect(lines[4]).toBe('Total,"€3,095"');
  });
});

describe('reportFileName', () => {
  const day = new Date('2026-10-05T12:00:00Z');

  it('slugs the title and dates the file', () => {
    expect(reportFileName('Spend by carrier — last quarter', day)).toBe('spend-by-carrier-last-quarter-2026-10-05.csv');
  });

  it('keeps Greek words whole, accents dropped', () => {
    expect(reportFileName('Δαπάνες ανά μεταφορέα', day)).toBe('δαπανες-ανα-μεταφορεα-2026-10-05.csv');
  });

  it('falls back when the title has no letters', () => {
    expect(reportFileName('—', day)).toBe('report-2026-10-05.csv');
  });
});
