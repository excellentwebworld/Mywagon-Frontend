/**
 * partnersMasterData.js — Mock data for Partners page
 *
 * Exports:
 *  - REGIONS: 8 Greek regions
 *  - TRUCK_TYPES: 8 capability options
 *  - PARTNER_TYPES: per role, which partner types are visible
 *  - RELATIONSHIP_TAGS: invite flow chips (Preferred, Private loads, Standard)
 *  - PARTNERS: an array of ~40 realistic partners covering all types and statuses
 */

export const REGIONS = [
  'attica', 'thessaloniki', 'central_greece', 'peloponnese',
  'epirus', 'thessaly', 'macedonia', 'crete',
];

// ISO country codes for the Country filter pill. Realistic mix: Greek partners default
// to 'GR' but the platform is multi-country from day one — EU neighbours most common.
export const COUNTRIES = [
  'GR', 'BG', 'RO', 'IT', 'DE', 'FR', 'ES', 'PL', 'NL', 'BE',
  'AT', 'CZ', 'HU', 'HR', 'SK', 'SI', 'SE', 'DK', 'FI', 'PT',
  'CH', 'NO', 'IE', 'LU', 'LT', 'LV', 'EE', 'GB', 'AL', 'MK',
  'RS', 'BA', 'ME', 'TR', 'CY',
];

export const TRUCK_TYPES = [
  'curtainsider', 'refrigerated', 'flatbed', 'box',
  'tank', 'tipper', 'low_loader', 'container',
];

export const RELATIONSHIP_TAGS = ['preferred', 'private_loads', 'standard'];

// Partner type set per role
export const VISIBLE_TYPES_BY_ROLE = {
  shipper:   ['carrier_company', 'freelancer_driver', 'forwarder', 'supplier', 'customer'],
  forwarder: ['carrier_company', 'freelancer_driver', 'shipper', 'customer'],
  carrier:   ['carrier_company', 'freelancer_driver', 'forwarder', 'shipper'],
};

// Colour scheme per type — used for pill badges. Actual rendering reads
// these keys and passes them through the theme system, so the pills match
// the dark/light theme.
export const TYPE_COLORS = {
  carrier_company:   { bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE' }, // blue
  freelancer_driver: { bg: '#F5F3FF', fg: '#7C3AED', bd: '#DDD6FE' }, // purple
  customer:          { bg: '#ECFDF5', fg: '#10B981', bd: '#A7F3D0' }, // green
  forwarder:         { bg: '#FFF7ED', fg: '#EA580C', bd: '#FED7AA' }, // orange
  supplier:          { bg: '#FDF2F8', fg: '#DB2777', bd: '#FBCFE8' }, // pink
  shipper:           { bg: '#F0FDFA', fg: '#0D9488', bd: '#99F6E4' }, // teal
};

export const STATUS_COLORS = {
  active:    { bg: '#ECFDF5', fg: '#10B981', bd: '#A7F3D0' },
  invited:   { bg: '#EFF6FF', fg: '#2563EB', bd: '#BFDBFE' },
  pending:   { bg: '#FFFBEB', fg: '#F59E0B', bd: '#FDE68A' },
  suspended: { bg: '#FEF2F2', fg: '#EF4444', bd: '#FECACA' },
};

// Helper for mock trip data
const mockTrips = (n) => Array.from({ length: n }, (_, i) => ({
  id: `TRP-${1000 + i}`,
  lane: ['Athens→Thessaloniki','Piraeus→Heraklion','Patras→Ioannina','Volos→Athens','Athens→Sofia','Thessaloniki→Skopje'][i % 6],
  date: `2026-0${((i % 3) + 1)}-${(10 + (i * 3)).toString().padStart(2, '0')}`,
  status: ['delivered','delivered','in_transit','delivered','delivered','cancelled'][i % 6],
  price: 450 + (i * 37),
}));

// 40 partners with realistic Greek names + varied statuses, capabilities, performance
export const PARTNERS = [
  // ─── Carrier companies (15) ───
  { id: 'PR-001', type: 'carrier_company', source: 'platform', status: 'active', name: 'TransMed Logistics A.E.', legalName: 'TransMed Logistics Α.Ε.', region: 'attica', country: 'GR', vat: 'EL094521987', email: 'info@transmed.gr', phone: '+30 210 4125900', tags: ['preferred'],
    trucks: [{ type: 'refrigerated', capacity: 24, count: 8 }, { type: 'box', capacity: 18, count: 4 }],
    loads30: 42, loadsLifetime: 1240, onTimePickup: 94, onTimeDelivery: 91, cancelRate: 3, acceptRate: 88, avgResponse: 12, rating: 4.6,
    iban: 'GR1601101250000000012300695', bankVerified: true, beneficiary: 'TransMed Logistics Α.Ε.',
    openInvoices: 3, disputes: 0, paymentTerms: 'Net 30', fleetSize: 18,
    contacts: [{ name: 'Γιώργος Παπαδόπουλος', role: 'Operations', email: 'g.pap@transmed.gr', phone: '+30 210 4125901' }],
    contractLanes: [{ id: 'CL-001', origin: 'Athens', destination: 'Thessaloniki', unit: 'per_load', price: 650, status: 'active' },
                    { id: 'CL-002', origin: 'Piraeus', destination: 'Patras', unit: 'per_load', price: 520, status: 'active' }],
    trips: mockTrips(8), lastActivity: '2026-04-14', profileCompleteness: 92, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-002', type: 'carrier_company', source: 'platform', status: 'active', name: 'Aegean Express', legalName: 'Aegean Express Μεταφορές ΕΠΕ', region: 'thessaloniki', country: 'GR', vat: 'EL800471232', email: 'dispatch@aegeanexpress.gr', phone: '+30 2310 546700', tags: ['preferred','private_loads'],
    trucks: [{ type: 'curtainsider', capacity: 25, count: 12 }, { type: 'container', capacity: 25, count: 6 }],
    loads30: 38, loadsLifetime: 980, onTimePickup: 89, onTimeDelivery: 87, cancelRate: 5, acceptRate: 82, avgResponse: 18, rating: 4.3,
    iban: 'GR2601101250000000012311111', bankVerified: true, beneficiary: 'Aegean Express Μεταφορές ΕΠΕ',
    openInvoices: 5, disputes: 1, paymentTerms: 'Net 45', fleetSize: 22,
    contacts: [{ name: 'Μαρία Κωστοπούλου', role: 'CEO', email: 'maria@aegeanexpress.gr', phone: '+30 2310 546701' }],
    contractLanes: [{ id: 'CL-003', origin: 'Thessaloniki', destination: 'Skopje', unit: 'per_load', price: 780, status: 'active' }],
    trips: mockTrips(6), lastActivity: '2026-04-15', profileCompleteness: 88, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'expiring', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-003', type: 'carrier_company', source: 'platform', status: 'active', name: 'Dimitriou Trans', legalName: 'Δημητρίου Μεταφορική ΙΚΕ', region: 'central_greece', country: 'GR', vat: 'EL115847263', email: 'contact@dimitriou-trans.gr', phone: '+30 22310 22200', tags: [],
    trucks: [{ type: 'flatbed', capacity: 28, count: 5 }, { type: 'tipper', capacity: 22, count: 3 }],
    loads30: 18, loadsLifetime: 420, onTimePickup: 78, onTimeDelivery: 75, cancelRate: 8, acceptRate: 70, avgResponse: 45, rating: 3.9,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 2, disputes: 0, paymentTerms: 'Net 30', fleetSize: 8,
    contacts: [{ name: 'Νίκος Δημητρίου', role: 'Owner', email: 'n.dim@dimitriou-trans.gr', phone: '+30 22310 22201' }],
    contractLanes: [], trips: mockTrips(4), lastActivity: '2026-04-10', profileCompleteness: 55, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'missing', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-004', type: 'carrier_company', source: 'platform', status: 'invited', name: 'Olympus Cargo', legalName: 'Olympus Cargo Transport ΑΕ', region: 'thessaly', country: 'GR', vat: '', email: 'info@olympus-cargo.gr', phone: '', tags: [],
    trucks: [], loads30: 0, loadsLifetime: 0, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '', openInvoices: 0, disputes: 0, paymentTerms: '', fleetSize: 0,
    contacts: [], contractLanes: [], trips: [], lastActivity: '2026-04-13', profileCompleteness: 10, suspended: false,
    invitedAt: '2026-04-13', remindersSent: 1,
    docs: { insurance: 'missing', license: 'missing', adr: 'missing', cmr: 'missing' }, notes: '',
  },
  { id: 'PR-005', type: 'carrier_company', source: 'platform', status: 'active', name: 'Kostas Freight Lines', legalName: 'Κώστας Μεταφορές ΟΕ', region: 'peloponnese', country: 'GR', vat: 'EL094521111', email: 'ops@kostasfreight.gr', phone: '+30 2610 338900', tags: [],
    trucks: [{ type: 'curtainsider', capacity: 24, count: 6 }],
    loads30: 22, loadsLifetime: 510, onTimePickup: 92, onTimeDelivery: 90, cancelRate: 2, acceptRate: 85, avgResponse: 15, rating: 4.5,
    iban: 'GR7201101250000000012312345', bankVerified: true, beneficiary: 'Κώστας Μεταφορές ΟΕ',
    openInvoices: 1, disputes: 0, paymentTerms: 'Net 30', fleetSize: 9,
    contacts: [{ name: 'Κώστας Παπανικολάου', role: 'Owner', email: 'k.pap@kostasfreight.gr', phone: '+30 2610 338901' }],
    contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-14', profileCompleteness: 80, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-006', type: 'carrier_company', source: 'platform', status: 'suspended', name: 'Papas Transport', legalName: 'Παπάς Μεταφορική ΕΕ', region: 'attica', country: 'GR', vat: 'EL998234561', email: 'info@papastransport.gr', phone: '+30 210 2378800', tags: [],
    trucks: [{ type: 'flatbed', capacity: 25, count: 3 }],
    loads30: 0, loadsLifetime: 180, onTimePickup: 62, onTimeDelivery: 58, cancelRate: 18, acceptRate: 55, avgResponse: 90, rating: 2.8,
    iban: 'GR8801101250000000012398765', bankVerified: true, beneficiary: 'Παπάς Μεταφορική ΕΕ',
    openInvoices: 0, disputes: 3, paymentTerms: 'Net 60', fleetSize: 4,
    contacts: [{ name: 'Θανάσης Παπάς', role: 'Owner', email: 't.papas@papastransport.gr', phone: '+30 210 2378801' }],
    contractLanes: [], trips: mockTrips(3), lastActivity: '2026-02-15', profileCompleteness: 65, suspended: true,
    docs: { insurance: 'expiring', license: 'valid', adr: 'missing', cmr: 'valid' },
    notes: 'Suspended due to repeated late deliveries and dispute resolution delays.',
  },
  { id: 'PR-007', type: 'carrier_company', source: 'erp', status: 'active', name: 'Hellenic Freight Co.', legalName: 'Hellenic Freight Company ΑΕ', region: 'macedonia', country: 'GR', vat: 'EL225478912', email: 'info@hellenicfreight.gr', phone: '+30 2310 778800', tags: ['preferred'],
    trucks: [{ type: 'refrigerated', capacity: 22, count: 7 }, { type: 'box', capacity: 20, count: 5 }, { type: 'tank', capacity: 28, count: 2 }],
    loads30: 36, loadsLifetime: 870, onTimePickup: 95, onTimeDelivery: 93, cancelRate: 2, acceptRate: 92, avgResponse: 8, rating: 4.7,
    iban: 'GR1601101250000000012345678', bankVerified: true, beneficiary: 'Hellenic Freight Company ΑΕ',
    openInvoices: 4, disputes: 0, paymentTerms: 'Net 30', fleetSize: 14,
    contacts: [{ name: 'Ελένη Γεωργίου', role: 'Operations Director', email: 'e.georgiou@hellenicfreight.gr', phone: '+30 2310 778801' }],
    contractLanes: [{ id: 'CL-010', origin: 'Thessaloniki', destination: 'Athens', unit: 'per_load', price: 620, status: 'active' }],
    trips: mockTrips(7), lastActivity: '2026-04-15', profileCompleteness: 96, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-008', type: 'carrier_company', source: 'platform', status: 'pending', name: 'Ionian Carriers', legalName: 'Ionian Carriers ΕΠΕ', region: 'epirus', country: 'GR', vat: 'EL334215687', email: 'contact@ionian-carriers.gr', phone: '+30 26510 44500', tags: [],
    trucks: [{ type: 'curtainsider', capacity: 24, count: 3 }],
    loads30: 8, loadsLifetime: 85, onTimePickup: 85, onTimeDelivery: 82, cancelRate: 5, acceptRate: 75, avgResponse: 25, rating: 4.1,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 30', fleetSize: 4,
    contacts: [{ name: 'Σπύρος Ιωάννου', role: 'Manager', email: 's.ioannou@ionian-carriers.gr', phone: '+30 26510 44501' }],
    contractLanes: [], trips: mockTrips(2), lastActivity: '2026-04-12', profileCompleteness: 40, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'missing', cmr: 'missing' }, notes: '',
  },
  // ─── Freelancer drivers (10) ───
  { id: 'PR-020', type: 'freelancer_driver', source: 'platform', status: 'active', name: 'Νίκος Παπαδόπουλος', legalName: 'Νικόλαος Παπαδόπουλος', region: 'attica', country: 'GR', vat: 'EL158234567', email: 'nikos.pap@gmail.com', phone: '+30 697 1234567', tags: ['preferred'],
    trucks: [{ type: 'curtainsider', capacity: 24, count: 1 }],
    loads30: 18, loadsLifetime: 215, onTimePickup: 96, onTimeDelivery: 94, cancelRate: 2, acceptRate: 88, avgResponse: 10, rating: 4.7,
    iban: 'GR1601101250000000099999111', bankVerified: true, beneficiary: 'Νικόλαος Παπαδόπουλος',
    openInvoices: 1, disputes: 0, paymentTerms: 'Net 15', fleetSize: 1,
    contacts: [], contractLanes: [], trips: mockTrips(6), lastActivity: '2026-04-15', profileCompleteness: 85, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-021', type: 'freelancer_driver', source: 'platform', status: 'active', name: 'Γιώργος Σταματίου', legalName: 'Γεώργιος Σταματίου', region: 'thessaloniki', country: 'GR', vat: 'EL258741963', email: 'g.stamatiou@gmail.com', phone: '+30 694 8765432', tags: [],
    trucks: [{ type: 'refrigerated', capacity: 20, count: 1 }],
    loads30: 12, loadsLifetime: 145, onTimePickup: 88, onTimeDelivery: 85, cancelRate: 6, acceptRate: 78, avgResponse: 20, rating: 4.2,
    iban: 'GR2601101250000000099912345', bankVerified: true, beneficiary: 'Γεώργιος Σταματίου',
    openInvoices: 2, disputes: 0, paymentTerms: 'Net 15', fleetSize: 1,
    contacts: [], contractLanes: [], trips: mockTrips(4), lastActivity: '2026-04-14', profileCompleteness: 75, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'missing', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-022', type: 'freelancer_driver', source: 'platform', status: 'invited', name: 'Βασίλης Κωστάκης', legalName: '', region: 'crete', country: 'GR', vat: '', email: 'v.kostakis@email.com', phone: '', tags: [],
    trucks: [], loads30: 0, loadsLifetime: 0, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '', openInvoices: 0, disputes: 0, paymentTerms: '', fleetSize: 0,
    contacts: [], contractLanes: [], trips: [], lastActivity: '2026-04-14', profileCompleteness: 5, suspended: false,
    invitedAt: '2026-04-14', remindersSent: 0,
    docs: { insurance: 'missing', license: 'missing', adr: 'missing', cmr: 'missing' }, notes: '',
  },
  { id: 'PR-023', type: 'freelancer_driver', source: 'platform', status: 'active', name: 'Δημήτρης Καραγιάννης', legalName: 'Δημήτριος Καραγιάννης', region: 'central_greece', country: 'GR', vat: 'EL369258147', email: 'dkaragiannis@yahoo.gr', phone: '+30 695 1112233', tags: [],
    trucks: [{ type: 'flatbed', capacity: 22, count: 1 }],
    loads30: 10, loadsLifetime: 98, onTimePickup: 82, onTimeDelivery: 78, cancelRate: 7, acceptRate: 72, avgResponse: 35, rating: 3.8,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 15', fleetSize: 1,
    contacts: [], contractLanes: [], trips: mockTrips(3), lastActivity: '2026-04-11', profileCompleteness: 50, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'missing', cmr: 'missing' }, notes: '',
  },
  { id: 'PR-024', type: 'freelancer_driver', source: 'platform', status: 'active', name: 'Παύλος Ξενάκης', legalName: 'Παύλος Ξενάκης', region: 'attica', country: 'GR', vat: 'EL471258963', email: 'p.xenakis@gmail.com', phone: '+30 693 5556677', tags: ['preferred'],
    trucks: [{ type: 'box', capacity: 18, count: 1 }],
    loads30: 15, loadsLifetime: 178, onTimePickup: 93, onTimeDelivery: 91, cancelRate: 3, acceptRate: 86, avgResponse: 14, rating: 4.5,
    iban: 'GR3801101250000000099988877', bankVerified: true, beneficiary: 'Παύλος Ξενάκης',
    openInvoices: 1, disputes: 0, paymentTerms: 'Net 15', fleetSize: 1,
    contacts: [], contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-15', profileCompleteness: 82, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  // ─── Freight forwarder partners (5) — visible to shipper + carrier ───
  { id: 'PR-040', type: 'forwarder', source: 'erp', status: 'active', name: 'GlobalShip Forwarders', legalName: 'GlobalShip Forwarders ΑΕ', region: 'attica', country: 'GR', vat: 'EL775412369', email: 'ops@globalship.gr', phone: '+30 210 9988000', tags: ['preferred'],
    trucks: [], loads30: 85, loadsLifetime: 2450, onTimePickup: 91, onTimeDelivery: 89, cancelRate: 3, acceptRate: 90, avgResponse: 9, rating: 4.4,
    iban: 'GR4401101250000000099911122', bankVerified: true, beneficiary: 'GlobalShip Forwarders ΑΕ',
    openInvoices: 12, disputes: 1, paymentTerms: 'Net 45', fleetSize: 0,
    contacts: [{ name: 'Αναστασία Μιχαηλίδη', role: 'Forwarding Manager', email: 'a.mich@globalship.gr', phone: '+30 210 9988001' }],
    contractLanes: [], trips: mockTrips(8), lastActivity: '2026-04-15', profileCompleteness: 90, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-041', type: 'forwarder', source: 'platform', status: 'active', name: 'BalticWay Forwarding', legalName: 'BalticWay Forwarding Services ΕΠΕ', region: 'thessaloniki', country: 'BG', vat: 'EL887412589', email: 'contact@balticway.gr', phone: '+30 2310 779900', tags: [],
    trucks: [], loads30: 54, loadsLifetime: 1340, onTimePickup: 85, onTimeDelivery: 83, cancelRate: 5, acceptRate: 82, avgResponse: 15, rating: 4.1,
    iban: 'GR9901101250000000099955566', bankVerified: true, beneficiary: 'BalticWay Forwarding Services ΕΠΕ',
    openInvoices: 8, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
    contacts: [{ name: 'Σταμάτης Πλατής', role: 'Owner', email: 's.platis@balticway.gr', phone: '+30 2310 779901' }],
    contractLanes: [], trips: mockTrips(6), lastActivity: '2026-04-14', profileCompleteness: 82, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  // ─── Shipper partners (5) — visible to forwarder + carrier ───
  { id: 'PR-060', type: 'shipper', source: 'platform', status: 'active', name: 'Βίκος Α.Ε.', legalName: 'Βίκος Α.Ε. Εμφιαλώσεις', region: 'epirus', country: 'GR', vat: 'EL094228831', email: 'logistics@vikos.gr', phone: '+30 26510 81000', tags: ['preferred'],
    trucks: [], loads30: 48, loadsLifetime: 1580, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 4.6,
    iban: 'GR1601101250000000011111222', bankVerified: true, beneficiary: 'Βίκος Α.Ε.',
    openInvoices: 2, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
    contacts: [{ name: 'Δήμος Τσίπρας', role: 'Logistics Manager', email: 'd.tsipras@vikos.gr', phone: '+30 26510 81001' }],
    contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-15', profileCompleteness: 88, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-061', type: 'shipper', source: 'erp', status: 'active', name: 'ΔΕΛΤΑ Α.Β.Ε.Ε.', legalName: 'ΔΕΛΤΑ Τρόφιμα Α.Β.Ε.Ε.', region: 'macedonia', country: 'GR', vat: 'EL094228888', email: 'shipping@delta-group.gr', phone: '+30 2310 999000', tags: ['preferred','private_loads'],
    trucks: [], loads30: 72, loadsLifetime: 2890, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 4.8,
    iban: 'GR2201101250000000022222333', bankVerified: true, beneficiary: 'ΔΕΛΤΑ Τρόφιμα Α.Β.Ε.Ε.',
    openInvoices: 4, disputes: 0, paymentTerms: 'Net 45', fleetSize: 0,
    contacts: [{ name: 'Κατερίνα Αθανασίου', role: 'Supply Chain Director', email: 'k.athanasiou@delta-group.gr', phone: '+30 2310 999001' }],
    contractLanes: [], trips: mockTrips(8), lastActivity: '2026-04-15', profileCompleteness: 94, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  // ─── Suppliers (3) — other MYVAGON shippers, invite-only ───
  { id: 'PR-070', type: 'supplier', source: 'platform', status: 'active', name: 'AgroFresh Hellas', legalName: 'AgroFresh Hellas Α.Ε.', region: 'attica', country: 'GR', vat: 'EL556677889', email: 'supply@agrofresh.gr', phone: '+30 210 3344000', tags: ['preferred'],
    trucks: [], loads30: 15, loadsLifetime: 180, onTimePickup: 96, onTimeDelivery: 94, cancelRate: 1, acceptRate: 98, avgResponse: 0.3, rating: 4.8,
    iban: '', bankVerified: false, beneficiary: '',
    contractLanes: [], trips: [], lastActivity: '2026-05-20', profileCompleteness: 90, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'n/a', cmr: 'n/a' }, notes: 'Main ingredients supplier',
  },
  { id: 'PR-071', type: 'supplier', source: 'platform', status: 'active', name: 'PackPro Industries', legalName: 'PackPro Industries S.A.', region: 'thessaloniki', country: 'GR', vat: 'EL998877665', email: 'orders@packpro.gr', phone: '+30 2310 556677', tags: [],
    trucks: [], loads30: 8, loadsLifetime: 92, onTimePickup: 93, onTimeDelivery: 91, cancelRate: 2, acceptRate: 95, avgResponse: 0.5, rating: 4.5,
    iban: '', bankVerified: false, beneficiary: '',
    contractLanes: [], trips: [], lastActivity: '2026-05-18', profileCompleteness: 85, suspended: false,
    docs: { insurance: 'valid', license: 'valid', adr: 'n/a', cmr: 'n/a' }, notes: 'Packaging materials',
  },
  { id: 'PR-072', type: 'supplier', source: 'platform', status: 'invited', name: 'EuroPallets Ltd', legalName: 'EuroPallets Ltd', region: 'attica', country: 'GR', vat: 'EL112233445', email: 'info@europallets.gr', phone: '+30 210 7788990', tags: [],
    trucks: [], loads30: 0, loadsLifetime: 0, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '',
    contractLanes: [], trips: [], lastActivity: '', profileCompleteness: 20, suspended: false,
    docs: { insurance: 'n/a', license: 'n/a', adr: 'n/a', cmr: 'n/a' }, notes: 'Invitation pending',
  },
  // ─── Customers (10) — visible to shipper + forwarder, NOT users of the app ───
  { id: 'PR-080', type: 'customer', source: 'erp', status: 'active', name: 'FreshCo S.A.', legalName: 'FreshCo S.A.', region: 'attica', country: 'GR', shipperIdSelf: 'self', shipperIdForwarder: 'PR-060', vat: 'EL444555666', email: 'orders@freshco.gr', phone: '+30 210 4442222', tags: [],
    trucks: [], loads30: 24, loadsLifetime: 356, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 5, disputes: 0, paymentTerms: 'Net 60', fleetSize: 0,
    contacts: [{ name: 'Μιχάλης Αναστασίου', role: 'Purchasing', email: 'm.anastasiou@freshco.gr', phone: '+30 210 4442223' }],
    contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-14', profileCompleteness: 60, suspended: false,
    docs: { insurance: 'missing', license: 'missing', adr: 'missing', cmr: 'missing' }, notes: '',
  },
  { id: 'PR-081', type: 'customer', source: 'erp', status: 'active', name: 'Σκλαβενίτης Α.Ε.Ε.', legalName: 'Ι & Σ. Σκλαβενίτης Α.Ε.Ε.', region: 'attica', country: 'GR', shipperIdSelf: 'self', shipperIdForwarder: 'PR-061', vat: 'EL094518765', email: 'logistics@sklavenitis.gr', phone: '+30 210 6677000', tags: ['preferred'],
    trucks: [], loads30: 55, loadsLifetime: 1420, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 8, disputes: 0, paymentTerms: 'Net 60', fleetSize: 0,
    contacts: [{ name: 'Ελένη Κοσμά', role: 'Supply Chain', email: 'e.kosma@sklavenitis.gr', phone: '+30 210 6677001' }],
    contractLanes: [], trips: mockTrips(6), lastActivity: '2026-04-15', profileCompleteness: 70, suspended: false,
    docs: {}, notes: '',
  },
  { id: 'PR-082', type: 'customer', source: 'erp', status: 'active', name: 'Lidl Hellas', legalName: 'Lidl Ελλάς & ΣΙΑ ΕΕ', region: 'attica', country: 'GR', shipperIdSelf: 'self', shipperIdForwarder: 'PR-061', vat: 'EL094018222', email: 'logistics@lidl.gr', phone: '+30 210 9000000', tags: ['preferred','private_loads'],
    trucks: [], loads30: 88, loadsLifetime: 3210, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 12, disputes: 1, paymentTerms: 'Net 45', fleetSize: 0,
    contacts: [{ name: 'Andreas Mueller', role: 'Head of Logistics', email: 'a.mueller@lidl.gr', phone: '+30 210 9000001' }],
    contractLanes: [], trips: mockTrips(8), lastActivity: '2026-04-15', profileCompleteness: 85, suspended: false,
    docs: {}, notes: '',
  },
  { id: 'PR-083', type: 'customer', source: 'manual', status: 'active', name: 'Papadopoulos Bakery', legalName: 'Ε.Ι. Παπαδόπουλος ΑΕ', region: 'attica', country: 'GR', shipperIdSelf: 'self', shipperIdForwarder: 'PR-060', vat: 'EL094177888', email: 'shipping@papadopoulos.gr', phone: '+30 210 5500100', tags: [],
    trucks: [], loads30: 16, loadsLifetime: 242, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 3, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
    contacts: [{ name: 'Θανάσης Παπαδόπουλος', role: 'Operations', email: 't.papadopoulos@papadopoulos.gr', phone: '+30 210 5500101' }],
    contractLanes: [], trips: mockTrips(4), lastActivity: '2026-04-13', profileCompleteness: 50, suspended: false,
    docs: {}, notes: '',
  },
  { id: 'PR-084', type: 'customer', source: 'manual', status: 'active', name: 'Attica Pharmacies Group', legalName: 'Attica Pharmacies Group ΕΕ', region: 'attica', country: 'GR', shipperIdSelf: 'self', shipperIdForwarder: 'PR-060', vat: 'EL155487963', email: 'dist@atticapharma.gr', phone: '+30 210 7000000', tags: [],
    trucks: [], loads30: 32, loadsLifetime: 680, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 4, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
    contacts: [], contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-14', profileCompleteness: 40, suspended: false,
    docs: {}, notes: '',
  },

  // ─── INCOMING INVITES (status: 'pending') — partners who reached out to ME and are waiting for my Accept/Reject ───
  // These cover all types so every role sees pending invites relevant to them.
  { id: 'PR-100', type: 'carrier_company', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Athens Priority Cargo', legalName: 'Athens Priority Cargo ΙΚΕ', region: 'attica', country: 'GR',
    vat: 'EL099112233', email: 'hello@athenspriority.gr', phone: '+30 210 5544000', tags: [],
    trucks: [{ type: 'refrigerated', capacity: 18, count: 4 }, { type: 'box', capacity: 16, count: 2 }],
    loads30: 0, loadsLifetime: 620, onTimePickup: 88, onTimeDelivery: 85, cancelRate: 4, acceptRate: 80, avgResponse: 15, rating: 4.3,
    iban: 'GR5601101250000000099771122', bankVerified: true, beneficiary: 'Athens Priority Cargo ΙΚΕ',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 30', fleetSize: 6,
    contacts: [{ name: 'Αντώνης Πρίφτης', role: 'Sales', email: 'a.priftis@athenspriority.gr', phone: '+30 210 5544001' }],
    contractLanes: [], trips: mockTrips(4), lastActivity: '2026-04-13', profileCompleteness: 85, suspended: false,
    invitedAt: '2026-04-13', invitedBy: 'them', inviteMessage: 'We would like to offer refrigerated and box truck capacity in Attica.',
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-101', type: 'freelancer_driver', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Στέφανος Μιχαηλίδης', legalName: 'Στέφανος Μιχαηλίδης', region: 'central_greece', country: 'GR',
    vat: 'EL147258369', email: 's.michailidis@gmail.com', phone: '+30 694 7778899', tags: [],
    trucks: [{ type: 'curtainsider', capacity: 22, count: 1 }],
    loads30: 0, loadsLifetime: 142, onTimePickup: 91, onTimeDelivery: 88, cancelRate: 3, acceptRate: 85, avgResponse: 12, rating: 4.5,
    iban: 'GR1601101250000000099112233', bankVerified: true, beneficiary: 'Στέφανος Μιχαηλίδης',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 15', fleetSize: 1,
    contacts: [], contractLanes: [], trips: mockTrips(3), lastActivity: '2026-04-14', profileCompleteness: 78, suspended: false,
    invitedAt: '2026-04-14', invitedBy: 'them', inviteMessage: 'Available for curtainsider routes Athens–Thessaloniki.',
    docs: { insurance: 'valid', license: 'valid', adr: 'missing', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-102', type: 'forwarder', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Mediterranean Freight Services', legalName: 'Mediterranean Freight Services ΑΕ', region: 'attica', country: 'IT',
    vat: 'EL225588471', email: 'partners@medfreight.gr', phone: '+30 210 4433500', tags: [],
    trucks: [],
    loads30: 0, loadsLifetime: 1850, onTimePickup: 87, onTimeDelivery: 86, cancelRate: 4, acceptRate: 88, avgResponse: 11, rating: 4.2,
    iban: 'GR8801101250000000099557711', bankVerified: true, beneficiary: 'Mediterranean Freight Services ΑΕ',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 45', fleetSize: 0,
    contacts: [{ name: 'Φώτης Δημόπουλος', role: 'Business Development', email: 'f.dim@medfreight.gr', phone: '+30 210 4433501' }],
    contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-15', profileCompleteness: 82, suspended: false,
    invitedAt: '2026-04-15', invitedBy: 'them', inviteMessage: 'Interested in long-term forwarding partnership.',
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-103', type: 'shipper', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Chrysa Foods A.E.', legalName: 'Chrysa Foods Α.Ε.', region: 'thessaloniki', country: 'GR',
    vat: 'EL558812336', email: 'procurement@chrysafoods.gr', phone: '+30 2310 661100', tags: [],
    trucks: [],
    loads30: 0, loadsLifetime: 780, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 4.4,
    iban: 'GR4401101250000000088662233', bankVerified: true, beneficiary: 'Chrysa Foods Α.Ε.',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
    contacts: [{ name: 'Χρύσα Αντωνοπούλου', role: 'CEO', email: 'c.antonop@chrysafoods.gr', phone: '+30 2310 661101' }],
    contractLanes: [], trips: mockTrips(4), lastActivity: '2026-04-12', profileCompleteness: 80, suspended: false,
    invitedAt: '2026-04-12', invitedBy: 'them', inviteMessage: 'Looking for reliable transport partner for our Northern Greece distribution.',
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-104', type: 'carrier_company', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Dodekanisa Logistics', legalName: 'Δωδεκάνησα Logistics ΕΠΕ', region: 'crete', country: 'GR',
    vat: 'EL336699112', email: 'dispatch@dodekanisa-log.gr', phone: '+30 2810 229900', tags: [],
    trucks: [{ type: 'container', capacity: 25, count: 3 }, { type: 'flatbed', capacity: 24, count: 2 }],
    loads30: 0, loadsLifetime: 340, onTimePickup: 84, onTimeDelivery: 82, cancelRate: 6, acceptRate: 75, avgResponse: 22, rating: 4.0,
    iban: 'GR2201101250000000077881122', bankVerified: true, beneficiary: 'Δωδεκάνησα Logistics ΕΠΕ',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 30', fleetSize: 5,
    contacts: [{ name: 'Μανώλης Χατζηδάκης', role: 'Operations', email: 'm.hatz@dodekanisa-log.gr', phone: '+30 2810 229901' }],
    contractLanes: [], trips: mockTrips(3), lastActivity: '2026-04-10', profileCompleteness: 75, suspended: false,
    invitedAt: '2026-04-10', invitedBy: 'them', inviteMessage: 'Container and flatbed coverage for Crete and the islands.',
    docs: { insurance: 'valid', license: 'valid', adr: 'expiring', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-105', type: 'freelancer_driver', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Λάμπρος Φωτίου', legalName: 'Λάμπρος Φωτίου', region: 'peloponnese', country: 'GR',
    vat: 'EL874125963', email: 'l.fotiou@email.gr', phone: '+30 695 4321111', tags: [],
    trucks: [{ type: 'tipper', capacity: 20, count: 1 }],
    loads30: 0, loadsLifetime: 88, onTimePickup: 90, onTimeDelivery: 87, cancelRate: 4, acceptRate: 82, avgResponse: 18, rating: 4.3,
    iban: '', bankVerified: false, beneficiary: '',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 15', fleetSize: 1,
    contacts: [], contractLanes: [], trips: mockTrips(2), lastActivity: '2026-04-09', profileCompleteness: 55, suspended: false,
    invitedAt: '2026-04-09', invitedBy: 'them', inviteMessage: 'Available for tipper truck work in Peloponnese.',
    docs: { insurance: 'valid', license: 'valid', adr: 'missing', cmr: 'missing' }, notes: '',
  },
  { id: 'PR-106', type: 'forwarder', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'Euroline Forwarders', legalName: 'Euroline Forwarders ΕΠΕ', region: 'macedonia', country: 'DE',
    vat: 'EL664411229', email: 'info@eurolineforwarders.gr', phone: '+30 2310 445566', tags: [],
    trucks: [],
    loads30: 0, loadsLifetime: 920, onTimePickup: 83, onTimeDelivery: 81, cancelRate: 5, acceptRate: 84, avgResponse: 14, rating: 4.1,
    iban: 'GR7701101250000000088997711', bankVerified: true, beneficiary: 'Euroline Forwarders ΕΠΕ',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 45', fleetSize: 0,
    contacts: [{ name: 'Ηλίας Βασιλείου', role: 'Partnerships', email: 'i.vasiliou@eurolineforwarders.gr', phone: '+30 2310 445567' }],
    contractLanes: [], trips: mockTrips(4), lastActivity: '2026-04-11', profileCompleteness: 80, suspended: false,
    invitedAt: '2026-04-11', invitedBy: 'them', inviteMessage: 'Cross-border EU forwarding partnership proposal.',
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
  { id: 'PR-107', type: 'shipper', status: 'pending', source: 'platform', direction: 'incoming',
    name: 'ΓΡΕΕΝΦΑΡΜ Α.Ε.', legalName: 'ΓΡΕΕΝΦΑΡΜ Φαρμακευτικά Α.Ε.', region: 'attica', country: 'GR',
    vat: 'EL336699887', email: 'logistics@greenpharm.gr', phone: '+30 210 8080800', tags: [],
    trucks: [],
    loads30: 0, loadsLifetime: 1120, onTimePickup: 0, onTimeDelivery: 0, cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 4.6,
    iban: 'GR3301101250000000099887766', bankVerified: true, beneficiary: 'ΓΡΕΕΝΦΑΡΜ Φαρμακευτικά Α.Ε.',
    openInvoices: 0, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
    contacts: [{ name: 'Άννα Παπαγιάννη', role: 'Supply Chain', email: 'a.papag@greenpharm.gr', phone: '+30 210 8080801' }],
    contractLanes: [], trips: mockTrips(5), lastActivity: '2026-04-08', profileCompleteness: 85, suspended: false,
    invitedAt: '2026-04-08', invitedBy: 'them', inviteMessage: 'Pharmaceutical cold-chain partnership opportunity.',
    docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '',
  },
];

// ERP customer sync — shipper and forwarder's Customer view pulls these from the
// shipper's ERP. For shipper role, shipperIdSelf='self' owns them; for forwarder
// role the shipperIdForwarder must be set by the caller to the currently-selected
// shipper's id.
export function makeErpCustomerBatch(shipperIdForwarder = null) {
  const now = new Date().toISOString().slice(0, 10);
  const ts = Date.now();
  return [
    { id: `PR-ERP-${ts}-C1`, type: 'customer', status: 'active', source: 'erp', direction: 'outgoing',
      shipperIdSelf: 'self', shipperIdForwarder,
      name: 'ΜΠΑΡΜΠΑ ΣΤΑΘΗΣ Α.Β.Ε.Ε.', legalName: 'ΜΠΑΡΜΠΑ ΣΤΑΘΗΣ Α.Β.Ε.Ε.', region: 'macedonia', country: 'GR',
      vat: 'EL094115542', email: 'logistics@barba-stathis.gr', phone: '+30 2310 221100', tags: [],
      trucks: [], loads30: 0, loadsLifetime: 0, onTimePickup: 0, onTimeDelivery: 0,
      cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
      iban: 'GR5501101250000000055443311', bankVerified: true, beneficiary: 'ΜΠΑΡΜΠΑ ΣΤΑΘΗΣ Α.Β.Ε.Ε.',
      openInvoices: 0, disputes: 0, paymentTerms: 'Net 45', fleetSize: 0,
      contacts: [{ name: 'Κατερίνα Νικολαΐδου', role: 'Purchasing', email: 'k.nikolaidou@barba-stathis.gr', phone: '+30 2310 221101' }],
      contractLanes: [], trips: [], lastActivity: now, profileCompleteness: 80, suspended: false,
      docs: {}, notes: '', erpExtId: 'ERP-CUST-445512',
    },
    { id: `PR-ERP-${ts}-C2`, type: 'customer', status: 'active', source: 'erp', direction: 'outgoing',
      shipperIdSelf: 'self', shipperIdForwarder,
      name: 'JUMBO A.E.E.', legalName: 'JUMBO Α.Ε.Ε.', region: 'attica', country: 'GR',
      vat: 'EL094045562', email: 'vendors@jumbo.gr', phone: '+30 210 6600000', tags: [],
      trucks: [], loads30: 0, loadsLifetime: 0, onTimePickup: 0, onTimeDelivery: 0,
      cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
      iban: 'GR2201101250000000044223311', bankVerified: true, beneficiary: 'JUMBO Α.Ε.Ε.',
      openInvoices: 0, disputes: 0, paymentTerms: 'Net 60', fleetSize: 0,
      contacts: [{ name: 'Νίκος Βάκρος', role: 'Logistics', email: 'n.vakros@jumbo.gr', phone: '+30 210 6600001' }],
      contractLanes: [], trips: [], lastActivity: now, profileCompleteness: 85, suspended: false,
      docs: {}, notes: '', erpExtId: 'ERP-CUST-885543',
    },
    { id: `PR-ERP-${ts}-C3`, type: 'customer', status: 'active', source: 'erp', direction: 'outgoing',
      shipperIdSelf: 'self', shipperIdForwarder,
      name: 'Ι.ΚΛΟΥΚΙΝΑΣ-Ι.ΛΑΠΠΑΣ Α.Ε.', legalName: 'Ι.ΚΛΟΥΚΙΝΑΣ-Ι.ΛΑΠΠΑΣ Τεχνική Α.Ε.', region: 'attica', country: 'GR',
      vat: 'EL094225533', email: 'ap@klm-kloukinas.gr', phone: '+30 210 5500500', tags: [],
      trucks: [], loads30: 0, loadsLifetime: 0, onTimePickup: 0, onTimeDelivery: 0,
      cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 0,
      iban: '', bankVerified: false, beneficiary: '',
      openInvoices: 0, disputes: 0, paymentTerms: 'Net 45', fleetSize: 0,
      contacts: [], contractLanes: [], trips: [], lastActivity: now, profileCompleteness: 55, suspended: false,
      docs: {}, notes: '', erpExtId: 'ERP-CUST-991100',
    },
  ];
}

// Backwards-compatible alias (old callers)
export const makeErpSyncBatch = makeErpCustomerBatch;

// ERP shipper sync — forwarder's Shipper view pulls these from the forwarder's ERP.
// These create shipper-type partners with origin='erp'. The forwarder can then link
// each shipper's customer book afterwards.
export function makeErpShipperBatch() {
  const now = new Date().toISOString().slice(0, 10);
  const ts = Date.now();
  return [
    { id: `PR-ERP-${ts}-S1`, type: 'shipper', status: 'active', source: 'erp', direction: 'outgoing',
      name: 'Ελληνικά Πετρέλαια Α.Ε.', legalName: 'Hellenic Petroleum Α.Ε.', region: 'attica', country: 'GR',
      vat: 'EL094011525', email: 'logistics@helpe.gr', phone: '+30 210 7725000', tags: ['preferred'],
      trucks: [], loads30: 0, loadsLifetime: 3400, onTimePickup: 0, onTimeDelivery: 0,
      cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 4.7,
      iban: 'GR1601101250000000077725000', bankVerified: true, beneficiary: 'Hellenic Petroleum Α.Ε.',
      openInvoices: 0, disputes: 0, paymentTerms: 'Net 45', fleetSize: 0,
      contacts: [{ name: 'Στέλιος Ροδίτης', role: 'Supply Chain', email: 's.roditis@helpe.gr', phone: '+30 210 7725001' }],
      contractLanes: [], trips: [], lastActivity: now, profileCompleteness: 90, suspended: false,
      docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '', erpExtId: 'ERP-SHIP-770010',
    },
    { id: `PR-ERP-${ts}-S2`, type: 'shipper', status: 'active', source: 'erp', direction: 'outgoing',
      name: 'Τιτάν Cement International', legalName: 'Titan Cement International Α.Ε.', region: 'central_greece', country: 'GR',
      vat: 'EL094023568', email: 'ops@titan.gr', phone: '+30 22620 99400', tags: [],
      trucks: [], loads30: 0, loadsLifetime: 2150, onTimePickup: 0, onTimeDelivery: 0,
      cancelRate: 0, acceptRate: 0, avgResponse: 0, rating: 4.5,
      iban: 'GR2201101250000000011122334', bankVerified: true, beneficiary: 'Titan Cement International Α.Ε.',
      openInvoices: 0, disputes: 0, paymentTerms: 'Net 30', fleetSize: 0,
      contacts: [{ name: 'Γεωργία Κωνσταντίνου', role: 'Distribution', email: 'g.konstantinou@titan.gr', phone: '+30 22620 99401' }],
      contractLanes: [], trips: [], lastActivity: now, profileCompleteness: 88, suspended: false,
      docs: { insurance: 'valid', license: 'valid', adr: 'valid', cmr: 'valid' }, notes: '', erpExtId: 'ERP-SHIP-880022',
    },
  ];
}

// A tiny helper to resolve a partner by id
export const getPartnerById = (id) => PARTNERS.find((p) => p.id === id);

// Favorite lanes — carrier/freelancer declared or manually added preferred routes.
// Used in the Favorite Lanes section of DetailPane for carrier_company and freelancer_driver.
export const FAVORITE_LANES = [
  // PR-001 TransMed Logistics — 3 lanes
  { id: 'FL-001', partnerId: 'PR-001', source: 'carrier_declared', createdAt: '2026-03-10',
    origin: { type: 'prefecture', value: 'attikis', label: 'Αττικής', countryCode: 'GR' },
    destination: { type: 'prefecture', value: 'thessalonikis', label: 'Θεσσαλονίκης', countryCode: 'GR' } },
  { id: 'FL-002', partnerId: 'PR-001', source: 'carrier_declared', createdAt: '2026-03-10',
    origin: { type: 'country', value: 'GR', label: 'Greece', countryCode: 'GR' },
    destination: { type: 'country', value: 'BG', label: 'Bulgaria', countryCode: 'BG' } },
  { id: 'FL-003', partnerId: 'PR-001', source: 'manual_added', createdAt: '2026-03-22',
    origin: { type: 'city', value: 'Πάτρα', label: 'Πάτρα, Greece', countryCode: 'GR' },
    destination: null },

  // PR-002 Aegean Express — 2 lanes
  { id: 'FL-004', partnerId: 'PR-002', source: 'carrier_declared', createdAt: '2026-02-18',
    origin: { type: 'region', value: 'thessaloniki', label: 'Θεσσαλονίκη, Greece', countryCode: 'GR' },
    destination: { type: 'country', value: 'MK', label: 'North Macedonia', countryCode: 'MK' } },
  { id: 'FL-005', partnerId: 'PR-002', source: 'manual_added', createdAt: '2026-04-01',
    origin: { type: 'prefecture', value: 'thessalonikis', label: 'Θεσσαλονίκης', countryCode: 'GR' },
    destination: { type: 'prefecture', value: 'serron', label: 'Σερρών', countryCode: 'GR' } },

  // PR-020 Νίκος Παπαδόπουλος (freelancer) — 2 lanes
  { id: 'FL-006', partnerId: 'PR-020', source: 'carrier_declared', createdAt: '2026-01-15',
    origin: { type: 'prefecture', value: 'attikis', label: 'Αττικής', countryCode: 'GR' },
    destination: { type: 'region', value: 'peloponnese', label: 'Πελοπόννησος, Greece', countryCode: 'GR' } },
  { id: 'FL-007', partnerId: 'PR-020', source: 'carrier_declared', createdAt: '2026-01-15',
    origin: { type: 'city', value: 'Αθήνα', label: 'Αθήνα, Greece', countryCode: 'GR' },
    destination: null },

  // PR-003 Dimitriou Trans — 1 lane (manual)
  { id: 'FL-008', partnerId: 'PR-003', source: 'manual_added', createdAt: '2026-04-05',
    origin: { type: 'region', value: 'central_greece', label: 'Στερεά Ελλάδα, Greece', countryCode: 'GR' },
    destination: { type: 'prefecture', value: 'attikis', label: 'Αττικής', countryCode: 'GR' } },
];

// Default sync log (shown when opening the Partners ERP Sync log panel)
export const DEFAULT_PARTNER_SYNC_LOG = [
  { id: 'PSL-001', ts: '2026-04-15 08:22', status: 'ok', partnerId: 'PR-080', system: 'SAP', msg: 'Customer synced from ERP — FreshCo S.A.' },
  { id: 'PSL-002', ts: '2026-04-15 08:21', status: 'ok', partnerId: 'PR-081', system: 'SAP', msg: 'Customer synced from ERP — Σκλαβενίτης Α.Ε.Ε.' },
  { id: 'PSL-003', ts: '2026-04-15 08:20', status: 'conflict', partnerId: 'PR-082', system: 'SAP', msg: 'VAT number mismatch for Lidl Hellas — kept local value.' },
  { id: 'PSL-004', ts: '2026-04-14 19:10', status: 'ok', partnerId: 'PR-061', system: 'SAP', msg: 'Shipper partner synced — ΔΕΛΤΑ Α.Β.Ε.Ε.' },
  { id: 'PSL-005', ts: '2026-04-14 19:05', status: 'ok', partnerId: 'PR-007', system: 'Soft1', msg: 'Carrier synced — Hellenic Freight Co.' },
  { id: 'PSL-006', ts: '2026-04-13 14:40', status: 'pending', partnerId: 'PR-040', system: 'SAP', msg: 'GlobalShip Forwarders — awaiting bank details verification.' },
];

export function makeErpPartnerSyncLogEntries(partnerCount) {
  const ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return [
    { id: `PSL-NEW-${Date.now()}`, ts, status: 'ok', partnerId: '—', system: 'SAP',
      msg: `Sync completed successfully — ${partnerCount} new partner(s) imported.` },
  ];
}
