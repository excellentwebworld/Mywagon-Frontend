import type { CreateLocationData } from '../types';
import { LOAD_TIME_MINUTES_MAX, LOAD_TIME_MINUTES_MIN } from '../constants';
import { validateTimeRangesList } from './timeRangeValidation';
import {
  isValidBoundedDecimal,
  isValidInternalCode,
  isValidLocationName,
  isValidNote,
  isValidPostalCode,
  LOCATION_NAME_MAX,
  MAX_TRUCK_LENGTH_M,
  MAX_WEIGHT_T,
  NOTE_MAX,
} from './locationFieldValidation';

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
  const name = String(data.name ?? '');
  if (!name.trim()) {
    errors.name = t('abValLocationNameRequired', 'Location name is required');
  } else if (!isValidLocationName(name)) {
    errors.name = t(
      'abValLocationNameFormat',
      `Location name must be at most ${LOCATION_NAME_MAX} characters with no special characters`
    );
  }
  if (!String(data.address ?? '').trim()) {
    errors.address = t('abValAddressRequired', 'Address is required');
  }
  if (!String(data.city ?? '').trim()) {
    errors.city = t('abValCityRequired', 'City is required');
  }
  if (!isValidPostalCode(String(data.postal ?? ''))) {
    errors.postal = t(
      'abValPostalDigits',
      'Postal code may only contain digits (max 10)'
    );
  }
  if (!isValidInternalCode(String(data.code ?? ''))) {
    errors.code = t(
      'abValInternalCodeMax',
      'Internal location code must be at most 10 characters'
    );
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

  if (!isValidBoundedDecimal(data.maxTruck, MAX_TRUCK_LENGTH_M, { optional: true })) {
    errors.maxTruck = t(
      'abValMaxTruckInvalid',
      `Must be greater than 0, up to 2 decimals, max ${MAX_TRUCK_LENGTH_M}`
    );
  }

  if (!isValidBoundedDecimal(data.maxWeight, MAX_WEIGHT_T, { optional: true })) {
    errors.maxWeight = t(
      'abValMaxWeightInvalid',
      `Must be greater than 0, up to 2 decimals, max ${MAX_WEIGHT_T}`
    );
  }

  if (!isValidNote(String(data.noteInternal ?? ''))) {
    errors.noteInternal = t(
      'abValNoteInternalMax',
      `Internal note must be at most ${NOTE_MAX} characters`
    );
  }
  if (!isValidNote(String(data.noteCarrier ?? ''))) {
    errors.noteCarrier = t(
      'abValNoteCarrierMax',
      `Carrier-visible note must be at most ${NOTE_MAX} characters`
    );
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
