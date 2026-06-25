export type ViewMode = 'skus' | 'types';
export type SelectedKind = 'sku' | 'type' | '';

export interface NewTypeForm {
  catId: string;
  name: string;
  temp: string;
  hazard: boolean;
  stackable: boolean;
  palletType: string;
}

export interface NewSkuForm {
  catId: string;
  typeId: string;
  name: string;
  number: string;
  barcode: string;
  uom: string;
  weight: string;
  active: boolean;
  tags: string;
  temperature: string;
  palletType: string;
  hazardous: boolean;
  stackable: boolean;
}

export interface NewCatForm {
  name: string;
  icon: string;
}

export interface ImportRow {
  name: string;
  number: string;
  barcode: string;
  catId: string;
  catName: string;
  typeId: string;
  typeName: string;
  uom: string;
  weight: string;
  active: boolean;
  tags: string;
  dupe: boolean;
  line: number;
}

export interface SyncLogEntry {
  t: string;
  s: string;
  a: string;
  st: 'ok' | 'error' | 'conflict' | 'pending';
  d: string;
}

export type ProductMasterSortField = '' | 'number' | 'type' | 'category' | 'updated_at';

export const EMPTY_NEW_TYPE: NewTypeForm = {
  catId: '',
  name: '',
  temp: 'Ambient',
  hazard: false,
  stackable: true,
  palletType: 'EUR',
};

export const EMPTY_NEW_SKU: NewSkuForm = {
  catId: '',
  typeId: '',
  name: '',
  number: '',
  barcode: '',
  uom: 'Case',
  weight: '',
  active: true,
  tags: '',
  temperature: 'Ambient',
  palletType: 'EUR',
  hazardous: false,
  stackable: true,
};

export const EMPTY_NEW_CAT: NewCatForm = {
  name: '',
  icon: '📦',
};
