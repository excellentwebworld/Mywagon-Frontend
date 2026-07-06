import type { ApiStop, ApiWizardState, SaveStepOnePayload, SaveStepTwoPayload } from '../types/createShipment';
import { createNewCargoLine, createNewStop } from '../../components/CreateShipmentWizard/types';

export interface WizardFormValues {
  loadId: string;
  custRef: string;
  coOwners: string[];
  stops: ApiStop[];
  itineraryConfirmed: boolean;
  routeSummary: { totalDistKm: number; totalDriveMin: number } | null;
  vehicleSpecs: Record<string, string[]>;
  broadcastType: 'private' | 'public';
  selectedCarriers: string[];
  targetPrice: string;
  trackingEmails: Record<string, string[]>;
  driverNotes: string;
  gpsRequired: boolean;
  bulkMode: 'single' | 'qty' | 'dates' | 'rec';
  bulkQty: number;
  bulkDates: { date: string; qty: number }[];
  bulkRecQty: number;
  bulkRecType: 'daily' | 'weekly' | 'monthly';
  bulkRecOccurrences: number;
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
  return {
    mode,
    customer_reference: values.custRef || '',
    co_owners: values.coOwners || [],
    stops: values.stops || [],
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
    routeSummary: state.routeSummary
      ? {
          totalDistKm: Number(state.routeSummary.total_dist_km ?? 0),
          totalDriveMin: Number(state.routeSummary.total_drive_min ?? 0),
        }
      : defaults.routeSummary,
    vehicleSpecs: state.vehicleSpecs ?? defaults.vehicleSpecs,
    broadcastType: state.broadcastType ?? defaults.broadcastType,
    selectedCarriers: state.selectedCarriers ?? defaults.selectedCarriers,
    targetPrice: state.targetPrice ?? defaults.targetPrice,
    trackingEmails: state.trackingEmails ?? defaults.trackingEmails,
    driverNotes: state.driverNotes ?? defaults.driverNotes,
    gpsRequired: state.gpsRequired ?? defaults.gpsRequired,
  };
}

export function formValuesToStepTwoPayload(
  values: Pick<WizardFormValues, 'itineraryConfirmed' | 'routeSummary'>,
  mode: SaveStepTwoPayload['mode']
): SaveStepTwoPayload {
  return {
    mode,
    itinerary_confirmed: Boolean(values.itineraryConfirmed),
    route_summary: values.routeSummary
      ? {
          total_dist_km: values.routeSummary.totalDistKm,
          total_drive_min: values.routeSummary.totalDriveMin,
        }
      : undefined,
  };
}

export function formValuesToWizardState(values: WizardFormValues): ApiWizardState {
  return {
    stops: values.stops,
    custRef: values.custRef,
    coOwners: values.coOwners,
    loadId: values.loadId,
    itineraryConfirmed: values.itineraryConfirmed,
    routeSummary: values.routeSummary
      ? {
          total_dist_km: values.routeSummary.totalDistKm,
          total_drive_min: values.routeSummary.totalDriveMin,
        }
      : undefined,
    vehicleSpecs: values.vehicleSpecs,
    broadcastType: values.broadcastType,
    selectedCarriers: values.selectedCarriers,
    targetPrice: values.targetPrice,
    trackingEmails: values.trackingEmails,
    driverNotes: values.driverNotes,
    gpsRequired: values.gpsRequired,
  };
}
