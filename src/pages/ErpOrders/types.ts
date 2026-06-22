export type ErpOrderStatus = 'unplanned' | 'planned' | 'on_trip' | 'completed' | 'canceled';

export type ErpOrderKpiFilter = '' | ErpOrderStatus;

export type ErpOrderSortField = 'orderReference' | 'customer' | 'deliveryDate' | 'status' | 'updatedAt';

export interface ErpOrderLine {
  id?: number;
  productSkuId: number | null;
  productName: string;
  quantity: number | null;
  unit: string;
  weight: number | null;
  weightUnit: string;
}

export interface ErpOrder {
  id: string;
  orderReference: string;
  erpReference: string;
  customerName: string;
  companyEntityId: number | null;
  originLocationId: number | null;
  destLocationId: number | null;
  shipFrom: string;
  shipTo: string;
  shipDate: string;
  deliveryDate: string;
  productsPreview: string;
  productCount: number;
  status: ErpOrderStatus;
  highPriority: boolean;
  linkedLoadSid: string;
  linkedLoadId: string;
  updatedAt: string;
  canEdit: boolean;
  notes: string;
  lines: ErpOrderLine[];
}

export interface ErpOrderFormState {
  orderReference: string;
  erpReference: string;
  companyEntityId: number | null;
  customerName: string;
  originLocationId: number | null;
  destLocationId: number | null;
  shipDate: string;
  deliveryDate: string;
  notes: string;
  highPriority: boolean;
  lines: ErpOrderLine[];
}

export const EMPTY_ORDER_LINE: ErpOrderLine = {
  productSkuId: null,
  productName: '',
  quantity: null,
  unit: 'Pallets',
  weight: null,
  weightUnit: 'Kg',
};

export const EMPTY_ORDER_FORM: ErpOrderFormState = {
  orderReference: '',
  erpReference: '',
  companyEntityId: null,
  customerName: '',
  originLocationId: null,
  destLocationId: null,
  shipDate: '',
  deliveryDate: '',
  notes: '',
  highPriority: false,
  lines: [],
};

// --- Deferred Create Load types (Views 2–3) ---

export interface ProductLine {
  name: string;
  sku: string;
  uom: string;
  qty: number;
  lw: number;
  pid?: number;
}

export interface ErpOrderLegacy {
  id: string;
  erpNum: string;
  erp: string;
  status: string;
  customer: string;
  origin: string;
  dest: string;
  oDate: Date;
  sDate: Date;
  dDate: Date;
  lines: ProductLine[];
  lc: number;
  tw: number;
  tp: number;
  loadSid: string;
  loadSt: string;
  lastSync: Date;
  syncOk: boolean;
  excReason: string;
  priority: 'Urgent' | 'High' | 'Normal';
  notes: string;
}

export interface StopProduct {
  id: number;
  productId: number | null;
  productName: string;
  action: 'pickup' | 'dropoff';
  qty: number;
  unit: string;
  weight: number | string;
  wtUnit: string;
}

export interface StopOrder {
  id: number;
  ref: string;
  expanded: boolean;
  products: StopProduct[];
}

export interface StopCustomer {
  id: number;
  name: string;
  expanded: boolean;
  orders: StopOrder[];
}

export interface Stop {
  id: number;
  locationId: number | null;
  locationName: string;
  locationAddr: string;
  date: string;
  timeMode: 'precise' | 'range';
  timeStart: string;
  timeEnd: string;
  expanded: boolean;
  orders: StopOrder[];
  customers: StopCustomer[];
}

export interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  contact?: string;
}

export interface CustomerLocations {
  custId: number;
  custName: string;
  locations: Location[];
}

export interface LocationsData {
  my: Location[];
  customers: CustomerLocations[];
}

export interface ProductSku {
  id: number;
  name: string;
  sku: string;
  wpu: number;
}

export interface ProductGroup {
  type: string;
  skus: ProductSku[];
}

export interface ClCustomer {
  id: number;
  name: string;
  vat: string;
  city: string;
}

export interface ErpOrderDdItem {
  id: string;
  customer: string;
}

export interface CreateLoadState {
  stops: Stop[];
}

export type ViewMode = 'orders' | 'create' | 'itin';
