import type { LocationItem } from '../../context/AppContext';

export interface DirectoryItem {
  id: string;
  name: string;
  icon: string;
  system: boolean;
  filter: ((l: LocationItem) => boolean) | null;
}

export type FilterKey = 'role' | 'type' | 'city' | 'appt' | 'hours' | 'active';

export interface ServerFilterValues {
  role: '' | 'pickup' | 'delivery' | 'both';
  type: string;
  city: string;
  appt: boolean;
  hours: boolean;
}

export const EMPTY_SERVER_FILTERS: ServerFilterValues = {
  role: '',
  type: '',
  city: '',
  appt: false,
  hours: false,
};

export type AddressBookSortField = '' | 'name' | 'city';

export interface CreateLocationData {
  context: 'my' | 'customer';
  company: string;
  companyVat: string;
  companyEntityId: number | null;
  template: string;
  name: string;
  address: string;
  city: string;
  postal: string;
  region: string;
  lat: string;
  lng: string;
  phone: string;
  email: string;
  role: 'both' | 'pickup' | 'delivery';
  type: string;
  appt: boolean;
  hours: string;
  dock: string;
  equipment: string[];
  maxTruck: string;
  maxWeight: string;
  adr: boolean;
  palletExchange: boolean;
  loadTime: string;
  noteInternal: string;
  noteCarrier: string;
  contacts: { id?: number; name: string; role: string; phone: string; email: string }[];
  code: string;
  custCode: string;
  tags: string;
  amenityIds: number[];
  timeRanges: { id?: number; start_time: string; end_time: string }[];
}

export interface CompanyFormData {
  name: string;
  vat: string;
  address: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  contactPerson: string;
  industry: string;
}

export const EMPTY_CREATE_DATA: CreateLocationData = {
  context: 'my',
  company: '',
  companyVat: '',
  companyEntityId: null,
  template: '',
  name: '',
  address: '',
  city: '',
  postal: '',
  region: '',
  lat: '',
  lng: '',
  phone: '',
  email: '',
  role: 'both',
  type: 'warehouse',
  appt: false,
  hours: '',
  dock: '',
  equipment: [],
  maxTruck: '',
  maxWeight: '',
  adr: false,
  palletExchange: false,
  loadTime: '',
  noteInternal: '',
  noteCarrier: '',
  contacts: [],
  code: '',
  custCode: '',
  tags: '',
  amenityIds: [],
  timeRanges: [],
};

export const EMPTY_COMPANY_DATA: CompanyFormData = {
  name: '',
  vat: '',
  address: '',
  country: 'Greece',
  phone: '',
  email: '',
  website: '',
  contactPerson: '',
  industry: '',
};
