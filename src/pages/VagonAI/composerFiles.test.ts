import { describe, expect, it } from 'vitest';
import { isImportIntent, MAX_STAGED_FILES, stageFiles } from './composerFiles';

const file = (name: string, size = 100) => new File([new Uint8Array(size)], name);
const rules = { accepts: (f: File) => /\.(xlsx|csv)$/i.test(f.name), maxBytes: 1000 };

describe('MS3-366: what a message asks of the staged files', () => {
  it('reads an import request in English and Greek, with or without accents', () => {
    for (const text of [
      'Import these orders',
      'please upload them',
      'import',
      'Add these to my orders',
      'Εισαγωγή παραγγελιών',
      'εισαγαγε τις παραγγελιες',
      'Πέρασε τις παραγγελίες',
      'ανέβασέ τες',
    ]) {
      expect(isImportIntent(text), text).toBe(true);
    }
  });

  it('does not treat a question about the file as an import', () => {
    for (const text of ['How many orders are in this file?', 'what is the total weight', 'Πόσες παραγγελίες έχει;', '', '   ', 'reimburse me']) {
      expect(isImportIntent(text), text).toBe(false);
    }
  });
});

describe('MS3-366: staging several files', () => {
  it('stages each acceptable file once, and says why the others are turned away', () => {
    const a = file('a.xlsx');
    const { files, refused } = stageFiles([a], [file('a.xlsx'), file('b.csv'), file('c.pdf'), file('d.xlsx', 5000)], rules);
    expect(files.map((f) => f.name)).toEqual(['a.xlsx', 'b.csv']);
    expect(refused.map((r) => [r.file.name, r.reason])).toEqual([['c.pdf', 'type'], ['d.xlsx', 'size']]);
  });

  it(`keeps at most ${MAX_STAGED_FILES}`, () => {
    const many = Array.from({ length: MAX_STAGED_FILES + 2 }, (_, i) => file(`f${i}.csv`));
    const { files, refused } = stageFiles([], many, rules);
    expect(files).toHaveLength(MAX_STAGED_FILES);
    expect(refused.map((r) => r.reason)).toEqual(['count', 'count']);
  });
});
