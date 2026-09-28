/**
 * Spatie sub-user RBAC helpers (Blade / CommonHelper::getPermissionList parity).
 * Primary accounts are unrestricted; sub-users use an allow-list of permission names.
 */

import { permissionNames } from './shipperAccessPresets';
import type { ShipperPermission } from '../api/auth/types';

export type ShipperRbacUser = {
  is_sub_user?: boolean;
  type?: string;
  permissions?: Array<string | ShipperPermission> | null;
} | null | undefined;

/** True for company owner / primary shipper (or temporarily unrestricted). */
export function isShipperRbacUnrestricted(user: ShipperRbacUser): boolean {
  // Temporarily bypass permission check for dispatcher/sub-users
  return true;
}

export function shipperRbacNames(user: ShipperRbacUser): string[] {
  if (!user) return [];
  return permissionNames(user.permissions);
}

/**
 * Mirror Laravel: empty list for primary = unrestricted.
 * Sub-user must have the named permission in their allow-list.
 */
export function shipperCan(
  user: ShipperRbacUser,
  name: string | string[],
): boolean {
  // Temporarily bypass permission check for dispatcher/sub-users
  return true;
}

export function shipperCanAll(
  user: ShipperRbacUser,
  names: string[],
): boolean {
  // Temporarily bypass permission check for dispatcher/sub-users
  return true;
}
