import type { LocationItem } from '../../../context/AppContext';
import type { LocationFormValues } from './locationFormSchema';

export function locationToFormValues(loc: LocationItem): LocationFormValues {
  return {
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
  };
}

export function formValuesToLocationItem(values: LocationFormValues, existing: LocationItem): LocationItem {
  const loadTime = parseInt(values.loadTime, 10);

  return {
    ...existing,
    name: values.name.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    postalCode: values.postalCode?.trim() ?? '',
    region: values.region?.trim() ?? '',
    lat: parseFloat(values.lat) || 0,
    lng: parseFloat(values.lng) || 0,
    phone: values.phone?.trim() ?? '',
    email: values.email?.trim() ?? '',
    role: values.role,
    type: values.type,
    code: values.code?.trim() ?? '',
    custCode: values.custCode?.trim() ?? '',
    tags: values.tags
      ? values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    appt: values.appt ?? false,
    dock: values.dock.trim(),
    hours: values.hours?.trim() ?? '',
    maxTruck: values.maxTruck.trim(),
    maxWeight: values.maxWeight.trim(),
    adr: values.adr ?? false,
    palletExchange: values.palletExchange ?? false,
    loadTime: Number.isFinite(loadTime) && loadTime >= 1 ? loadTime : 1,
    noteInternal: values.noteInternal ?? '',
    noteCarrier: values.noteCarrier ?? '',
    equipment: values.equipment ?? [],
    amenityIds: values.amenityIds ?? [],
    timeRanges: values.timeRanges ?? [],
    contacts: (values.contacts ?? []).filter((c) => c.name.trim()),
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
