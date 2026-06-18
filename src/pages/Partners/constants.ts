// ── Truck / vehicle types available on the platform ──
export const TRUCK_TYPES = [
  'Curtainsider',
  'Box Truck',
  'Flatbed',
  'Refrigerated',
  'Tanker',
  'Lowbed',
  'Mega Trailer',
  'Container Chassis',
] as const;

// ── Pre-defined contract lanes ──
export const CONTRACT_LANES = [
  'Athens → Thessaloniki',
  'Thessaloniki → Sofia',
  'Athens → Patras',
  'Patras → Igoumenitsa',
  'Thessaloniki → Istanbul',
  'Athens → Heraklion',
  'Volos → Larissa',
  'Kavala → Alexandroupoli',
] as const;

// ── Region keys (aligned with reference HTML regionKeys array) ──
export const REGION_KEYS = [
  'attica',
  'thessaloniki',
  'cMacedonia',
  'peloponnese',
  'crete',
  'wGreece',
  'thessaly',
  'epirus',
] as const;

export type RegionKey = (typeof REGION_KEYS)[number];

// ── Region labels (English) ──
export const REGION_LABELS: Record<RegionKey, string> = {
  attica: 'Attica',
  thessaloniki: 'Thessaloniki',
  cMacedonia: 'C. Macedonia',
  peloponnese: 'Peloponnese',
  crete: 'Crete',
  wGreece: 'W. Greece',
  thessaly: 'Thessaly',
  epirus: 'Epirus',
};

// ── Sort options ──
export const SORT_OPTIONS: { value: 'name' | 'act' | 'ot' | 'ld'; label: string }[] = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'act', label: 'Last Activity' },
  { value: 'ot', label: 'On-time %' },
  { value: 'ld', label: 'Loads 30d' },
];

// ── Carrier company seed names ──
export const CARRIER_NAMES = [
  'TransMed Logistics',
  'Aegean Freight',
  'Hellas Cargo',
  'Olympic Transport',
  'Balkan Express',
  'Euro Haul GmbH',
  'Adriatic Lines',
  'Continental Carriers',
  'NorthStar Haulage',
  'Danube Logistics',
  'Atlas Freight',
  'PanEuropean Transport',
  'Ionian Carriers',
  'Rhodope Logistics',
  'Thessaly Express',
  'Maritsa Transport',
] as const;

// ── Freelancer driver names ──
export const FREELANCER_NAMES = [
  'Nikos Papadopoulos',
  'Giorgos Konstantinou',
  'Dimitris Alexandrou',
  'Maria Ioannidou',
  'Kostas Nikolaou',
  'Yannis Stavrou',
  'Elena Dimitriou',
  'Petros Georgiou',
  'Sofia Andreou',
  'Thanasis Vasileiou',
  'Antonis Karagiannis',
  'Vassilis Papas',
] as const;

// ── Customer company names ──
export const CUSTOMER_NAMES = [
  'FreshCo Foods',
  'BuildRight Materials',
  'PharmaPlus GR',
  'AutoParts Hellas',
  'TechDist Europe',
  'AgroExport SA',
  'ChemStar Industries',
  'RetailBox Athens',
] as const;

// ── Status badge CSS classes ──
export const STATUS_CLASSES: Record<string, string> = {
  active: 's-ac',
  invited: 's-in',
  pending: 's-pe',
  suspended: 's-su',
};

// ── Partner type badge CSS classes ──
export const TYPE_CLASSES: Record<string, string> = {
  carrier_company: 'tp-c',
  freelancer_driver: 'tp-f',
  customer: 'tp-s',
};
