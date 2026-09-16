import { describe, expect, it } from 'vitest';
import { skuValidationSchema } from './ProductMasterSkuModal';

describe('ProductMaster SKU Validation', () => {
  const baseValid = {
    catId: '1',
    typeId: '2',
    name: 'Vikos 1.5L Mineral Water',
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

  it('validates a valid SKU with positive weight successfully', async () => {
    await expect(skuValidationSchema.validate(baseValid)).resolves.toBeTruthy();
  });

  it('validates a SKU with positive weight and kg unit suffix successfully', async () => {
    await expect(
      skuValidationSchema.validate({ ...baseValid, weight: '25 kg' })
    ).resolves.toBeTruthy();
    await expect(
      skuValidationSchema.validate({ ...baseValid, weight: '1.55kg' })
    ).resolves.toBeTruthy();
  });

  it('allows empty weight as it is an optional field', async () => {
    await expect(
      skuValidationSchema.validate({ ...baseValid, weight: '' })
    ).resolves.toBeTruthy();
  });

  it('rejects negative weight inputs', async () => {
    await expect(
      skuValidationSchema.validateAt('weight', { weight: '-2' })
    ).rejects.toThrow('Must be greater than 0');

    await expect(
      skuValidationSchema.validateAt('weight', { weight: '-2 kg' })
    ).rejects.toThrow('Must be greater than 0');

    await expect(
      skuValidationSchema.validateAt('weight', { weight: '-0.5' })
    ).rejects.toThrow('Must be greater than 0');
  });

  it('rejects zero weight inputs', async () => {
    await expect(
      skuValidationSchema.validateAt('weight', { weight: '0' })
    ).rejects.toThrow('Must be greater than 0');

    await expect(
      skuValidationSchema.validateAt('weight', { weight: '0 kg' })
    ).rejects.toThrow('Must be greater than 0');
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
});
