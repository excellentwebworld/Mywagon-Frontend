import type { LocationItem } from '../../../context/AppContext';
import type { LocationFormValues } from './locationFormSchema';
import { coerceFormString } from './locationFormCoerce';

/** Coerce form/API values to strings so `.trim()` and Yup string rules never throw. */
export { coerceFormString } from './locationFormCoerce';

export function normalizeLocationFormValues(values: LocationFormValues): LocationFormValues {
  return {
    ...values,
    loadTime: coerceFormString(values.loadTime),
    maxTruck: coerceFormString(values.maxTruck),
    maxWeight: coerceFormString(values.maxWeight),
    dock: coerceFormString(values.dock),
    lat: coerceFormString(values.lat),
    lng: coerceFormString(values.lng),
    postalCode: coerceFormString(values.postalCode),
    region: coerceFormString(values.region),
    phone: coerceFormString(values.phone),
    email: coerceFormString(values.email),
    code: coerceFormString(values.code),
    custCode: coerceFormString(values.custCode),
    hours: coerceFormString(values.hours),
  };
}

export function locationToFormValues(loc: LocationItem): LocationFormValues {
  return normalizeLocationFormValues({
    name: loc.name,
    company: loc.company,
    companyVat: loc.companyVat,
    address: loc.address,
    city: loc.city,
    postalCode: loc.postalCode ?? '',
    region: loc.region ?? '',
    lat: loc.lat !== 0 ? String(loc.lat) : '',
    lng: loc.lng !== 0 ? String(loc.lng) : '',
    phone: loc.phone ?? '',
    email: loc.email ?? '',
    role: loc.role,
    type: loc.type || 'warehouse',
    code: loc.code ?? '',
    custCode: loc.custCode ?? '',
    tags: loc.tags.join(', '),
    appt: loc.appt,
    dock: loc.dock ?? '',
    hours: loc.hours ?? '',
    maxTruck: loc.maxTruck ?? '',
    maxWeight: loc.maxWeight ?? '',
    adr: loc.adr,
    palletExchange: loc.palletExchange,
    loadTime: loc.loadTime && loc.loadTime >= 1 ? String(loc.loadTime) : '',
    noteInternal: loc.noteInternal ?? '',
    noteCarrier: loc.noteCarrier ?? '',
    equipment: loc.equipment ?? [],
    amenityIds: loc.amenityIds ?? [],
    timeRanges: loc.timeRanges ?? [],
    contacts: loc.contacts ?? [],
  });
}

export function formValuesToLocationItem(values: LocationFormValues, existing: LocationItem): LocationItem {
  const normalized = normalizeLocationFormValues(values);
  const loadTime = parseInt(normalized.loadTime, 10);

  return {
    ...existing,
    name: normalized.name.trim(),
    address: normalized.address.trim(),
    city: normalized.city.trim(),
    postalCode: normalized.postalCode.trim(),
    region: normalized.region.trim(),
    lat: parseFloat(normalized.lat) || 0,
    lng: parseFloat(normalized.lng) || 0,
    phone: normalized.phone.trim(),
    email: normalized.email.trim(),
    role: normalized.role,
    type: normalized.type,
    code: normalized.code.trim(),
    custCode: normalized.custCode.trim(),
    tags: normalized.tags
      ? normalized.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    appt: normalized.appt ?? false,
    dock: normalized.dock.trim(),
    hours: normalized.hours.trim(),
    maxTruck: normalized.maxTruck.trim(),
    maxWeight: normalized.maxWeight.trim(),
    adr: normalized.adr ?? false,
    palletExchange: normalized.palletExchange ?? false,
    loadTime: Number.isFinite(loadTime) && loadTime >= 1 ? loadTime : 1,
    noteInternal: normalized.noteInternal ?? '',
    noteCarrier: normalized.noteCarrier ?? '',
    equipment: normalized.equipment ?? [],
    amenityIds: normalized.amenityIds ?? [],
    timeRanges: normalized.timeRanges ?? [],
    contacts: (normalized.contacts ?? []).filter((c) => c.name.trim()),
  };
}

/** Map Laravel API field keys to Formik field names for server-side errors. */
export const API_FIELD_TO_FORM: Record<string, keyof LocationFormValues | 'timeRanges' | 'contacts'> = {
  location_name: 'name',
  location: 'address',
  lat: 'lat',
  lng: 'lng',
  city: 'city',
  postal_code: 'postalCode',
  region: 'region',
  phone: 'phone',
  email: 'email',
  location_subtype: 'type',
  location_role: 'role',
  location_code: 'code',
  customer_code: 'custCode',
  dock_type: 'dock',
  max_truck_length: 'maxTruck',
  max_weight: 'maxWeight',
  load_time_minutes: 'loadTime',
  receiving_hours: 'hours',
  appointment_required: 'appt',
  time_ranges: 'timeRanges',
  internal_note: 'noteInternal',
  carrier_note: 'noteCarrier',
  contacts: 'contacts',
};
