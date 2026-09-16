import type { CreateLocationData } from '../types';
import { validateTimeRangesList } from './timeRangeValidation';
import { isPositiveMeasurement } from './locationFormSchema';

export type CreateFieldErrors = Partial<Record<string, string>>;

function isValidCoordinate(value: string | number | undefined, min: number, max: number): boolean {
  const str = String(value ?? '').trim();
  if (!str) return false;
  const n = parseFloat(str);
  return Number.isFinite(n) && n >= min && n <= max;
}

export function validateCreateStep1(data: CreateLocationData): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!String(data.type ?? '').trim()) errors.type = 'Location type is required';
  if (data.context === 'customer') {
    if (!data.companyEntityId && !String(data.company ?? '').trim()) {
      errors.companyEntity = 'Company / entity is required';
    }
  }
  return errors;
}

export function validateCreateStep2(data: CreateLocationData): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!String(data.name ?? '').trim()) errors.name = 'Location name is required';
  if (!String(data.address ?? '').trim()) errors.address = 'Address is required';
  if (!String(data.city ?? '').trim()) errors.city = 'City is required';
  if (!isValidCoordinate(data.lat, -90, 90)) errors.address = errors.address ?? 'Select a valid address from suggestions';
  if (!isValidCoordinate(data.lng, -180, 180)) errors.address = errors.address ?? 'Select a valid address from suggestions';
  if (!data.role) errors.role = 'Location role is required';
  return errors;
}

export function validateCreateStep3(data: CreateLocationData): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!String(data.dock ?? '').trim()) errors.dock = 'Dock type is required';

  if (!String(data.loadTime ?? '').trim()) {
    errors.loadTime = 'Estimated loading/unloading time is required';
  } else {
    const loadTimeNum = parseInt(String(data.loadTime).trim(), 10);
    if (!Number.isFinite(loadTimeNum) || loadTimeNum < 1) {
      errors.loadTime = 'Must be at least 1 minute';
    }
  }

  if (!isPositiveMeasurement(data.maxTruck, /m$/i)) {
    errors.maxTruck = 'Must be greater than 0';
  }

  if (!isPositiveMeasurement(data.maxWeight, /(t|tons?|kg)$/i)) {
    errors.maxWeight = 'Must be greater than 0';
  }

  if (data.appt) {
    const timeRangeError = validateTimeRangesList(data.timeRanges);
    if (timeRangeError) errors.timeRanges = timeRangeError;
  }
  return errors;
}

export function validateCreateAll(data: CreateLocationData): CreateFieldErrors {
  return {
    ...validateCreateStep1(data),
    ...validateCreateStep2(data),
    ...validateCreateStep3(data),
  };
}
