import type { CreateLocationData } from '../types';
import { LOAD_TIME_MINUTES_MAX, LOAD_TIME_MINUTES_MIN } from '../constants';
import { validateTimeRangesList } from './timeRangeValidation';
import { isPositiveMeasurement } from './locationFormSchema';

export type CreateFieldErrors = Partial<Record<string, string>>;

type TFn = (key: string, fallback?: string) => string;

const defaultT: TFn = (_k, fb) => fb ?? _k;

function isValidCoordinate(value: string | number | undefined, min: number, max: number): boolean {
  const str = String(value ?? '').trim();
  if (!str) return false;
  const n = parseFloat(str);
  return Number.isFinite(n) && n >= min && n <= max;
}

export function validateCreateStep1(
  data: CreateLocationData,
  t: TFn = defaultT
): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!String(data.type ?? '').trim()) {
    errors.type = t('abValLocationTypeRequired', 'Location type is required');
  }
  if (data.context === 'customer') {
    if (!data.companyEntityId && !String(data.company ?? '').trim()) {
      errors.companyEntity = t('abValCompanyEntityRequired', 'Company / entity is required');
    }
  }
  return errors;
}

export function validateCreateStep2(
  data: CreateLocationData,
  t: TFn = defaultT
): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!String(data.name ?? '').trim()) {
    errors.name = t('abValLocationNameRequired', 'Location name is required');
  }
  if (!String(data.address ?? '').trim()) {
    errors.address = t('abValAddressRequired', 'Address is required');
  }
  if (!String(data.city ?? '').trim()) {
    errors.city = t('abValCityRequired', 'City is required');
  }
  if (!isValidCoordinate(data.lat, -90, 90)) {
    errors.address =
      errors.address ?? t('abValSelectValidAddress', 'Select a valid address from suggestions');
  }
  if (!isValidCoordinate(data.lng, -180, 180)) {
    errors.address =
      errors.address ?? t('abValSelectValidAddress', 'Select a valid address from suggestions');
  }
  if (!data.role) {
    errors.role = t('abValLocationRoleRequired', 'Location role is required');
  }
  return errors;
}

export function validateCreateStep3(
  data: CreateLocationData,
  t: TFn = defaultT
): CreateFieldErrors {
  const errors: CreateFieldErrors = {};
  if (!String(data.dock ?? '').trim()) {
    errors.dock = t('abValDockRequired', 'Dock type is required');
  }

  const loadTimeStr = String(data.loadTime ?? '').trim();
  if (!loadTimeStr) {
    errors.loadTime = t(
      'abValLoadTimeRequired',
      'Estimated loading/unloading time is required'
    );
  } else if (!/^\d+$/.test(loadTimeStr)) {
    errors.loadTime = t('abValLoadTimeInteger', 'Enter a whole number of minutes');
  } else {
    const loadTimeNum = Number(loadTimeStr);
    if (loadTimeNum < LOAD_TIME_MINUTES_MIN) {
      errors.loadTime = t('abValLoadTimeMin', 'Must be at least 1 minute');
    } else if (loadTimeNum > LOAD_TIME_MINUTES_MAX) {
      errors.loadTime = t(
        'abValLoadTimeMax',
        `Must be at most ${LOAD_TIME_MINUTES_MAX} minutes`
      );
    }
  }

  if (!isPositiveMeasurement(data.maxTruck, /m$/i)) {
    errors.maxTruck = t('abValMustBePositive', 'Must be greater than 0');
  }

  if (!isPositiveMeasurement(data.maxWeight, /(t|tons?|kg)$/i)) {
    errors.maxWeight = t('abValMustBePositive', 'Must be greater than 0');
  }

  if (data.appt) {
    const timeRangeError = validateTimeRangesList(data.timeRanges, t);
    if (timeRangeError) errors.timeRanges = timeRangeError;
  }
  return errors;
}

export function validateCreateAll(
  data: CreateLocationData,
  t: TFn = defaultT
): CreateFieldErrors {
  return {
    ...validateCreateStep1(data, t),
    ...validateCreateStep2(data, t),
    ...validateCreateStep3(data, t),
  };
}
