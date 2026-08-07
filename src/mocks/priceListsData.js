/**
 * priceListsData.js — Mock data for Price Lists module.
 *
 * Exports:
 *  - CITIES (25 Greek cities, bilingual EN/EL)
 *  - DISTANCE_PAIRS, TOLL_ESTIMATES (static lookup tables)
 *  - getDistance, getTollEstimate, calculateRouteTotals (helpers)
 *  - resolveCity (accepts EN or EL name → English key)
 *  - MOCK_LANES (28 lane price entries)
 *  - COMPANY_DEFAULTS (default rates, fuel surcharge, operating costs, quote settings)
 *  - getPartnersForScope(role) — partners filtered by role from Partners module
 *  - getScopeLabels(ids), formatScopeDisplay(lane, t)
 *  - AUDIT_LOG (seeded from lane data)
 *  - CURRENCIES
 */

// ─── Cities (bilingual) ───
export const CITIES = [
  { id: 'athens', en: 'Athens', el: 'Αθήνα' },
  { id: 'thessaloniki', en: 'Thessaloniki', el: 'Θεσσαλονίκη' },
  { id: 'patras', en: 'Patras', el: 'Πάτρα' },
  { id: 'ioannina', en: 'Ioannina', el: 'Ιωάννινα' },
  { id: 'larissa', en: 'Larissa', el: 'Λάρισα' },
  { id: 'volos', en: 'Volos', el: 'Βόλος' },
  { id: 'heraklion', en: 'Heraklion', el: 'Ηράκλειο' },
  { id: 'chania', en: 'Chania', el: 'Χανιά' },
  { id: 'corinth', en: 'Corinth', el: 'Κόρινθος' },
  { id: 'kavala', en: 'Kavala', el: 'Καβάλα' },
  { id: 'kalamata', en: 'Kalamata', el: 'Καλαμάτα' },
  { id: 'tripoli', en: 'Tripoli', el: 'Τρίπολη' },
  { id: 'kozani', en: 'Kozani', el: 'Κοζάνη' },
  { id: 'serres', en: 'Serres', el: 'Σέρρες' },
  { id: 'lamia', en: 'Lamia', el: 'Λαμία' },
  { id: 'alexandroupoli', en: 'Alexandroupoli', el: 'Αλεξανδρούπολη' },
  { id: 'rethymno', en: 'Rethymno', el: 'Ρέθυμνο' },
  { id: 'chalkida', en: 'Chalkida', el: 'Χαλκίδα' },
  { id: 'komotini', en: 'Komotini', el: 'Κομοτηνή' },
  { id: 'xanthi', en: 'Xanthi', el: 'Ξάνθη' },
  { id: 'drama', en: 'Drama', el: 'Δράμα' },
  { id: 'trikala', en: 'Trikala', el: 'Τρίκαλα' },
  { id: 'agrinio', en: 'Agrinio', el: 'Αγρίνιο' },
  { id: 'preveza', en: 'Preveza', el: 'Πρέβεζα' },
  { id: 'igoumenitsa', en: 'Igoumenitsa', el: 'Ηγουμενίτσα' },
];

/** Resolve a city name (EN or EL or datalist format 'EL (EN)') → English name. Returns null if not found. */
export function resolveCity(input) {
  if (!input) return null;
  let cleaned = input.trim();
  // Handle datalist format: "Αθήνα (Athens)" or "Athens (Αθήνα)"
  const parenMatch = cleaned.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    // Try both parts
    const part1 = parenMatch[1].trim().toLowerCase();
    const part2 = parenMatch[2].trim().toLowerCase();
    const m = CITIES.find(
      (c) => c.en.toLowerCase() === part1 || c.el.toLowerCase() === part1 ||
             c.en.toLowerCase() === part2 || c.el.toLowerCase() === part2
    );
    if (m) return m.en;
  }
  const lower = cleaned.toLowerCase();
  const match = CITIES.find(
    (c) => c.en.toLowerCase() === lower || c.el.toLowerCase() === lower
  );
  return match ? match.en : null;
}

import { COUNTRY_NAMES, getCountryName, resolveCountryIsoCode } from './partnersMasterData';

/** Get city or country label in given language */
export function cityLabel(input, lang = 'en') {
  if (!input) return '';
  const cleaned = String(input).trim();
  if (!cleaned) return '';

  // 1. Check if input is a known city in CITIES
  const c = CITIES.find(
    (x) => x.en.toLowerCase() === cleaned.toLowerCase() || x.el.toLowerCase() === cleaned.toLowerCase()
  );
  if (c) return lang?.startsWith('el') ? c.el : c.en;

  // 2. Check if input is an ISO country code (e.g. GR, BG, RO, DE, IT, CZ, AT...)
  const countryName = getCountryName(cleaned, lang);
  if (countryName && countryName !== cleaned) {
    return countryName;
  }

  // 3. Check if input is formatted like "Patras, GR" -> "Patras, Greece"
  const commaMatch = cleaned.match(/^(.+?),\s*([A-Z]{2})$/i);
  if (commaMatch) {
    const cityName = cityLabel(commaMatch[1], lang);
    const cName = getCountryName(commaMatch[2], lang);
    if (cName && cName !== commaMatch[2]) {
      return `${cityName}, ${cName}`;
    }
  }

  return cleaned;
}

/** Formats a full route string with country codes converted to full names */
export function formatRouteLabel(lane, lang = 'en') {
  if (!lane) return '';
  const arrow = lane.isRoundTrip || lane.tripType === 'roundtrip' ? ' ↔ ' : ' → ';

  if (Array.isArray(lane.stops) && lane.stops.length >= 2) {
    return lane.stops.map((s) => {
      const val = typeof s === 'string' ? s : (s.label || s.city || s.value || '');
      return cityLabel(val, lang);
    }).join(arrow);
  }

  if (lane.routeLabel) {
    const parts = lane.routeLabel.split(/\s*(?:→|↔)\s*/);
    if (parts.length >= 2) {
      return parts.map((p) => cityLabel(p, lang)).join(arrow);
    }
    return cityLabel(lane.routeLabel, lang);
  }

  return '';
}

// ─── Distance Matrix (bidirectional) ───
const DISTANCE_PAIRS = {
  'Athens-Thessaloniki': 502, 'Athens-Patras': 215, 'Athens-Ioannina': 388,
  'Athens-Larissa': 356, 'Athens-Volos': 326, 'Athens-Heraklion': 340,
  'Athens-Corinth': 83, 'Athens-Kavala': 670, 'Athens-Chania': 350,
  'Athens-Alexandroupoli': 765, 'Athens-Kalamata': 235, 'Athens-Tripoli': 165,
  'Athens-Lamia': 214, 'Athens-Chalkida': 80, 'Thessaloniki-Kavala': 168,
  'Thessaloniki-Larissa': 153, 'Thessaloniki-Ioannina': 260, 'Thessaloniki-Volos': 215,
  'Thessaloniki-Alexandroupoli': 310, 'Thessaloniki-Kozani': 135, 'Thessaloniki-Serres': 100,
  'Ioannina-Patras': 213, 'Ioannina-Kozani': 165, 'Patras-Corinth': 133,
  'Patras-Kalamata': 195, 'Patras-Tripoli': 160, 'Corinth-Tripoli': 95,
  'Corinth-Larissa': 275, 'Larissa-Volos': 60, 'Larissa-Kozani': 140,
  'Lamia-Larissa': 142, 'Lamia-Volos': 110, 'Heraklion-Chania': 140,
  'Heraklion-Rethymno': 80,
};

const COUNTRY_DISTANCES = {
  'GR-BG': 520, 'GR-RO': 890, 'GR-DE': 1850, 'GR-IT': 1200, 'GR-CZ': 1450,
  'GR-BE': 1920, 'GR-AT': 1350, 'GR-FR': 2100, 'GR-NL': 2050, 'GR-PL': 1650,
  'IT-NL': 1050, 'IT-DE': 820, 'IT-BE': 950, 'IT-FR': 780, 'BE-DE': 580,
  'BE-FR': 310, 'DE-NL': 420, 'DE-FR': 650, 'DE-PL': 580, 'BG-RO': 380,
  'BG-TR': 550, 'BG-DE': 1450, 'RO-DE': 1250, 'RO-PL': 850, 'AT-DE': 550,
};

const DOMESTIC_COUNTRY_DISTANCES = {
  GR: 350, DE: 450, IT: 500, BG: 300, RO: 400, FR: 550, ES: 600,
  NL: 220, BE: 180, PL: 480, AT: 320, CZ: 300, TR: 750, CY: 120,
};

const REGION_DISTANCES = {
  'thessaloniki-peloponnese': 480, 'attica-thessaloniki': 502, 'attica-peloponnese': 210,
  'attica-epirus': 388, 'attica-thessaly': 340, 'macedonia-attica': 502,
  'macedonia-peloponnese': 480, 'central_greece-peloponnese': 260, 'epirus-peloponnese': 350,
};

const CITY_COORDINATES = {
  // Greek cities & regions
  athens: { lat: 37.9838, lng: 23.7275 },
  thessaloniki: { lat: 40.6401, lng: 22.9444 },
  patras: { lat: 38.2466, lng: 21.7345 },
  ioannina: { lat: 39.6650, lng: 20.8537 },
  larissa: { lat: 39.6390, lng: 22.4191 },
  volos: { lat: 39.3621, lng: 22.9422 },
  heraklion: { lat: 35.3387, lng: 25.1442 },
  chania: { lat: 35.5138, lng: 24.0180 },
  kavala: { lat: 40.9377, lng: 24.4124 },
  alexandroupoli: { lat: 40.8457, lng: 25.8739 },
  kalamata: { lat: 37.0379, lng: 22.1130 },
  tripoli: { lat: 37.5106, lng: 22.3726 },
  lamia: { lat: 38.8986, lng: 22.4350 },
  corinth: { lat: 37.9386, lng: 22.9322 },
  kozani: { lat: 40.3006, lng: 21.7889 },
  serres: { lat: 41.0911, lng: 23.5497 },
  grevena: { lat: 40.0850, lng: 21.4273 },
  peloponnese: { lat: 37.5000, lng: 22.3700 },
  attica: { lat: 37.9800, lng: 23.7200 },
  thessaly: { lat: 39.6000, lng: 22.4000 },
  epirus: { lat: 39.6000, lng: 20.8500 },
  macedonia: { lat: 40.6000, lng: 22.9000 },

  // Indian cities
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  kalupur: { lat: 23.0270, lng: 72.5985 },
  amritsar: { lat: 31.6340, lng: 74.8723 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  surat: { lat: 21.1702, lng: 72.8311 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  ludhiana: { lat: 30.9010, lng: 75.8573 },

  // European cities
  sofia: { lat: 42.6977, lng: 23.3219 },
  bucharest: { lat: 44.4268, lng: 26.1025 },
  berlin: { lat: 52.5200, lng: 13.4050 },
  munich: { lat: 48.1351, lng: 11.5820 },
  frankfurt: { lat: 50.1109, lng: 8.6821 },
  rome: { lat: 41.9028, lng: 12.4964 },
  milan: { lat: 45.4642, lng: 9.1900 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  prague: { lat: 50.0755, lng: 14.4378 },
  warsaw: { lat: 52.2297, lng: 21.0122 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  brussels: { lat: 50.8503, lng: 4.3517 },
  paris: { lat: 48.8566, lng: 2.3522 },
};

function extractCoords(obj) {
  if (!obj) return null;
  if (typeof obj === 'object') {
    const lat = Number(obj.lat ?? obj.latitude);
    const lng = Number(obj.lng ?? obj.longitude);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
  }
  const str = String(typeof obj === 'object' ? (obj.value || obj.city || obj.label || obj.address || '') : obj).toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (str.includes(key)) {
      return coords;
    }
  }
  return null;
}

export function getDistance(a, b) {
  if (!a || !b) return null;

  // 0. Extract exact or dictionary lat/lng coordinates if available (Haversine road distance)
  const coordsA = extractCoords(a);
  const coordsB = extractCoords(b);

  if (coordsA && coordsB) {
    const lat1 = coordsA.lat;
    const lon1 = coordsA.lng;
    const lat2 = coordsB.lat;
    const lon2 = coordsB.lng;

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    if (Math.abs(dLat) < 0.0001 && Math.abs(dLon) < 0.0001) return 0;

    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * sinLon * sinLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    const airKm = 6371 * c;
    const roadKm = Math.round(airKm * 1.25);
    if (roadKm > 0) return roadKm;
  }

  const strA = String(typeof a === 'object' ? (a.value || a.city || a.label || '') : a).trim();
  const strB = String(typeof b === 'object' ? (b.value || b.city || b.label || '') : b).trim();
  if (!strA || !strB) return 0;

  // 1. Direct lookup in DISTANCE_PAIRS
  const direct = DISTANCE_PAIRS[`${strA}-${strB}`] || DISTANCE_PAIRS[`${strB}-${strA}`];
  if (direct) return direct;

  // 2. Resolve country codes or names
  const isoA = resolveCountryIsoCode(strA);
  const isoB = resolveCountryIsoCode(strB);

  if (isoA && isoB) {
    if (isoA === isoB) {
      return DOMESTIC_COUNTRY_DISTANCES[isoA] || 350;
    }
    const cDist = COUNTRY_DISTANCES[`${isoA}-${isoB}`] || COUNTRY_DISTANCES[`${isoB}-${isoA}`];
    if (cDist) return cDist;
    const hash = Math.abs((isoA.charCodeAt(0) * 31 + isoB.charCodeAt(0) * 17) % 800);
    return 800 + hash;
  }

  if (strA.toLowerCase() === strB.toLowerCase()) return 0;

  // 3. Resolve Region / Prefecture / City names
  const lowerA = strA.toLowerCase().replace(/,\s*.+$/, '');
  const lowerB = strB.toLowerCase().replace(/,\s*.+$/, '');

  const regDist = REGION_DISTANCES[`${lowerA}-${lowerB}`] || REGION_DISTANCES[`${lowerB}-${lowerA}`];
  if (regDist) return regDist;

  // 4. Try matching known city pairs
  const cityA = cityLabel(lowerA, 'en');
  const cityB = cityLabel(lowerB, 'en');
  const cityMatch = DISTANCE_PAIRS[`${cityA}-${cityB}`] || DISTANCE_PAIRS[`${cityB}-${cityA}`];
  if (cityMatch) return cityMatch;

  // 5. Hash fallback
  let charSum = 0;
  for (let i = 0; i < lowerA.length; i++) charSum += lowerA.charCodeAt(i);
  for (let i = 0; i < lowerB.length; i++) charSum += lowerB.charCodeAt(i);
  return 150 + (charSum % 350);
}

// ─── Toll Estimates ───
const TOLL_ESTIMATES = {
  'Athens-Thessaloniki': 44.80, 'Athens-Patras': 22.10, 'Athens-Ioannina': 36.50,
  'Athens-Larissa': 33.20, 'Athens-Lamia': 18.60, 'Athens-Corinth': 7.40,
  'Athens-Volos': 28.50, 'Athens-Kavala': 52.30, 'Thessaloniki-Larissa': 12.80,
  'Thessaloniki-Kavala': 14.20, 'Thessaloniki-Ioannina': 24.60, 'Thessaloniki-Volos': 18.90,
  'Ioannina-Patras': 15.90, 'Patras-Corinth': 11.30, 'Corinth-Larissa': 22.40,
  'Lamia-Larissa': 11.50,
};

export function getTollEstimate(a, b) {
  if (!a || !b) return null;
  const strA = typeof a === 'object' ? (a.value || a.city || a.label || '') : String(a);
  const strB = typeof b === 'object' ? (b.value || b.city || b.label || '') : String(b);
  return TOLL_ESTIMATES[`${strA}-${strB}`] || TOLL_ESTIMATES[`${strB}-${strA}`] || null;
}

/** Given an ordered array of stops, compute legs, totalKm, totalTolls, routeLabel. */
export function calculateRouteTotals(stops, isRoundTrip = false) {
  const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const rawFrom = stops[i];
    const rawTo = stops[i + 1];
    const fromStr = typeof rawFrom === 'string' ? rawFrom : (rawFrom?.value || rawFrom?.city || rawFrom?.label || '');
    const toStr = typeof rawTo === 'string' ? rawTo : (rawTo?.value || rawTo?.city || rawTo?.label || '');
    const km = getDistance(rawFrom, rawTo) || 0;
    const toll = getTollEstimate(rawFrom, rawTo) || 0;
    legs.push({ from: fromStr, to: toStr, km, toll });
  }
  if (isRoundTrip && stops.length >= 2) {
    const rawFrom = stops[stops.length - 1];
    const rawTo = stops[0];
    const fromStr = typeof rawFrom === 'string' ? rawFrom : (rawFrom?.value || rawFrom?.city || rawFrom?.label || '');
    const toStr = typeof rawTo === 'string' ? rawTo : (rawTo?.value || rawTo?.city || rawTo?.label || '');
    const km = getDistance(rawFrom, rawTo) || 0;
    const toll = getTollEstimate(rawFrom, rawTo) || 0;
    legs.push({ from: fromStr, to: toStr, km, toll, isReturn: true });
  }
  const totalKm = legs.reduce((s, l) => s + (l.km || 0), 0);
  const totalTolls = legs.reduce((s, l) => s + (l.toll || 0), 0);
  const arrow = isRoundTrip ? ' ↔ ' : ' → ';
  const routeLabel = stops.map((s) => typeof s === 'string' ? s : (s.label || s.city || s.value || '')).join(arrow);
  return { legs, totalKm, totalTolls, routeLabel };
}

// ─── Currencies ───
export const CURRENCIES = ['EUR', 'USD', 'GBP'];

// ─── Scope Partners (drawn from Partners module) ───
import { PARTNERS as MOCK_PARTNERS } from './partnersMasterData';

const _activePartners = (MOCK_PARTNERS || []).filter(p => p.status === 'active');

export function getPartnersForScope(role) {
  if (role === 'shipper') return _activePartners.filter(p => p.type === 'carrier_company' || p.type === 'freelancer_driver');
  if (role === 'carrier') return _activePartners.filter(p => p.type === 'shipper' || p.type === 'forwarder' || p.type === 'customer');
  return _activePartners; // forwarder sees all
}

/** Resolve partner IDs to display names */
export function getScopeLabels(partnerIds) {
  if (!partnerIds || partnerIds.length === 0) return [];
  const partners = getPartnersForScope('forwarder'); // all
  return partnerIds.map(id => {
    const key = String(id);
    const p = partners.find(x => String(x.id) === key);
    return p ? p.name : key;
  });
}

/** Format scope display: 1 name, 2-3 comma-joined, 4+ "N partners" */
export function formatScopeDisplay(lane, t) {
  if (lane.scope === 'default') return t ? t('priceLists.scope.default', 'Default') : 'Default';
  // Prefer stored label from save (real partner names); skip placeholder "Specific"
  if (lane.scopeLabel && lane.scopeLabel !== 'Specific' && lane.scopeLabel !== 'Default') {
    return lane.scopeLabel;
  }
  const ids = lane.scopePartnerIds || [];
  if (ids.length === 0) return lane.scopeLabel || (t ? t('priceLists.scope.default', 'Default') : 'Default');
  const names = getScopeLabels(ids);
  if (names.length <= 3) return names.join(', ');
  return t ? t('priceLists.scope.nPartners', '{{n}} partners').replace('{{n}}', names.length) : `${names.length} partners`;
}

// Legacy compat — keep SCOPE_PARTNERS for any remaining references
export const SCOPE_PARTNERS = [
  { id: 'PR-060', name: 'Βίκος Α.Ε.', type: 'shipper' },
  { id: 'PR-061', name: 'ΔΕΛΤΑ Α.Β.Ε.Ε.', type: 'shipper' },
  { id: 'PR-080', name: 'FreshCo S.A.', type: 'customer' },
  { id: 'PR-081', name: 'Σκλαβενίτης Α.Ε.Ε.', type: 'customer' },
  { id: 'PR-001', name: 'TransMed Logistics A.E.', type: 'carrier' },
  { id: 'PR-005', name: 'Kostas Freight Lines', type: 'carrier' },
];

// ─── Company Defaults ───
export const COMPANY_DEFAULTS = {
  defaultRates: {
    perKm: 1.10,
    perPallet: 40,
    perTonne: 25,
    minimumCharge: 150,
    currency: 'EUR',
  },
  fuelSurcharge: {
    enabled: true,
    baseFuelPricePerLitre: 1.45,
    currentFuelPricePerLitre: 1.72,
    avgConsumptionLPer100Km: 33,
    lastUpdated: '2026-04-01',
  },
  operatingCosts: {
    driverCostPerHour: 14.50,
    avgDrivingHoursPerDay: 9,
    tollCostPerKm: null,
    tollCostPerKmManual: null,
    tollCostSource: 'auto',
    maintenanceCostPerKm: 0.08,
    insuranceCostPerDay: 35,
    depreciationPerKm: 0.05,
    avgConsumptionL100Km: 33,
  },
  quoteSettings: {
    autoApplyFuelSurcharge: true,
    showCostBreakdown: false,
    defaultQuoteValidityDays: 7,
  },
};

/** Calculate fuel surcharge per km from company defaults */
export function calcFuelSurchargePerKm(defaults = COMPANY_DEFAULTS) {
  const fs = defaults.fuelSurcharge;
  if (!fs.enabled) return 0;
  const diff = fs.currentFuelPricePerLitre - fs.baseFuelPricePerLitre;
  return diff * (fs.avgConsumptionLPer100Km / 100);
}

/** Calculate carrier profitability for a lane */
export function calcProfitability(lane, defaults = COMPANY_DEFAULTS, overrides = {}) {
  const op = { ...defaults.operatingCosts, ...overrides };
  const km = lane.totalKm || 0;
  const avgSpeed = 60;

  // Revenue
  const price = lane.pricing?.perLoad || (lane.pricing?.perKm ? lane.pricing.perKm * km : 0);
  const fuelSurcharge = calcFuelSurchargePerKm(defaults) * km;
  const revenue = price + fuelSurcharge;

  // Costs
  const fuel = km * (op.avgConsumptionL100Km / 100) * defaults.fuelSurcharge.currentFuelPricePerLitre;
  const driverHrs = km / avgSpeed;
  const driver = driverHrs * op.driverCostPerHour;
  const maintenance = km * op.maintenanceCostPerKm;
  const depreciation = km * op.depreciationPerKm;
  const days = km / (op.avgDrivingHoursPerDay * avgSpeed);
  const insurance = days * op.insuranceCostPerDay;
  const tolls = lane.laneCosts?.tollCost || 0;

  const totalCost = fuel + driver + maintenance + depreciation + insurance + tolls;
  const margin = revenue - totalCost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    fuel: Math.round(fuel * 100) / 100,
    driver: Math.round(driver * 100) / 100,
    maintenance: Math.round(maintenance * 100) / 100,
    depreciation: Math.round(depreciation * 100) / 100,
    insurance: Math.round(insurance * 100) / 100,
    tolls: Math.round(tolls * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
  };
}

/** Calculate forwarder profitability: sell price vs avg carrier cost */
export function calcForwarderProfitability(sellLane, allLanes, defaults = COMPANY_DEFAULTS) {
  const km = sellLane.totalKm || 0;
  const sellPrice = sellLane.pricing?.perLoad || (sellLane.pricing?.perKm ? sellLane.pricing.perKm * km : 0);

  // Find matching buy lanes (carrier costs for same route)
  const buyLanes = allLanes.filter(l =>
    l.scopeDirection === 'buy' && l.status === 'active' &&
    l.stops[0]?.city === sellLane.stops[0]?.city &&
    l.stops[l.stops.length - 1]?.city === sellLane.stops[sellLane.stops.length - 1]?.city
  );

  let avgCostPerKm;
  if (buyLanes.length > 0) {
    // Average cost per km from buy lanes
    const totalCost = buyLanes.reduce((sum, l) => {
      const price = l.pricing?.perLoad || (l.pricing?.perKm ? l.pricing.perKm * l.totalKm : 0);
      return sum + (l.totalKm > 0 ? price / l.totalKm : 0);
    }, 0);
    avgCostPerKm = totalCost / buyLanes.length;
  } else {
    // Fallback to company default rate
    avgCostPerKm = defaults.defaultRates?.perKm || 1.10;
  }

  const estimatedCost = avgCostPerKm * km;
  const margin = sellPrice - estimatedCost;
  const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0;

  return {
    sellPrice: Math.round(sellPrice * 100) / 100,
    avgCostPerKm: Math.round(avgCostPerKm * 1000) / 1000,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
    buyLaneCount: buyLanes.length,
    source: buyLanes.length > 0 ? 'carrier_lanes' : 'default_rate',
  };
}

// ─── 28 Mock Lanes ───
export const MOCK_LANES = [
  // ── 15 simple 2-stop lanes ──
  {
    id: 'LP-001',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Thessaloniki', label: 'Θεσσαλονίκη' }],
    isRoundTrip: false, routeLabel: 'Athens → Thessaloniki', totalKm: 502,
    legs: [{ from: 'Athens', to: 'Thessaloniki', km: 502 }],
    pricing: { perLoad: 520, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: [
      { vehicleType: 'van', perLoad: 280, perKm: 0.56 },
      { vehicleType: 'rigid', perLoad: 420, perKm: 0.84 },
      { vehicleType: 'semi', perLoad: 520, perKm: 1.04 },
    ],
    weightBreaks: null,
    laneCosts: { tollCost: 44.80, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-01-15', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Standard Athens–Thessaloniki via Olympia Odos.', createdAt: '2026-01-15T10:30:00Z', updatedAt: '2026-04-10T14:22:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-002',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Patras', label: 'Πάτρα' }],
    isRoundTrip: false, routeLabel: 'Athens → Patras', totalKm: 215,
    legs: [{ from: 'Athens', to: 'Patras', km: 215 }],
    pricing: { perLoad: null, perPallet: 42, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 180 },
    vehicleRates: null, weightBreaks: [
      { minQty: 1, maxQty: 5, perPallet: 48, perTonne: null },
      { minQty: 6, maxQty: 15, perPallet: 42, perTonne: null },
      { minQty: 16, maxQty: null, perPallet: 36, perTonne: null },
    ],
    laneCosts: { tollCost: 22.10, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-02-01', effectiveTo: '2026-06-15', status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Volume discount tiers.', createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-03-20T11:15:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-003',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Larissa', label: 'Λάρισα' }],
    isRoundTrip: false, routeLabel: 'Athens → Larissa', totalKm: 356,
    legs: [{ from: 'Athens', to: 'Larissa', km: 356 }],
    pricing: { perLoad: 390, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 180 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 33.20, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-01-20', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-01-20T08:00:00Z', updatedAt: '2026-01-20T08:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-004',
    stops: [{ city: 'Thessaloniki', label: 'Θεσσαλονίκη' }, { city: 'Kavala', label: 'Καβάλα' }],
    isRoundTrip: false, routeLabel: 'Thessaloniki → Kavala', totalKm: 168,
    legs: [{ from: 'Thessaloniki', to: 'Kavala', km: 168 }],
    pricing: { perLoad: null, perPallet: 38, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 120 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 14.20, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-03-01', effectiveTo: null, status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-080'], scopeLabel: 'FreshCo S.A.', scopeDirection: null,
    notes: 'FreshCo dedicated rate.', createdAt: '2026-03-01T12:00:00Z', updatedAt: '2026-03-15T09:30:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-005',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Volos', label: 'Βόλος' }],
    isRoundTrip: false, routeLabel: 'Athens → Volos', totalKm: 326,
    legs: [{ from: 'Athens', to: 'Volos', km: 326 }],
    pricing: { perLoad: null, perPallet: null, perKm: 1.12, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 28.50, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-02-15', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Per-km rate for flexible loads.', createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-04-05T16:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-006',
    stops: [{ city: 'Patras', label: 'Πάτρα' }, { city: 'Kalamata', label: 'Καλαμάτα' }],
    isRoundTrip: false, routeLabel: 'Patras → Kalamata', totalKm: 195,
    legs: [{ from: 'Patras', to: 'Kalamata', km: 195 }],
    pricing: { perLoad: 260, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 150 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-03-10', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-03-10T09:30:00Z', updatedAt: '2026-03-10T09:30:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-007',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Heraklion', label: 'Ηράκλειο' }],
    isRoundTrip: false, routeLabel: 'Athens → Heraklion', totalKm: 340,
    legs: [{ from: 'Athens', to: 'Heraklion', km: 340 }],
    pricing: { perLoad: 650, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 300 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: null, ferryCost: 120, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-01-10', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Includes Piraeus–Heraklion ferry.', createdAt: '2026-01-10T11:00:00Z', updatedAt: '2026-02-28T14:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-008',
    stops: [{ city: 'Thessaloniki', label: 'Θεσσαλονίκη' }, { city: 'Ioannina', label: 'Ιωάννινα' }],
    isRoundTrip: false, routeLabel: 'Thessaloniki → Ioannina', totalKm: 260,
    legs: [{ from: 'Thessaloniki', to: 'Ioannina', km: 260 }],
    pricing: { perLoad: 340, perPallet: 35, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 160 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 24.60, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-02-20', effectiveTo: null, status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-081'], scopeLabel: 'Σκλαβενίτης Α.Ε.Ε.', scopeDirection: null,
    notes: 'Σκλαβενίτης special rate.', createdAt: '2026-02-20T08:30:00Z', updatedAt: '2026-04-01T10:00:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-009',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Corinth', label: 'Κόρινθος' }],
    isRoundTrip: false, routeLabel: 'Athens → Corinth', totalKm: 83,
    legs: [{ from: 'Athens', to: 'Corinth', km: 83 }],
    pricing: { perLoad: 120, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 80 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 7.40, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-04-01', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-04-01T09:00:00Z', updatedAt: '2026-04-01T09:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-010',
    stops: [{ city: 'Larissa', label: 'Λάρισα' }, { city: 'Volos', label: 'Βόλος' }],
    isRoundTrip: false, routeLabel: 'Larissa → Volos', totalKm: 60,
    legs: [{ from: 'Larissa', to: 'Volos', km: 60 }],
    pricing: { perLoad: null, perPallet: null, perKm: null, perKg: null, perTonne: 28, currency: 'EUR', minimumCharge: 80 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-03-15', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Short haul — per tonne pricing.', createdAt: '2026-03-15T14:00:00Z', updatedAt: '2026-03-15T14:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-011',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Kalamata', label: 'Καλαμάτα' }],
    isRoundTrip: false, routeLabel: 'Athens → Kalamata', totalKm: 235,
    legs: [{ from: 'Athens', to: 'Kalamata', km: 235 }],
    pricing: { perLoad: 310, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 150 },
    vehicleRates: [
      { vehicleType: 'van', perLoad: 180, perKm: 0.77 },
      { vehicleType: 'rigid', perLoad: 250, perKm: 1.06 },
      { vehicleType: 'semi', perLoad: 310, perKm: 1.32 },
    ],
    weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-02-01', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-02-01T11:00:00Z', updatedAt: '2026-03-22T15:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-012',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Kavala', label: 'Καβάλα' }],
    isRoundTrip: false, routeLabel: 'Athens → Kavala', totalKm: 670,
    legs: [{ from: 'Athens', to: 'Kavala', km: 670 }],
    pricing: { perLoad: 720, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 350 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 52.30, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-01-05', effectiveTo: '2026-05-20', status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-060'], scopeLabel: 'Βίκος Α.Ε.', scopeDirection: null,
    notes: 'OliveTrack contract rate.', createdAt: '2026-01-05T10:00:00Z', updatedAt: '2026-01-05T10:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-013',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Lamia', label: 'Λαμία' }],
    isRoundTrip: false, routeLabel: 'Athens → Lamia', totalKm: 214,
    legs: [{ from: 'Athens', to: 'Lamia', km: 214 }],
    pricing: { perLoad: null, perPallet: null, perKm: 1.05, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 130 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 18.60, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-03-01', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-014',
    stops: [{ city: 'Thessaloniki', label: 'Θεσσαλονίκη' }, { city: 'Larissa', label: 'Λάρισα' }],
    isRoundTrip: false, routeLabel: 'Thessaloniki → Larissa', totalKm: 153,
    legs: [{ from: 'Thessaloniki', to: 'Larissa', km: 153 }],
    pricing: { perLoad: null, perPallet: 30, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 100 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 12.80, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-04-10', effectiveTo: '2026-05-25', status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-001'], scopeLabel: 'TransMed Logistics A.E.', scopeDirection: null,
    notes: 'TransMed seasonal rate.', createdAt: '2026-04-10T08:00:00Z', updatedAt: '2026-04-10T08:00:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-015',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Chalkida', label: 'Χαλκίδα' }],
    isRoundTrip: false, routeLabel: 'Athens → Chalkida', totalKm: 80,
    legs: [{ from: 'Athens', to: 'Chalkida', km: 80 }],
    pricing: { perLoad: 95, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 60 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-01-20', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z', createdBy: 'Pavlos D.',
  },

  // ── 7 multi-stop lanes (3+ stops) ──
  {
    id: 'LP-016',
    stops: [{ city: 'Ioannina', label: 'Ιωάννινα' }, { city: 'Patras', label: 'Πάτρα' }, { city: 'Athens', label: 'Αθήνα' }],
    isRoundTrip: false, routeLabel: 'Ioannina → Patras → Athens', totalKm: 428,
    legs: [{ from: 'Ioannina', to: 'Patras', km: 213 }, { from: 'Patras', to: 'Athens', km: 215 }],
    pricing: { perLoad: 480, perPallet: 42, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 38.00, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-02-10', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Multi-drop route through western Greece.', createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-03-18T11:30:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-017',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Lamia', label: 'Λαμία' }, { city: 'Larissa', label: 'Λάρισα' }, { city: 'Thessaloniki', label: 'Θεσσαλονίκη' }],
    isRoundTrip: false, routeLabel: 'Athens → Lamia → Larissa → Thessaloniki', totalKm: 508,
    legs: [{ from: 'Athens', to: 'Lamia', km: 214 }, { from: 'Lamia', to: 'Larissa', km: 142 }, { from: 'Larissa', to: 'Thessaloniki', km: 153 }],
    pricing: { perLoad: 580, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 250 },
    vehicleRates: [
      { vehicleType: 'rigid', perLoad: 480, perKm: 0.94 },
      { vehicleType: 'semi', perLoad: 580, perKm: 1.14 },
    ],
    weightBreaks: null,
    laneCosts: { tollCost: 42.90, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-01-25', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Milk run — 3 drops along E75.', createdAt: '2026-01-25T12:00:00Z', updatedAt: '2026-04-02T09:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-018',
    stops: [{ city: 'Thessaloniki', label: 'Θεσσαλονίκη' }, { city: 'Serres', label: 'Σέρρες' }, { city: 'Kavala', label: 'Καβάλα' }],
    isRoundTrip: false, routeLabel: 'Thessaloniki → Serres → Kavala', totalKm: 268,
    legs: [{ from: 'Thessaloniki', to: 'Serres', km: 100 }, { from: 'Serres', to: 'Kavala', km: 168 }],
    pricing: { perLoad: null, perPallet: 35, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 140 },
    vehicleRates: null, weightBreaks: [
      { minQty: 1, maxQty: 8, perPallet: 40, perTonne: null },
      { minQty: 9, maxQty: null, perPallet: 35, perTonne: null },
    ],
    laneCosts: null,
    effectiveFrom: '2026-03-20', effectiveTo: null, status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-080'], scopeLabel: 'FreshCo S.A.', scopeDirection: null,
    notes: 'FreshCo northern distribution.', createdAt: '2026-03-20T10:00:00Z', updatedAt: '2026-03-20T10:00:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-019',
    stops: [{ city: 'Heraklion', label: 'Ηράκλειο' }, { city: 'Rethymno', label: 'Ρέθυμνο' }, { city: 'Chania', label: 'Χανιά' }],
    isRoundTrip: false, routeLabel: 'Heraklion → Rethymno → Chania', totalKm: 220,
    legs: [{ from: 'Heraklion', to: 'Rethymno', km: 80 }, { from: 'Rethymno', to: 'Chania', km: 140 }],
    pricing: { perLoad: 280, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 150 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-04-01', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Crete east-west corridor.', createdAt: '2026-04-01T08:30:00Z', updatedAt: '2026-04-01T08:30:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-020',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Corinth', label: 'Κόρινθος' }, { city: 'Tripoli', label: 'Τρίπολη' }, { city: 'Kalamata', label: 'Καλαμάτα' }],
    isRoundTrip: false, routeLabel: 'Athens → Corinth → Tripoli → Kalamata', totalKm: 343,
    legs: [{ from: 'Athens', to: 'Corinth', km: 83 }, { from: 'Corinth', to: 'Tripoli', km: 95 }, { from: 'Tripoli', to: 'Kalamata', km: 165 }],
    pricing: { perLoad: null, perPallet: null, perKm: 1.18, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 12.00, ferryCost: null, otherCosts: 15, otherCostsLabel: 'Mountain pass fee' },
    effectiveFrom: '2026-03-05', effectiveTo: null, status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-081'], scopeLabel: 'Σκλαβενίτης Α.Ε.Ε.', scopeDirection: null,
    notes: 'Peloponnese south route — mountain pass.', createdAt: '2026-03-05T10:00:00Z', updatedAt: '2026-03-05T10:00:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-021',
    stops: [{ city: 'Thessaloniki', label: 'Θεσσαλονίκη' }, { city: 'Kozani', label: 'Κοζάνη' }, { city: 'Ioannina', label: 'Ιωάννινα' }],
    isRoundTrip: false, routeLabel: 'Thessaloniki → Kozani → Ioannina', totalKm: 300,
    legs: [{ from: 'Thessaloniki', to: 'Kozani', km: 135 }, { from: 'Kozani', to: 'Ioannina', km: 165 }],
    pricing: { perLoad: 380, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 180 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-02-18', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Western Macedonia route.', createdAt: '2026-02-18T09:00:00Z', updatedAt: '2026-02-18T09:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-022',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Volos', label: 'Βόλος' }, { city: 'Larissa', label: 'Λάρισα' }],
    isRoundTrip: false, routeLabel: 'Athens → Volos → Larissa', totalKm: 386,
    legs: [{ from: 'Athens', to: 'Volos', km: 326 }, { from: 'Volos', to: 'Larissa', km: 60 }],
    pricing: { perLoad: 440, perPallet: 38, perKm: null, perKg: null, perTonne: 30, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-01-30', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'All pricing methods available.', createdAt: '2026-01-30T11:00:00Z', updatedAt: '2026-04-08T08:00:00Z', createdBy: 'Pavlos D.',
  },

  // ── 6 round trips ──
  {
    id: 'LP-023',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Thessaloniki', label: 'Θεσσαλονίκη' }],
    isRoundTrip: true, routeLabel: 'Athens ↔ Thessaloniki', totalKm: 1004,
    legs: [{ from: 'Athens', to: 'Thessaloniki', km: 502 }, { from: 'Thessaloniki', to: 'Athens', km: 502, isReturn: true }],
    pricing: { perLoad: 950, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 450 },
    vehicleRates: [
      { vehicleType: 'rigid', perLoad: 780, perKm: 0.78 },
      { vehicleType: 'semi', perLoad: 950, perKm: 0.95 },
    ],
    weightBreaks: null,
    laneCosts: { tollCost: 89.60, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-01-15', effectiveTo: null, status: 'active',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Round trip discount vs. 2 × one-way.', createdAt: '2026-01-15T10:45:00Z', updatedAt: '2026-04-10T14:22:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-024',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Patras', label: 'Πάτρα' }],
    isRoundTrip: true, routeLabel: 'Athens ↔ Patras', totalKm: 430,
    legs: [{ from: 'Athens', to: 'Patras', km: 215 }, { from: 'Patras', to: 'Athens', km: 215, isReturn: true }],
    pricing: { perLoad: null, perPallet: 38, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 160 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 44.20, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-02-01', effectiveTo: '2026-05-31', status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-060'], scopeLabel: 'Βίκος Α.Ε.', scopeDirection: null,
    notes: 'OliveTrack round-trip pallet rate.', createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-04-15T09:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-025',
    stops: [{ city: 'Thessaloniki', label: 'Θεσσαλονίκη' }, { city: 'Alexandroupoli', label: 'Αλεξανδρούπολη' }],
    isRoundTrip: true, routeLabel: 'Thessaloniki ↔ Alexandroupoli', totalKm: 620,
    legs: [{ from: 'Thessaloniki', to: 'Alexandroupoli', km: 310 }, { from: 'Alexandroupoli', to: 'Thessaloniki', km: 310, isReturn: true }],
    pricing: { perLoad: null, perPallet: null, perKm: 1.15, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 300 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-03-25', effectiveTo: null, status: 'inactive',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Thrace corridor — suspended pending review.', createdAt: '2026-03-25T11:00:00Z', updatedAt: '2026-04-20T16:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-026',
    stops: [{ city: 'Patras', label: 'Πάτρα' }, { city: 'Ioannina', label: 'Ιωάννινα' }],
    isRoundTrip: true, routeLabel: 'Patras ↔ Ioannina', totalKm: 426,
    legs: [{ from: 'Patras', to: 'Ioannina', km: 213 }, { from: 'Ioannina', to: 'Patras', km: 213, isReturn: true }],
    pricing: { perLoad: 480, perPallet: null, perKm: null, perKg: null, perTonne: 32, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 31.80, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2026-02-12', effectiveTo: null, status: 'inactive',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: '', createdAt: '2026-02-12T09:00:00Z', updatedAt: '2026-04-18T14:00:00Z', createdBy: 'Pavlos D.',
  },
  {
    id: 'LP-027',
    stops: [{ city: 'Larissa', label: 'Λάρισα' }, { city: 'Kozani', label: 'Κοζάνη' }],
    isRoundTrip: true, routeLabel: 'Larissa ↔ Kozani', totalKm: 280,
    legs: [{ from: 'Larissa', to: 'Kozani', km: 140 }, { from: 'Kozani', to: 'Larissa', km: 140, isReturn: true }],
    pricing: { perLoad: null, perPallet: null, perKm: 0.95, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 120 },
    vehicleRates: null, weightBreaks: null, laneCosts: null,
    effectiveFrom: '2026-03-01', effectiveTo: null, status: 'inactive',
    scope: 'specific', scopePartnerIds: ['PR-001'], scopeLabel: 'TransMed Logistics A.E.', scopeDirection: null,
    notes: 'TransMed regional rate — under review.', createdAt: '2026-03-01T12:00:00Z', updatedAt: '2026-04-22T10:00:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-028',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Ioannina', label: 'Ιωάννινα' }],
    isRoundTrip: true, routeLabel: 'Athens ↔ Ioannina', totalKm: 776,
    legs: [{ from: 'Athens', to: 'Ioannina', km: 388 }, { from: 'Ioannina', to: 'Athens', km: 388, isReturn: true }],
    pricing: { perLoad: 820, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 400 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: { tollCost: 73.00, ferryCost: null, otherCosts: null, otherCostsLabel: '' },
    effectiveFrom: '2025-11-01', effectiveTo: '2026-02-28', status: 'archived',
    scope: 'default', scopePartnerIds: [], scopeLabel: 'Default', scopeDirection: null,
    notes: 'Winter 2025 rate — archived.', createdAt: '2025-11-01T09:00:00Z', updatedAt: '2026-03-01T10:00:00Z', createdBy: 'Pavlos D.',
  },
];

// Forwarder margin pair (LP-029 sell, LP-030 buy — same route)
// NOTE: These share the MOCK_LANES array — appended at the end to keep IDs sequential
MOCK_LANES.push(
  {
    id: 'LP-029',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Thessaloniki', label: 'Θεσσαλονίκη' }],
    isRoundTrip: false, routeLabel: 'Athens → Thessaloniki', totalKm: 502,
    legs: [{ from: 'Athens', to: 'Thessaloniki', km: 502 }],
    pricing: { perLoad: 600, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 250 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: null,
    effectiveFrom: '2026-03-01', effectiveTo: null, status: 'archived',
    scope: 'specific', scopePartnerIds: ['PR-061'], scopeLabel: 'ΔΕΛΤΑ Α.Β.Ε.Ε.', scopeDirection: 'sell',
    notes: 'Sell rate to Aegean Freight — archived.', createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-04-25T12:00:00Z', createdBy: 'Maria K.',
  },
  {
    id: 'LP-030',
    stops: [{ city: 'Athens', label: 'Αθήνα' }, { city: 'Thessaloniki', label: 'Θεσσαλονίκη' }],
    isRoundTrip: false, routeLabel: 'Athens → Thessaloniki', totalKm: 502,
    legs: [{ from: 'Athens', to: 'Thessaloniki', km: 502 }],
    pricing: { perLoad: 480, perPallet: null, perKm: null, perKg: null, perTonne: null, currency: 'EUR', minimumCharge: 200 },
    vehicleRates: null, weightBreaks: null,
    laneCosts: null,
    effectiveFrom: '2026-03-01', effectiveTo: null, status: 'active',
    scope: 'specific', scopePartnerIds: ['PR-001'], scopeLabel: 'TransMed Logistics A.E.', scopeDirection: 'buy',
    notes: 'Buy rate from TransMed carrier.', createdAt: '2026-03-01T09:30:00Z', updatedAt: '2026-03-01T09:30:00Z', createdBy: 'Maria K.',
  },
);

// ─── Audit Log (seeded from existing lanes) ───
export function seedAuditLog(lanes) {
  const log = [];
  lanes.forEach((lane) => {
    log.push({
      id: `AUD-${lane.id}-C`,
      laneId: lane.id,
      action: 'created',
      timestamp: lane.createdAt,
      user: lane.createdBy,
      details: `Lane ${lane.id} created: ${lane.routeLabel}`,
    });
    if (lane.updatedAt !== lane.createdAt) {
      log.push({
        id: `AUD-${lane.id}-U`,
        laneId: lane.id,
        action: 'updated',
        timestamp: lane.updatedAt,
        user: lane.createdBy,
        details: `Lane ${lane.id} updated`,
      });
    }
    if (lane.status === 'archived') {
      log.push({
        id: `AUD-${lane.id}-A`,
        laneId: lane.id,
        action: 'archived',
        timestamp: lane.updatedAt,
        user: lane.createdBy,
        details: `Lane ${lane.id} archived`,
      });
    }
    if (lane.status === 'inactive') {
      log.push({
        id: `AUD-${lane.id}-D`,
        laneId: lane.id,
        action: 'deactivated',
        timestamp: lane.updatedAt,
        user: lane.createdBy,
        details: `Lane ${lane.id} set to inactive`,
      });
    }
  });
  log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return log;
}

import {
  getPrimaryMetricKey,
  getPrimaryMetricPrice,
  metricKeyToLegacyUnit,
  resolveLanePricingRows,
} from '../api/utils/laneMetricDisplay';

/** Get the primary pricing method label for a lane */
export function getPrimaryUnit(lane) {
  const rows = resolveLanePricingRows(lane);
  if (rows.length > 0) {
    const metric = getPrimaryMetricKey(lane);
    const primaryRow = rows.find((row) => row.metric === metric) || rows[0];
    return metricKeyToLegacyUnit(metric, primaryRow?.metricValue);
  }

  const p = lane.pricing || {};
  if (p.perLoad != null) return 'load';
  if (p.perPallet != null) return 'pallet';
  if (p.perKm != null) return 'km';
  if (p.perKg != null) return 'kg';
  if (p.perTonne != null) return 'tonne';
  return 'load';
}

/** Get primary price value */
export function getPrimaryPrice(lane) {
  const rows = resolveLanePricingRows(lane);
  if (rows.length > 0) return getPrimaryMetricPrice(lane);

  const p = lane.pricing || {};
  if (p.perLoad != null) return p.perLoad;
  if (p.perPallet != null) return p.perPallet;
  if (p.perKm != null) return p.perKm;
  if (p.perKg != null) return p.perKg;
  if (p.perTonne != null) return p.perTonne;
  return 0;
}

/** Check if a lane is expiring within N days */
export function isExpiringSoon(lane, days = 14) {
  if (!lane.effectiveTo || lane.status !== 'active') return false;
  const end = new Date(lane.effectiveTo);
  const now = new Date();
  const diff = (end - now) / (1000 * 60 * 60 * 24);
  return diff > 0 && diff <= days;
}

/** Calculate avg toll/km from active lanes */
export function calcAvgTollPerKm(lanes) {
  const withTolls = lanes.filter((l) => l.status === 'active' && l.laneCosts?.tollCost > 0);
  if (withTolls.length === 0) return { avg: 0, count: 0, totalTolls: 0, totalKm: 0 };
  const totalTolls = withTolls.reduce((s, l) => s + l.laneCosts.tollCost, 0);
  const totalKm = withTolls.reduce((s, l) => s + l.totalKm, 0);
  return {
    avg: totalKm > 0 ? Math.round((totalTolls / totalKm) * 1000) / 1000 : 0,
    count: withTolls.length,
    totalTolls: Math.round(totalTolls * 100) / 100,
    totalKm,
  };
}
