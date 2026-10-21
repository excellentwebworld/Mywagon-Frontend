import { apiGet, apiPut, getStoredToken } from '../client';
import {
  normalizeShipmentSettings,
  type ShipmentSettings,
} from '../../utils/shipmentSettings';

/**
 * MS3-415 — GET/PUT /settings/shipment (company Shipment Settings).
 * GET: any user of the company. PUT: admin (edit_company_account_information).
 */

// Session cache for the Create Shipment defaults, keyed by the auth token so a
// different login in the same tab never reuses another company's settings.
let cached: { token: string | null; settings: ShipmentSettings } | null = null;
let inflight: Promise<ShipmentSettings | null> | null = null;

function remember(settings: ShipmentSettings): ShipmentSettings {
  cached = { token: getStoredToken(), settings };
  return settings;
}

export const shipmentSettingsService = {
  async get(): Promise<ShipmentSettings> {
    const res = await apiGet<ShipmentSettings>('/settings/shipment');
    return remember(normalizeShipmentSettings(res.data));
  },

  async update(body: Partial<ShipmentSettings>): Promise<ShipmentSettings> {
    const res = await apiPut<ShipmentSettings>('/settings/shipment', body);
    return remember(normalizeShipmentSettings(res.data));
  },

  /** Settings already loaded this session for the current login, else null. */
  peekCached(): ShipmentSettings | null {
    if (!cached || cached.token !== getStoredToken()) return null;
    return cached.settings;
  },

  /**
   * One fetch per session for the Create Shipment defaults. Resolves null on
   * failure (callers fall back to On / Private / Negotiable); a failure is not
   * cached, so the next new load tries again.
   */
  loadOnce(): Promise<ShipmentSettings | null> {
    const hit = shipmentSettingsService.peekCached();
    if (hit) return Promise.resolve(hit);
    if (!inflight) {
      inflight = shipmentSettingsService
        .get()
        .catch(() => null)
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },

  /** Test hook. */
  resetCache(): void {
    cached = null;
    inflight = null;
  },
};
