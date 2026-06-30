/**
 * settingsData.js — Mock data for Settings page sections:
 * Personal Profile, Organization, Security (personal-level).
 */

// ═══ Current User ═══
export const CURRENT_USER = {
  id: 'USR-001',
  firstName: 'Παύλος',
  lastName: 'Δημητρίου',
  email: 'pavlos@vikos.com',
  phone: '+30 265 102 3456',
  jobTitle: 'CEO',
  department: 'Management',
  timezone: 'Europe/Athens',
  locale: 'el',
  avatarUrl: null,
  role: 'admin',
  roleLabel: 'Admin',
  roleAssignedBy: 'System',
  roleAssignedDate: '2024-01-15',
  isOwner: true,
  mfaEnabled: true,
  mfaMethod: 'authenticator',
  mfaEnabledDate: '2026-01-15',
  lastPasswordChange: '2026-03-15',
  lastLogin: '2026-05-09T09:15:00Z',
  memberSince: '2024-01-15',
  permissions: null,
  customPerms: null,
};

// ═══ Organization ═══
export const ORGANIZATION = {
  id: 'ORG-001',
  legalName: 'ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΕΜΦΙΑΛΩΣΕΩΝ',
  tradeName: 'VIKOS S.A.',
  vatNumber: 'EL094289234',
  registrationNumber: '12345678',
  billingAddress: 'Ιωάννινα, Ήπειρος, 45500',
  country: 'GR',
  defaultCurrency: 'EUR',
  invoiceEmails: ['billing@vikos.com', 'pavlos@vikos.com'],
  accountType: 'shipper',
  logoUrl: null,
  publicProfile: true,
  companyDescription: 'Leading mineral water and beverages company in Epirus, Greece.',
  kycStatus: 'verified',
  kycVerifiedDate: '2024-10-20',
  plan: 'Business',
  totalSeats: 10,
  createdAt: '2024-01-15',
};

export const ORG_OPERATIONAL = {
  primaryLocations: ['Ioannina', 'Thessaloniki', 'Athens'],
  equipmentTypes: ['curtainside', 'reefer', 'box'],
  shipmentProfile: '10-26 pallets, 5-24 tonnes',
  industries: ['beverages', 'fmcg', 'retail'],
  regionsServed: null,
  servicesOffered: null,
  shipperCount: null,
  carrierCount: null,
  operatingLicenseNumber: null,
  operatingLicenseExpiry: null,
  insuranceProvider: null,
  insurancePolicyNumber: null,
  insuranceCoverage: null,
  adrCertified: false,
};

// ═══ Personal Security ═══
export const PERSONAL_SESSIONS = [
  { id: 'SES-001', browser: 'Chrome', os: 'macOS', city: 'Athens', country: 'GR', ip: '192.168.1.x', startedAt: '2026-05-09T09:15:00Z', current: true },
  { id: 'SES-002', browser: 'Safari', os: 'iOS', city: 'Athens', country: 'GR', ip: '10.0.0.x', startedAt: '2026-05-08T14:30:00Z', current: false },
  { id: 'SES-003', browser: 'Firefox', os: 'Windows', city: 'Thessaloniki', country: 'GR', ip: '85.73.x.x', startedAt: '2026-05-06T11:00:00Z', current: false },
];

export const PERSONAL_LOGIN_HISTORY = [
  { id: 'LOG-001', ts: '2026-05-09T09:15:00Z', browser: 'Chrome', os: 'macOS', city: 'Athens', country: 'GR', ip: '192.168.1.x', success: true },
  { id: 'LOG-002', ts: '2026-05-08T14:30:00Z', browser: 'Safari', os: 'iOS', city: 'Athens', country: 'GR', ip: '10.0.0.x', success: true },
  { id: 'LOG-003', ts: '2026-05-06T11:00:00Z', browser: 'Firefox', os: 'Windows', city: 'Thessaloniki', country: 'GR', ip: '85.73.x.x', success: true },
  { id: 'LOG-004', ts: '2026-05-04T08:45:00Z', browser: 'Chrome', os: 'macOS', city: 'Sofia', country: 'BG', ip: '94.156.x.x', success: false },
  { id: 'LOG-005', ts: '2026-05-02T10:20:00Z', browser: 'Chrome', os: 'macOS', city: 'Athens', country: 'GR', ip: '192.168.1.x', success: true },
  { id: 'LOG-006', ts: '2026-04-25T16:00:00Z', browser: 'Safari', os: 'iOS', city: 'Athens', country: 'GR', ip: '10.0.0.x', success: true },
];

export const RECENT_ACTIVITY = [
  { icon: '📦', action: 'Created shipment SHP-4521', ts: '2026-05-09T07:15:00Z' },
  { icon: '✏️', action: 'Edited order ORD-0015', ts: '2026-05-08T11:30:00Z' },
  { icon: '🚛', action: 'Assigned DRV-005 to TRK-001', ts: '2026-05-07T09:00:00Z' },
  { icon: '📋', action: 'Exported price list CSV', ts: '2026-05-06T14:22:00Z' },
  { icon: '🔑', action: 'Password changed', ts: '2026-03-15T10:00:00Z' },
];

export const APPLICATION_HISTORY = [];

export const COMPLETION = {
  personal: 100,
  organization: 85,
  compliance: 100,
  missing: { organization: ['Company logo'] },
};

// ═══ Equipment & Industry labels ═══
export const EQUIPMENT_TYPES = [
  { key: 'curtainside', label: 'Curtain-side' },
  { key: 'reefer', label: 'Refrigerated' },
  { key: 'box', label: 'Box' },
  { key: 'flatbed', label: 'Flatbed' },
  { key: 'tanker', label: 'Tanker' },
];

export const INDUSTRIES = [
  { key: 'beverages', label: 'Beverages' },
  { key: 'fmcg', label: 'FMCG' },
  { key: 'retail', label: 'Retail' },
  { key: 'construction', label: 'Building Materials' },
  { key: 'pharma', label: 'Pharmaceuticals' },
  { key: 'automotive', label: 'Automotive' },
  { key: 'electronics', label: 'Electronics' },
];

export const TIMEZONES = [
  'Europe/Athens', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Rome', 'Europe/Madrid', 'Europe/Istanbul', 'Europe/Moscow',
  'US/Eastern', 'US/Central', 'US/Pacific', 'Asia/Tokyo', 'Asia/Shanghai',
];

// ═══ Recovery codes (mock) ═══
export const RECOVERY_CODES = [
  'ABCD-1234-EFGH', 'IJKL-5678-MNOP', 'QRST-9012-UVWX',
  'YZAB-3456-CDEF', 'GHIJ-7890-KLMN', 'OPQR-1234-STUV',
  'WXYZ-5678-ABCD', 'EFGH-9012-IJKL', 'MNOP-3456-QRST',
  'UVWX-7890-YZAB',
];

// ═══ Helpers ═══
export function relativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function passwordAgeDays(lastChange) {
  if (!lastChange) return 999;
  return Math.floor((Date.now() - new Date(lastChange).getTime()) / 86400000);
}
