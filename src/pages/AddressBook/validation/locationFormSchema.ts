import * as Yup from 'yup';
import { DOCK_TYPES, FACILITY_TYPES } from '../constants';
import { DUPLICATE_LOCATION_MESSAGE } from './locationDuplicateValidation';
import { areTimeRangesValid } from './timeRangeValidation';

const facilityValues = [...FACILITY_TYPES];

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

const contactSchema = Yup.object({
  name: Yup.string().trim().max(255),
  role: Yup.string().max(100),
  phone: Yup.string().max(20),
  email: Yup.string().email('Enter a valid contact email').max(50).nullable().transform((v) => v || ''),
}).test('contact-name-required', 'Contact name is required', (value) => {
  if (!value) return true;
  const hasContent = Boolean(value.name?.trim() || value.phone?.trim() || value.email?.trim());
  if (!hasContent) return true;
  return Boolean(value.name?.trim());
});

/** Mirrors MV_Backend_API UpdateLocationRequest / StoreLocationRequest rules. */
export const locationEditValidationSchema = Yup.object({
  company: Yup.string(),
  companyVat: Yup.string(),
  tags: Yup.string(),
  adr: Yup.boolean(),
  palletExchange: Yup.boolean(),
  equipment: Yup.array().of(Yup.string()),
  amenityIds: Yup.array().of(Yup.number()),
  name: Yup.string().trim().required('Location name is required').max(255),
  address: Yup.string().trim().required('Address is required').max(500),
  city: Yup.string().trim().required('City is required').max(255),
  postalCode: Yup.string().max(50),
  region: Yup.string().max(100),
  lat: Yup.string()
    .required('Latitude is required')
    .test('valid-lat', 'Enter a valid latitude between -90 and 90', (v) => isValidCoordinate(v, -90, 90)),
  lng: Yup.string()
    .required('Longitude is required')
    .test('valid-lng', 'Enter a valid longitude between -180 and 180', (v) => isValidCoordinate(v, -180, 180)),
  phone: Yup.string().max(255),
  email: Yup.string().email('Enter a valid email address').max(255).nullable().transform((v) => v || ''),
  role: Yup.string().oneOf(['both', 'pickup', 'delivery'], 'Select a valid role').required('Role is required'),
  type: Yup.string()
    .oneOf(facilityValues as unknown as string[], 'Select a valid facility type')
    .required('Facility type is required'),
  code: Yup.string().max(100),
  custCode: Yup.string().max(100),
  dock: Yup.string()
    .trim()
    .required('Dock type is required')
    .max(50)
    .test('valid-dock', 'Select a valid dock type', (v) => DOCK_TYPES.includes(v as (typeof DOCK_TYPES)[number])),
  maxTruck: Yup.string().trim(),
  maxWeight: Yup.string().trim(),
  loadTime: Yup.string()
    .required('Estimated loading/unloading time is required')
    .test('min-load-time', 'Must be at least 1 minute', (v) => {
      const n = parseInt(v ?? '', 10);
      return Number.isFinite(n) && n >= 1;
    }),
  hours: Yup.string().max(255),
  appt: Yup.boolean(),
  timeRanges: Yup.array()
    .when('appt', {
      is: true,
      then: (schema) => schema.min(1, 'Add at least one time range when appointment is required'),
      otherwise: (schema) => schema,
    })
    .test(
      'valid-ranges',
      'Enter start and end times; end must be after start.',
      function validateRanges(ranges) {
        return validateTimeRanges(ranges, this);
      }
    ),
  contacts: Yup.array().of(contactSchema),
  noteInternal: Yup.string(),
  noteCarrier: Yup.string(),
});

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
