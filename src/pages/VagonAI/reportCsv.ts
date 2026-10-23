/**
 * A report table as a CSV file — exactly the strings on screen, nothing recomputed.
 *
 * Built in the browser from the card rather than fetched, so it works for every
 * report kind and costs no second query. Two details matter for the people who
 * will open it in Excel:
 *
 * - A UTF-8 byte-order mark, without which Excel reads Greek names as mojibake.
 * - Names are shipper-entered text, so one that starts like a formula is
 *   prefixed with an apostrophe and stays text when the file is opened.
 */
import type { ResultTable } from '../../hooks/useChat';

const FORMULA_START = /^[=+\-@\t\r]/;

function quote(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/** Headers and the label column are free text; the figures are the gateway's own formatting. */
function defuse(cell: string): string {
  return FORMULA_START.test(cell) ? `'${cell}` : cell;
}

export function reportTableToCsv(table: ResultTable): string {
  const lines = [table.columns.map((col) => quote(defuse(col.label)))];
  const body = table.totals ? [...table.rows.map((row) => row.cells), table.totals] : table.rows.map((row) => row.cells);
  for (const cells of body) {
    lines.push(cells.map((cell, i) => quote(i === 0 ? defuse(cell) : cell)));
  }
  return `﻿${lines.map((line) => line.join(',')).join('\r\n')}\r\n`;
}

/** "Spend by carrier" → "spend-by-carrier-2026-10-05.csv"; falls back to "report" for a title of only symbols. */
export function reportFileName(title: string, today: Date = new Date()): string {
  const slug = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'report'}-${today.toISOString().slice(0, 10)}.csv`;
}

export function downloadReportCsv(table: ResultTable, title: string): void {
  const blob = new Blob([reportTableToCsv(table)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = reportFileName(title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
