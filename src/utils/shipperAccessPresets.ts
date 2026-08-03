/**
 * shipperAccessPresets.ts — Admin/Dispatcher permission presets (PDS-937 Phase 2).
 *
 * Hybrid model:
 * - `role` = UI preset label (admin | dispatcher) — maps to future role tables / Spatie
 * - `directPermissions` = source of truth for access — maps to old `shipper_user_permissions`
 *   / `permission_val[]` and future role overrides
 *
 * Backend follow-up (not wired here): migrate old → new tables, dual-write via
 * UserAccessService while Blade + React both live, then cut over to single SoT.
 */

export type ShipperPresetKey = 'admin' | 'dispatcher';

/** Dispatcher preset keys — keep in sync with SHIPPER_ROLES.dispatcher in userMgmtData.js */
export const DISPATCHER_PRESET_PERMISSIONS: string[] = [
  'shipment.create', 'shipment.edit', 'shipment.cancel', 'shipment.view',
  'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.split', 'orders.groups', 'orders.ai_optimizer',
  'master.address_book', 'master.products', 'master.partners',
  'loads.view', 'loads.create', 'loads.assign_carrier', 'loads.assign_fleet', 'loads.track', 'loads.confirm_delivery',
  'fleet.view', 'fleet.assign',
  'docs.upload', 'docs.review', 'docs.request',
  'partners.view', 'partners.manage',
  'analytics.basic',
];

export const SHIPPER_PRESET_META: Record<
  ShipperPresetKey,
  { name: string; color: string; description: string }
> = {
  admin: {
    name: 'Admin',
    color: '#7C3AED',
    description: 'Full access to all platform features and settings.',
  },
  dispatcher: {
    name: 'Dispatcher',
    color: '#3B82F6',
    description: 'Manages shipments, orders, loads, and day-to-day operations.',
  },
};

/** Expand a preset into a permission list. `null` = full access (Admin). */
export function expandPresetPermissions(role: string): string[] | null {
  const key = String(role || '').toLowerCase() as ShipperPresetKey;
  if (key === 'admin') return null;
  if (key === 'dispatcher') return [...DISPATCHER_PRESET_PERMISSIONS];
  return [...DISPATCHER_PRESET_PERMISSIONS];
}

/** Seed directPermissions when inviting: Admin → null (all); Dispatcher → copy of preset. */
export function seedDirectPermissionsForInvite(role: string): string[] | null {
  return expandPresetPermissions(role);
}

function sortedCopy(list: string[] | null | undefined): string {
  if (list == null) return '__ALL__';
  return [...list].sort().join('|');
}

/** True when user's directPermissions differ from their role preset (custom access). */
export function hasCustomDirectPermissions(user: {
  role?: string;
  directPermissions?: string[] | null;
  customPerms?: string[] | null;
}): boolean {
  const direct = user.directPermissions !== undefined ? user.directPermissions : user.customPerms;
  // null/undefined = follow preset (Admin full / Dispatcher template) — not custom
  if (direct === undefined || direct === null) return false;
  const preset = expandPresetPermissions(user.role || 'dispatcher');
  // Explicit list on Admin (full-access preset) always counts as override
  if (preset === null) return true;
  return sortedCopy(direct) !== sortedCopy(preset);
}

export function resolveShipperPresetLabel(role: string): { name: string; color: string } {
  const key = String(role || '').toLowerCase() as ShipperPresetKey;
  if (key === 'admin' || key === 'dispatcher') return SHIPPER_PRESET_META[key];
  return SHIPPER_PRESET_META.dispatcher;
}
