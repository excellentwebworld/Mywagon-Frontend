import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from './useTranslation';
import {
  isShipperRbacUnrestricted,
  shipperCan,
  shipperCanAll,
  shipperRbacNames,
} from '../utils/shipperRbac';
import {
  ACTION_RBAC,
  NAV_RBAC,
  resolveRouteRbac,
  type ShipperRbacActionKey,
  type ShipperRbacNavKey,
} from '../utils/shipperRbacMap';
import { RBAC_ACCESS_DENIED_DEFAULT, toastRbacAccessDenied } from '../utils/rbacToast';

export type UseShipperPermissionResult = {
  /** Primary account — Spatie unrestricted. */
  isUnrestricted: boolean;
  /** Normalized Spatie permission names for the current user. */
  permissions: string[];
  /** Any-of when given an array. */
  can: (name: string | string[]) => boolean;
  canAll: (names: string[]) => boolean;
  canNav: (key: ShipperRbacNavKey) => boolean;
  canAction: (key: ShipperRbacActionKey) => boolean;
  canRoute: (pathname: string) => boolean;
  /**
   * Returns true when allowed; otherwise shows a toast and returns false.
   * Does not open the subscription upgrade modal (Spatie ≠ plan entitlement).
   */
  requirePermission: (name: string | string[], message?: string) => boolean;
};

export function useShipperPermission(): UseShipperPermissionResult {
  const { user } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();

  const isUnrestricted = isShipperRbacUnrestricted(user);
  const permissions = useMemo(() => shipperRbacNames(user), [user]);

  const can = useCallback(
    (name: string | string[]) => shipperCan(user, name),
    [user],
  );

  const canAll = useCallback(
    (names: string[]) => shipperCanAll(user, names),
    [user],
  );

  const canNav = useCallback(
    (key: ShipperRbacNavKey) => shipperCan(user, NAV_RBAC[key]),
    [user],
  );

  const canAction = useCallback(
    (key: ShipperRbacActionKey) => shipperCan(user, ACTION_RBAC[key]),
    [user],
  );

  const canRoute = useCallback(
    (pathname: string) => {
      const required = resolveRouteRbac(pathname);
      if (required == null) return true;
      return shipperCan(user, required);
    },
    [user],
  );

  const requirePermission = useCallback(
    (name: string | string[], message?: string) => {
      if (shipperCan(user, name)) return true;
      const msg =
        message ||
        t('rbac.accessDenied', { defaultValue: RBAC_ACCESS_DENIED_DEFAULT });
      toastRbacAccessDenied(showToast, msg);
      return false;
    },
    [user, showToast, t],
  );

  return useMemo(
    () => ({
      isUnrestricted,
      permissions,
      can,
      canAll,
      canNav,
      canAction,
      canRoute,
      requirePermission,
    }),
    [
      isUnrestricted,
      permissions,
      can,
      canAll,
      canNav,
      canAction,
      canRoute,
      requirePermission,
    ],
  );
}
