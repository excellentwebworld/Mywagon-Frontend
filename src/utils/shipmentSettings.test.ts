import { describe, expect, it } from 'vitest';
import {
  SHIPMENT_SETTINGS_DEFAULTS,
  applyShipmentSettingsToWizard,
  normalizeShipmentSettings,
  shipmentSettingsDiff,
  shipmentSettingsKey,
  shipmentSettingsToWizardFields,
} from './shipmentSettings';
import { buildDefaultWizardValues } from '../components/CreateShipmentWizard/types';
import { draftToFormValues } from '../api/mappers/createShipmentMapper';
import { NAV_RBAC, SHIPPER_RBAC, resolveRouteRbac } from './shipperRbacMap';
import { shipperCan } from './shipperRbac';

describe('MS3-415 shipment settings', () => {
  it('brand-new account defaults are On / Private / Negotiable', () => {
    expect(SHIPMENT_SETTINGS_DEFAULTS).toEqual({
      live_navigation: true,
      broadcast_type: 'private',
      price_type: 'negotiable',
    });
    expect(shipmentSettingsToWizardFields(null)).toEqual({
      broadcastType: 'private',
      negotiable: true,
      gpsRequired: true,
    });
  });

  it('normalizes API payloads field by field and falls back on junk', () => {
    expect(normalizeShipmentSettings({ live_navigation: false, broadcast_type: 'PUBLIC', price_type: 'fixed' }))
      .toEqual({ live_navigation: false, broadcast_type: 'public', price_type: 'fixed' });
    expect(normalizeShipmentSettings({ live_navigation: '0', broadcast_type: 'everyone', price_type: 7 }))
      .toEqual({ live_navigation: false, broadcast_type: 'private', price_type: 'negotiable' });
    expect(normalizeShipmentSettings(null)).toEqual(SHIPMENT_SETTINGS_DEFAULTS);
    expect(normalizeShipmentSettings('nope')).toEqual(SHIPMENT_SETTINGS_DEFAULTS);
  });

  it('applies the company settings to blank Create Shipment values', () => {
    const values = applyShipmentSettingsToWizard(buildDefaultWizardValues(), {
      live_navigation: false,
      broadcast_type: 'public',
      price_type: 'fixed',
    });
    expect(values.broadcastType).toBe('public');
    expect(values.negotiable).toBe(false);
    expect(values.gpsRequired).toBe(false);
    // Unrelated fields untouched.
    expect(values.targetPrice).toBe('');
    expect(values.stops).toHaveLength(2);
  });

  it('stored draft values win over the company defaults', () => {
    const defaults = applyShipmentSettingsToWizard(buildDefaultWizardValues(), {
      live_navigation: false,
      broadcast_type: 'public',
      price_type: 'fixed',
    });
    const stored = draftToFormValues(
      {
        id: 1,
        auto_id: 'SID-1',
        wizard_state: { broadcastType: 'private', negotiable: true, gpsRequired: true },
      } as never,
      defaults,
    );
    expect(stored.broadcastType).toBe('private');
    expect(stored.negotiable).toBe(true);
    expect(stored.gpsRequired).toBe(true);

    const unset = draftToFormValues({ id: 2, auto_id: 'SID-2', wizard_state: {} } as never, defaults);
    expect(unset.broadcastType).toBe('public');
    expect(unset.negotiable).toBe(false);
    expect(unset.gpsRequired).toBe(false);
  });

  it('diff sends only the changed keys', () => {
    const saved = { ...SHIPMENT_SETTINGS_DEFAULTS };
    expect(shipmentSettingsDiff(saved, saved)).toEqual({});
    expect(shipmentSettingsDiff(saved, { ...saved, price_type: 'fixed' })).toEqual({ price_type: 'fixed' });
    expect(shipmentSettingsDiff(saved, { live_navigation: false, broadcast_type: 'public', price_type: 'negotiable' }))
      .toEqual({ live_navigation: false, broadcast_type: 'public' });
  });

  it('key is stable for equal values and null = defaults', () => {
    expect(shipmentSettingsKey(null)).toBe(shipmentSettingsKey({ ...SHIPMENT_SETTINGS_DEFAULTS }));
    expect(shipmentSettingsKey({ ...SHIPMENT_SETTINGS_DEFAULTS, live_navigation: false }))
      .not.toBe(shipmentSettingsKey(null));
  });

  it('page is admin-gated by edit_company_account_information', () => {
    expect(NAV_RBAC.shipmentSettings).toBe(SHIPPER_RBAC.editCompanyInfo);
    expect(resolveRouteRbac('/settings/shipment')).toBe(SHIPPER_RBAC.editCompanyInfo);

    const primary = { is_sub_user: false, type: 'shipper' };
    const dispatcher = { is_sub_user: true, type: 'sub_user', permissions: ['view_company_account_information'] };
    const admin = {
      is_sub_user: true,
      type: 'sub_user',
      permissions: ['view_company_account_information', 'edit_company_account_information'],
    };
    expect(shipperCan(primary, NAV_RBAC.shipmentSettings)).toBe(true);
    expect(shipperCan(dispatcher, NAV_RBAC.shipmentSettings)).toBe(false);
    expect(shipperCan(admin, NAV_RBAC.shipmentSettings)).toBe(true);
  });
});
