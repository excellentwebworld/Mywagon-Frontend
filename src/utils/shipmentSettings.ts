/**
 * MS3-415 — company Shipment Settings (Settings → Admin → Shipment Settings).
 * Pure helpers: shape of GET/PUT /settings/shipment and how a new Create Shipment
 * form takes its defaults from it. A per-load choice always overrides these.
 */

export type ShipmentBroadcastType = 'private' | 'public';
export type ShipmentPriceType = 'negotiable' | 'fixed';

export type ShipmentSettings = {
  live_navigation: boolean;
  broadcast_type: ShipmentBroadcastType;
  price_type: ShipmentPriceType;
};

/** Brand-new account defaults; also the fallback when the settings call fails. */
export const SHIPMENT_SETTINGS_DEFAULTS: Readonly<ShipmentSettings> = Object.freeze({
  live_navigation: true,
  broadcast_type: 'private',
  price_type: 'negotiable',
});

function toBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

/** Coerce an API payload (or anything) to valid settings, field by field. */
export function normalizeShipmentSettings(raw: unknown): ShipmentSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const live = toBool(src.live_navigation);
  const broadcast = typeof src.broadcast_type === 'string' ? src.broadcast_type.trim().toLowerCase() : '';
  const price = typeof src.price_type === 'string' ? src.price_type.trim().toLowerCase() : '';

  return {
    live_navigation: live ?? SHIPMENT_SETTINGS_DEFAULTS.live_navigation,
    broadcast_type:
      broadcast === 'public' || broadcast === 'private'
        ? broadcast
        : SHIPMENT_SETTINGS_DEFAULTS.broadcast_type,
    price_type:
      price === 'negotiable' || price === 'fixed' ? price : SHIPMENT_SETTINGS_DEFAULTS.price_type,
  };
}

/** Create-wizard field values for the given settings (null = account defaults). */
export function shipmentSettingsToWizardFields(settings: ShipmentSettings | null | undefined): {
  broadcastType: ShipmentBroadcastType;
  negotiable: boolean;
  gpsRequired: boolean;
} {
  const s = settings ?? SHIPMENT_SETTINGS_DEFAULTS;
  return {
    broadcastType: s.broadcast_type,
    negotiable: s.price_type === 'negotiable',
    gpsRequired: s.live_navigation,
  };
}

/**
 * Overlay the company defaults on blank Create Shipment values. Only used to
 * build the defaults for a new load; stored draft / shipment values win because
 * the mapper reads them first and falls back to these.
 */
export function applyShipmentSettingsToWizard<
  T extends { broadcastType: ShipmentBroadcastType; negotiable: boolean; gpsRequired: boolean },
>(values: T, settings: ShipmentSettings | null | undefined): T {
  return { ...values, ...shipmentSettingsToWizardFields(settings) };
}

/** Stable identity for memoising on settings values (null = account defaults). */
export function shipmentSettingsKey(settings: ShipmentSettings | null | undefined): string {
  const s = settings ?? SHIPMENT_SETTINGS_DEFAULTS;
  return `${s.live_navigation ? 1 : 0}|${s.broadcast_type}|${s.price_type}`;
}

/** Partial PUT body: only the keys that differ from what is saved. */
export function shipmentSettingsDiff(
  saved: ShipmentSettings,
  next: ShipmentSettings,
): Partial<ShipmentSettings> {
  const diff: Partial<ShipmentSettings> = {};
  if (saved.live_navigation !== next.live_navigation) diff.live_navigation = next.live_navigation;
  if (saved.broadcast_type !== next.broadcast_type) diff.broadcast_type = next.broadcast_type;
  if (saved.price_type !== next.price_type) diff.price_type = next.price_type;
  return diff;
}
