import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { addressBookService, productMasterService } from '../api';

// ==========================================
// TYPES
// ==========================================

export interface Contact {
  id?: number;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface LocationItem {
  id: string;
  name: string;
  company: string;
  companyVat: string;
  group: 'my' | 'customer';
  city: string;
  region: string;
  address: string;
  lat: number;
  lng: number;
  geoVerified: boolean;
  role: 'pickup' | 'delivery' | 'both';
  type: string; // Warehouse, Plant, Store, Office, Cross-dock, Port
  appt: boolean;
  hours: string;
  dock: string;
  equipment: string[];
  maxTruck: string;
  maxWeight: string;
  adr: boolean;
  palletExchange: boolean;
  loadTime: number;
  contacts: Contact[];
  tags: string[];
  code: string;
  custCode: string;
  lastUsed: string;
  shipments30: number;
  shipments90: number;
  otd: number;
  noteInternal: string;
  noteCarrier: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  amenityIds?: number[];
  timeRanges?: { id?: number; start_time: string; end_time: string }[];
  status: 'active' | 'archived';
  created: string;
  usageHistoryCount?: number;
}

export interface Company {
  id: string;
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

export interface Category {
  id: string;
  name: { en: string; el: string };
  icon: string;
}

export interface ProductType {
  id: string;
  catId: string;
  name: string;
  active: boolean;
  defaults: {
    temp: string;
    hazard: boolean;
    stackable: boolean;
    palletType: string;
  };
  s30: number;
  s90: number;
  skuCount?: number;
  shipmentTotal?: number;
}

export interface SKU {
  id: string;
  name: string;
  number: string;
  barcode: string;
  catId: string;
  typeId: string;
  source: 'erp' | 'manual';
  active: boolean;
  erp: {
    system: string;
    extId: string;
    lastSync: string;
    status: 'ok' | 'error' | 'conflict' | 'pending' | '';
    error: string;
  };
  weight: string;
  uom: string;
  tags: string[];
  temperature?: string;
  palletType?: string;
  hazardous?: boolean;
  stackable?: boolean;
  shipments30?: number;
  shipments90?: number;
  shipmentsTotal?: number;
  updatedAt?: string;
}

export interface ShipmentCustomerOrder {
  id: string;
  products: string;
  qty: number;
  qtyUnit: string;
  weight: number;
  weightUnit: string;
}

export interface ShipmentCustomer {
  name: string;
  orders: ShipmentCustomerOrder[];
}

export interface ShipmentStop {
  id: number;
  type: 'pickup' | 'delivery';
  location: string;
  address: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  customers: ShipmentCustomer[];
}

export interface Shipment {
  id: string;
  autoId?: string;
  date: string;
  pickDt?: string | null;
  delDt?: string | null;
  ref?: string;
  status: 'pending' | 'upcoming' | 'in_progress' | 'past_due' | 'awarded' | 'delivered' | 'cancelled';
  vis: 'private' | 'public' | 'fleet';
  origin: string;
  dest: string;
  via: string | null;
  viaStops?: string[];
  stopCount?: number;
  ordersCount?: number;
  invited?: number;
  customer: { name: string; orders: string[] }[];
  bids: number;
  best_bid: number | null;
  bid_exp: string | null;
  carrier: string | null;
  carrier_init?: string;
  price: number | null;
  price_type: 'spot' | 'contract' | 'bidding';
  updated: string;
  timeline: string[];
  tl_cur: number;
  at_risk?: boolean;
  riskReason?: string | null;
  needsAction?: boolean;
  awaitingResponse?: boolean;
  pickupToday?: boolean;
  awaitingPod?: boolean;
  bidsReceived?: number;
  bidsSent?: number;
  quotedPrice?: number | null;
  agreedPrice?: number | null;
  paymentStatus?: 'paid' | 'payment_pending' | null;
  channel?: 'private' | 'public';
  shipmentType?: 'direct' | 'multiple' | string | null;
  intermediateStops?: number;
  orderIds?: string[];
  pickDtIso?: string | null;
  delDtIso?: string | null;
  stops?: ShipmentStop[];
  journeyDistanceKm?: number | null;
  journeyTime?: string | number | null;
  cargoValue?: number | null;
  truckTypes?: string[];
  totalWeight?: number | null;
  totalQty?: number | null;
  weightUnit?: string | null;
  qtyUnit?: string | null;
  driverNotes?: string;
  negotiable?: boolean;
  navigation?: boolean;
  counter?: { yours: number; theirs: number; pct: string; dir: 'up' | 'down' };
  offers?: Array<{
    id: string;
    type: 'bid' | 'interest';
    name: string;
    initials?: string;
    rating?: number | null;
    role?: string;
    price?: number | null;
    respondedAt?: string | null;
    counter?: { yours: number; theirs: number; pct: number; dir: 'up' | 'down' } | null;
  }>;
  invitees?: Array<{
    id: number;
    name: string;
    initials?: string;
    invitedAt?: string | null;
    status?: string;
  }>;
}

export interface Carrier {
  id: string;
  init: string;
  name: string;
  city: string;
  rating: number;
  type: string; // Carrier Company, Freelancer Driver
  selected: boolean;
  contract: {
    lane: string;
    mode: 'per_load' | 'per_pallet';
    price: number;
  } | null;
}

export interface ContractLane {
  lane: string;
  unit: 'PER_LOAD' | 'PER_PALLET';
  price: number;
  status: 'ACTIVE' | 'EXPIRED';
  volume: number;
  ot: number;
}

export interface PartnerTrip {
  id: string;
  lane: string;
  pickupDate: string;
  deliveryDate: string;
  status: 'Delivered' | 'In Transit' | 'Cancelled';
  price: string;
}

export interface PartnerContact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface Partner {
  id: string;
  name: string;
  /** carrier_company | freelancer_driver | customer */
  type: 'carrier_company' | 'freelancer_driver' | 'customer';
  status: 'active' | 'invited' | 'pending' | 'suspended';
  legalName: string;
  vat: string;
  email: string;
  phone: string;
  /** Index into REGION_KEYS array */
  regionIdx: number;
  trucks: string[];
  fleetSize: number;
  lifetimeLoads: number;
  loads30d: number;
  otPickup: number;
  otDelivery: number;
  cancelRate: number;
  acceptRate: number;
  avgResponse: string;
  lastActivity: string;
  rating: string;
  paymentTerms: string;
  iban: string;
  beneficiary: string;
  bankVerified: boolean;
  openInvoices: number;
  disputes: number;
  tags: string[];
  missingDocs: boolean;
  profileCompletion: number;
  contractLanes: ContractLane[];
  trips: PartnerTrip[];
  contacts: PartnerContact[];
  notes: string;
}

export interface VehicleOption {
  id: string;
  label: string;
  meta: string;
  selected: boolean;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  show: boolean;
}

interface AppContextType {
  lang: 'en' | 'el';
  setLang: (lang: 'en' | 'el') => void;

  locations: LocationItem[];
  addLocation: (loc: Omit<LocationItem, 'id' | 'created' | 'status'>) => void;
  updateLocation: (loc: LocationItem) => void;
  archiveLocation: (id: string) => void;
  restoreLocation: (id: string) => void;
  refreshLocationsFromApi: (force?: boolean) => Promise<void>;

  companies: Company[];
  addCompany: (comp: Omit<Company, 'id'>) => void;

  categories: Category[];
  addCategory: (nameEn: string, nameEl: string, icon: string) => void;

  productTypes: ProductType[];
  addProductType: (type: Omit<ProductType, 'id' | 's30' | 's90'>) => void;
  updateProductType: (type: ProductType) => void;

  skus: SKU[];
  addSku: (sku: Omit<SKU, 'id'>) => void;
  updateSku: (sku: SKU) => void;
  refreshSkusFromApi: (force?: boolean) => Promise<void>;

  shipments: Shipment[];
  addShipment: (shp: Shipment) => void;
  updateShipment: (shp: Shipment) => void;

  carriers: Carrier[];
  toggleCarrierSelection: (id: string) => void;

  vehicleOptions: VehicleOption[];
  toggleVehicleSelection: (id: string) => void;

  // Partners
  partners: Partner[];
  addPartner: (p: Omit<Partner, 'id'>) => void;
  updatePartner: (p: Partner) => void;
  removePartner: (id: string) => void;

  toast: ToastState;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type MasterDataFetchState = {
  loaded: boolean;
  inflight: Promise<void> | null;
};

const locationsFetchState: MasterDataFetchState = { loaded: false, inflight: null };
const skusFetchState: MasterDataFetchState = { loaded: false, inflight: null };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Locale State
  const [lang, setLangState] = useState<'en' | 'el'>(
    (localStorage.getItem('shipment-lang') as 'en' | 'el') || 'en'
  );

  const setLang = (l: 'en' | 'el') => {
    setLangState(l);
    localStorage.setItem('shipment-lang', l);
  };

  // Toast State
  const [toast, setToast] = useState<ToastState & { key: number }>({
    message: '',
    type: 'success',
    show: false,
    key: 0,
  });

  const TOAST_DURATION_MS: Record<ToastState['type'], number> = {
    success: 5000,
    error: 8000,
    warning: 7000,
    info: 6000,
  };

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast((prev) => ({ message: msg, type, show: true, key: prev.key + 1 }));
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const duration = TOAST_DURATION_MS[toast.type] ?? 6000;
    const timer = setTimeout(() => {
      hideToast();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.show, toast.key, toast.type]);

  // Locations State
  const [locations, setLocations] = useState<LocationItem[]>([]);

  const addLocation = (loc: Omit<LocationItem, 'id' | 'created' | 'status'>) => {
    const nextId = `LOC-${String(locations.length + 1).padStart(3, '0')}`;
    const newLoc: LocationItem = {
      ...loc,
      id: nextId,
      status: 'active',
      created: new Date().toLocaleDateString('en-GB'),
      shipments30: 0,
      shipments90: 0,
      otd: 100,
      lastUsed: 'Never',
    };
    setLocations((prev) => [newLoc, ...prev]);
    showToast(`Location "${loc.name}" created successfully.`, 'success');
  };

  const updateLocation = (updatedLoc: LocationItem) => {
    setLocations((prev) => prev.map((loc) => (loc.id === updatedLoc.id ? updatedLoc : loc)));
    showToast(`Location "${updatedLoc.name}" updated successfully.`, 'success');
  };

  const archiveLocation = (id: string) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, status: 'archived' } : loc))
    );
    showToast(`Location archived.`, 'info');
  };

  const restoreLocation = (id: string) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, status: 'active' } : loc))
    );
    showToast(`Location restored.`, 'success');
  };

  const refreshLocationsFromApi = useCallback(async (force = false) => {
    if (!force && locationsFetchState.loaded) return;
    if (locationsFetchState.inflight) return locationsFetchState.inflight;

    locationsFetchState.inflight = (async () => {
      try {
        const list = await addressBookService.listAllLocations({ type: 'all', status: 'active' });
        setLocations(list);
        locationsFetchState.loaded = true;
      } catch {
        // Ignore when session is unavailable (e.g. marketing pages).
      } finally {
        locationsFetchState.inflight = null;
      }
    })();

    return locationsFetchState.inflight;
  }, []);

  const refreshSkusFromApi = useCallback(async (force = false) => {
    if (!force && skusFetchState.loaded) return;
    if (skusFetchState.inflight) return skusFetchState.inflight;

    skusFetchState.inflight = (async () => {
      try {
        const list = await productMasterService.listAllSkus({ status: 'active' });
        setSkus(list);
        skusFetchState.loaded = true;
      } catch {
        // Ignore when session is unavailable (e.g. marketing pages).
      } finally {
        skusFetchState.inflight = null;
      }
    })();

    return skusFetchState.inflight;
  }, []);

  // Companies State
  const [companies, setCompanies] = useState<Company[]>([
    { id: 'C-001', name: 'Σκλαβενίτης', vat: 'EL094493827', address: 'Λεωφ. Κηφισίας 40, Μαρούσι 15125', country: 'Greece', phone: '+30 210 6750800', email: 'info@sklavenitis.gr', website: 'www.sklavenitis.gr', contactPerson: 'Ιωάννης Σκλαβενίτης', industry: 'Retail' },
    { id: 'C-002', name: 'THE MART (Makro)', vat: 'EL094002314', address: 'Θέση Λιθαρί, Μάνδρα 19600', country: 'Greece', phone: '+30 210 5551234', email: 'info@themart.gr', website: 'www.themart.gr', contactPerson: '', industry: 'Wholesale' },
    { id: 'C-003', name: 'AB Βασιλόπουλος', vat: 'EL094059468', address: 'Σπάτα Αττικής, 19004', country: 'Greece', phone: '+30 210 6608000', email: 'info@ab.gr', website: 'www.ab.gr', contactPerson: '', industry: 'Retail' },
    { id: 'C-004', name: 'Lidl Hellas', vat: 'EL094521379', address: 'Εθν. Οδ. Σχηματαρίου, 32009', country: 'Greece', phone: '+30 22620 57000', email: 'info@lidl.gr', website: 'www.lidl.gr', contactPerson: '', industry: 'Retail' },
    { id: 'C-005', name: 'Μασούτης', vat: 'EL094073560', address: 'Εθν. Οδ. Ωραιοκάστρου, 57013', country: 'Greece', phone: '+30 2310 698200', email: 'info@masoutis.gr', website: 'www.masoutis.gr', contactPerson: '', industry: 'Retail' },
    { id: 'C-006', name: 'Metro C&C', vat: 'EL094328716', address: 'Λεωφ. Δημοκρατίας 33, Αχαρνές 13671', country: 'Greece', phone: '+30 210 2407100', email: 'info@metro.com.gr', website: 'www.metro.com.gr', contactPerson: '', industry: 'Retail' }
  ]);

  const addCompany = (comp: Omit<Company, 'id'>) => {
    const nextId = `C-${String(companies.length + 1).padStart(3, '0')}`;
    const newComp: Company = { ...comp, id: nextId };
    setCompanies((prev) => [...prev, newComp]);
    showToast(`Company "${comp.name}" added successfully.`, 'success');
  };

  // Categories State
  const [categories, setCategories] = useState<Category[]>([
    { id: 'CAT-01', name: { en: 'Food & Beverages', el: 'Τρόφιμα & Ποτά' }, icon: '🍷🥨' },
    { id: 'CAT-02', name: { en: 'Building Materials', el: 'Οικοδομικά Υλικά' }, icon: '🧱' },
    { id: 'CAT-03', name: { en: 'Chemicals & Hazardous', el: 'Χημικά & Επικίνδυνα' }, icon: '⚗️' },
    { id: 'CAT-04', name: { en: 'Consumer Goods', el: 'Καταναλωτικά Αγαθά' }, icon: '🛒' },
    { id: 'CAT-05', name: { en: 'Electronics & Tech', el: 'Ηλεκτρονικά & Τεχνολογία' }, icon: '💻' },
    { id: 'CAT-06', name: { en: 'Pharmaceuticals', el: 'Φαρμακευτικά' }, icon: '💊' },
    { id: 'CAT-07', name: { en: 'Textiles & Apparel', el: 'Υφάσματα & Ένδυση' }, icon: '👕' },
    { id: 'CAT-08', name: { en: 'Automotive Parts', el: 'Ανταλλακτικά Αυτοκινήτων' }, icon: '🔧' },
  ]);

  const addCategory = (nameEn: string, nameEl: string, icon: string) => {
    const nextId = `CAT-${String(categories.length + 1).padStart(2, '0')}`;
    const newCat: Category = { id: nextId, name: { en: nameEn, el: nameEl }, icon };
    setCategories((prev) => [...prev, newCat]);
    showToast(`Category "${nameEn}" added.`, 'success');
  };

  // Product Types State
  const [productTypes, setProductTypes] = useState<ProductType[]>([
    { id: 'PT-01', catId: 'CAT-01', name: 'Bottled Water', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' }, s30: 42, s90: 118 },
    { id: 'PT-02', catId: 'CAT-01', name: 'Carbonated Drinks', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' }, s30: 28, s90: 85 },
    { id: 'PT-03', catId: 'CAT-01', name: 'Dairy Products', active: true, defaults: { temp: '2–8°C', hazard: false, stackable: false, palletType: 'EUR' }, s30: 15, s90: 44 },
    { id: 'PT-04', catId: 'CAT-01', name: 'Frozen Foods', active: true, defaults: { temp: '-18°C', hazard: false, stackable: true, palletType: 'EUR' }, s30: 10, s90: 31 },
    { id: 'PT-05', catId: 'CAT-01', name: 'Snacks & Confectionery', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' }, s30: 8, s90: 22 },
    { id: 'PT-06', catId: 'CAT-02', name: 'Cement & Aggregates', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: false, palletType: 'Industrial' }, s30: 6, s90: 20 },
    { id: 'PT-07', catId: 'CAT-02', name: 'Steel & Metal', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: false, palletType: 'Industrial' }, s30: 4, s90: 14 },
    { id: 'PT-08', catId: 'CAT-03', name: 'Industrial Solvents', active: true, defaults: { temp: 'Ambient', hazard: true, stackable: false, palletType: 'Chemical' }, s30: 3, s90: 9 },
    { id: 'PT-09', catId: 'CAT-03', name: 'Cleaning Agents', active: true, defaults: { temp: 'Ambient', hazard: true, stackable: true, palletType: 'EUR' }, s30: 5, s90: 16 },
    { id: 'PT-10', catId: 'CAT-04', name: 'Personal Care', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' }, s30: 7, s90: 21 },
    { id: 'PT-11', catId: 'CAT-04', name: 'Household Appliances', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: false, palletType: 'EUR' }, s30: 3, s90: 10 },
    { id: 'PT-12', catId: 'CAT-01', name: 'Olive Oil & Condiments', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: true, palletType: 'EUR' }, s30: 6, s90: 19 },
    { id: 'PT-13', catId: 'CAT-06', name: 'OTC Medications', active: true, defaults: { temp: '15–25°C', hazard: false, stackable: true, palletType: 'Pharma' }, s30: 2, s90: 8 },
    { id: 'PT-14', catId: 'CAT-05', name: 'Consumer Electronics', active: true, defaults: { temp: 'Ambient', hazard: false, stackable: false, palletType: 'EUR' }, s30: 4, s90: 12 },
  ]);

  const addProductType = (pt: Omit<ProductType, 'id' | 's30' | 's90'>) => {
    const nextId = `PT-${String(productTypes.length + 1).padStart(2, '0')}`;
    const newPt: ProductType = { ...pt, id: nextId, s30: 0, s90: 0 };
    setProductTypes((prev) => [...prev, newPt]);
    showToast(`Product Type "${pt.name}" created.`, 'success');
  };

  const updateProductType = (pt: ProductType) => {
    setProductTypes((prev) => prev.map((item) => (item.id === pt.id ? pt : item)));
  };

  // SKUs State
  const [skus, setSkus] = useState<SKU[]>([
    { id: 'SKU-001', name: 'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)', number: '5201054001011', barcode: '5201054001011', catId: 'CAT-01', typeId: 'PT-01', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-001011', lastSync: '2h ago', status: 'ok', error: '' }, weight: '12.5 kg', uom: 'Case', tags: ['Fast-mover'] },
    { id: 'SKU-002', name: 'ΒΙΚΟΣ Φυσικό Νερό 1.5L (x6)', number: '5201054001028', barcode: '5201054001028', catId: 'CAT-01', typeId: 'PT-01', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-001028', lastSync: '2h ago', status: 'ok', error: '' }, weight: '9.2 kg', uom: 'Case', tags: ['Fast-mover'] },
    { id: 'SKU-003', name: 'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)', number: '5201054002018', barcode: '5201054002018', catId: 'CAT-01', typeId: 'PT-02', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-002018', lastSync: '2h ago', status: 'ok', error: '' }, weight: '8.4 kg', uom: 'Case', tags: [] },
    { id: 'SKU-004', name: 'ΒΙΚΟΣ Σόδα Classic 330ml (x24)', number: '5201054002025', barcode: '5201054002025', catId: 'CAT-01', typeId: 'PT-02', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-002025', lastSync: '2h ago', status: 'ok', error: '' }, weight: '8.4 kg', uom: 'Case', tags: [] },
    { id: 'SKU-005', name: 'ΒΙΚΟΣ Φυσ. Νεραλ. Νερό 750ml (x12)', number: '5201054001035', barcode: '5201054001035', catId: 'CAT-01', typeId: 'PT-01', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-001035', lastSync: '5h ago', status: 'ok', error: '' }, weight: '9.8 kg', uom: 'Case', tags: ['Premium'] },
    { id: 'SKU-006', name: 'ΔΕΛΤΑ Γάλα Πλήρες 1L (x12)', number: '5201054060012', barcode: '5201054060012', catId: 'CAT-01', typeId: 'PT-03', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-060012', lastSync: '1d ago', status: 'ok', error: '' }, weight: '12.8 kg', uom: 'Case', tags: ['Chilled'] },
    { id: 'SKU-007', name: 'ΦΑΓΕ Διαιτητικό Total 1kg (x6)', number: '5201054060029', barcode: '5201054060029', catId: 'CAT-01', typeId: 'PT-03', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-060029', lastSync: '1d ago', status: 'ok', error: '' }, weight: '6.5 kg', uom: 'Case', tags: ['Chilled'] },
    { id: 'SKU-008', name: 'Cris Cris Frozen Pizza (x8)', number: '5201054070011', barcode: '5201054070011', catId: 'CAT-01', typeId: 'PT-04', source: 'erp', active: true, erp: { system: 'SAP', extId: 'MAT-070011', lastSync: '3d ago', status: 'pending', error: '' }, weight: '4.2 kg', uom: 'Case', tags: ['Frozen'] },
    { id: 'SKU-009', name: 'Παπαδοπούλου Μπισκότα Διάνα (x16)', number: '5201054080018', barcode: '5201054080018', catId: 'CAT-01', typeId: 'PT-05', source: 'manual', active: true, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '3.8 kg', uom: 'Case', tags: [] },
    { id: 'SKU-010', name: 'ΚΡΕΜ Ελαιόλαδο Extra Virgin 1L (x12)', number: '5201054090014', barcode: '5201054090014', catId: 'CAT-01', typeId: 'PT-12', source: 'manual', active: true, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '11.5 kg', uom: 'Case', tags: ['Premium'] },
    { id: 'SKU-011', name: 'ΤΙΤΑΝ Τριμένο Σκυρί 25kg', number: '5201999010011', barcode: '5201999010011', catId: 'CAT-02', typeId: 'PT-06', source: 'erp', active: true, erp: { system: 'Soft1', extId: 'CEM-010011', lastSync: '6h ago', status: 'ok', error: '' }, weight: '25 kg', uom: 'Bag', tags: ['Heavy'] },
    { id: 'SKU-012', name: 'Χαλυβδίνη Ράβδος Φ12 (6m)', number: '5201999020018', barcode: '', catId: 'CAT-02', typeId: 'PT-07', source: 'erp', active: true, erp: { system: 'Soft1', extId: 'STL-020018', lastSync: '1d ago', status: 'error', error: 'Missing weight field in ERP' }, weight: '', uom: 'Piece', tags: ['Long-load'] },
    { id: 'SKU-013', name: 'Αρεστή Βιομηχανικό 5L', number: '5201999030015', barcode: '5201999030015', catId: 'CAT-03', typeId: 'PT-08', source: 'manual', active: true, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '4.8 kg', uom: 'Can', tags: ['ADR'] },
    { id: 'SKU-014', name: 'Ajax Καθ. Γενικής Χρήσης 4L (x4)', number: '5201999040012', barcode: '5201999040012', catId: 'CAT-03', typeId: 'PT-09', source: 'erp', active: true, erp: { system: 'SAP', extId: 'CLN-040012', lastSync: '12h ago', status: 'ok', error: '' }, weight: '16.5 kg', uom: 'Case', tags: [] },
    { id: 'SKU-015', name: 'Nivea Body Lotion 400ml (x12)', number: '5201999050019', barcode: '5201999050019', catId: 'CAT-04', typeId: 'PT-10', source: 'erp', active: true, erp: { system: 'SAP', extId: 'PC-050019', lastSync: '2d ago', status: 'conflict', error: 'Name mismatch: ERP="NIVEA Body Milk 400ml"' }, weight: '5.2 kg', uom: 'Case', tags: [] },
    { id: 'SKU-016', name: 'Samsung Galaxy Tab A9 (Box)', number: '8806095360911', barcode: '8806095360911', catId: 'CAT-05', typeId: 'PT-14', source: 'erp', active: true, erp: { system: 'BC', extId: 'ELEC-360911', lastSync: '4d ago', status: 'ok', error: '' }, weight: '0.48 kg', uom: 'Piece', tags: ['Fragile'] },
    { id: 'SKU-017', name: 'Depon Maximum 1000mg (x30)', number: '5201054130014', barcode: '5201054130014', catId: 'CAT-06', typeId: 'PT-13', source: 'erp', active: true, erp: { system: 'Epsilon', extId: 'PH-130014', lastSync: '7d ago', status: 'ok', error: '' }, weight: '0.15 kg', uom: 'Box', tags: ['Pharma'] },
    { id: 'SKU-018', name: 'ERP New Item – Unmapped #1', number: '5209999990011', barcode: '', catId: 'CAT-01', typeId: '', source: 'erp', active: true, erp: { system: 'SAP', extId: 'NEW-990011', lastSync: '30m ago', status: 'ok', error: '' }, weight: '', uom: '', tags: ['Unmapped'] },
    { id: 'SKU-019', name: 'ERP New Item – Unmapped #2', number: '5209999990028', barcode: '', catId: 'CAT-04', typeId: '', source: 'erp', active: true, erp: { system: 'SAP', extId: 'NEW-990028', lastSync: '30m ago', status: 'ok', error: '' }, weight: '', uom: '', tags: ['Unmapped'] },
    { id: 'SKU-020', name: 'Παλιό Προϊόν – Inactive', number: '5201054099099', barcode: '5201054099099', catId: 'CAT-01', typeId: 'PT-05', source: 'manual', active: false, erp: { system: '', extId: '', lastSync: '—', status: '', error: '' }, weight: '2.1 kg', uom: 'Case', tags: ['Discontinued'] },
  ]);

  const addSku = (sku: Omit<SKU, 'id'>) => {
    const nextId = `SKU-${String(skus.length + 1).padStart(3, '0')}`;
    const newSku: SKU = { ...sku, id: nextId };
    setSkus((prev) => [...prev, newSku]);
    showToast(`SKU "${sku.name}" added successfully.`, 'success');
  };

  const updateSku = (sku: SKU) => {
    setSkus((prev) => prev.map((item) => (item.id === sku.id ? sku : item)));
  };

  // Carriers State
  const [carriers, setCarriers] = useState<Carrier[]>([
    { id: 'krp', init: 'KR', name: 'KRP Transport S.A', city: 'Athens', rating: 4.8, type: 'Carrier Company', selected: true, contract: { lane: 'Ioannina → Athens', mode: 'per_load', price: 790 } },
    { id: 'elmet', init: 'EM', name: 'Hellenic Transport', city: 'Thessaloniki', rating: 4.2, type: 'Carrier Company', selected: false, contract: null },
    { id: 'transmed', init: 'TL', name: 'Transmed Logistics', city: 'Patras', rating: 4.5, type: 'Carrier Company', selected: false, contract: { lane: 'Ioannina → Athens', mode: 'per_pallet', price: 22 } },
    { id: 'gpant', init: 'GP', name: 'Giorgos Pantazis', city: 'Ioannina', rating: 4.1, type: 'Freelancer Driver', selected: false, contract: null },
    { id: 'dntinos', init: 'DN', name: 'Dimitris Ntinos', city: 'Athens', rating: 5.0, type: 'Freelancer Driver', selected: true, contract: null },
  ]);

  const toggleCarrierSelection = (id: string) => {
    setCarriers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  // Vehicle Options State
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([
    { id: 'semi', label: 'Semi-Trailer', meta: 'Tilt trailer', selected: true },
    { id: 'curtain', label: 'Truck with Trailer', meta: 'Curtainsider', selected: true },
    { id: 'rigid', label: 'Rigid Truck (7-12t)', meta: '7.5T – 12.0T', selected: false },
    { id: 'van', label: 'Van', meta: 'Van / LCV', selected: false },
  ]);

  const toggleVehicleSelection = (id: string) => {
    setVehicleOptions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  // Shipments State
  const [shipments, setShipments] = useState<Shipment[]>([
    {
      id: 'SHP-5012', date: 'Apr 25', status: 'pending', vis: 'private',
      origin: 'Ioannina', dest: 'Athens', via: null,
      customer: [{ name: 'Alpha Foods Ltd', orders: ['ORD-1101', 'ORD-1102', 'ORD-1103'] }],
      bids: 3, best_bid: 820, bid_exp: '2h 14m', carrier: null,
      price: null, price_type: 'spot', updated: '8m ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 2,
    },
    {
      id: 'SHP-5011', date: 'Apr 25', status: 'pending', vis: 'public',
      origin: 'Thessaloniki', dest: 'Larissa', via: null,
      customer: [{ name: 'Beta Distributors', orders: ['ORD-2201', 'ORD-2202'] }],
      bids: 1, best_bid: 340, bid_exp: '5h 30m', carrier: null,
      counter: { yours: 340, theirs: 390, pct: '+15%', dir: 'up' },
      price: null, price_type: 'spot', updated: '22m ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 2,
    },
    {
      id: 'SHP-5010', date: 'Apr 24', status: 'pending', vis: 'private',
      origin: 'Athens', dest: 'Patras', via: null,
      customer: [
        { name: 'Alpha Foods Ltd', orders: ['ORD-1099'] },
        { name: 'Gamma Logistics', orders: ['ORD-3305', 'ORD-3306'] },
      ],
      bids: 0, best_bid: null, bid_exp: null, carrier: null,
      price: null, price_type: 'spot', updated: '1h ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 1,
    },
    {
      id: 'SHP-5009', date: 'Apr 24', status: 'upcoming', vis: 'private',
      origin: 'Volos', dest: 'Thessaloniki', via: 'Larissa',
      customer: [{ name: 'Beta Distributors', orders: ['ORD-2199', 'ORD-2200'] }],
      bids: 2, best_bid: 560, bid_exp: null, carrier: 'KRP Transport S.A',
      carrier_init: 'KR',
      price: 560, price_type: 'contract', updated: '3h ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 3,
    },
    {
      id: 'SHP-5008', date: 'Apr 23', status: 'in_progress', vis: 'private',
      origin: 'Athens', dest: 'Thessaloniki', via: null,
      customer: [{ name: 'Alpha Foods Ltd', orders: ['ORD-1095', 'ORD-1096', 'ORD-1097', 'ORD-1098'] }],
      bids: 4, best_bid: null, bid_exp: null, carrier: 'Transmed Logistics',
      carrier_init: 'TM',
      price: 950, price_type: 'spot', updated: '5h ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 5,
    },
    {
      id: 'SHP-5007', date: 'Apr 23', status: 'in_progress', vis: 'public',
      origin: 'Patras', dest: 'Athens', via: null,
      customer: [{ name: 'Gamma Logistics', orders: ['ORD-3302', 'ORD-3303', 'ORD-3304'] }],
      bids: 2, best_bid: null, bid_exp: null, carrier: 'Giorgos Pantazis',
      carrier_init: 'GP',
      price: 420, price_type: 'spot', updated: '6h ago', at_risk: true,
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 4,
    },
    {
      id: 'SHP-5006', date: 'Apr 23', status: 'in_progress', vis: 'private',
      origin: 'Ioannina', dest: 'Volos', via: 'Trikala',
      customer: [{ name: 'Alpha Foods Ltd', orders: ['ORD-1093', 'ORD-1094'] }],
      bids: 3, best_bid: null, bid_exp: null, carrier: 'Hellenic Transport',
      carrier_init: 'EM',
      price: 680, price_type: 'contract', updated: 'Yesterday',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 5,
    },
    {
      id: 'SHP-5005', date: 'Apr 22', status: 'pending', vis: 'public',
      origin: 'Heraklion', dest: 'Piraeus', via: null,
      customer: [{ name: 'Beta Distributors', orders: ['ORD-2197', 'ORD-2198'] }],
      bids: 0, best_bid: null, bid_exp: null, carrier: null,
      price: null, price_type: 'spot', updated: 'Yesterday',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 1,
    },
    {
      id: 'SHP-5004', date: 'Apr 22', status: 'pending', vis: 'private',
      origin: 'Thessaloniki', dest: 'Ioannina', via: null,
      customer: [{ name: 'Gamma Logistics', orders: ['ORD-3300', 'ORD-3301'] }],
      bids: 5, best_bid: 710, bid_exp: '45m', carrier: null,
      price: null, price_type: 'spot', updated: '2d ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 2,
    },
    {
      id: 'SHP-5003', date: 'Apr 21', status: 'upcoming', vis: 'private',
      origin: 'Athens', dest: 'Heraklion', via: 'Piraeus',
      customer: [{ name: 'Alpha Foods Ltd', orders: ['ORD-1091', 'ORD-1092'] }],
      bids: 1, best_bid: 1100, bid_exp: null, carrier: 'Aegean Cargo',
      carrier_init: 'AC',
      price: 1100, price_type: 'contract', updated: '2d ago',
      timeline: ['booked', 'posted', 'bidding', 'awarded', 'pickup', 'transit', 'delivered'],
      tl_cur: 3,
    },
  ]);

  const addShipment = (shp: Shipment) => {
    setShipments((prev) => [shp, ...prev]);
    showToast(`Shipment "${shp.id}" created successfully.`, 'success');
  };

  const updateShipment = (updatedShp: Shipment) => {
    setShipments((prev) =>
      prev.map((shp) => (shp.id === updatedShp.id ? updatedShp : shp))
    );
  };

  // ── Partners State ──────────────────────────────────────
  const [partners, setPartners] = useState<Partner[]>(() => {
    // Deterministic seed (avoids random re-renders)
    const carrierNames = ['TransMed Logistics', 'Aegean Freight', 'Hellas Cargo', 'Olympic Transport', 'Balkan Express', 'Euro Haul GmbH', 'Adriatic Lines', 'Continental Carriers', 'NorthStar Haulage', 'Danube Logistics', 'Atlas Freight', 'PanEuropean Transport', 'Ionian Carriers', 'Rhodope Logistics', 'Thessaly Express', 'Maritsa Transport'];
    const freelancerNames = ['Nikos Papadopoulos', 'Giorgos Konstantinou', 'Dimitris Alexandrou', 'Maria Ioannidou', 'Kostas Nikolaou', 'Yannis Stavrou', 'Elena Dimitriou', 'Petros Georgiou', 'Sofia Andreou', 'Thanasis Vasileiou', 'Antonis Karagiannis', 'Vassilis Papas'];
    const customerNames = ['FreshCo Foods', 'BuildRight Materials', 'PharmaPlus GR', 'AutoParts Hellas', 'TechDist Europe', 'AgroExport SA', 'ChemStar Industries', 'RetailBox Athens'];
    const truckTypes = ['Curtainsider', 'Box Truck', 'Flatbed', 'Refrigerated', 'Tanker', 'Lowbed', 'Mega Trailer', 'Container Chassis'];
    const lanes = ['Athens → Thessaloniki', 'Thessaloniki → Sofia', 'Athens → Patras', 'Patras → Igoumenitsa', 'Athens → Heraklion', 'Volos → Larissa'];
    const statuses: Array<'active' | 'invited' | 'pending' | 'suspended'> = ['active', 'invited', 'pending', 'suspended'];
    const types: Array<'carrier_company' | 'freelancer_driver' | 'customer'> = ['carrier_company', 'carrier_company', 'carrier_company', 'freelancer_driver', 'freelancer_driver', 'customer'];
    const payTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60'];

    const seed: Partner[] = [];
    for (let i = 0; i < 42; i++) {
      const type = types[i % types.length];
      const status: 'active' | 'invited' | 'pending' | 'suspended' = i < 6 ? 'active' : statuses[i % statuses.length];
      const isCarrier = type === 'carrier_company';
      const isFreelancer = type === 'freelancer_driver';
      const name = isCarrier ? carrierNames[i % carrierNames.length] : isFreelancer ? freelancerNames[i % freelancerNames.length] : customerNames[i % customerNames.length];
      const truckCount = isCarrier ? 3 + (i % 4) : isFreelancer ? 1 : 0;
      const trucks = truckTypes.slice(i % truckTypes.length, i % truckTypes.length + truckCount).concat(truckTypes.slice(0, Math.max(0, truckCount - (truckTypes.length - i % truckTypes.length))));
      const loads30d = 5 + (i * 11) % 43;
      const daysAgo = (i * 7) % 30;
      const lastDate = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
      const contractLanes: ContractLane[] = isCarrier ? lanes.slice(0, i % 4).map((lane, li) => ({
        lane,
        unit: li % 2 === 0 ? 'PER_LOAD' : 'PER_PALLET',
        price: 200 + (i + li) * 80,
        status: 'ACTIVE',
        volume: 5 + li * 8,
        ot: 75 + li * 5,
      })) : [];
      const trips: PartnerTrip[] = Array.from({ length: 3 + i % 5 }, (_, ti) => {
        const tripStatuses: Array<'Delivered' | 'In Transit' | 'Cancelled'> = ['Delivered', 'Delivered', 'Delivered', 'In Transit', 'Cancelled'];
        return {
          id: `SH-${10000 + i * 7 + ti}`,
          lane: lanes[(i + ti) % lanes.length],
          pickupDate: new Date(Date.now() - (ti + 2) * 86400000 * 5).toISOString().slice(0, 10),
          deliveryDate: new Date(Date.now() - ti * 86400000 * 4).toISOString().slice(0, 10),
          status: tripStatuses[(i + ti) % tripStatuses.length],
          price: `€${200 + (i + ti) * 120}`,
        };
      });
      const contacts: PartnerContact[] = isFreelancer
        ? [{ name, role: 'Driver', phone: `+30 69${String(10000000 + i * 1234567).slice(0, 8)}`, email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com` }]
        : [
          { name: 'Operations Dept', role: 'Ops', phone: `+30 69${String(10000000 + i * 987654).slice(0, 8)}`, email: `ops@${name.toLowerCase().replace(/\s+/g, '')}.com` },
          { name: 'Finance Dept', role: 'Finance', phone: `+30 21${String(1000000 + i * 456789).slice(0, 7)}`, email: `fin@${name.toLowerCase().replace(/\s+/g, '')}.com` },
        ];
      const hasIban = i % 5 !== 0;
      const ibanStr = hasIban ? `GR${16 + i} ${1000 + i} ${2000 + i} ${3000 + i}` : '';
      seed.push({
        id: `P-${String(i + 1).padStart(4, '0')}`,
        name,
        type,
        status,
        legalName: isCarrier ? `${name} S.A.` : isFreelancer ? name : `${name} Ltd`,
        vat: `EL${String(100000000 + i * 7654321).slice(0, 9)}`,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: `+30 69${String(10000000 + i * 1111111).slice(0, 8)}`,
        regionIdx: i % 8,
        trucks: trucks.slice(0, truckCount),
        fleetSize: isCarrier ? 5 + i * 2 : isFreelancer ? 1 : 0,
        lifetimeLoads: 50 + i * 12,
        loads30d,
        otPickup: 72 + (i * 3) % 28,
        otDelivery: 68 + (i * 4) % 30,
        cancelRate: i % 13,
        acceptRate: 55 + (i * 5) % 45,
        avgResponse: `${5 + (i * 17) % 180}m`,
        lastActivity: lastDate,
        rating: ((30 + (i * 7) % 20) / 10).toFixed(1),
        paymentTerms: payTerms[i % payTerms.length],
        iban: ibanStr,
        beneficiary: name,
        bankVerified: hasIban && i % 3 !== 0,
        openInvoices: i % 9,
        disputes: i % 4,
        tags: i < 3 ? ['preferred'] : i === 6 ? ['do-not-use'] : i % 4 === 0 ? ['preferred'] : [],
        missingDocs: i % 5 === 4,
        profileCompletion: 55 + (i * 9) % 45,
        contractLanes,
        trips,
        contacts,
        notes: '',
      });
    }
    return seed;
  });

  const addPartner = (p: Omit<Partner, 'id'>) => {
    const nextId = `P-${String(partners.length + 1).padStart(4, '0')}`;
    setPartners((prev) => [{ ...p, id: nextId }, ...prev]);
  };

  const updatePartner = (updated: Partner) => {
    setPartners((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const removePartner = (id: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        locations,
        addLocation,
        updateLocation,
        archiveLocation,
        restoreLocation,
        refreshLocationsFromApi,
        companies,
        addCompany,
        categories,
        addCategory,
        productTypes,
        addProductType,
        updateProductType,
        skus,
        addSku,
        updateSku,
        refreshSkusFromApi,
        shipments,
        addShipment,
        updateShipment,
        carriers,
        toggleCarrierSelection,
        vehicleOptions,
        toggleVehicleSelection,
        partners,
        addPartner,
        updatePartner,
        removePartner,
        toast,
        showToast,
        hideToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
