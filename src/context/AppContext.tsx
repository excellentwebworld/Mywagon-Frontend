import React, { createContext, useContext, useState, useEffect } from 'react';

// ==========================================
// TYPES
// ==========================================

export interface Contact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface LocationItem {
  id: string;
  name: string;
  company: string;
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
  status: 'active' | 'archived';
  created: string;
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
  date: string;
  status: 'pending' | 'upcoming' | 'in_progress' | 'awarded' | 'delivered' | 'cancelled';
  vis: 'private' | 'public' | 'fleet';
  origin: string;
  dest: string;
  via: string | null;
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
  stops?: ShipmentStop[]; // Wizard created stop details
  driverNotes?: string;
  negotiable?: boolean;
  navigation?: boolean;
  counter?: { yours: number; theirs: number; pct: string; dir: 'up' | 'down' };
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
  t: (key: string) => string;
  
  locations: LocationItem[];
  addLocation: (loc: Omit<LocationItem, 'id' | 'created' | 'status'>) => void;
  updateLocation: (loc: LocationItem) => void;
  archiveLocation: (id: string) => void;
  restoreLocation: (id: string) => void;
  
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

// ==========================================
// TRANSLATION DICTIONARY
// ==========================================

const TRANSLATIONS: Record<string, { en: string; el: string }> = {
  appName: { en: 'MY VAGON', el: 'MY VAGON' },
  dashboard: { en: 'Dashboard', el: 'Ταμπλό' },
  createShipment: { en: 'Create Shipment', el: 'Δημιουργία Φορτίου' },
  manageShipments: { en: 'Manage Shipments', el: 'Διαχείριση Φορτίων' },
  searchTrucks: { en: 'Search Trucks', el: 'Αναζήτηση Φορτηγών' },
  addressBook: { en: 'Address Book', el: 'Βιβλίο Διευθύνσεων' },
  products: { en: 'Product Registry', el: 'Μητρώο Προϊόντων' },
  partners: { en: 'Partners', el: 'Συνεργάτες' },
  help: { en: 'Help & Support', el: 'Βοήθεια & Υποστήριξη' },
  step1Title: { en: 'Create Load', el: 'Δημιουργία Φορτίου' },
  step1Sub: { en: 'Add stops and cargo details', el: 'Προσθήκη στάσεων και στοιχεία φορτίου' },
  step2Title: { en: 'Itinerary Confirmation', el: 'Επιβεβαίωση Δρομολογίου' },
  step2Sub: { en: 'Review your stops and itinerary before proceeding.', el: 'Ελέγξτε τις στάσεις και το δρομολόγιο πριν συνεχίσετε.' },
  step3Title: { en: 'Pricing & Tracking', el: 'Τιμή & Παρακολούθηση' },
  step3Sub: { en: 'Set your price and configure tracking links.', el: 'Ορίστε τιμή και ρυθμίστε συνδέσμους παρακολούθησης.' },
  details: { en: 'Details', el: 'Λεπτομέρειες' },
  itinerary: { en: 'Itinerary', el: 'Δρομολόγιο' },
  pricing: { en: 'Pricing & Tracking', el: 'Τιμή & Παρακολούθηση' },
  vehicleType: { en: 'Vehicle Type', el: 'Τύπος Οχήματος' },
  shipmentStops: { en: 'Shipment Stops', el: 'Στάσεις Αποστολής' },
  stop: { en: 'Stop', el: 'Στάση' },
  pickup: { en: 'Pickup', el: 'Παραλαβή' },
  delivery: { en: 'Delivery', el: 'Παράδοση' },
  addStop: { en: '+ Add stop', el: '+ Προσθήκη στάσης' },
  saveDraft: { en: 'Save Draft', el: 'Αποθήκευση Πρόχειρου' },
  continue: { en: 'Continue', el: 'Συνέχεια' },
  back: { en: 'Back', el: 'Πίσω' },
  routeStops: { en: 'Route Stops', el: 'Στάσεις Δρομολογίου' },
  tripSummary: { en: 'Trip Summary', el: 'Σύνοψη Ταξιδιού' },
  orders: { en: 'Orders', el: 'Παραγγελίες' },
  customers: { en: 'Customers', el: 'Πελάτες' },
  map: { en: 'Map', el: 'Χάρτης' },
  satellite: { en: 'Satellite', el: 'Δορυφόρος' },
  confirmContinue: { en: 'Confirm & Continue', el: 'Επιβεβαίωση & Συνέχεια' },
  autoSave: { en: 'Auto-save active', el: 'Αυτόματη αποθήκευση ενεργή' },
  broadcastType: { en: 'Broadcast Type', el: 'Τύπος Αποστολής' },
  privateNetwork: { en: 'Private Network', el: 'Ιδιωτικό Δίκτυο' },
  publicMarketplace: { en: 'Public Marketplace', el: 'Δημόσια Αγορά' },
  myFleet: { en: 'My Fleet', el: 'Ο Στόλος Μου' },
  bulkLoadCreation: { en: 'Bulk Load Creation', el: 'Μαζική Δημιουργία Φορτίων' },
  trackingLinks: { en: 'Tracking Links', el: 'Σύνδεσμοι Παρακολούθησης' },
  summary: { en: 'Summary', el: 'Σύνοψη' },
  driverNotes: { en: 'Driver Notes', el: 'Σημειώσεις Οδηγού' },
  totalCost: { en: 'Total cost', el: 'Συνολικό Κόστος' },
  createShipmentBtn: { en: 'Create Shipment', el: 'Δημιουργία φορτίου' },
  liveNavigation: { en: 'Live navigation', el: 'Live πλοήγηση' },
  routeLabel: { en: 'Route', el: 'Διαδρομή' },
  laneAnalysis: { en: 'Lane Analysis', el: 'Ανάλυση Διαδρόμου' },
  perKm: { en: '/ km', el: '/ km' },
  perPalletSlash: { en: '/ pallet', el: '/ παλέτα' },
  negotiablePrice: { en: 'Negotiable price', el: 'Διαπραγματεύσιμη τιμή' },
  counteroffers: { en: 'Carriers can submit counteroffers', el: 'Οι μεταφορείς μπορούν να κάνουν αντιπροσφορά' },
  singleLoad: { en: 'Single Load', el: 'Μονό Φορτίο' },
  multipleSameDay: { en: 'Multiple (same day)', el: 'Πολλαπλά (ίδια μέρα)' },
  multipleDates: { en: 'Multiple dates', el: 'Πολλαπλές Ημερομηνίες' },
  recurring: { en: 'Recurring', el: 'Επαναλαμβανόμενο' },
  
  // Manage Shipments T
  in_progress: { en: 'In Progress', el: 'Σε εξέλιξη' },
  upcoming: { en: 'Upcoming', el: 'Προσεχές' },
  pending: { en: 'Pending', el: 'Εκκρεμεί' },
  awarded: { en: 'Awarded', el: 'Ανατέθηκε' },
  delivered: { en: 'Delivered', el: 'Παραδόθηκε' },
  cancelled: { en: 'Cancelled', el: 'Ακυρωμένο' },
  private: { en: 'Private', el: 'Ιδιωτικό' },
  public: { en: 'Public', el: 'Δημόσιο' },
  uncovered: { en: 'Uncovered', el: 'Ακάλυπτο' },
  has_bids: { en: 'Has Bids', el: 'Έχει προσφορές' },
  no_bids: { en: 'No Bids', el: 'Χωρίς προσφορές' },
  spot: { en: 'SPOT', el: 'SPOT' },
  contract: { en: 'CONTRACT', el: 'ΣΥΜΒΟΛΑΙΟ' },
  bid_exp: { en: 'Bid expires', el: 'Λήγει' },
  counter: { en: 'Counter-offer', el: 'Αντιπροσφορά' },

  // Quick Actions
  qaNewShipment: { en: 'New Shipment', el: 'Νέο φορτίο' },
  qaNewShipmentSub: { en: 'Create a new load', el: 'Δημιουργία φορτίου' },
  qaNeedsAction: { en: 'loads need attention', el: 'φορτία χρειάζονται ενέργεια' },
  qaNeedsActionSub: { en: 'Review now', el: 'Ελέγξτε τώρα' },
  qaSearchTrucks: { en: 'Search Trucks', el: 'Αναζήτηση φορτηγών' },
  qaSearchTrucksSub: { en: 'Find available carriers', el: 'Βρείτε διαθέσιμους μεταφορείς' },
  qaImportErp: { en: 'Import from ERP', el: 'Εισαγωγή από ERP' },
  qaImportErpSub: { en: 'Bulk create shipments', el: 'Μαζική δημιουργία' },

  // KPI Dashboard Labels
  kpiOpLabel: { en: 'Operational', el: 'Λειτουργικά' },
  kpiFinLabel: { en: 'Financial', el: 'Οικονομικά' },
  kpiActive: { en: 'Active Loads', el: 'Ενεργά φορτία' },
  kpiAction: { en: 'Needs Action', el: 'Χρειάζονται ενέργεια' },
  kpiTransit: { en: 'In Transit', el: 'Σε μεταφορά' },
  kpiUpcoming: { en: 'Upcoming (7d)', el: 'Προσεχώς (7ημ.)' },
  kpiCompleted: { en: 'Completed (MTD)', el: 'Ολοκληρωμένα (μήνας)' },
  kpiTotalSpend: { en: 'Total Spend (MTD)', el: 'Συνολική δαπάνη (μήνας)' },
  kpiCostKm: { en: 'Avg Cost / km', el: 'Μ.Ο. κόστος / km' },
  kpiCostLoad: { en: 'Avg Cost / Load', el: 'Μ.Ο. κόστος / φορτίο' },
  kpiUnpaid: { en: 'Unpaid Invoices', el: 'Απλήρωτα τιμολόγια' },
  kpiMargin: { en: 'Commission Rate', el: 'Ποσοστό προμήθειας' },
  kpiBudget: { en: 'Budget: €55K', el: 'Budget: €55K' },
  kpiMarketAvg: { en: 'Market: €1.74', el: 'Αγορά: €1.74' },

  // Product registry T
  masterData: { en: 'Master Data', el: 'Κύρια Δεδομένα' },
  prodMaster: { en: 'Product Master', el: 'Κατάλογος Προϊόντων' },
  subtitle: { en: 'Manage categories, product types, and SKUs', el: 'Διαχείριση κατηγοριών, τύπων προϊόντων και SKU' },
  export: { en: 'Export', el: 'Εξαγωγή' },
  add: { en: 'Add', el: 'Προσθήκη' },
  cancel: { en: 'Cancel', el: 'Ακύρωση' },
  create: { en: 'Create', el: 'Δημιουργία' },
  save: { en: 'Save', el: 'Αποθήκευση' },
  search: { en: 'Search SKU name, number, barcode, type…', el: 'Αναζήτηση ονόματος, αριθμού, barcode, τύπου…' },
  clearAll: { en: 'Clear all', el: 'Εκκαθάριση' },
  totalSkus: { en: 'Total SKUs', el: 'Σύνολο SKU' },
  erpSynced: { en: 'ERP-Synced', el: 'ERP' },
  manual: { en: 'Manual', el: 'Χειροκίνητα' },
  syncIssues: { en: 'Sync Issues', el: 'Προβλήματα Sync' },
  unmapped: { en: 'Unmapped', el: 'Μη αντιστοιχισμένα' },
  inactive: { en: 'Inactive', el: 'Ανενεργά' },
  category: { en: 'Category', el: 'Κατηγορία' },
  source: { en: 'Source', el: 'Πηγή' },
  syncStatus: { en: 'Sync', el: 'Sync' },
  status: { en: 'Status', el: 'Κατάσταση' },
  active: { en: 'Active', el: 'Ενεργό' },
  activeOnly: { en: 'Active Only', el: 'Ενεργά' },
  inactiveOnly: { en: 'Inactive Only', el: 'Ανενεργά' },
  all: { en: 'All', el: 'Όλα' },
  catalog: { en: 'Catalog', el: 'Κατάλογος' },
  allItems: { en: 'All Items', el: 'Όλα' },
  allTypes: { en: 'All Types', el: 'Όλοι οι Τύποι' },
  unmappedSkus: { en: 'Unmapped SKUs', el: 'Μη αντιστοιχισμένα SKU' },
  addCategory: { en: '+ Add Category', el: '+ Προσθήκη Κατηγορίας' },
  sku: { en: 'SKU', el: 'SKU' },
  productType: { en: 'Product Type', el: 'Τύπος Προϊόντος' },
  lastSynced: { en: 'Last Synced', el: 'Τελ. Sync' },
  items: { en: 'items', el: 'στοιχεία' },
  item: { en: 'item', el: 'στοιχείο' },
  types: { en: 'types', el: 'τύποι' },
  noItems: { en: 'No items found', el: 'Δεν βρέθηκαν στοιχεία' },
  noItemsSub: { en: 'Try adjusting your filters or search, or add new items.', el: 'Δοκιμάστε να αλλάξετε φίλτρα ή αναζήτηση, ή προσθέστε νέα.' },
  noTypes: { en: 'No product types found', el: 'Δεν βρέθηκαν τύποι' },
  sortName: { en: 'SKU Name A–Z', el: 'Όνομα Α–Ω' },
  sortNumber: { en: 'SKU Number', el: 'Αριθμός SKU' },
  sortType: { en: 'Product Type', el: 'Τύπος' },
  sortStatus: { en: 'Status', el: 'Κατάσταση' },
  selected: { en: 'selected', el: 'επιλεγμένα' },
  mapType: { en: 'Map Type', el: 'Αντιστοίχιση' },
  toggleActive: { en: 'Toggle Active', el: 'Εναλλαγή' },
  archive: { en: 'Archive', el: 'Αρχειοθέτηση' },
  edit: { en: 'Edit', el: 'Επεξεργασία' },
  rename: { en: 'Rename', el: 'Μετονομασία' },
  merge: { en: 'Merge', el: 'Συγχώνευση' },
  shipment: { en: '+ Shipment', el: '+ Αποστολή' },
  deactivate: { en: 'Deactivate', el: 'Απενεργοποίηση' },
  activate: { en: 'Activate', el: 'Ενεργοποίηση' },
  usage: { en: 'Usage', el: 'Χρήση' },
  ship30: { en: 'Shipments (30d)', el: 'Αποστολές (30ημ)' },
  ship90: { en: 'Shipments (90d)', el: 'Αποστολές (90ημ)' },
  mappedSkus: { en: 'Mapped SKUs', el: 'Αντιστοιχισμένα SKU' },
  fromErp: { en: 'From ERP', el: 'Από ERP' },
  shippingDefaults: { en: 'Shipping Defaults', el: 'Προεπιλογές Αποστολής' },
  shippingProfile: { en: 'Shipping Profile', el: 'Προφίλ Αποστολής' },
  temp: { en: 'Temperature', el: 'Θερμοκρασία' },
  hazardous: { en: 'Hazardous', el: 'Επικίνδυνο' },
  stackable: { en: 'Stackable', el: 'Στοιβαζόμενο' },
  palletType: { en: 'Pallet Type', el: 'Τύπος Παλέτας' },
  noTypeAssigned: { en: 'No type assigned.', el: 'Δεν υπάρχει τύπος.' },
  noSkusMapped: { en: 'No SKUs mapped.', el: 'Δεν υπάρχουν SKU.' },
  erpIntegration: { en: 'ERP Integration', el: 'Ενσωμάτωση ERP' },
  erpSystem: { en: 'ERP System', el: 'Σύστημα ERP' },
  extId: { en: 'External ID', el: 'Εξωτερικό ID' },
  syncConflict: { en: 'Sync Conflict', el: 'Σύγκρουση Sync' },
  acceptErp: { en: 'Accept ERP', el: 'Αποδοχή ERP' },
  keepMyvagon: { en: 'Keep MYVAGON', el: 'Διατήρηση MYVAGON' },
  addType: { en: 'Add Product Type', el: 'Προσθήκη Τύπου Προϊόντος' },
  addSku: { en: 'Add SKU', el: 'Προσθήκη SKU' },
  editSku: { en: 'Edit SKU', el: 'Επεξεργασία SKU' },
  addCat: { en: 'Add Category', el: 'Προσθήκη Κατηγορίας' },
  importCsv: { en: 'Import CSV', el: 'Εισαγωγή CSV' },
  addTypeMenu: { en: 'Add Product Type', el: 'Προσθήκη Τύπου' },
  addSkuMenu: { en: 'Add SKU (Manual)', el: 'Προσθήκη SKU (Χειροκίνητα)' },
  importCsvMenu: { en: 'Import CSV', el: 'Εισαγωγή CSV' },
  addCatMenu: { en: 'Add Category', el: 'Προσθήκη Κατηγορίας' },
  typeName: { en: 'Type Name', el: 'Όνομα Τύπου' },
  selectCat: { en: '— Select —', el: '— Επιλέξτε —' },
  skuName: { en: 'SKU Name', el: 'Όνομα SKU' },
  skuNumber: { en: 'SKU Number', el: 'Αριθμός SKU' },
  barcode: { en: 'Barcode', el: 'Barcode' },
  uom: { en: 'Unit of Measure', el: 'Μονάδα Μέτρησης' },
  weight: { en: 'Weight', el: 'Βάρος' },
  tags: { en: 'Tags', el: 'Ετικέτες' },
  catName: { en: 'Category Name', el: 'Όνομα Κατηγορίας' },
  icon: { en: 'Icon', el: 'Εικονίδιο' },
  selectCatFirst: { en: 'Select category first', el: 'Επιλέξτε πρώτα κατηγορία' },
  none: { en: '— None —', el: '— Κανένα —' },
  similarTypes: { en: 'Similar types exist', el: 'Υπάρχουν παρόμοιοι τύποι' },
  dupeNumber: { en: 'SKU Number exists', el: 'Ο αριθμός SKU υπάρχει' },
  erpReadonly: { en: 'ERP-managed — ID fields read-only.', el: 'Διαχείριση ERP — τα πεδία ID είναι μόνο ανάγνωσης.' },
  newName: { en: 'New Name', el: 'Νέο Όνομα' },
  renameTo: { en: 'Rename', el: 'Μετονομασία' },
  mergeInto: { en: 'Merge into…', el: 'Συγχώνευση σε…' },
  mergeInfo: { en: 'SKU(s) will be reassigned. Select target:', el: 'Τα SKU θα αντιστοιχιστούν εκ νέου. Επιλέξτε στόχο:' },
  noOtherTypes: { en: 'No other types in this category.', el: 'Δεν υπάρχουν άλλοι τύποι σε αυτή την κατηγορία.' },
  archiveConfirm: { en: 'This type has active SKU(s). Archiving will unmap them. Continue?', el: 'Αυτός ο τύπος έχει ενεργά SKU. Η αρχειοθέτηση θα τα αποσυνδέσει. Συνέχεια;' },
  bulkArchiveConfirm: { en: 'Archive selected SKUs?', el: 'Αρχειοθέτηση επιλεγμένων SKU;' },
  downloadTemplate: { en: 'Download Template', el: 'Λήψη Προτύπου' },
  downloadSub: { en: 'Get the CSV template to fill in', el: 'Κατεβάστε το πρότυπο CSV' },
  uploadFile: { en: 'Upload File', el: 'Ανέβασμα Αρχείου' },
  uploadSub: { en: 'Upload a completed CSV file', el: 'Ανεβάστε ένα συμπληρωμένο CSV' },
  preview: { en: 'Preview', el: 'Προεπισκόπηση' },
  detected: { en: 'Detected', el: 'Εντοπίστηκαν' },
  rows: { en: 'rows', el: 'σειρές' },
  valid: { en: 'Valid', el: 'Έγκυρα' },
  duplicates: { en: 'Duplicates', el: 'Διπλά' },
  missingCat: { en: 'Missing category', el: 'Χωρίς κατηγορία' },
  importN: { en: 'Import', el: 'Εισαγωγή' },
  helpSupport: { en: 'Help & Support', el: 'Βοήθεια & Υποστήριξη' },
  syncSettings: { en: 'Opening sync settings…', el: 'Άνοιγμα ρυθμίσεων sync…' },
  filtersCleared: { en: 'Filters cleared', el: 'Τα φίλτρα εκκαθαρίστηκαν' },
  ok: { en: 'OK', el: 'OK' },
  error: { en: 'Error', el: 'Σφάλμα' },
  conflict: { en: 'Conflict', el: 'Σύγκρουση' },
  showing: { en: 'Showing', el: 'Εμφάνιση' },
  of: { en: 'of', el: 'από' },
  exported: { en: 'Exported', el: 'Εξαγωγή' },
  imported: { en: 'Imported', el: 'Εισαγωγή' },
  skusWord: { en: 'SKUs', el: 'SKU' },
  created: { en: 'created', el: 'δημιουργήθηκε' },
  updated: { en: 'Updated', el: 'Ενημερώθηκε' },
  activated: { en: 'Activated', el: 'Ενεργοποιήθηκε' },
  deactivated: { en: 'Deactivated', el: 'Απενεργοποιήθηκε' },
  archived: { en: 'archived', el: 'αρχειοθετήθηκε' },
  merged: { en: 'Merged into', el: 'Συγχωνεύτηκε σε' },
  renamed: { en: 'Renamed to', el: 'Μετονομάστηκε σε' },
  toggled: { en: 'Toggled', el: 'Αλλαγή' },
  yes: { en: 'Yes', el: 'Ναι' },
  no: { en: 'No', el: 'Όχι' },

  // ── Partners page ──
  partnersTitle: { en: 'Partners', el: 'Συνεργάτες' },
  partnersSubtitle: { en: 'Manage your carrier, freelancer & customer partner network', el: 'Διαχείριση δικτύου μεταφορέων, ελεύθερων οδηγών & πελατών' },
  invitePartner: { en: 'Invite Partner', el: 'Πρόσκληση Συνεργάτη' },
  addCustomerBtn: { en: '+ Add Customer', el: '+ Προσθήκη Πελάτη' },
  syncErp: { en: 'Sync ERP', el: 'Sync ERP' },
  partnerExport: { en: 'Export', el: 'Εξαγωγή' },
  totalPartners: { en: 'Total', el: 'Σύνολο' },
  activePartners: { en: 'Active', el: 'Ενεργοί' },
  carrierPartners: { en: 'Carrier Companies', el: 'Μεταφορικές' },
  freelancerPartners: { en: 'Freelancers', el: 'Ελεύθεροι Οδηγοί' },
  invitedPartners: { en: 'Invited', el: 'Προσκεκλημένοι' },
  missingBankPartners: { en: 'Missing Bank', el: 'Χωρίς Τράπεζα' },
  suspendedPartners: { en: 'Suspended', el: 'Σε Αναστολή' },
  allPartners: { en: 'All Partners', el: 'Όλοι' },
  carriersType: { en: 'Carrier Companies', el: 'Μεταφορικές' },
  freelancersType: { en: 'Freelancer Drivers', el: 'Ελεύθεροι Οδηγοί' },
  customersType: { en: 'Customers', el: 'Πελάτες' },
  byType: { en: 'By Type', el: 'Ανά Τύπο' },
  byStatus: { en: 'By Status', el: 'Ανά Κατάσταση' },
  byRegion: { en: 'By Region', el: 'Ανά Περιοχή' },
  partnersNetwork: { en: 'Partners Network', el: 'Δίκτυο Συνεργατών' },
  partnerSearchPlaceholder: { en: 'Search name, VAT, email, truck type, region…', el: 'Αναζήτηση ονόματος, ΑΦΜ, email, τύπου, περιοχής…' },
  statusFilter: { en: 'Status', el: 'Κατάσταση' },
  capabilityFilter: { en: 'Capability', el: 'Δυνατότητα' },
  performanceFilter: { en: 'Performance', el: 'Απόδοση' },
  regionFilter: { en: 'Region', el: 'Περιοχή' },
  partnerCol: { en: 'Partner', el: 'Συνεργάτης' },
  typeCol: { en: 'Type', el: 'Τύπος' },
  capabilitiesCol: { en: 'Capabilities', el: 'Δυνατότητες' },
  loads30dCol: { en: 'Loads 30d', el: 'Φορτία 30ημ' },
  ontimeCol: { en: 'On-time', el: 'Εγκαιρ.' },
  cancelPctCol: { en: 'Cancel %', el: 'Ακύρωση %' },
  lastActCol: { en: 'Last Activity', el: 'Τελ. Δραστηριότητα' },
  sortNameAz: { en: 'Name A–Z', el: 'Όνομα Α–Ω' },
  sortLastAct: { en: 'Last Activity', el: 'Τελ. Δραστηριότητα' },
  sortOntime: { en: 'On-time %', el: 'Εγκαιρότητα %' },
  sortLoads: { en: 'Loads 30d', el: 'Φορτία 30ημ' },
  partnerMessage: { en: 'Message', el: 'Μήνυμα' },
  partnerSuspend: { en: 'Suspend', el: 'Αναστολή' },
  partnerReactivate: { en: 'Reactivate', el: 'Επανενεργοποίηση' },
  partnerRemove: { en: 'Remove Permanently', el: 'Οριστική Αφαίρεση' },
  performanceKpis: { en: 'Performance KPIs', el: 'Δείκτες Απόδοσης' },
  infoSection: { en: 'Information', el: 'Πληροφορίες' },
  fleetSection: { en: 'Fleet & Capabilities', el: 'Στόλος & Δυνατότητες' },
  tripsSection: { en: 'Trips History', el: 'Ιστορικό Μεταφορών' },
  billingSection: { en: 'Billing & Finance', el: 'Τιμολόγηση & Οικονομικά' },
  contractsSection: { en: 'Contract Lanes', el: 'Συμβ. Δρομολόγια' },
  docsSection: { en: 'Documents', el: 'Έγγραφα' },
  notesSection: { en: 'Notes & Tags', el: 'Σημειώσεις & Ετικέτες' },
  addCapability: { en: '+ Add Capability', el: '+ Προσθήκη Δυνατότητας' },
  addContractLane: { en: '+ Add Lane', el: '+ Προσθήκη Δρομολογίου' },
  saveNote: { en: 'Save Note', el: 'Αποθήκευση Σημείωσης' },
  editBankDetails: { en: 'Edit Bank Details', el: 'Επεξεργασία Τραπεζικών' },
  bankNotVerified: { en: 'Not Verified', el: 'Μη Επαληθευμένο' },
  bankVerified: { en: 'Verified', el: 'Επαληθευμένο' },
  notProvided: { en: 'Not provided', el: 'Δεν δόθηκε' },
  legalName: { en: 'Legal Name', el: 'Επωνυμία' },
  paymentTerms: { en: 'Payment Terms', el: 'Όροι Πληρωμής' },
  fleetSize: { en: 'Fleet Size', el: 'Μέγεθος Στόλου' },
  partnerContacts: { en: 'Contacts', el: 'Επαφές' },
  lifetimeLoads: { en: 'Lifetime Loads', el: 'Φορτία Σύνολο' },
  otPickup: { en: 'On-time Pickup', el: 'Έγκαιρη Παραλαβή' },
  otDelivery: { en: 'On-time Delivery', el: 'Έγκαιρη Παράδοση' },
  cancelRate: { en: 'Cancel Rate', el: 'Ποσοστό Ακύρωσης' },
  acceptRate: { en: 'Accept Rate', el: 'Ποσοστό Αποδοχής' },
  avgResponse: { en: 'Avg Response', el: 'Μ.Ο. Απόκρισης' },
  partnerRating: { en: 'Rating', el: 'Βαθμολογία' },
  openInvoices: { en: 'Open Invoices', el: 'Ανοικτά Τιμολόγια' },
  partnerDisputes: { en: 'Disputes', el: 'Διαφορές' },
  beneficiary: { en: 'Beneficiary', el: 'Δικαιούχος' },
  perLoad: { en: 'Per Load', el: 'Ανά Φορτίο' },
  perPallet: { en: 'Per Pallet', el: 'Ανά Παλέτα' },
  contractOverride: { en: 'Contract prices override Spot Price List for private/assigned shipments.', el: 'Οι τιμές σύμβασης υπερισχύουν του Spot Price List.' },
  noContractLanes: { en: 'No contract lanes', el: 'Χωρίς δρομολόγια σύμβασης' },
  docValid: { en: 'Valid', el: 'Έγκυρο' },
  docExpiring: { en: 'Expiring', el: 'Λήγει' },
  docMissing: { en: 'Missing', el: 'Λείπει' },
  insuranceCert: { en: 'Insurance Certificate', el: 'Ασφαλιστήριο' },
  operatingLicense: { en: 'Operating License', el: 'Άδεια Λειτουργίας' },
  adrCert: { en: 'ADR Certificate', el: 'Πιστοποιητικό ADR' },
  cmrInsurance: { en: 'CMR Insurance', el: 'Ασφάλιση CMR' },
  notesPrivate: { en: 'Notes are private to your organization.', el: 'Οι σημειώσεις είναι ιδιωτικές για τον οργανισμό σας.' },
  preferred: { en: 'Preferred', el: 'Προτιμώμενος' },
  inviteTitle: { en: 'Invite Partner', el: 'Πρόσκληση Συνεργάτη' },
  partnerType: { en: 'Partner type', el: 'Τύπος συνεργάτη' },
  relTags: { en: 'Relationship tags', el: 'Ετικέτες σχέσης' },
  prefTag: { en: '★ Preferred', el: '★ Προτιμώμενος' },
  privLoadsTag: { en: '🔒 Private Loads', el: '🔒 Ιδιωτικά Φορτία' },
  stdTag: { en: 'Standard', el: 'Κανονικός' },
  carrierCoType: { en: '🏢 Carrier Company', el: '🏢 Μεταφορική Εταιρεία' },
  freelancerDrType: { en: '🧑‍✈️ Freelancer Driver', el: '🧑‍✈️ Ελεύθερος Οδηγός' },
  customerType: { en: '🏪 Customer', el: '🏪 Πελάτης' },
  sendInvitation: { en: 'Send Invitation', el: 'Αποστολή Πρόσκλησης' },
  invAnother: { en: 'Invite Another', el: 'Νέα Πρόσκληση' },
  invSentTitle: { en: 'Invitation Sent!', el: 'Η Πρόσκληση Εστάλη!' },
  invSentDesc: { en: 'Your partner will receive the invitation shortly.', el: 'Ο συνεργάτης θα λάβει την πρόσκληση σύντομα.' },
  addCapTitle: { en: 'Add Truck Capability', el: 'Προσθήκη Δυνατότητας' },
  truckType: { en: 'Truck Type', el: 'Τύπος Φορτηγού' },
  capacity: { en: 'Capacity (t)', el: 'Χωρητικότητα (τ)' },
  countField: { en: 'Count', el: 'Πλήθος' },
  addLaneTitle: { en: 'Add Contract Lane', el: 'Προσθήκη Δρομολογίου' },
  originCity: { en: 'Origin City', el: 'Πόλη Αφετηρίας' },
  destCity: { en: 'Destination City', el: 'Πόλη Προορισμού' },
  pricingMode: { en: 'Pricing', el: 'Τιμολόγηση' },
  priceEur: { en: 'Price (€)', el: 'Τιμή (€)' },
  editBankTitle: { en: 'Edit Bank Details', el: 'Επεξεργασία Τραπεζικών' },
  bankWarn: { en: 'Manually entered bank details will be labeled as "Not Verified" until confirmed from the carrier profile.', el: 'Τα χειροκίνητα στοιχεία θα εμφανίζονται ως "Μη Επαληθευμένο" μέχρι να επιβεβαιωθούν από το προφίλ.' },
  addCustomerTitle: { en: 'Add Customer Manually', el: 'Χειροκίνητη Προσθήκη Πελάτη' },
  customerName: { en: 'Customer Name', el: 'Όνομα Πελάτη' },
  customerCompanyField: { en: 'Company Name', el: 'Επωνυμία Εταιρείας' },
  customerVat: { en: 'VAT Number', el: 'ΑΦΜ' },
  customerAdded: { en: '✅ Customer added', el: '✅ Ο πελάτης προστέθηκε' },
  comingSoon: { en: 'Coming Soon', el: 'Σύντομα Διαθέσιμο' },
  customerInviteNote: { en: 'Customer invitations are not yet available. You can add customers manually or sync from your ERP.', el: 'Οι προσκλήσεις πελατών δεν είναι ακόμα διαθέσιμες.' },
  confirmSuspendPartner: { en: 'Are you sure you want to suspend this partner?', el: 'Θέλετε σίγουρα να αναστείλετε αυτόν τον συνεργάτη;' },
  confirmReactivatePartner: { en: 'Reactivate this partner?', el: 'Επανενεργοποίηση αυτού του συνεργάτη;' },
  confirmRemovePartner: { en: 'PERMANENTLY remove this partner? This cannot be undone.', el: 'ΟΡΙΣΤΙΚΗ αφαίρεση αυτού του συνεργάτη; Αυτή η ενέργεια δεν αναιρείται.' },
  confirmRemoveLane: { en: 'Remove this contract lane?', el: 'Αφαίρεση αυτού του δρομολογίου;' },
  partnerSuspended: { en: '🚫 Partner suspended', el: '🚫 Συνεργάτης σε αναστολή' },
  partnerReactivated: { en: '✅ Partner reactivated', el: '✅ Επανενεργοποιήθηκε' },
  partnerRemoved: { en: '🗑️ Partner permanently removed', el: '🗑️ Ο συνεργάτης αφαιρέθηκε οριστικά' },
  capabilityAdded: { en: '✅ Capability added', el: '✅ Δυνατότητα προστέθηκε' },
  laneAdded: { en: '✅ Contract lane added', el: '✅ Δρομολόγιο προστέθηκε' },
  laneDeleted: { en: '🗑️ Contract lane removed', el: '🗑️ Δρομολόγιο αφαιρέθηκε' },
  bankSaved: { en: '✅ Bank details saved', el: '✅ Τραπεζικά αποθηκεύτηκαν' },
  partnerNoteSaved: { en: '✅ Note saved', el: '✅ Σημείωση αποθηκεύτηκε' },
  partnerExported: { en: '✅ CSV exported', el: '✅ Εξαγωγή CSV' },
  inviteSent: { en: '✅ Invitation sent', el: '✅ Πρόσκληση εστάλη' },
  noPartners: { en: 'No partners found', el: 'Δεν βρέθηκαν συνεργάτες' },
  noPartnersSub: { en: 'Try adjusting filters or invite new partners.', el: 'Δοκιμάστε διαφορετικά φίλτρα ή προσκαλέστε νέους.' },
  recentTrips: { en: 'Recent Trips', el: 'Πρόσφατες Μεταφορές' },
  viewProfile: { en: 'View Profile', el: 'Προφίλ' },
  carrierShort: { en: 'Carrier', el: 'Μεταφορέας' },
  freelancerShort: { en: 'Freelancer', el: 'Ελεύθερος' },
  customerShort: { en: 'Customer', el: 'Πελάτης' },
  expLabel: { en: 'Exp', el: 'Λήξη' },
  fillRequired: { en: '⚠ Fill required fields', el: '⚠ Συμπληρώστε τα υποχρεωτικά πεδία' },
  partnerFiltersCleared: { en: 'Filters cleared', el: 'Φίλτρα καθαρίστηκαν' },
  partnerProfileLabel: { en: 'Profile', el: 'Προφίλ' },
  showingLabel: { en: 'Showing', el: 'Εμφάνιση' },
  ofLabel: { en: 'of', el: 'από' },
  partnersLabel: { en: 'partners', el: 'συνεργάτες' },
  lanePriceCol: { en: 'Price', el: 'Τιμή' },
  laneUnitCol: { en: 'Unit', el: 'Μονάδα' },
  laneCol: { en: 'Lane', el: 'Δρομολόγιο' },
  tripDateCol: { en: 'Date', el: 'Ημερομηνία' },
  tripIdCol: { en: 'ID', el: 'ID' },
  attica: { en: 'Attica', el: 'Αττική' },
  thessaloniki: { en: 'Thessaloniki', el: 'Θεσσαλονίκη' },
  cMacedonia: { en: 'C. Macedonia', el: 'Κ. Μακεδονία' },
  peloponnese: { en: 'Peloponnese', el: 'Πελοπόννησος' },
  crete: { en: 'Crete', el: 'Κρήτη' },
  wGreece: { en: 'W. Greece', el: 'Δ. Ελλάδα' },
  thessaly: { en: 'Thessaly', el: 'Θεσσαλία' },
  epirus: { en: 'Epirus', el: 'Ήπειρος' }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Locale State
  const [lang, setLangState] = useState<'en' | 'el'>(
    (localStorage.getItem('shipment-lang') as 'en' | 'el') || 'en'
  );

  const setLang = (l: 'en' | 'el') => {
    setLangState(l);
    localStorage.setItem('shipment-lang', l);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.en || key;
  };

  // Toast State
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    show: false,
  });

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message: msg, type, show: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Locations State
  const [locations, setLocations] = useState<LocationItem[]>([
    { id:'LOC-001', name:'ΒΙΚΟΣ Κεντρική Αποθήκη', company:'ΒΙΚΟΣ Α.Ε.', group:'my', city:'Ιωάννινα', region:'Ήπειρος',
      address:'7ο χλμ Α.Ε. Ιωαννίνων-Αθηνών, 45500', lat:39.643, lng:20.878, geoVerified:true,
      role:'both', type:'Warehouse', appt:true, hours:'Mon-Fri 06:00–22:00 · Sat 07:00–14:00',
      dock:'Dock-level', equipment:['Forklift','Pallet jack'], maxTruck:'18.75m', maxWeight:'40T',
      adr:true, palletExchange:true, loadTime:45,
      contacts:[{ name:'Γεώργιος Μπακόλας', role:'Receiving', phone:'+30 26510 42100', email:'g.bakolas@vikos.gr' },
                { name:'Νίκος Δήμος', role:'Gate/Security', phone:'+30 26510 42111', email:'' }],
      tags:['HQ','Primary'], code:'WH-IOA-01', custCode:'', lastUsed:'2h ago',
      shipments30:24, shipments90:68, otd:96,
      noteInternal:'Main loading point. 3 docks available. Gate PIN: 4821#',
      noteCarrier:'Report to Gate B. Driver must wear PPE.', status:'active', created:'15/03/2024' },
  
    { id:'LOC-002', name:'Εργοστάσιο Αμπελιώτης', company:'ΒΙΚΟΣ Α.Ε.', group:'my', city:'Ιωάννινα', region:'Ήπειρος',
      address:'Θέση Αμπέλια, Βίτσα, 45332', lat:39.710, lng:20.785, geoVerified:true,
      role:'pickup', type:'Plant', appt:true, hours:'Mon-Fri 05:00–21:00',
      dock:'Dock-level', equipment:['Forklift','Crane'], maxTruck:'16.5m', maxWeight:'40T',
      adr:false, palletExchange:true, loadTime:60,
      contacts:[{ name:'Δημήτρης Τσίπρας', role:'Receiving', phone:'+30 26510 31200', email:'d.tsipras@vikos.gr' }],
      tags:['Production'], code:'PL-ZIT-01', custCode:'', lastUsed:'5h ago',
      shipments30:18, shipments90:52, otd:94,
      noteInternal:'High volume site.', noteCarrier:'Follow signs to loading bay.', status:'active', created:'15/03/2024' },
  
    { id:'LOC-003', name:'Σκλαβενίτης Ν. Ηράκλειο', company:'Σκλαβενίτης', group:'customer', city:'Ηράκλειο', region:'Αττική',
      address:'Λεωφ. Ηρακλείου 340, 14122', lat:38.044, lng:23.752, geoVerified:true,
      role:'delivery', type:'Store', appt:true, hours:'Mon-Sat 06:00–14:00',
      dock:'Ramp', equipment:['Pallet jack'], maxTruck:'12m', maxWeight:'19T',
      adr:false, palletExchange:false, loadTime:30,
      contacts:[{ name:'Μαρία Αντωνοπούλου', role:'Receiving', phone:'+30 210 2841500', email:'' }],
      tags:['Retail','Priority'], code:'', custCode:'SKL-HRK-01', lastUsed:'1d ago',
      shipments30:8, shipments90:22, otd:91,
      noteInternal:'Strict time windows.', noteCarrier:'Use rear entrance.', status:'active', created:'20/05/2024' },
  
    { id:'LOC-004', name:'THE MART Μάνδρα', company:'THE MART (Makro)', group:'customer', city:'Μάνδρα', region:'Αττική',
      address:'Θέση Λιθαρί, Μάνδρα, 19600', lat:38.091, lng:23.502, geoVerified:true,
      role:'delivery', type:'Warehouse', appt:true, hours:'Mon-Fri 06:00–16:00',
      dock:'Dock-level', equipment:['Forklift','Pallet jack'], maxTruck:'18.75m', maxWeight:'40T',
      adr:true, palletExchange:true, loadTime:40,
      contacts:[{ name:'Αλέξανδρος Νίκου', role:'Receiving', phone:'+30 210 5551234', email:'a.nikou@themart.gr' },
                { name:'Γεωργία Παπ.', role:'Gate/Security', phone:'+30 210 5551200', email:'' }],
      tags:['DC','Key Account'], code:'', custCode:'MART-MDR-01', lastUsed:'3d ago',
      shipments30:6, shipments90:19, otd:89,
      noteInternal:'Pallet exchange mandatory.', noteCarrier:'Appointment slot mandatory.', status:'active', created:'01/06/2024' },
  
    { id:'LOC-005', name:'AB Βασιλόπουλος DC', company:'AB Βασιλόπουλος', group:'customer', city:'Θήβα', region:'Βοιωτία',
      address:'Εθν. Οδ. Θηβών, 32200', lat:38.310, lng:23.310, geoVerified:true,
      role:'delivery', type:'Cross-dock', appt:true, hours:'Mon-Sun 00:00–23:59 (24h)',
      dock:'Dock-level', equipment:['Forklift'], maxTruck:'18.75m', maxWeight:'40T',
      adr:false, palletExchange:true, loadTime:35,
      contacts:[{ name:'Κώστας Αναγνώστου', role:'Receiving', phone:'+30 22620 89100', email:'k.anagnostou@ab.gr' }],
      tags:['24h','Cross-dock'], code:'', custCode:'AB-THV-DC', lastUsed:'12h ago',
      shipments30:10, shipments90:31, otd:93,
      noteInternal:'Best slots 02:00–06:00.', noteCarrier:'Check in at security.', status:'active', created:'10/04/2024' },
  
    { id:'LOC-006', name:'Αποθήκη Τρικάλων', company:'ΒΙΚΟΣ Α.Ε.', group:'my', city:'Τρίκαλα', region:'Θεσσαλία',
      address:'4ο χλμ Τρικάλων-Καρδίτσας, 42100', lat:39.545, lng:21.780, geoVerified:false,
      role:'both', type:'Warehouse', appt:false, hours:'Mon-Fri 07:00–15:00',
      dock:'Ground', equipment:['Pallet jack'], maxTruck:'12m', maxWeight:'19T',
      adr:false, palletExchange:false, loadTime:25, contacts:[],
      tags:['Secondary'], code:'WH-TRK-01', custCode:'', lastUsed:'14d ago',
      shipments30:2, shipments90:8, otd:100,
      noteInternal:'Small facility. Call ahead.', noteCarrier:'', status:'active', created:'22/07/2024' },
  
    { id:'LOC-007', name:'Μασούτης DC', company:'Μασούτης', group:'customer', city:'Ωραιόκαστρο', region:'Θεσσαλονίκη',
      address:'Εθν. Οδ. Ωραιοκάστρου, 57013', lat:40.685, lng:22.916, geoVerified:true,
      role:'delivery', type:'Warehouse', appt:true, hours:'Mon-Sat 05:00–18:00',
      dock:'Dock-level', equipment:['Forklift','Pallet jack'], maxTruck:'18.75m', maxWeight:'40T',
      adr:false, palletExchange:true, loadTime:50,
      contacts:[{ name:'Σπύρος Τσικαλάκης', role:'Receiving', phone:'+30 2310 698200', email:'s.tsikalakis@masoutis.gr' }],
      tags:['DC','North Greece'], code:'', custCode:'MAS-ORK-DC', lastUsed:'6d ago',
      shipments30:4, shipments90:14, otd:92,
      noteInternal:'Large queue times Monday.', noteCarrier:'Enter from highway exit.', status:'active', created:'15/08/2024' },
  
    { id:'LOC-008', name:'Metro Αχαρνές', company:'Metro C&C', group:'customer', city:'Αχαρνές', region:'Αττική',
      address:'Λεωφ. Δημοκρατίας 33, 13671', lat:38.085, lng:23.741, geoVerified:true,
      role:'delivery', type:'Store', appt:false, hours:'Mon-Fri 06:00–14:00 · Sat 06:00–12:00',
      dock:'Ramp', equipment:['Pallet jack'], maxTruck:'10m', maxWeight:'12T',
      adr:false, palletExchange:false, loadTime:20,
      contacts:[{ name:'Ελένη Κλάρου', role:'Receiving', phone:'+30 210 2407100', email:'' }],
      tags:['Retail'], code:'', custCode:'MET-ACH-01', lastUsed:'8d ago',
      shipments30:3, shipments90:11, otd:88,
      noteInternal:'Tight loading bay. 10m max.', noteCarrier:'Ring bell at side entrance.', status:'active', created:'20/09/2024' },
  
    { id:'LOC-009', name:'Αποθήκη Καλύβια', company:'ΒΙΚΟΣ Α.Ε.', group:'my', city:'Καλύβια', region:'Αττική',
      address:'Λεωφ. Αθηνών-Σουνίου, Καλύβια 19010', lat:37.828, lng:23.921, geoVerified:true,
      role:'both', type:'Warehouse', appt:true, hours:'Mon-Fri 07:00–19:00',
      dock:'Dock-level', equipment:['Forklift','Pallet jack'], maxTruck:'18.75m', maxWeight:'40T',
      adr:true, palletExchange:true, loadTime:35,
      contacts:[{ name:'Παναγιώτης Ρέππας', role:'Receiving', phone:'+30 22910 48200', email:'p.reppas@vikos.gr' },
                { name:'Ειρήνη Δακτή', role:'After-hours', phone:'+30 6945 123456', email:'' }],
      tags:['Attica Hub'], code:'WH-KAL-3PL', custCode:'', lastUsed:'1d ago',
      shipments30:15, shipments90:42, otd:95,
      noteInternal:'Main Attica hub.', noteCarrier:'Dock assignment at gate.', status:'active', created:'01/02/2024' },
  
    { id:'LOC-010', name:'Lidl DC Θήβα', company:'Lidl Hellas', group:'customer', city:'Θήβα', region:'Βοιωτία',
      address:'Εθν. Οδ. Σχηματαρίου, 32009', lat:38.345, lng:23.405, geoVerified:true,
      role:'delivery', type:'Cross-dock', appt:true, hours:'Mon-Sun 00:00–23:59 (24h)',
      dock:'Dock-level', equipment:['Forklift'], maxTruck:'18.75m', maxWeight:'40T',
      adr:false, palletExchange:true, loadTime:30,
      contacts:[{ name:'Ανδρέας Μητρόπουλος', role:'Receiving', phone:'+30 22620 57000', email:'a.mitropoulos@lidl.gr' }],
      tags:['24h','Cross-dock','Key Account'], code:'', custCode:'LDL-THV-DC', lastUsed:'2d ago',
      shipments30:7, shipments90:20, otd:90,
      noteInternal:'Very strict on time.', noteCarrier:'E-booking required 48h before.', status:'active', created:'11/05/2024' },
  
    { id:'LOC-011', name:'Γραφεία Αθήνα', company:'ΒΙΚΟΣ Α.Ε.', group:'my', city:'Μαρούσι', region:'Αττική',
      address:'Λεωφ. Κηφισίας 120, 15125', lat:38.033, lng:23.804, geoVerified:true,
      role:'pickup', type:'Office', appt:false, hours:'Mon-Fri 09:00–17:00',
      dock:'Ground', equipment:[], maxTruck:'7.5m', maxWeight:'3.5T',
      adr:false, palletExchange:false, loadTime:15,
      contacts:[{ name:'Αθηνά Κεφάλα', role:'Reception', phone:'+30 210 6100200', email:'a.kefala@vikos.gr' }],
      tags:['Office','Docs only'], code:'OF-ATH-01', custCode:'', lastUsed:'30d ago',
      shipments30:1, shipments90:3, otd:100,
      noteInternal:'Documents and samples only.', noteCarrier:'Call reception.', status:'active', created:'01/01/2024' },
  
    { id:'LOC-012', name:'Παλαιά Αποθήκη Πάτρα', company:'ΒΙΚΟΣ Α.Ε.', group:'my', city:'Πάτρα', region:'Δ. Ελλάδα',
      address:'Ακτή Δυμαίων 80, 26333', lat:38.250, lng:21.740, geoVerified:false,
      role:'pickup', type:'Warehouse', appt:false, hours:'', dock:'Ground', equipment:[],
      maxTruck:'', maxWeight:'', adr:false, palletExchange:false, loadTime:0, contacts:[],
      tags:['Archived'], code:'WH-PAT-01', custCode:'', lastUsed:'92d ago',
      shipments30:0, shipments90:0, otd:0,
      noteInternal:'Closed since Oct 2025.', noteCarrier:'', status:'archived', created:'10/01/2023' }
  ]);

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

  // Companies State
  const [companies, setCompanies] = useState<Company[]>([
    { id:'C-001', name:'Σκλαβενίτης', vat:'EL094493827', address:'Λεωφ. Κηφισίας 40, Μαρούσι 15125', country:'Greece', phone:'+30 210 6750800', email:'info@sklavenitis.gr', website:'www.sklavenitis.gr', contactPerson:'Ιωάννης Σκλαβενίτης', industry:'Retail' },
    { id:'C-002', name:'THE MART (Makro)', vat:'EL094002314', address:'Θέση Λιθαρί, Μάνδρα 19600', country:'Greece', phone:'+30 210 5551234', email:'info@themart.gr', website:'www.themart.gr', contactPerson:'', industry:'Wholesale' },
    { id:'C-003', name:'AB Βασιλόπουλος', vat:'EL094059468', address:'Σπάτα Αττικής, 19004', country:'Greece', phone:'+30 210 6608000', email:'info@ab.gr', website:'www.ab.gr', contactPerson:'', industry:'Retail' },
    { id:'C-004', name:'Lidl Hellas', vat:'EL094521379', address:'Εθν. Οδ. Σχηματαρίου, 32009', country:'Greece', phone:'+30 22620 57000', email:'info@lidl.gr', website:'www.lidl.gr', contactPerson:'', industry:'Retail' },
    { id:'C-005', name:'Μασούτης', vat:'EL094073560', address:'Εθν. Οδ. Ωραιοκάστρου, 57013', country:'Greece', phone:'+30 2310 698200', email:'info@masoutis.gr', website:'www.masoutis.gr', contactPerson:'', industry:'Retail' },
    { id:'C-006', name:'Metro C&C', vat:'EL094328716', address:'Λεωφ. Δημοκρατίας 33, Αχαρνές 13671', country:'Greece', phone:'+30 210 2407100', email:'info@metro.com.gr', website:'www.metro.com.gr', contactPerson:'', industry:'Retail' }
  ]);

  const addCompany = (comp: Omit<Company, 'id'>) => {
    const nextId = `C-${String(companies.length + 1).padStart(3, '0')}`;
    const newComp: Company = { ...comp, id: nextId };
    setCompanies((prev) => [...prev, newComp]);
    showToast(`Company "${comp.name}" added successfully.`, 'success');
  };

  // Categories State
  const [categories, setCategories] = useState<Category[]>([
    { id:'CAT-01', name:{ en:'Food & Beverages', el:'Τρόφιμα & Ποτά' }, icon:'🍷🥨' },
    { id:'CAT-02', name:{ en:'Building Materials', el:'Οικοδομικά Υλικά' }, icon:'🧱' },
    { id:'CAT-03', name:{ en:'Chemicals & Hazardous', el:'Χημικά & Επικίνδυνα' }, icon:'⚗️' },
    { id:'CAT-04', name:{ en:'Consumer Goods', el:'Καταναλωτικά Αγαθά' }, icon:'🛒' },
    { id:'CAT-05', name:{ en:'Electronics & Tech', el:'Ηλεκτρονικά & Τεχνολογία' }, icon:'💻' },
    { id:'CAT-06', name:{ en:'Pharmaceuticals', el:'Φαρμακευτικά' }, icon:'💊' },
    { id:'CAT-07', name:{ en:'Textiles & Apparel', el:'Υφάσματα & Ένδυση' }, icon:'👕' },
    { id:'CAT-08', name:{ en:'Automotive Parts', el:'Ανταλλακτικά Αυτοκινήτων' }, icon:'🔧' },
  ]);

  const addCategory = (nameEn: string, nameEl: string, icon: string) => {
    const nextId = `CAT-${String(categories.length + 1).padStart(2, '0')}`;
    const newCat: Category = { id: nextId, name: { en: nameEn, el: nameEl }, icon };
    setCategories((prev) => [...prev, newCat]);
    showToast(`Category "${nameEn}" added.`, 'success');
  };

  // Product Types State
  const [productTypes, setProductTypes] = useState<ProductType[]>([
    { id:'PT-01', catId:'CAT-01', name:'Bottled Water',          active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:true,  palletType:'EUR' },      s30:42, s90:118 },
    { id:'PT-02', catId:'CAT-01', name:'Carbonated Drinks',      active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:true,  palletType:'EUR' },      s30:28, s90:85 },
    { id:'PT-03', catId:'CAT-01', name:'Dairy Products',         active:true, defaults:{ temp:'2–8°C',    hazard:false, stackable:false, palletType:'EUR' },      s30:15, s90:44 },
    { id:'PT-04', catId:'CAT-01', name:'Frozen Foods',           active:true, defaults:{ temp:'-18°C',    hazard:false, stackable:true,  palletType:'EUR' },      s30:10, s90:31 },
    { id:'PT-05', catId:'CAT-01', name:'Snacks & Confectionery', active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:true,  palletType:'EUR' },      s30:8,  s90:22 },
    { id:'PT-06', catId:'CAT-02', name:'Cement & Aggregates',    active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:false, palletType:'Industrial' }, s30:6, s90:20 },
    { id:'PT-07', catId:'CAT-02', name:'Steel & Metal',          active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:false, palletType:'Industrial' }, s30:4, s90:14 },
    { id:'PT-08', catId:'CAT-03', name:'Industrial Solvents',    active:true, defaults:{ temp:'Ambient',  hazard:true,  stackable:false, palletType:'Chemical' }, s30:3, s90:9 },
    { id:'PT-09', catId:'CAT-03', name:'Cleaning Agents',        active:true, defaults:{ temp:'Ambient',  hazard:true,  stackable:true,  palletType:'EUR' },      s30:5, s90:16 },
    { id:'PT-10', catId:'CAT-04', name:'Personal Care',          active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:true,  palletType:'EUR' },      s30:7, s90:21 },
    { id:'PT-11', catId:'CAT-04', name:'Household Appliances',   active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:false, palletType:'EUR' },      s30:3, s90:10 },
    { id:'PT-12', catId:'CAT-01', name:'Olive Oil & Condiments', active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:true,  palletType:'EUR' },      s30:6, s90:19 },
    { id:'PT-13', catId:'CAT-06', name:'OTC Medications',        active:true, defaults:{ temp:'15–25°C',  hazard:false, stackable:true,  palletType:'Pharma' },   s30:2, s90:8 },
    { id:'PT-14', catId:'CAT-05', name:'Consumer Electronics',   active:true, defaults:{ temp:'Ambient',  hazard:false, stackable:false, palletType:'EUR' },      s30:4, s90:12 },
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
    { id:'SKU-001', name:'ΒΙΚΟΣ Φυσικό Νερό 500ml (x24)',   number:'5201054001011', barcode:'5201054001011', catId:'CAT-01', typeId:'PT-01', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-001011', lastSync:'2h ago',  status:'ok',       error:'' }, weight:'12.5 kg', uom:'Case',  tags:['Fast-mover'] },
    { id:'SKU-002', name:'ΒΙΚΟΣ Φυσικό Νερό 1.5L (x6)',    number:'5201054001028', barcode:'5201054001028', catId:'CAT-01', typeId:'PT-01', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-001028', lastSync:'2h ago',  status:'ok',       error:'' }, weight:'9.2 kg',  uom:'Case',  tags:['Fast-mover'] },
    { id:'SKU-003', name:'ΒΙΚΟΣ Σόδα Lemon 330ml (x24)',    number:'5201054002018', barcode:'5201054002018', catId:'CAT-01', typeId:'PT-02', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-002018', lastSync:'2h ago',  status:'ok',       error:'' }, weight:'8.4 kg',  uom:'Case',  tags:[] },
    { id:'SKU-004', name:'ΒΙΚΟΣ Σόδα Classic 330ml (x24)', number:'5201054002025', barcode:'5201054002025', catId:'CAT-01', typeId:'PT-02', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-002025', lastSync:'2h ago',  status:'ok',       error:'' }, weight:'8.4 kg',  uom:'Case',  tags:[] },
    { id:'SKU-005', name:'ΒΙΚΟΣ Φυσ. Νεραλ. Νερό 750ml (x12)', number:'5201054001035', barcode:'5201054001035', catId:'CAT-01', typeId:'PT-01', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-001035', lastSync:'5h ago',  status:'ok',       error:'' }, weight:'9.8 kg',  uom:'Case',  tags:['Premium'] },
    { id:'SKU-006', name:'ΔΕΛΤΑ Γάλα Πλήρες 1L (x12)',     number:'5201054060012', barcode:'5201054060012', catId:'CAT-01', typeId:'PT-03', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-060012', lastSync:'1d ago',  status:'ok',       error:'' }, weight:'12.8 kg', uom:'Case',  tags:['Chilled'] },
    { id:'SKU-007', name:'ΦΑΓΕ Διαιτητικό Total 1kg (x6)', number:'5201054060029', barcode:'5201054060029', catId:'CAT-01', typeId:'PT-03', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-060029', lastSync:'1d ago',  status:'ok',       error:'' }, weight:'6.5 kg',  uom:'Case',  tags:['Chilled'] },
    { id:'SKU-008', name:'Cris Cris Frozen Pizza (x8)',     number:'5201054070011', barcode:'5201054070011', catId:'CAT-01', typeId:'PT-04', source:'erp',  active:true, erp:{ system:'SAP',    extId:'MAT-070011', lastSync:'3d ago',  status:'pending',  error:'' }, weight:'4.2 kg',  uom:'Case',  tags:['Frozen'] },
    { id:'SKU-009', name:'Παπαδοπούλου Μπισκότα Διάνα (x16)', number:'5201054080018', barcode:'5201054080018', catId:'CAT-01', typeId:'PT-05', source:'manual', active:true, erp:{ system:'',      extId:'',          lastSync:'—',       status:'',         error:'' }, weight:'3.8 kg',  uom:'Case',  tags:[] },
    { id:'SKU-010', name:'ΚΡΕΜ Ελαιόλαδο Extra Virgin 1L (x12)', number:'5201054090014', barcode:'5201054090014', catId:'CAT-01', typeId:'PT-12', source:'manual', active:true, erp:{ system:'',      extId:'',          lastSync:'—',       status:'',         error:'' }, weight:'11.5 kg', uom:'Case',  tags:['Premium'] },
    { id:'SKU-011', name:'ΤΙΤΑΝ Τριμένο Σκυρί 25kg',        number:'5201999010011', barcode:'5201999010011', catId:'CAT-02', typeId:'PT-06', source:'erp',  active:true, erp:{ system:'Soft1',  extId:'CEM-010011', lastSync:'6h ago',  status:'ok',       error:'' }, weight:'25 kg',   uom:'Bag',   tags:['Heavy'] },
    { id:'SKU-012', name:'Χαλυβδίνη Ράβδος Φ12 (6m)',       number:'5201999020018', barcode:'',             catId:'CAT-02', typeId:'PT-07', source:'erp',  active:true, erp:{ system:'Soft1',  extId:'STL-020018', lastSync:'1d ago',  status:'error',    error:'Missing weight field in ERP' }, weight:'', uom:'Piece', tags:['Long-load'] },
    { id:'SKU-013', name:'Αρεστή Βιομηχανικό 5L',           number:'5201999030015', barcode:'5201999030015', catId:'CAT-03', typeId:'PT-08', source:'manual', active:true, erp:{ system:'',      extId:'',          lastSync:'—',       status:'',         error:'' }, weight:'4.8 kg',  uom:'Can',   tags:['ADR'] },
    { id:'SKU-014', name:'Ajax Καθ. Γενικής Χρήσης 4L (x4)', number:'5201999040012', barcode:'5201999040012', catId:'CAT-03', typeId:'PT-09', source:'erp',  active:true, erp:{ system:'SAP',    extId:'CLN-040012', lastSync:'12h ago', status:'ok',       error:'' }, weight:'16.5 kg', uom:'Case',  tags:[] },
    { id:'SKU-015', name:'Nivea Body Lotion 400ml (x12)',    number:'5201999050019', barcode:'5201999050019', catId:'CAT-04', typeId:'PT-10', source:'erp',  active:true, erp:{ system:'SAP',    extId:'PC-050019',  lastSync:'2d ago',  status:'conflict', error:'Name mismatch: ERP="NIVEA Body Milk 400ml"' }, weight:'5.2 kg', uom:'Case',  tags:[] },
    { id:'SKU-016', name:'Samsung Galaxy Tab A9 (Box)',      number:'8806095360911', barcode:'8806095360911', catId:'CAT-05', typeId:'PT-14', source:'erp',  active:true, erp:{ system:'BC',     extId:'ELEC-360911', lastSync:'4d ago', status:'ok',       error:'' }, weight:'0.48 kg', uom:'Piece', tags:['Fragile'] },
    { id:'SKU-017', name:'Depon Maximum 1000mg (x30)',       number:'5201054130014', barcode:'5201054130014', catId:'CAT-06', typeId:'PT-13', source:'erp',  active:true, erp:{ system:'Epsilon', extId:'PH-130014', lastSync:'7d ago',  status:'ok',       error:'' }, weight:'0.15 kg', uom:'Box',   tags:['Pharma'] },
    { id:'SKU-018', name:'ERP New Item – Unmapped #1',       number:'5209999990011', barcode:'',             catId:'CAT-01', typeId:'',      source:'erp',  active:true, erp:{ system:'SAP',    extId:'NEW-990011', lastSync:'30m ago', status:'ok',       error:'' }, weight:'',        uom:'',      tags:['Unmapped'] },
    { id:'SKU-019', name:'ERP New Item – Unmapped #2',       number:'5209999990028', barcode:'',             catId:'CAT-04', typeId:'',      source:'erp',  active:true, erp:{ system:'SAP',    extId:'NEW-990028', lastSync:'30m ago', status:'ok',       error:'' }, weight:'',        uom:'',      tags:['Unmapped'] },
    { id:'SKU-020', name:'Παλιό Προϊόν – Inactive',          number:'5201054099099', barcode:'5201054099099', catId:'CAT-01', typeId:'PT-05', source:'manual', active:false, erp:{ system:'',      extId:'',          lastSync:'—',       status:'',         error:'' }, weight:'2.1 kg',  uom:'Case',  tags:['Discontinued'] },
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
    const carrierNames = ['TransMed Logistics','Aegean Freight','Hellas Cargo','Olympic Transport','Balkan Express','Euro Haul GmbH','Adriatic Lines','Continental Carriers','NorthStar Haulage','Danube Logistics','Atlas Freight','PanEuropean Transport','Ionian Carriers','Rhodope Logistics','Thessaly Express','Maritsa Transport'];
    const freelancerNames = ['Nikos Papadopoulos','Giorgos Konstantinou','Dimitris Alexandrou','Maria Ioannidou','Kostas Nikolaou','Yannis Stavrou','Elena Dimitriou','Petros Georgiou','Sofia Andreou','Thanasis Vasileiou','Antonis Karagiannis','Vassilis Papas'];
    const customerNames = ['FreshCo Foods','BuildRight Materials','PharmaPlus GR','AutoParts Hellas','TechDist Europe','AgroExport SA','ChemStar Industries','RetailBox Athens'];
    const truckTypes = ['Curtainsider','Box Truck','Flatbed','Refrigerated','Tanker','Lowbed','Mega Trailer','Container Chassis'];
    const lanes = ['Athens → Thessaloniki','Thessaloniki → Sofia','Athens → Patras','Patras → Igoumenitsa','Athens → Heraklion','Volos → Larissa'];
    const statuses: Array<'active'|'invited'|'pending'|'suspended'> = ['active','invited','pending','suspended'];
    const types: Array<'carrier_company'|'freelancer_driver'|'customer'> = ['carrier_company','carrier_company','carrier_company','freelancer_driver','freelancer_driver','customer'];
    const payTerms = ['Net 15','Net 30','Net 45','Net 60'];

    const seed: Partner[] = [];
    for (let i = 0; i < 42; i++) {
      const type = types[i % types.length];
      const status: 'active'|'invited'|'pending'|'suspended' = i < 6 ? 'active' : statuses[i % statuses.length];
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
        const tripStatuses: Array<'Delivered'|'In Transit'|'Cancelled'> = ['Delivered','Delivered','Delivered','In Transit','Cancelled'];
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
        t,
        locations,
        addLocation,
        updateLocation,
        archiveLocation,
        restoreLocation,
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
