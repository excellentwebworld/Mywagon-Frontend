/**
 * shipperAccessPresets.ts — Admin/Dispatcher helpers (Blade-parity Spatie values).
 */

/**
 * Display label for system roles (Admin / Dispatcher). Custom roles pass through unchanged.
 */
export function localizeShipperRoleName(
  nameOrKey: string | null | undefined,
  t: (key: string, fallback?: string) => string,
): string {
  const raw = String(nameOrKey || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  if (key === 'admin') return t('roles.admin', 'Admin');
  if (key === 'dispatcher') return t('roles.dispatcher', 'Dispatcher');
  return raw;
}

export type ShipperPresetKey = 'admin' | 'dispatcher';

export const SHIPPER_PRESET_META: Record<
  ShipperPresetKey,
  { name: string; color: string; description: string }
> = {
  admin: {
    name: 'Admin',
    color: '#9B51E0',
    description: 'Full access to all platform features and settings.',
  },
  dispatcher: {
    name: 'Dispatcher',
    color: '#3B82F6',
    description: 'Manages shipments, orders, loads, and day-to-day operations.',
  },
};

/**
 * Explicit Edit/Delete → View dependencies (Spatie / shipper_permissions.value).
 * Additional pairs are inferred via {@link buildPermissionDependencyMaps}.
 */
export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
  edit_company_account_information: ['view_company_account_information'],
  edit_all_existing_shipments: ['view_all_existing_shipments'],
  delete_all_existing_shipments: ['view_all_existing_shipments'],
};

/** @deprecated Prefer buildPermissionDependencyMaps(catalog).dependents */
export const PERMISSION_DEPENDENTS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [perm, deps] of Object.entries(PERMISSION_DEPENDENCIES)) {
    for (const dep of deps) {
      if (!map[dep]) map[dep] = [];
      map[dep].push(perm);
    }
  }
  return map;
})();

/**
 * Build full dependency maps from the live permission catalog.
 * Rule: enabling edit_X or delete_X also requires view_X when present.
 */
export function buildPermissionDependencyMaps(catalogNames: string[]): {
  dependencies: Record<string, string[]>;
  dependents: Record<string, string[]>;
} {
  const catalog = new Set(catalogNames.filter(Boolean));
  const dependencies: Record<string, string[]> = {};

  const addDep = (perm: string, dep: string, requireInCatalog = true) => {
    if (perm === dep) return;
    if (requireInCatalog && !catalog.has(dep)) return;
    if (!dependencies[perm]) dependencies[perm] = [];
    if (!dependencies[perm].includes(dep)) dependencies[perm].push(dep);
  };

  for (const [perm, deps] of Object.entries(PERMISSION_DEPENDENCIES)) {
    for (const dep of deps) addDep(perm, dep, false);
  }

  for (const name of catalog) {
    if (name.startsWith('edit_')) {
      addDep(name, `view_${name.slice('edit_'.length)}`);
    } else if (name.startsWith('delete_')) {
      addDep(name, `view_${name.slice('delete_'.length)}`);
    }
  }

  const dependents: Record<string, string[]> = {};
  for (const [perm, deps] of Object.entries(dependencies)) {
    for (const dep of deps) {
      if (!dependents[dep]) dependents[dep] = [];
      if (!dependents[dep].includes(perm)) dependents[dep].push(perm);
    }
  }

  return { dependencies, dependents };
}

/** Expand a permission list with required View (and other) dependencies. */
export function expandPermissionDependencies(
  names: string[] | null | undefined,
  catalogNames: string[] = [],
): string[] {
  if (!names?.length) return [];
  const { dependencies } = buildPermissionDependencyMaps(
    catalogNames.length ? catalogNames : Object.keys(PERMISSION_DEPENDENCIES),
  );
  const set = new Set<string>();
  const queue = [...names];
  while (queue.length) {
    const name = queue.shift()!;
    if (!name || set.has(name)) continue;
    set.add(name);
    for (const dep of dependencies[name] || []) {
      if (!set.has(dep)) queue.push(dep);
    }
  }
  return Array.from(set);
}

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
    color: '#9B51E0',
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

/** Blade `control` catalog value — required to manage other users via API. */
export const MANAGE_USERS_PERMISSION = 'manage_permissions';

/** Normalize `/auth/me` permissions to Spatie name strings. */
export function permissionNames(
  permissions: Array<string | { name?: string; value?: string; slug?: string | null }> | null | undefined,
): string[] {
  if (!permissions?.length) return [];
  return permissions
    .map((p) => {
      if (typeof p === 'string') return p;
      return p.name || p.value || p.slug || '';
    })
    .filter(Boolean) as string[];
}

/**
 * Mirror UsersController::actorCanManageUsers —
 * main account, or Spatie permission `manage_permissions` (admin pack includes it).
 */
export function canManageShipperUsers(user: {
  is_sub_user?: boolean;
  type?: string;
  permissions?: Array<string | { name?: string; value?: string; slug?: string | null }> | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.is_sub_user !== true && user.type !== 'sub_user') return true;
  return permissionNames(user.permissions).includes(MANAGE_USERS_PERMISSION);
}
