import { describe, expect, it } from 'vitest';
import {
  CSV_COLUMNS_EN,
  EXPORT_CSV_COLUMNS_EN,
  SIMPLE_CSV_COLUMNS_EN,
  buildTemplateCsv,
  detectCsvFormat,
  parseCsvText,
  scopeToCsvExportLabel,
  serializeLanesToCsv,
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

  it('scopeToCsvExportLabel resolves partner names for specific scope', () => {
    const map = new Map([['2046', 'TransMed Logistics A.E.']]);
    expect(scopeToCsvExportLabel({
      scope: 'specific',
      scopePartnerIds: ['2046'],
    }, 'en', map)).toBe('TransMed Logistics A.E.');
    expect(scopeToCsvExportLabel({
      scope: 'default',
      scopePartnerIds: [],
    }, 'en', map)).toBe('All Partners');
  });

  it('serializeLanesToCsv produces 11-column export without coords', () => {
    const csv = serializeLanesToCsv([{
      stops: [{ city: 'Athens', label: 'Athens' }, { city: 'Patras', label: 'Patras' }],
      tripType: 'direct',
      pricingRows: [{ metric: 'load_any_size', priceEur: 450, metricValue: { type: 'per_load' } }],
      effectiveFrom: '2026-03-01',
      status: 'active',
      scope: 'default',
    }], 'en');
    const headerLine = csv.replace(/^\uFEFF/, '').split('\n')[0];
    expect(headerLine).toBe(EXPORT_CSV_COLUMNS_EN.join(','));
    expect(headerLine).toContain('Origin');
    expect(headerLine).not.toContain('Origin Lat');
    expect(headerLine).not.toContain('Origin Address');
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

  it('parseCsvText flags route conflicts only when dates and scope overlap', () => {
    const existingLanes = [{
      id: 'APL-1',
      status: 'active',
      stops: [{ city: 'Patras' }, { city: 'Heraklion' }],
      effectiveFrom: '2026-03-01',
      effectiveTo: '2026-03-31',
      scope: 'default',
      scopePartnerIds: [],
    }];

    const sameRouteDifferentDates = parseCsvText(
      `Origin City,Destination City,Trip Type,Metric,Metric Value,Price,Effective From,Effective To,Notes
Patras,Heraklion,direct,load any size,per load,450,2026-05-01,2026-05-31,`,
      { existingLanes },
    );

    expect(sameRouteDifferentDates!.dupes).toBe(0);
    expect(sameRouteDifferentDates!.valid).toBe(1);

    const overlappingDates = parseCsvText(
      `Origin City,Destination City,Trip Type,Metric,Metric Value,Price,Effective From,Effective To,Notes
Patras,Heraklion,direct,load any size,per load,450,2026-03-15,2026-04-15,`,
      { existingLanes },
    );

    expect(overlappingDates!.dupes).toBe(1);
    expect(overlappingDates!.valid).toBe(0);
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
