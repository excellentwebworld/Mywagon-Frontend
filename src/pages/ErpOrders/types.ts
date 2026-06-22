export interface ProductLine {
  name: string;
  sku: string;
  uom: string;
  qty: number;
  lw: number; // line weight in kg
  pid?: number; // matched product ID
}

export interface ErpOrder {
  id: string; // e.g. ORD-00001
  erpNum: string; // e.g. SO-300001
  erp: string; // ERP System
  status: string; // status: New, Ready to Plan, Planned, In Transit, Completed, Canceled, Exception
  customer: string;
  origin: string;
  dest: string;
  oDate: Date; // Order Date
  sDate: Date; // Ship Date
  dDate: Date; // Delivery Date
  lines: ProductLine[];
  lc: number; // line count
  tw: number; // total weight
  tp: number; // total pallets
  loadSid: string; // linked load ID
  loadSt: string; // linked load status
  lastSync: Date; // last synced date/time
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
  date: string; // ISO date string (YYYY-MM-DD)
  timeMode: 'precise' | 'range';
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  expanded: boolean;
  orders: StopOrder[]; // direct orders
  customers: StopCustomer[]; // customer-grouped orders
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
  wpu: number; // weight per unit in kg
}

export interface ProductGroup {
  type: string; // category
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
