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

/** True for company owner / primary shipper (not a sub-user). */
export function isShipperRbacUnrestricted(user: ShipperRbacUser): boolean {
  if (!user) return false;
  return user.is_sub_user !== true && user.type !== 'sub_user';
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
  if (!user) return false;
  if (isShipperRbacUnrestricted(user)) return true;
  const names = Array.isArray(name) ? name : [name];
  if (names.length === 0) return true;
  const granted = new Set(shipperRbacNames(user));
  return names.some((n) => granted.has(n));
}

export function shipperCanAll(
  user: ShipperRbacUser,
  names: string[],
): boolean {
  if (!user) return false;
  if (isShipperRbacUnrestricted(user)) return true;
  if (names.length === 0) return true;
  const granted = new Set(shipperRbacNames(user));
  return names.every((n) => granted.has(n));
}
