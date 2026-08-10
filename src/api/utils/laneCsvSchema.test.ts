import { describe, expect, it } from 'vitest';
import {
  CSV_COLUMNS_EN,
  SIMPLE_CSV_COLUMNS_EN,
  buildTemplateCsv,
  detectCsvFormat,
  parseCsvText,
} from './laneCsvSchema';

const SIMPLE_CSV = `Origin City,Destination City,Trip Type,Metric,Metric Value,Price,Effective From,Effective To,Notes
Patras,Heraklion,direct,load any size,per load,450,2026-03-01,2026-12-31,
Patras,Heraklion,direct,unit transport,eur pallet,42,2026-03-01,,`;

const FULL_CSV = `${CSV_COLUMNS_EN.join(',')}
Patras Port · Patras,Patras,Patras Port Greece,38.2466,21.7346,Port Heraklion · Heraklion,Heraklion,Port Heraklion Greece,35.3387,25.1442,direct,load any size,per load,450,EUR,2026-03-01,2026-12-31,active,Default,,`;

describe('laneCsvSchema', () => {
  it('detectCsvFormat identifies simple and full headers', () => {
    expect(detectCsvFormat([...SIMPLE_CSV_COLUMNS_EN])).toBe('simple');
    expect(detectCsvFormat([...CSV_COLUMNS_EN])).toBe('full');
  });

  it('buildTemplateCsv produces 9-column simple template', () => {
    const csv = buildTemplateCsv('en');
    const headerLine = csv.replace(/^\uFEFF/, '').split('\n')[0];
    expect(headerLine.split(',')).toHaveLength(9);
    expect(headerLine).toBe(SIMPLE_CSV_COLUMNS_EN.join(','));
  });

  it('parseCsvText accepts 9-column simple CSV with city-only rows', () => {
    const result = parseCsvText(SIMPLE_CSV);
    expect(result).not.toBeNull();
    expect(result!.format).toBe('simple');
    expect(result!.rows).toHaveLength(2);
    expect(result!.valid).toBe(2);
    expect(result!.rows[0].oMatch).toBe('city_only');
    expect(result!.rows[0].dMatch).toBe('city_only');
    expect(result!.rows[0].oCity).toBe('Patras');
    expect(result!.rows[0].dCity).toBe('Heraklion');
  });

  it('parseCsvText accepts 21-column full export CSV with coordinates', () => {
    const result = parseCsvText(FULL_CSV);
    expect(result).not.toBeNull();
    expect(result!.format).toBe('full');
    expect(result!.rows).toHaveLength(1);
    expect(result!.valid).toBe(1);
    expect(result!.rows[0].oMatch).toBe('coords');
    expect(result!.rows[0].dMatch).toBe('coords');
    expect(result!.rows[0].oLat).toBeCloseTo(38.2466);
    expect(result!.rows[0].dLng).toBeCloseTo(25.1442);
  });

  it('parseCsvText parses Greek simple headers', () => {
    const greekCsv = `Πόλη Αφετηρίας,Πόλη Προορισμού,Τύπος Δρομολογίου,Μετρική,Τιμή Μετρικής,Τιμή,Ισχύς Από,Ισχύς Έως,Σημειώσεις
Αθήνα,Θεσσαλονίκη,direct,load any size,per load,450,2026-03-01,,`;
    const result = parseCsvText(greekCsv);
    expect(result).not.toBeNull();
    expect(result!.format).toBe('simple');
    expect(result!.valid).toBe(1);
  });
});
