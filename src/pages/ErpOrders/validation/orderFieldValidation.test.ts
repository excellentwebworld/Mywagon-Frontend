import { describe, expect, it } from 'vitest';
import {
  isValidLineWeight,
  isValidNotes,
  isValidOrderId,
  isValidOrderValue,
  isValidQty,
  normalizeOrderId,
  sanitizeOrderIdInput,
  sanitizeOrderValueInput,
  sanitizeQtyInput,
  sanitizeWeightInput,
} from './orderFieldValidation';

describe('orderFieldValidation', () => {
  it('normalizes Order ID / ERP ID', () => {
    expect(sanitizeOrderIdInput('ord 1234')).toBe('ORD1234');
    expect(normalizeOrderId('  ab-01_x/y  ')).toBe('AB-01_X/Y');
    expect(isValidOrderId('AB', { required: true })).toBe(false);
    expect(isValidOrderId('ORD-1234', { required: true })).toBe(true);
    expect(isValidOrderId('', { required: false })).toBe(true);
    expect(isValidOrderId('AB', { required: false })).toBe(false);
  });

  it('validates qty 1–99999 whole numbers', () => {
    expect(sanitizeQtyInput('12.5')).toBe('12');
    expect(sanitizeQtyInput('100000')).toBe('99999');
    expect(isValidQty(1)).toBe(true);
    expect(isValidQty(99999)).toBe(true);
    expect(isValidQty(0)).toBe(false);
    expect(isValidQty(1.5)).toBe(false);
  });

  it('validates weight by unit with 3 decimals', () => {
    expect(sanitizeWeightInput('12.3456')).toBe('12.345');
    expect(isValidLineWeight(12.5, 'Kgs')).toBe(true);
    expect(isValidLineWeight(0, 'Kgs')).toBe(false);
    expect(isValidLineWeight(50001, 'Kgs')).toBe(false);
    expect(isValidLineWeight(100, 'Tonnes')).toBe(true);
    expect(isValidLineWeight(100.01, 'Tonnes')).toBe(false);
  });

  it('validates optional order value and notes', () => {
    expect(sanitizeOrderValueInput('12.345')).toBe('12.34');
    expect(isValidOrderValue(null)).toBe(true);
    expect(isValidOrderValue(0)).toBe(true);
    expect(isValidOrderValue(10_000_000)).toBe(true);
    expect(isValidOrderValue(10_000_000.01)).toBe(false);
    expect(isValidOrderValue(-1)).toBe(false);
    expect(isValidNotes('ok')).toBe(true);
    expect(isValidNotes('x'.repeat(201))).toBe(false);
  });
});
