import React from 'react';

export const FACILITY_TYPES = ['dc', 'warehouse', 'plant', 'store', 'port', 'other'] as const;

export const FACILITY_TYPE_LABELS: Record<string, string> = {
  dc: 'DC',
  warehouse: 'Warehouse',
  plant: 'Plant',
  store: 'Store',
  port: 'Port',
  other: 'Other',
};

/** Map UI/legacy labels to API enum values (dc | warehouse | plant | store | port | other). */
export function normalizeFacilityType(type: string | null | undefined): (typeof FACILITY_TYPES)[number] {
  if (!type?.trim()) return 'warehouse';

  const normalized = type.trim().toLowerCase();
  if ((FACILITY_TYPES as readonly string[]).includes(normalized)) {
    return normalized as (typeof FACILITY_TYPES)[number];
  }

  const aliases: Record<string, (typeof FACILITY_TYPES)[number]> = {
    'cross-dock': 'dc',
    'cross dock': 'dc',
    'distribution center': 'dc',
    'distribution centre': 'dc',
    office: 'other',
    factory: 'plant',
  };

  return aliases[normalized] ?? 'other';
}

export const FACILITY_TYPE_COLORS: Record<string, string> = {
  dc: '#7C3AED',
  warehouse: '#0EA5E9',
  plant: '#10B981',
  store: '#F59E0B',
  port: '#0891B2',
  other: '#8E8E9A',
};

/** @deprecated Use FACILITY_TYPE_COLORS */
export const TYPE_COLORS: Record<string, string> = {
  ...FACILITY_TYPE_COLORS,
  Warehouse: '#0EA5E9',
  Plant: '#10B981',
  Store: '#F59E0B',
  Office: '#8E8E9A',
  'Cross-dock': '#7C3AED',
  Port: '#0891B2',
};

export const LOCATION_TYPES = FACILITY_TYPES;

export const PAGE_SIZE_OPTIONS = [10, 12, 25, 50, 100] as const;

export const DEFAULT_PAGE_SIZE = 12;

export function getSystemDirectories(lang: 'en' | 'el'): { id: string; name: string; icon: string }[] {
  return [
    { id: 'all', name: lang === 'el' ? 'Όλες οι Τοποθεσίες' : 'All Locations', icon: 'home' },
    { id: 'my', name: lang === 'el' ? 'Οι Τοποθεσίες μου' : 'My Locations', icon: 'briefcase' },
    { id: 'customer', name: lang === 'el' ? 'Τοποθεσίες Πελατών' : 'Customer Locations', icon: 'users' },
    { id: 'archived', name: lang === 'el' ? 'Αρχειοθετημένα' : 'Archived', icon: 'archive' },
  ];
}

export const DOCK_TYPES = ['Dock-level', 'Ramp', 'Ground'] as const;

export const EQUIPMENT_OPTIONS = ['Forklift', 'Pallet jack', 'Crane', 'Dock plate', 'Loading ramp'] as const;

export const CONTACT_ROLES = ['Receiving', 'Gate/Security', 'After-hours', 'Billing', 'Reception'] as const;

export const FILTER_PILLS: { key: 'role' | 'type' | 'city' | 'appt' | 'hours' | 'active'; label: string }[] = [
  { key: 'role', label: '📍 Role' },
  { key: 'type', label: '🏭 Type' },
  { key: 'city', label: '🏙️ City' },
  { key: 'appt', label: '📅 Appointment' },
  { key: 'hours', label: '🕐 Hours' },
  { key: 'active', label: '✅ Active' },
];

export const SORT_OPTIONS = ['Name A–Z', 'City', 'Last used', 'Created'] as const;

export const TEMPLATE_OPTIONS = [
  { id: 'retail', icon: '🏪', label: 'Retail DC' },
  { id: 'factory', icon: '🏭', label: 'Factory' },
  { id: 'warehouse', icon: '📦', label: 'Warehouse' },
  { id: 'store', icon: '🏬', label: 'Store' },
] as const;

export const ICON_NAMES = ['folder', 'tag', 'star', 'truck', 'briefcase', 'users', 'home', 'archive'] as const;

export const DIR_ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 5v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
};
