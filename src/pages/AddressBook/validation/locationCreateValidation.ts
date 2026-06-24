import type { CreateLocationData } from '../types';
import { validateTimeRangesList } from './timeRangeValidation';

export type CreateFieldErrors = Partial<Record<string, string>>;

function isValidCoordinate(value: string | undefined, min: number, max: number): boolean {
  if (!value?.trim()) return false;
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

export function validateCreateStep1(data: CreateLocationData): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!data.type?.trim()) errors.type = 'Location type is required';
  if (data.context === 'customer') {
    if (!data.companyEntityId && !data.company?.trim()) {
      errors.companyEntity = 'Company / entity is required';
    }
  }
  return errors;
}

export function validateCreateStep2(data: CreateLocationData): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!data.name?.trim()) errors.name = 'Location name is required';
  if (!data.address?.trim()) errors.address = 'Address is required';
  if (!data.city?.trim()) errors.city = 'City is required';
  if (!isValidCoordinate(data.lat, -90, 90)) errors.address = errors.address ?? 'Select a valid address from suggestions';
  if (!isValidCoordinate(data.lng, -180, 180)) errors.address = errors.address ?? 'Select a valid address from suggestions';
  if (!data.role) errors.role = 'Location role is required';
  return errors;
}

export function validateCreateStep3(data: CreateLocationData): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!data.dock?.trim()) errors.dock = 'Dock type is required';
  if (!data.maxTruck?.trim()) errors.maxTruck = 'Max truck length is required';
  if (!data.maxWeight?.trim()) errors.maxWeight = 'Max weight is required';
  if (!data.loadTime?.trim()) errors.loadTime = 'Estimated loading/unloading time is required';
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
