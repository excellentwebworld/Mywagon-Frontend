import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import { userEditedStopTrackingEmails } from './itinerary/stopTrackingEmails';

/**
 * QA 2026-10-08: AppLayout keys its <Outlet> by pathname + search, so every
 * wizard step change remounts the wizard and re-reads the draft from the API.
 * Step 3 has no save on Back, so the channel, price, negotiable flag etc. typed
 * there came back as the last saved values (Private / empty). Carry them in
 * memory across that remount; Step 3 consumes them when it loads again.
 */
const STEP3_FIELDS = [
  'broadcastType',
  'selectedCarriers',
  'targetPrice',
  'negotiable',
  'orderValue',
  'driverNotes',
  'gpsRequired',
  'trackingEmails',
  'documentsList',
] as const;

type Step3Carry = Pick<WizardFormValues, (typeof STEP3_FIELDS)[number]> & {
  /**
   * MS3-414: only the stop receiver emails the user changed. An untouched
   * pre-fill is not carried, so a stop whose location changed on Step 1 shows
   * the new location's email instead of the old one.
   */
  stopTrackingEmails?: Record<string, string[]>;
};

const carried = new Map<string, Step3Carry>();

const carryKey = (id: number | string, editMode: boolean) =>
  `${editMode ? 'edit' : 'draft'}:${id}`;

/** Snapshot the Step 3 fields before navigating away from Step 3 without saving. */
export function rememberStep3Values(
  id: number | string | null | undefined,
  editMode: boolean,
  values: WizardFormValues
): void {
  if (id == null || id === '') return;
  const snapshot = {} as Record<string, unknown>;
  for (const field of STEP3_FIELDS) {
    snapshot[field] = values[field];
  }
  snapshot.stopTrackingEmails = userEditedStopTrackingEmails(
    values.stopTrackingEmails,
    values.stopTrackingEmailsAuto
  );
  carried.set(carryKey(id, editMode), snapshot as Step3Carry);
}

/** Overlay carried Step 3 fields onto freshly loaded draft values. */
export function applyCarriedStep3Values(
  id: number | string,
  editMode: boolean,
  values: WizardFormValues,
  consume: boolean
): WizardFormValues {
  const key = carryKey(id, editMode);
  const snapshot = carried.get(key);
  if (!snapshot) return values;
  if (consume) carried.delete(key);
  const { stopTrackingEmails: editedStops, ...rest } = snapshot;
  const stopIds = new Set((values.stops || []).map((stop) => String(stop.id ?? '')));
  const keptEdits = Object.fromEntries(
    Object.entries(editedStops || {}).filter(([stopId]) => stopIds.has(stopId))
  );
  return {
    ...values,
    ...rest,
    stopTrackingEmails: { ...(values.stopTrackingEmails || {}), ...keptEdits },
  };
}

export function forgetStep3Values(id: number | string | null | undefined, editMode: boolean): void {
  if (id == null || id === '') return;
  carried.delete(carryKey(id, editMode));
}

/**
 * Step 3 can send the user back to Step 2 to pick a vehicle. The wizard remounts
 * on the way, so the request to scroll to the vehicle selector rides here.
 */
let vehicleSelectorFocusRequested = false;

export function requestVehicleSelectorFocus(): void {
  vehicleSelectorFocusRequested = true;
}

export function isVehicleSelectorFocusRequested(): boolean {
  return vehicleSelectorFocusRequested;
}

export function clearVehicleSelectorFocusRequest(): void {
  vehicleSelectorFocusRequested = false;
}
