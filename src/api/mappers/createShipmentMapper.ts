import type { ApiStop, ApiWizardState, SaveStepOnePayload, SaveStepThreePayload, SaveStepTwoPayload } from '../types/createShipment';
import { createNewCargoLine, createNewStop } from '../../components/CreateShipmentWizard/types';
import { computeItineraryFingerprint } from '../../components/CreateShipmentWizard/itineraryFingerprint';
import { normalizeQtyUnit, normalizeWeightUnit } from '../../constants/cargoUnits';

/** Coerce draft vehicleSpecs keys/ids to strings so lookup by formKey always matches. */
export function normalizeVehicleSpecs(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;
    out[String(key)] = value.map((id) => String(id));
  });
  return out;
}

export function isUninitializedTrackingEmails(emails: string[] | undefined): boolean {
  if (!emails || emails.length === 0) return true;
  return emails.every((email) => email.trim() === '');
}

/** Stable order of ERP order ids used by the Tracking Links UI. */
export function extractTrackingOrderIds(stops: ApiStop[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];

  stops.forEach((stop) => {
    (stop.lines || []).forEach((line) => {
      if (!line.productId) return;
      const orderId = line.orderId ? String(line.orderId) : line.orderRef;
      if (!orderId || seen.has(orderId)) return;
      seen.add(orderId);
      ids.push(orderId);
    });
  });

  return ids;
}

/**
 * Wizard state may store tracking emails as a nested JSON array (PHP re-indexed keys).
 * Remap those back to order-id keyed records the UI and publish flow expect.
 */
export function normalizeTrackingEmails(
  raw: unknown,
  orderIds: string[]
): Record<string, string[]> {
  const orderIdSet = new Set(orderIds);
  const result: Record<string, string[]> = {};

  const assignEmails = (orderId: string, emails: unknown) => {
    if (!orderIdSet.has(orderId) || !Array.isArray(emails)) return;
    // Preserve empty slots so "+ Add email" inputs stay visible while editing.
    result[orderId] = emails.map((email) => String(email));
  };

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  if (Array.isArray(raw)) {
    raw.forEach((emails, index) => {
      const orderId = orderIds[index];
      if (orderId) assignEmails(orderId, emails);
    });
    return result;
  }

  const entries = Object.entries(raw as Record<string, unknown>);

  for (const [key, emails] of entries) {
    if (orderIdSet.has(key)) {
      assignEmails(key, emails);
    }
  }
  if (Object.keys(result).length > 0) {
    return result;
  }

  entries
    .filter(([key, emails]) => /^\d+$/.test(key) && Array.isArray(emails))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([, emails], index) => {
      const orderId = orderIds[index];
      if (orderId) assignEmails(orderId, emails);
    });

  return result;
}

export function sanitizeTrackingEmails(
  raw: Record<string, string[]> | undefined
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [orderId, emails] of Object.entries(raw || {})) {
    const cleaned = (emails || []).map((email) => email.trim()).filter(Boolean);
    if (cleaned.length > 0) {
      out[orderId] = cleaned;
    }
  }
  return out;
}

export interface WizardFormValues {
  loadId: string;
  custRef: string;
  coOwners: string[];
  stops: ApiStop[];
  itineraryConfirmed: boolean;
  itineraryConfirmSnapshot: string;
  routeSummary: { totalDistKm: number; totalDriveMin: number } | null;
  vehicleSpecs: Record<string, string[]>;
  vehicleSelectionConfirmed: boolean;
  broadcastType: 'private' | 'public';
  selectedCarriers: string[];
  targetPrice: string;
  negotiable: boolean;
  trackingEmails: Record<string, string[]>;
  driverNotes: string;
  gpsRequired: boolean;
  orderValue: string;
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function formValuesToStepOnePayload(
  values: Pick<WizardFormValues, 'stops' | 'custRef' | 'coOwners'>,
  mode: SaveStepOnePayload['mode']
): SaveStepOnePayload {
  const stops = (values.stops || []).map((stop) => ({
    ...stop,
    lines: (stop.lines || []).map((line) => ({
      ...line,
      unit: normalizeQtyUnit(line.unit) || line.unit || 'EUR Pallets',
      wtUnit: normalizeWeightUnit(line.wtUnit),
    })),
  }));

  return {
    mode,
    customer_reference: values.custRef || '',
    co_owners: values.coOwners || [],
    stops,
    timezone: browserTimezone(),
  };
}

export function draftToFormValues(
  draft: { auto_id: string; customer_reference?: string | null; wizard_state?: ApiWizardState | unknown },
  defaults: WizardFormValues
): WizardFormValues {
  const rawState = draft.wizard_state;
  const state: ApiWizardState =
    rawState && typeof rawState === 'object' && !Array.isArray(rawState)
      ? (rawState as ApiWizardState)
      : {};

  const stops =
    Array.isArray(state.stops) && state.stops.length > 0
      ? state.stops.map((stop) => ({
          ...createNewStop(false),
          ...stop,
          lines:
            Array.isArray(stop.lines) && stop.lines.length > 0
              ? stop.lines.map((line) => ({
                  ...createNewCargoLine(),
                  ...line,
                  unit: normalizeQtyUnit(line.unit) || line.unit || 'EUR Pallets',
                  wtUnit: normalizeWeightUnit(line.wtUnit),
                }))
              : [createNewCargoLine()],
        }))
      : defaults.stops;

  return {
    ...defaults,
    loadId: draft.auto_id || state.loadId || defaults.loadId,
    custRef: draft.customer_reference ?? state.custRef ?? defaults.custRef,
    coOwners: state.coOwners ?? defaults.coOwners,
    stops,
    itineraryConfirmed: state.itineraryConfirmed ?? defaults.itineraryConfirmed,
    itineraryConfirmSnapshot:
      state.itineraryConfirmSnapshot ??
      (state.itineraryConfirmed ? computeItineraryFingerprint(stops) : defaults.itineraryConfirmSnapshot),
    routeSummary: state.routeSummary
      ? {
          totalDistKm: Number(state.routeSummary.total_dist_km ?? 0),
          totalDriveMin: Number(state.routeSummary.total_drive_min ?? 0),
        }
      : defaults.routeSummary,
    vehicleSpecs: (() => {
      const stateRecord = state as ApiWizardState & { vehicle_specs?: unknown };
      const raw = stateRecord.vehicleSpecs ?? stateRecord.vehicle_specs;
      return raw != null ? normalizeVehicleSpecs(raw) : defaults.vehicleSpecs;
    })(),
    vehicleSelectionConfirmed:
      state.vehicleSelectionConfirmed ?? defaults.vehicleSelectionConfirmed,
    broadcastType: state.broadcastType ?? defaults.broadcastType,
    selectedCarriers: (state.selectedCarriers ?? defaults.selectedCarriers)
      .map((id) => String(id))
      .filter((id) => /^\d+$/.test(id)),
    targetPrice: state.targetPrice ?? defaults.targetPrice,
    negotiable: state.negotiable ?? defaults.negotiable,
    trackingEmails: normalizeTrackingEmails(
      state.trackingEmails ?? defaults.trackingEmails,
      extractTrackingOrderIds(stops)
    ),
    driverNotes: state.driverNotes ?? defaults.driverNotes,
    gpsRequired: state.gpsRequired ?? defaults.gpsRequired,
    orderValue: state.orderValue ?? defaults.orderValue,
  };
}

export function formValuesToStepThreePayload(
  values: Pick<
    WizardFormValues,
    | 'stops'
    | 'broadcastType'
    | 'selectedCarriers'
    | 'targetPrice'
    | 'negotiable'
    | 'trackingEmails'
    | 'driverNotes'
    | 'gpsRequired'
    | 'orderValue'
    | 'vehicleSpecs'
    | 'vehicleSelectionConfirmed'
  >,
  mode: SaveStepThreePayload['mode']
): SaveStepThreePayload {
  const targetPrice = parseFloat(String(values.targetPrice ?? ''));
  const selectedCarriers = (values.selectedCarriers || [])
    .map((id) => parseInt(String(id), 10))
    .filter((id) => !Number.isNaN(id) && id > 0);

  const orderValue = parseFloat(String(values.orderValue ?? ''));
  const trackingOrderIds = extractTrackingOrderIds(values.stops || []);
  const trackingEmails = sanitizeTrackingEmails(
    normalizeTrackingEmails(values.trackingEmails, trackingOrderIds)
  );

  const payload: SaveStepThreePayload = {
    mode,
    broadcast_type: values.broadcastType,
    selected_carriers: selectedCarriers,
    target_price: Number.isNaN(targetPrice) ? undefined : targetPrice,
    negotiable: Boolean(values.negotiable),
    tracking_emails: trackingEmails,
    driver_notes: values.driverNotes || '',
    gps_required: Boolean(values.gpsRequired),
    bulk_mode: 'single',
    order_value: Number.isNaN(orderValue) || orderValue <= 0 ? undefined : orderValue,
  };

  // Re-assert vehicles when present so Step 3 Save Draft keeps Step 2 selection.
  // Omit when empty so a wiped client form cannot clear persisted vehicleSpecs.
  const vehicleSpecs = normalizeVehicleSpecs(values.vehicleSpecs);
  const hasVehicles = Object.values(vehicleSpecs).some((ids) => ids.length > 0);
  if (hasVehicles) {
    payload.vehicle_specs = vehicleSpecs;
    payload.vehicle_selection_confirmed = Boolean(values.vehicleSelectionConfirmed);
  }

  return payload;
}

export function formValuesToStepTwoPayload(
  values: Pick<
    WizardFormValues,
    | 'itineraryConfirmed'
    | 'itineraryConfirmSnapshot'
    | 'routeSummary'
    | 'vehicleSpecs'
    | 'vehicleSelectionConfirmed'
  >,
  mode: SaveStepTwoPayload['mode']
): SaveStepTwoPayload {
  return {
    mode,
    itinerary_confirmed: Boolean(values.itineraryConfirmed),
    itinerary_confirm_snapshot: values.itineraryConfirmSnapshot || undefined,
    route_summary: values.routeSummary
      ? {
          total_dist_km: values.routeSummary.totalDistKm,
          total_drive_min: values.routeSummary.totalDriveMin,
        }
      : undefined,
    vehicle_specs: normalizeVehicleSpecs(values.vehicleSpecs),
    vehicle_selection_confirmed: Boolean(values.vehicleSelectionConfirmed),
  };
}

export function formValuesToWizardState(values: WizardFormValues): ApiWizardState {
  return {
    stops: values.stops,
    custRef: values.custRef,
    coOwners: values.coOwners,
    loadId: values.loadId,
    itineraryConfirmed: values.itineraryConfirmed,
    itineraryConfirmSnapshot: values.itineraryConfirmSnapshot,
    routeSummary: values.routeSummary
      ? {
          total_dist_km: values.routeSummary.totalDistKm,
          total_drive_min: values.routeSummary.totalDriveMin,
        }
      : undefined,
    vehicleSpecs: values.vehicleSpecs,
    vehicleSelectionConfirmed: values.vehicleSelectionConfirmed,
    broadcastType: values.broadcastType,
    selectedCarriers: values.selectedCarriers,
    targetPrice: values.targetPrice,
    negotiable: values.negotiable,
    trackingEmails: values.trackingEmails,
    driverNotes: values.driverNotes,
    gpsRequired: values.gpsRequired,
    orderValue: values.orderValue,
  };
}
