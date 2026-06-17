import type { LocationItem } from '../../context/AppContext';

export interface DirectoryItem {
  id: string;
  name: string;
  icon: string;
  system: boolean;
  filter: ((l: LocationItem) => boolean) | null;
}

export type FilterKey = 'role' | 'type' | 'city' | 'appt' | 'hours' | 'active';

export type SortOption = 'Name A–Z' | 'City' | 'Last used' | 'Created';

export interface CreateLocationData {
  context: 'my' | 'customer';
  company: string;
  template: string;
  name: string;
  address: string;
  city: string;
  postal: string;
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
  contacts: { name: string; role: string; phone: string; email: string }[];
  code: string;
  tags: string;
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
  template: '',
  name: '',
  address: '',
  city: '',
  postal: '',
  role: 'both',
  type: 'Warehouse',
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
  tags: '',
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
