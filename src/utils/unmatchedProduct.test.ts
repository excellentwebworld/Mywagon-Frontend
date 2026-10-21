import { describe, expect, it } from 'vitest';
import { findProductMasterMatch, normalizeProductName, numericWeight, productPickPatch, unmatchedProductName } from './unmatchedProduct';

describe('unmatchedProductName — Bug 3 (QA 2026-10-10)', () => {
  const ord4 = { lines: [{ id: 91, productSkuId: null, productName: 'QARET-1010 Gadget', sku: 'G-1' }] };

  it('keeps the name the order gave the line when there is no product', () => {
    expect(unmatchedProductName({ productId: '', orderLineId: '' }, ord4)).toBe('QARET-1010 Gadget');
    expect(unmatchedProductName({ productId: '', productName: 'Saved name' }, ord4)).toBe('Saved name');
    expect(unmatchedProductName({ productId: '', orderLineId: '91' }, ord4)).toBe('QARET-1010 Gadget');
  });

  it('says nothing once a product is chosen, or when the order is ambiguous', () => {
    expect(unmatchedProductName({ productId: '7' }, ord4)).toBeNull();
    const two = { lines: [{ id: 1, productName: 'A' }, { id: 2, productName: 'B' }] };
    expect(unmatchedProductName({ productId: '' }, two)).toBeNull();
    expect(unmatchedProductName({ productId: '', orderLineId: '2' }, two)).toBe('B');
  });
});

describe('findProductMasterMatch', () => {
  const skus = [
    { id: 1, name: 'QARET-1010 Widget', number: 'W-1', active: true },
    { id: 2, name: 'Γάλα Φρέσκο 1L', number: 'MILK-1', active: true },
    { id: 3, name: 'Old Gadget', number: 'G-0', active: false },
    { id: 4, name: 'Pallet Water 500ml', number: 'WAT-500', active: true },
    { id: 5, name: 'Pallet Water 1.5L', number: 'WAT-1500', active: true },
  ];

  it('matches on the name or the SKU code, ignoring case, accents and punctuation', () => {
    expect(findProductMasterMatch('qaret 1010 widget', skus)?.id).toBe(1);
    expect(findProductMasterMatch('ΓΑΛΑ φρεσκο 1l', skus)?.id).toBe(2);
    expect(findProductMasterMatch('milk-1', skus)?.id).toBe(2);
    expect(normalizeProductName('Γάλα  1L')).toBe('γαλα 1l');
  });

  it('accepts one containing match but never guesses between two', () => {
    expect(findProductMasterMatch('QARET-1010 Widget box', skus)?.id).toBe(1);
    expect(findProductMasterMatch('Pallet Water', skus)).toBeNull();
  });

  it('ignores archived products and nonsense', () => {
    expect(findProductMasterMatch('Old Gadget', skus)).toBeNull();
    expect(findProductMasterMatch('', skus)).toBeNull();
    expect(findProductMasterMatch('QARET-1010 Gadget', skus)).toBeNull();
  });
});

describe('productPickPatch - "Use <match>" keeps the order quantities (QA retest #2)', () => {
  const widget = { id: 77, name: 'QARET-1010 Widget', unit: 'Boxes', weight: '240 kg' };

  it("keeps an order line's own weight, quantity and unit", () => {
    const patch = productPickPatch({ orderId: 341, qty: '4', unit: 'EUR Pallets', weight: '40', wtUnit: 'Kgs' }, widget);
    expect(patch).toMatchObject({ productId: '77', productName: 'QARET-1010 Widget', qty: '4', unit: 'EUR Pallets', weight: '40', wtUnit: 'Kgs' });
  });

  it('falls back to the product weight as a number the weight box accepts', () => {
    const patch = productPickPatch({ orderId: 341, qty: '4', unit: '', weight: '' }, widget);
    expect(patch.weight).toBe('240');
    expect(patch.unit).toBe('Boxes');
  });

  it('a line not from an order takes the product unit', () => {
    expect(productPickPatch({ qty: '1', unit: 'EUR Pallets', weight: '' }, widget).unit).toBe('Boxes');
  });
});

describe('numericWeight', () => {
  it('reads the number out of a weight string', () => {
    expect(numericWeight('240 kg')).toBe('240');
    expect(numericWeight('1.234,5 kg')).toBe('1234.5');
    expect(numericWeight('1,234.5')).toBe('1234.5');
    expect(numericWeight(40)).toBe('40');
    expect(numericWeight('kg')).toBe('');
    expect(numericWeight(null)).toBe('');
    expect(numericWeight('0')).toBe('');
  });
});
