import type { ApiStop, ApiWizardState, SaveStepOnePayload, SaveStepThreePayload, SaveStepTwoPayload } from '../types/createShipment';
import { createNewCargoLine, createNewStop } from '../../components/CreateShipmentWizard/types';
import { computeItineraryFingerprint } from '../../components/CreateShipmentWizard/itineraryFingerprint';
import { normalizeWeightUnit } from '../../constants/cargoUnits';

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
    vehicleSpecs: state.vehicleSpecs ?? defaults.vehicleSpecs,
    vehicleSelectionConfirmed:
      state.vehicleSelectionConfirmed ?? defaults.vehicleSelectionConfirmed,
    broadcastType: state.broadcastType ?? defaults.broadcastType,
    selectedCarriers: (state.selectedCarriers ?? defaults.selectedCarriers)
      .map((id) => String(id))
      .filter((id) => /^\d+$/.test(id)),
    targetPrice: state.targetPrice ?? defaults.targetPrice,
    negotiable: state.negotiable ?? defaults.negotiable,
    trackingEmails: state.trackingEmails ?? defaults.trackingEmails,
    driverNotes: state.driverNotes ?? defaults.driverNotes,
    gpsRequired: state.gpsRequired ?? defaults.gpsRequired,
    orderValue: state.orderValue ?? defaults.orderValue,
  };
}

export function formValuesToStepThreePayload(
  values: Pick<
    WizardFormValues,
    | 'broadcastType'
    | 'selectedCarriers'
    | 'targetPrice'
    | 'negotiable'
    | 'trackingEmails'
    | 'driverNotes'
    | 'gpsRequired'
    | 'orderValue'
  >,
  mode: SaveStepThreePayload['mode']
): SaveStepThreePayload {
  const targetPrice = parseFloat(String(values.targetPrice ?? ''));
  const selectedCarriers = (values.selectedCarriers || [])
    .map((id) => parseInt(String(id), 10))
    .filter((id) => !Number.isNaN(id) && id > 0);

  const orderValue = parseFloat(String(values.orderValue ?? ''));

  return {
    mode,
    broadcast_type: values.broadcastType,
    selected_carriers: selectedCarriers,
    target_price: Number.isNaN(targetPrice) ? undefined : targetPrice,
    negotiable: Boolean(values.negotiable),
    tracking_emails: values.trackingEmails || {},
    driver_notes: values.driverNotes || '',
    gps_required: Boolean(values.gpsRequired),
    bulk_mode: 'single',
    order_value: Number.isNaN(orderValue) || orderValue <= 0 ? undefined : orderValue,
  };
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
    vehicle_specs: values.vehicleSpecs,
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
