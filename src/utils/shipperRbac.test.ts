import { describe, expect, it } from 'vitest';
import {
  isShipperRbacUnrestricted,
  shipperCan,
  shipperCanAll,
  shipperRbacNames,
} from './shipperRbac';
import { resolveRouteRbac, SHIPPER_RBAC } from './shipperRbacMap';

describe('shipperRbac helpers', () => {
  const primary = {
    is_sub_user: false,
    type: 'shipper',
    permissions: [] as string[],
  };

  const dispatcher = {
    is_sub_user: true,
    type: 'sub_user',
    permissions: [
      SHIPPER_RBAC.newShipment,
      SHIPPER_RBAC.viewAllShipments,
      SHIPPER_RBAC.searchPublicTrucks,
    ],
  };

  it('treats primary account as unrestricted', () => {
    expect(isShipperRbacUnrestricted(primary)).toBe(true);
    expect(shipperCan(primary, SHIPPER_RBAC.managePermissions)).toBe(true);
    expect(shipperCanAll(primary, [SHIPPER_RBAC.manageSubscriptions])).toBe(true);
  });

  it('restricts sub-users to allow-list', () => {
    expect(isShipperRbacUnrestricted(dispatcher)).toBe(false);
    expect(shipperCan(dispatcher, SHIPPER_RBAC.newShipment)).toBe(true);
    expect(shipperCan(dispatcher, SHIPPER_RBAC.managePermissions)).toBe(false);
    expect(
      shipperCan(dispatcher, [
        SHIPPER_RBAC.managePermissions,
        SHIPPER_RBAC.newShipment,
      ]),
    ).toBe(true);
    expect(
      shipperCanAll(dispatcher, [
        SHIPPER_RBAC.newShipment,
        SHIPPER_RBAC.managePermissions,
      ]),
    ).toBe(false);
  });

  it('normalizes object-shaped permissions', () => {
    const user = {
      is_sub_user: true,
      type: 'sub_user',
      permissions: [{ value: 'view_quotes' }, { name: 'chat_with_carrier' }],
    };
    expect(shipperRbacNames(user)).toEqual(['view_quotes', 'chat_with_carrier']);
    expect(shipperCan(user, SHIPPER_RBAC.viewQuotes)).toBe(true);
  });

  it('denies when user is null', () => {
    expect(shipperCan(null, SHIPPER_RBAC.newShipment)).toBe(false);
    expect(isShipperRbacUnrestricted(null)).toBe(false);
  });
});

describe('resolveRouteRbac', () => {
  it('picks the longest matching prefix', () => {
    expect(resolveRouteRbac('/shipments/create/step/1')).toBe(
      SHIPPER_RBAC.newShipment,
    );
    expect(resolveRouteRbac('/shipments/42')).toBe(SHIPPER_RBAC.viewAllShipments);
    expect(resolveRouteRbac('/settings/users/roles')).toBe(
      SHIPPER_RBAC.managePermissions,
    );
    expect(resolveRouteRbac('/dashboard')).toBeNull();
  });
});
