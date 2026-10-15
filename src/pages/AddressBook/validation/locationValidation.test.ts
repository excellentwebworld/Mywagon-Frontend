import { describe, expect, it } from 'vitest';
import {
  LOAD_TIME_MINUTES_MAX,
  sanitizeLoadTimeMinutesInput,
} from '../constants';
import { isPositiveMeasurement, locationEditValidationSchema } from './locationFormSchema';
import { validateCreateStep2, validateCreateStep3 } from './locationCreateValidation';
import type { CreateLocationData } from '../types';
import { EMPTY_CREATE_DATA } from '../types';

describe('Address Book Location Measurement and Step 3 Validation', () => {
  describe('sanitizeLoadTimeMinutesInput', () => {
    it('allows empty, in-range digits, and rejects oversized pastes', () => {
      expect(sanitizeLoadTimeMinutesInput('')).toBe('');
      expect(sanitizeLoadTimeMinutesInput('45')).toBe('45');
      expect(sanitizeLoadTimeMinutesInput(String(LOAD_TIME_MINUTES_MAX))).toBe(
        String(LOAD_TIME_MINUTES_MAX)
      );
      expect(sanitizeLoadTimeMinutesInput('1441')).toBeNull();
      expect(sanitizeLoadTimeMinutesInput('65536')).toBeNull();
      expect(sanitizeLoadTimeMinutesInput('45.5')).toBeNull();
      expect(sanitizeLoadTimeMinutesInput('-1')).toBeNull();
    });
  });

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

  describe('validateCreateStep2', () => {
    const baseAddress: CreateLocationData = {
      ...EMPTY_CREATE_DATA,
      name: 'Central Warehouse',
      address: 'Industrial St 1',
      city: 'Athens',
      postal: '10000',
      lat: '38.0',
      lng: '23.7',
      role: 'both',
      code: '12345',
    };

    it('accepts valid location name, postal, and code', () => {
      expect(Object.keys(validateCreateStep2(baseAddress)).length).toBe(0);
    });

    it('rejects location name with special characters', () => {
      const errors = validateCreateStep2({ ...baseAddress, name: 'Hub@Main!' });
      expect(errors.name).toMatch(/special characters/i);
    });

    it('rejects non-digit postal but allows alphanumeric code', () => {
      const errors = validateCreateStep2({
        ...baseAddress,
        postal: 'AB-12',
        code: 'WH-IOA-01',
      });
      expect(errors.postal).toMatch(/digits/i);
      expect(errors.code).toBeUndefined();
    });

    it('rejects internal code longer than 10 characters', () => {
      const errors = validateCreateStep2({
        ...baseAddress,
        code: 'WH-IOA-01-XX',
      });
      expect(errors.code).toMatch(/at most 10/i);
    });
  });

  describe('validateCreateStep3', () => {
    const baseValidData: CreateLocationData = {
      ...EMPTY_CREATE_DATA,
      type: 'warehouse',
      name: 'Main Hub',
      address: 'Industrial St 1',
      city: 'Athens',
      postal: '10000',
      lat: '38.0',
      lng: '23.7',
      role: 'both',
      dock: 'Dock-level',
      maxTruck: '18.75',
      maxWeight: '40',
      loadTime: '45',
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
      expect(errors.maxTruck).toMatch(/greater than 0/i);
      expect(errors.maxWeight).toMatch(/greater than 0/i);
      expect(errors.loadTime).toBe('Enter a whole number of minutes');
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

    it('flags oversized truck/weight and loadTime over 1440', () => {
      expect(
        validateCreateStep3({ ...baseValidData, maxTruck: '26' }).maxTruck
      ).toMatch(/max 25/i);
      expect(
        validateCreateStep3({ ...baseValidData, maxWeight: '100.01' }).maxWeight
      ).toMatch(/max 100/i);
      expect(
        validateCreateStep3({ ...baseValidData, loadTime: '1441' }).loadTime
      ).toBe('Must be at most 1440 minutes');
      expect(
        validateCreateStep3({ ...baseValidData, loadTime: '45.5' }).loadTime
      ).toBe('Enter a whole number of minutes');
    });

    it('accepts loadTime at 1440 and empty optional truck/weight', () => {
      expect(
        validateCreateStep3({ ...baseValidData, loadTime: '1440' }).loadTime
      ).toBeUndefined();
      expect(
        validateCreateStep3({ ...baseValidData, maxTruck: '', maxWeight: '' }).maxTruck
      ).toBeUndefined();
    });

    it('flags more than 2 decimal places', () => {
      expect(
        validateCreateStep3({ ...baseValidData, maxTruck: '18.751' }).maxTruck
      ).toMatch(/2 decimals/i);
    });
  });

  describe('locationEditValidationSchema (Yup)', () => {
    it('rejects invalid maxTruck and maxWeight on edit schema', async () => {
      await expect(
        locationEditValidationSchema.validateAt('maxTruck', { maxTruck: '-5' })
      ).rejects.toThrow(/greater than 0/i);

      await expect(
        locationEditValidationSchema.validateAt('maxWeight', { maxWeight: '101' })
      ).rejects.toThrow(/max 100/i);
    });

    it('accepts valid maxTruck and maxWeight strings on edit schema', async () => {
      await expect(
        locationEditValidationSchema.validateAt('maxTruck', { maxTruck: '18.75' })
      ).resolves.toBe('18.75');

      await expect(
        locationEditValidationSchema.validateAt('maxWeight', { maxWeight: '40' })
      ).resolves.toBe('40');

      await expect(
        locationEditValidationSchema.validateAt('maxTruck', { maxTruck: '' })
      ).resolves.toBe('');
    });

    it('rejects oversized loadTime on edit schema', async () => {
      await expect(
        locationEditValidationSchema.validateAt('loadTime', { loadTime: '1441' })
      ).rejects.toThrow('Must be at most 1440 minutes');

      await expect(
        locationEditValidationSchema.validateAt('loadTime', { loadTime: '45' })
      ).resolves.toBe('45');
    });

    it('enforces note max 500 and location name rules', async () => {
      await expect(
        locationEditValidationSchema.validateAt('noteInternal', {
          noteInternal: 'x'.repeat(501),
        })
      ).rejects.toThrow(/500/);

      await expect(
        locationEditValidationSchema.validateAt('name', { name: 'Hub@1' })
      ).rejects.toThrow(/special characters|letters/i);
    });
  });
});
