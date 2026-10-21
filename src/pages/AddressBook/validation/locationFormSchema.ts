import * as Yup from 'yup';
import {
  DOCK_TYPES,
  FACILITY_TYPES,
  LOAD_TIME_MINUTES_MAX,
  LOAD_TIME_MINUTES_MIN,
} from '../constants';
import { DUPLICATE_LOCATION_MESSAGE } from './locationDuplicateValidation';
import { areTimeRangesValid } from './timeRangeValidation';
import { coerceFormString } from './locationFormCoerce';
import { optionalPhoneSchema } from './phoneValidation';
import { isPositiveMeasurement } from '../../../utils/measurementValidation';
import {
  isValidBoundedDecimal,
  LOCATION_CODE_MAX,
  LOCATION_NAME_MAX,
  LOCATION_POSTAL_MAX,
  MAX_TRUCK_LENGTH_M,
  MAX_WEIGHT_T,
  NOTE_MAX,
} from './locationFieldValidation';

export { isPositiveMeasurement };

const facilityValues = [...FACILITY_TYPES];

type TFn = (key: string, fallback?: string) => string;

function isValidCoordinate(value: any, min: number, max: number): boolean {
  const str = String(value ?? '').trim();
  if (!str) return false;
  const n = parseFloat(str);
  return Number.isFinite(n) && n >= min && n <= max;
}

function validateTimeRanges(
  ranges: { start_time?: string; end_time?: string }[] | undefined,
  context?: { parent?: { appt?: boolean } }
): boolean {
  if (!context?.parent?.appt) return true;
  return areTimeRangesValid(ranges);
}

function buildContactSchema(t: TFn) {
  return Yup.object({
    name: Yup.string().trim().max(255),
    role: Yup.string().max(100),
    phone: optionalPhoneSchema(t('abValidPhone', 'Enter a valid phone number.')).max(20),
    email: Yup.string()
      .email(t('abValValidContactEmail', 'Enter a valid contact email'))
      .max(50)
      .nullable()
      .transform((v) => v || ''),
  }).test(
    'contact-name-required',
    t('abValContactNameRequired', 'Contact name is required'),
    (value) => {
      if (!value) return true;
      const hasContent = Boolean(value.name?.trim() || value.phone?.trim() || value.email?.trim());
      if (!hasContent) return true;
      return Boolean(value.name?.trim());
    }
  );
}

/** Mirrors MV_Backend_API UpdateLocationRequest / StoreLocationRequest rules. */
export function getLocationEditValidationSchema(t: TFn = (_k, fb) => fb ?? _k) {
  return Yup.object({
    company: Yup.string(),
    companyVat: Yup.string(),
    tags: Yup.string(),
    adr: Yup.boolean(),
    palletExchange: Yup.boolean(),
    equipment: Yup.array().of(Yup.string()),
    amenityIds: Yup.array().of(Yup.number()),
    name: Yup.string()
      .trim()
      .required(t('abValLocationNameRequired', 'Location name is required'))
      .max(
        LOCATION_NAME_MAX,
        t('abValLocationNameMax', `Location name must be at most ${LOCATION_NAME_MAX} characters`)
      )
      .matches(
        /^[\p{L}\p{N}\s]+$/u,
        t(
          'abValLocationNameFormat',
          'Location name may only contain letters, digits and spaces (no special characters)'
        )
      ),
    address: Yup.string()
      .trim()
      .required(t('abValAddressRequired', 'Address is required'))
      .max(500),
    city: Yup.string()
      .trim()
      .required(t('abValCityRequired', 'City is required'))
      .max(255),
    postalCode: Yup.string()
      .trim()
      .matches(
        /^\d*$/,
        t('abValPostalDigits', 'Postal code may only contain digits (max 10)')
      )
      .max(
        LOCATION_POSTAL_MAX,
        t('abValPostalMax', `Postal code must be at most ${LOCATION_POSTAL_MAX} digits`)
      ),
    region: Yup.string().max(100),
    lat: Yup.string()
      .required(t('abValLatRequired', 'Latitude is required'))
      .test('valid-lat', t('abValValidLat', 'Enter a valid latitude between -90 and 90'), (v) =>
        isValidCoordinate(v, -90, 90)
      ),
    lng: Yup.string()
      .required(t('abValLngRequired', 'Longitude is required'))
      .test('valid-lng', t('abValValidLng', 'Enter a valid longitude between -180 and 180'), (v) =>
        isValidCoordinate(v, -180, 180)
      ),
    phone: optionalPhoneSchema(t('abValidPhone', 'Enter a valid phone number.')).max(255),
    email: Yup.string()
      .email(t('abValValidEmail', 'Enter a valid email address'))
      .max(255)
      .nullable()
      .transform((v) => v || ''),
    role: Yup.string()
      .oneOf(['both', 'pickup', 'delivery'], t('abValValidRole', 'Select a valid role'))
      .required(t('abValRoleRequired', 'Role is required')),
    type: Yup.string()
      .oneOf(facilityValues as unknown as string[], t('abValValidFacility', 'Select a valid facility type'))
      .required(t('abValFacilityRequired', 'Facility type is required')),
    code: Yup.string()
      .trim()
      .max(
        LOCATION_CODE_MAX,
        t(
          'abValInternalCodeMax',
          `Internal location code must be at most ${LOCATION_CODE_MAX} characters`
        )
      ),
    custCode: Yup.string().max(100),
    dock: Yup.string()
      .transform((v) => coerceFormString(v))
      .trim()
      .required(t('abValDockRequired', 'Dock type is required'))
      .max(50)
      .test('valid-dock', t('abValValidDock', 'Select a valid dock type'), (v) =>
        DOCK_TYPES.includes(v as (typeof DOCK_TYPES)[number])
      ),
    maxTruck: Yup.string()
      .transform((v) => coerceFormString(v))
      .trim()
      .test(
        'max-truck-bounds',
        t(
          'abValMaxTruckInvalid',
          `Must be greater than 0, up to 2 decimals, max ${MAX_TRUCK_LENGTH_M}`
        ),
        (v) => isValidBoundedDecimal(v, MAX_TRUCK_LENGTH_M, { optional: true })
      ),
    maxWeight: Yup.string()
      .transform((v) => coerceFormString(v))
      .trim()
      .test(
        'max-weight-bounds',
        t(
          'abValMaxWeightInvalid',
          `Must be greater than 0, up to 2 decimals, max ${MAX_WEIGHT_T}`
        ),
        (v) => isValidBoundedDecimal(v, MAX_WEIGHT_T, { optional: true })
      ),
    loadTime: Yup.string()
      .transform((v) => coerceFormString(v))
      .required(t('abValLoadTimeRequired', 'Estimated loading/unloading time is required'))
      .test(
        'integer-load-time',
        t('abValLoadTimeInteger', 'Enter a whole number of minutes'),
        (v) => /^\d+$/.test(String(v ?? '').trim())
      )
      .test('min-load-time', t('abValLoadTimeMin', 'Must be at least 1 minute'), (v) => {
        const n = Number(String(v ?? '').trim());
        return Number.isFinite(n) && n >= LOAD_TIME_MINUTES_MIN;
      })
      .test(
        'max-load-time',
        t('abValLoadTimeMax', `Must be at most ${LOAD_TIME_MINUTES_MAX} minutes`),
        (v) => {
          const n = Number(String(v ?? '').trim());
          return Number.isFinite(n) && n <= LOAD_TIME_MINUTES_MAX;
        }
      ),
    hours: Yup.string().max(255),
    appt: Yup.boolean(),
    timeRanges: Yup.array()
      .when('appt', {
        is: true,
        then: (schema) =>
          schema.min(
            1,
            t('abValTimeRangeMin', 'Add at least one time range when appointment is required')
          ),
        otherwise: (schema) => schema,
      })
      .test(
        'valid-ranges',
        t('abValTimeRangesInvalid', 'Enter start and end times; end must be after start.'),
        function validateRanges(ranges) {
          return validateTimeRanges(ranges, this);
        }
      ),
    contacts: Yup.array().of(buildContactSchema(t)),
    noteInternal: Yup.string()
      .transform((v) => (typeof v === 'string' ? v.trim() : v))
      .max(
        NOTE_MAX,
        t('abValNoteInternalMax', `Internal note must be at most ${NOTE_MAX} characters`)
      ),
    noteCarrier: Yup.string()
      .transform((v) => (typeof v === 'string' ? v.trim() : v))
      .max(
        NOTE_MAX,
        t('abValNoteCarrierMax', `Carrier-visible note must be at most ${NOTE_MAX} characters`)
      ),
  });
}

/** Default English schema for tests and callers without a translator. */
export const locationEditValidationSchema = getLocationEditValidationSchema();

export interface LocationFormValues {
  name: string;
  company: string;
  companyVat: string;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  lat: string;
  lng: string;
  phone: string;
  email: string;
  role: 'both' | 'pickup' | 'delivery';
  type: string;
  code: string;
  custCode: string;
  tags: string;
  appt: boolean;
  dock: string;
  hours: string;
  maxTruck: string;
  maxWeight: string;
  adr: boolean;
  palletExchange: boolean;
  loadTime: string;
  noteInternal: string;
  noteCarrier: string;
  equipment: string[];
  amenityIds: number[];
  timeRanges: { id?: number; start_time: string; end_time: string }[];
  contacts: { id?: number; name: string; role: string; phone: string; email: string }[];
}

export { DUPLICATE_LOCATION_MESSAGE };
