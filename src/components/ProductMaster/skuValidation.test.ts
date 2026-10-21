import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createSkuValidationSchema, skuValidationSchema } from './ProductMasterSkuModal';
import {
  isValidBarcode,
  isValidSkuWeight,
  normalizeSkuNumber,
  sanitizeBarcodeInput,
  sanitizeSkuNameInput,
  sanitizeSkuNumberInput,
  sanitizeWeightInput,
} from './skuFieldValidation';

vi.mock('../../api/services/productMasterService', () => ({
  productMasterService: {
    listSkus: vi.fn(),
    getAllReferenceCategories: vi.fn().mockResolvedValue([]),
  },
}));

describe('ProductMaster SKU Validation', () => {
  const baseValid = {
    catId: '1',
    typeId: '2',
    name: 'Vikos-1.5L-Mineral-Water',
    number: 'VIK-001',
    barcode: '',
    uom: 'Case',
    weight: '25',
    temperature: 'ambient',
    palletType: 'eur',
    hazardous: false,
    stackable: true,
    tags: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates a valid SKU with positive weight successfully', async () => {
    await expect(skuValidationSchema.validate(baseValid)).resolves.toBeTruthy();
  });

  it('allows empty weight as it is an optional field', async () => {
    await expect(
      skuValidationSchema.validate({ ...baseValid, weight: '' })
    ).resolves.toBeTruthy();
  });

  it('rejects negative, zero, and non-numeric weight inputs', async () => {
    await expect(
      skuValidationSchema.validateAt('weight', { weight: '-2' })
    ).rejects.toThrow(/greater than 0|up to 3 decimals/i);

    await expect(
      skuValidationSchema.validateAt('weight', { weight: '0' })
    ).rejects.toThrow(/greater than 0|up to 3 decimals/i);

    await expect(
      skuValidationSchema.validateAt('weight', { weight: 'abc' })
    ).rejects.toThrow(/greater than 0|up to 3 decimals/i);
  });

  it('rejects weight with more than 3 decimals or over max', async () => {
    await expect(
      skuValidationSchema.validateAt('weight', { weight: '1.2345' })
    ).rejects.toThrow(/greater than 0|up to 3 decimals/i);

    await expect(
      skuValidationSchema.validateAt('weight', { weight: '50001' })
    ).rejects.toThrow(/greater than 0|up to 3 decimals/i);

    await expect(
      skuValidationSchema.validateAt('weight', { weight: '12.5' })
    ).resolves.toBe('12.5');
  });

  it('requires category, product type, SKU name, and SKU number', async () => {
    await expect(
      skuValidationSchema.validateAt('catId', { catId: '' })
    ).rejects.toThrow('Category is required');

    await expect(
      skuValidationSchema.validateAt('typeId', { typeId: '' })
    ).rejects.toThrow('Please select a product type');

    await expect(
      skuValidationSchema.validateAt('name', { name: '' })
    ).rejects.toThrow('SKU Name is required');

    await expect(
      skuValidationSchema.validateAt('number', { number: '' })
    ).rejects.toThrow('SKU Number is required');
  });

  it('enforces SKU Name length 2-30 and rejects spaces', async () => {
    await expect(
      skuValidationSchema.validateAt('name', { name: 'A' })
    ).rejects.toThrow(/at least 2/i);

    await expect(
      skuValidationSchema.validateAt('name', { name: 'AB CD' })
    ).rejects.toThrow(/spaces/i);

    await expect(
      skuValidationSchema.validateAt('name', { name: 'AB' })
    ).resolves.toBe('AB');

    await expect(
      skuValidationSchema.validateAt('name', { name: 'A'.repeat(31) })
    ).rejects.toThrow(/at most 30/i);
  });

  it('enforces SKU Number format A-Z 0-9 - _ and length 3-30', async () => {
    await expect(
      skuValidationSchema.validateAt('number', { number: 'AB' })
    ).rejects.toThrow(/at least 3/i);

    // Spaces/invalid chars are stripped by normalize; leftover too short fails min
    await expect(
      skuValidationSchema.validateAt('number', { number: 'A B' })
    ).rejects.toThrow(/at least 3/i);

    await expect(
      skuValidationSchema.validateAt('number', { number: 'ab-01' })
    ).resolves.toBe('AB-01');
  });

  it('allows optional barcode up to 14 digits with no checksum', async () => {
    await expect(
      skuValidationSchema.validateAt('barcode', { barcode: '' })
    ).resolves.toBe('');

    await expect(
      skuValidationSchema.validateAt('barcode', { barcode: '43243432' })
    ).resolves.toBe('43243432');

    await expect(
      skuValidationSchema.validateAt('barcode', { barcode: '12345678901234' })
    ).resolves.toBe('12345678901234');

    await expect(
      skuValidationSchema.validateAt('barcode', { barcode: '123456789012345' })
    ).rejects.toThrow(/at most 14/i);
  });

  it('requires unit of measure from allowed options', async () => {
    await expect(
      skuValidationSchema.validateAt('uom', { uom: '' })
    ).rejects.toThrow(/unit of measure/i);

    await expect(
      skuValidationSchema.validateAt('uom', { uom: 'Case' })
    ).resolves.toBe('Case');

    await expect(
      skuValidationSchema.validateAt('uom', { uom: 'Invalid' })
    ).rejects.toThrow(/valid unit/i);
  });

  it('uses translated messages from createSkuValidationSchema', async () => {
    const schema = createSkuValidationSchema((key, fallback) => fallback || key);
    await expect(schema.validateAt('catId', { catId: '' })).rejects.toThrow(
      'Category is required'
    );
  });
});

describe('skuFieldValidation helpers', () => {
  it('normalizes and sanitizes SKU name/number with max 30 and no spaces in name', () => {
    expect(sanitizeSkuNameInput('Vikos Water')).toBe('VikosWater');
    expect(sanitizeSkuNameInput('A'.repeat(40))).toBe('A'.repeat(30));
    expect(sanitizeSkuNumberInput('ab-01_x')).toBe('AB-01_X');
    expect(sanitizeSkuNumberInput('AB 01')).toBe('AB01');
    expect(sanitizeSkuNumberInput('E'.repeat(40))).toBe('E'.repeat(30));
    expect(normalizeSkuNumber('  ab-01  ')).toBe('AB-01');
  });

  it('sanitizes weight input and blocks scientific notation chars', () => {
    expect(sanitizeWeightInput('12.3456')).toBe('12.345');
    expect(sanitizeWeightInput('12e3')).toBe('123');
    expect(sanitizeWeightInput('12+3')).toBe('123');
  });

  it('caps barcode input at 14 digits maximum', () => {
    expect(isValidBarcode('')).toBe(true);
    expect(isValidBarcode('43243432')).toBe(true);
    expect(isValidBarcode('123456789012345')).toBe(false);
    expect(sanitizeBarcodeInput('123456789012345678')).toBe('12345678901234');
    expect(sanitizeBarcodeInput('abc12345678901234xyz')).toBe('12345678901234');
  });

  it('validates weight rules', () => {
    expect(isValidSkuWeight('')).toBe(true);
    expect(isValidSkuWeight('0.001')).toBe(true);
    expect(isValidSkuWeight('50000')).toBe(true);
    expect(isValidSkuWeight('50000.001')).toBe(false);
    expect(isValidSkuWeight('1.2345')).toBe(false);
    expect(isValidSkuWeight('1e3')).toBe(false);
  });
});
