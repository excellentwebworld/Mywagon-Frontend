import { describe, expect, it } from 'vitest';
import { isPositiveMeasurement, locationEditValidationSchema } from './locationFormSchema';
import { validateCreateStep3 } from './locationCreateValidation';
import type { CreateLocationData } from '../types';

describe('Address Book Location Measurement and Step 3 Validation', () => {
  describe('isPositiveMeasurement helper', () => {
    it('rejects negative numbers and negative numbers with units', () => {
      expect(isPositiveMeasurement('-5', /m$/i)).toBe(false);
      expect(isPositiveMeasurement('-5m', /m$/i)).toBe(false);
      expect(isPositiveMeasurement('-18.75 m', /m$/i)).toBe(false);
      expect(isPositiveMeasurement('-40', /(t|tons?|kg)$/i)).toBe(false);
      expect(isPositiveMeasurement('-40T', /(t|tons?|kg)$/i)).toBe(false);
    });

    it('rejects zero values', () => {
      expect(isPositiveMeasurement('0', /m$/i)).toBe(false);
      expect(isPositiveMeasurement('0m', /m$/i)).toBe(false);
      expect(isPositiveMeasurement('0.0', /m$/i)).toBe(false);
      expect(isPositiveMeasurement('0T', /(t|tons?|kg)$/i)).toBe(false);
    });

    it('accepts valid positive numbers with or without units', () => {
      expect(isPositiveMeasurement('18.75', /m$/i)).toBe(true);
      expect(isPositiveMeasurement('18.75m', /m$/i)).toBe(true);
      expect(isPositiveMeasurement('12', /m$/i)).toBe(true);
      expect(isPositiveMeasurement('12m', /m$/i)).toBe(true);
      expect(isPositiveMeasurement('40', /(t|tons?|kg)$/i)).toBe(true);
      expect(isPositiveMeasurement('40T', /(t|tons?|kg)$/i)).toBe(true);
      expect(isPositiveMeasurement('40 tons', /(t|tons?|kg)$/i)).toBe(true);
    });

    it('allows empty / null / undefined values for optional fields', () => {
      expect(isPositiveMeasurement('', /m$/i)).toBe(true);
      expect(isPositiveMeasurement('   ', /m$/i)).toBe(true);
      expect(isPositiveMeasurement(null, /m$/i)).toBe(true);
      expect(isPositiveMeasurement(undefined, /m$/i)).toBe(true);
    });
  });

  describe('validateCreateStep3', () => {
    const baseValidData: CreateLocationData = {
      context: 'my',
      company: 'My Co',
      companyVat: '123456789',
      companyEntityId: null,
      template: null,
      type: 'warehouse',
      name: 'Main Hub',
      address: 'Industrial St 1',
      city: 'Athens',
      postalCode: '10000',
      region: 'Attica',
      lat: 38.0,
      lng: 23.7,
      phone: '',
      email: '',
      role: 'both',
      code: '',
      custCode: '',
      dock: 'Dock-level',
      maxTruck: '18.75m',
      maxWeight: '40T',
      loadTime: '45',
      appt: false,
      adr: false,
      palletExchange: false,
      noteInternal: '',
      noteCarrier: '',
      timeRanges: [],
    };

    it('returns no errors for valid step 3 data', () => {
      const errors = validateCreateStep3(baseValidData);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('flags negative maxTruck, maxWeight, and loadTime', () => {
      const invalidData: CreateLocationData = {
        ...baseValidData,
        maxTruck: '-5',
        maxWeight: '-15',
        loadTime: '-15',
      };
      const errors = validateCreateStep3(invalidData);
      expect(errors.maxTruck).toBe('Must be greater than 0');
      expect(errors.maxWeight).toBe('Must be greater than 0');
      expect(errors.loadTime).toBe('Must be at least 1 minute');
    });

    it('flags zero loadTime and missing dock type', () => {
      const invalidData: CreateLocationData = {
        ...baseValidData,
        dock: '',
        loadTime: '0',
      };
      const errors = validateCreateStep3(invalidData);
      expect(errors.dock).toBe('Dock type is required');
      expect(errors.loadTime).toBe('Must be at least 1 minute');
    });
  });

  describe('locationEditValidationSchema (Yup)', () => {
    it('rejects negative maxTruck and negative maxWeight on edit schema', async () => {
      await expect(
        locationEditValidationSchema.validateAt('maxTruck', { maxTruck: '-5' })
      ).rejects.toThrow('Must be greater than 0');

      await expect(
        locationEditValidationSchema.validateAt('maxWeight', { maxWeight: '-20T' })
      ).rejects.toThrow('Must be greater than 0');
    });

    it('accepts valid maxTruck and maxWeight strings on edit schema', async () => {
      await expect(
        locationEditValidationSchema.validateAt('maxTruck', { maxTruck: '18.75m' })
      ).resolves.toBe('18.75m');

      await expect(
        locationEditValidationSchema.validateAt('maxWeight', { maxWeight: '40T' })
      ).resolves.toBe('40T');

      await expect(
        locationEditValidationSchema.validateAt('maxTruck', { maxTruck: '' })
      ).resolves.toBe('');
    });
  });
});
