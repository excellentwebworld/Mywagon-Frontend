/**
 * shipperAccessPresets.ts — Admin/Dispatcher helpers (Blade-parity Spatie values).
 */

export type ShipperPresetKey = 'admin' | 'dispatcher';

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

/** Company-account dependency (Blade parity). */
export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  edit_company_account_information: ['view_company_account_information'],
};

export const PERMISSION_DEPENDENTS: Record<string, string[]> = {
  view_company_account_information: ['edit_company_account_information'],
};

export function expandPresetPermissions(
  role: string,
  rolePermissionNames?: string[] | null,
): string[] | null {
  const key = String(role || '').toLowerCase() as ShipperPresetKey;
  if (key === 'admin') return null;
  if (rolePermissionNames) return [...rolePermissionNames];
  return [];
}

export function seedDirectPermissionsForInvite(
  role: string,
  rolePermissionNames?: string[] | null,
): string[] | null {
  return expandPresetPermissions(role, rolePermissionNames);
}

function sortedCopy(list: string[] | null | undefined): string {
  if (list == null) return '__ALL__';
  return [...list].sort().join('|');
}

export function hasCustomDirectPermissions(user: {
  role?: string;
  directPermissions?: string[] | null;
  direct_permissions?: string[] | null;
  customPerms?: string[] | null;
  has_custom_permissions?: boolean;
}): boolean {
  if (typeof user.has_custom_permissions === 'boolean') {
    return user.has_custom_permissions;
  }
  const direct =
    user.directPermissions !== undefined
      ? user.directPermissions
      : user.direct_permissions !== undefined
        ? user.direct_permissions
        : user.customPerms;
  if (direct === undefined || direct === null) return false;
  const preset = expandPresetPermissions(user.role || 'dispatcher');
  if (preset === null) return true;
  return sortedCopy(direct) !== sortedCopy(preset);
}

export function resolveShipperPresetLabel(role: string): { name: string; color: string } {
  const key = String(role || '').toLowerCase() as ShipperPresetKey;
  if (key === 'admin' || key === 'dispatcher') return SHIPPER_PRESET_META[key];
  return SHIPPER_PRESET_META.dispatcher;
}

/** Static Admin/Dispatcher for filters when roles API not loaded yet. */
export const SHIPPER_ROLES = [
  {
    id: 'role-admin',
    key: 'admin',
    name: 'Admin',
    color: '#7C3AED',
    isSystem: true,
    description: SHIPPER_PRESET_META.admin.description,
    permissions: null as string[] | null,
    userCount: 0,
  },
  {
    id: 'role-dispatcher',
    key: 'dispatcher',
    name: 'Dispatcher',
    color: '#3B82F6',
    isSystem: true,
    description: SHIPPER_PRESET_META.dispatcher.description,
    permissions: [] as string[],
    userCount: 0,
  },
];

export const ROLES_BY_KEY: Record<string, (typeof SHIPPER_ROLES)[number]> = {};
SHIPPER_ROLES.forEach((r) => {
  ROLES_BY_KEY[r.key] = r;
});
