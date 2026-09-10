import type {
  ApiStop,
  ApiWizardState,
  SaveStepOnePayload,
  SaveStepThreePayload,
  SaveStepTwoPayload,
} from '../types/createShipment';
import { createNewCargoLine, createNewStop } from '../../components/CreateShipmentWizard/types';
import { computeItineraryFingerprint } from '../../components/CreateShipmentWizard/itineraryFingerprint';
import { normalizeQtyUnit, normalizeWeightUnit } from '../../constants/cargoUnits';
import { getBrowserTimezone } from '../../utils/timezone';
import { normalizeTime24 } from '../../components/ui/TimePicker';

/** Coerce draft vehicleSpecs so lookup by formKey always matches.
 * PHP/Laravel often re-indexes numeric object keys into a list of arrays —
 * rematch those using the vehicle-type catalog when available.
 */
export function normalizeVehicleSpecs(
  raw: unknown,
  vehicleTypes?: Array<{ formKey: string; categories: Array<{ items: Array<{ id: string }> }> }>
): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {};

  const rematchFromGroups = (groups: unknown[]): Record<string, string[]> => {
    if (!vehicleTypes?.length) {
      const orphaned: Record<string, string[]> = {};
      groups.forEach((ids, i) => {
        if (!Array.isArray(ids) || ids.length === 0) return;
        orphaned[`__orphan_${i}`] = ids.map(String);
      });
      return orphaned;
    }

    const out: Record<string, string[]> = {};
    groups.forEach((ids) => {
      if (!Array.isArray(ids) || ids.length === 0) return;
      const idStrs = ids.map(String);
      let best: { formKey: string; matched: string[]; score: number } | null = null;
      vehicleTypes.forEach((vt) => {
        const typeItems = new Set(
          vt.categories.flatMap((cat) => cat.items.map((item) => String(item.id)))
        );
        const matched = idStrs.filter((id) => typeItems.has(id));
        if (matched.length === 0) return;
        if (!best || matched.length > best.score) {
          best = { formKey: vt.formKey, matched, score: matched.length };
        }
      });
      if (!best) return;
      const selected = best as { formKey: string; matched: string[]; score: number };
      const prev = out[selected.formKey] || [];
      out[selected.formKey] = [...new Set([...prev, ...selected.matched])];
    });
    return out;
  };

  if (Array.isArray(raw)) {
    return rematchFromGroups(raw);
  }

  const out: Record<string, string[]> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;
    out[String(key)] = value.map((id) => String(id));
  });

  const keys = Object.keys(out);
  const isSequential =
    keys.length > 0 && keys.every((k, i) => k === String(i) || k.startsWith('__orphan_'));
  if (isSequential) {
    return rematchFromGroups(keys.map((k) => out[k]));
  }

  return out;
}

/** True when specs still need rematching against the vehicle-type catalog. */
export function vehicleSpecsNeedRematch(specs: Record<string, string[]> | undefined): boolean {
  if (!specs) return false;
  const keys = Object.keys(specs);
  if (keys.length === 0) return false;
  return keys.every((k, i) => k === String(i) || k.startsWith('__orphan_'));
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
  notesList?: Array<{
    id: string | number;
    text: string;
    visibility: 'internal' | 'carrier' | string;
    date?: string | null;
    author?: string;
  }>;
  gpsRequired: boolean;
  orderValue: string;
  documentsList?: Array<{ id: string | number; name: string; fileName?: string; fileSize?: number; fileType?: string; url?: string; description?: string; file?: File }>;
}

export function formValuesToStepOnePayload(
  values: Pick<WizardFormValues, 'stops' | 'custRef' | 'coOwners'>,
  mode: SaveStepOnePayload['mode'],
  availabilityId?: number | null
): SaveStepOnePayload {
  const stops = (values.stops || []).map((stop) => ({
    ...stop,
    timeFrom: normalizeTime24(String(stop.timeFrom || '')),
    timeTo: normalizeTime24(String(stop.timeTo || '')),
    lines: (stop.lines || []).map((line) => ({
      ...line,
      unit: normalizeQtyUnit(line.unit) || line.unit || 'EUR Pallets',
      wtUnit: normalizeWeightUnit(line.wtUnit),
      ...(line.shipmentLocationId != null
        ? { shipmentLocationId: Number(line.shipmentLocationId) }
        : {}),
      ...(line.locationStatus != null ? { locationStatus: String(line.locationStatus) } : {}),
      ...(line.driverId !== undefined ? { driverId: line.driverId } : {}),
    })),
  }));

  return {
    mode,
    customer_reference: values.custRef || '',
    co_owners: values.coOwners || [],
    stops,
    timezone: getBrowserTimezone(),
    ...(availabilityId ? { availability_id: availabilityId } : {}),
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
          timeFrom: normalizeTime24(String(stop.timeFrom || '')),
          timeTo: normalizeTime24(String(stop.timeTo || '')),
          lines:
            Array.isArray(stop.lines) && stop.lines.length > 0
              ? stop.lines.map((line) => ({
                  ...createNewCargoLine(),
                  ...line,
                  unit: normalizeQtyUnit(line.unit) || line.unit || 'EUR Pallets',
                  wtUnit: normalizeWeightUnit(line.wtUnit),
                  ...(line.shipmentLocationId != null
                    ? { shipmentLocationId: Number(line.shipmentLocationId) }
                    : {}),
                  ...(line.locationStatus != null
                    ? { locationStatus: String(line.locationStatus) }
                    : {}),
                  ...(line.driverId !== undefined ? { driverId: line.driverId } : {}),
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
    targetPrice:
      state.targetPrice != null && state.targetPrice !== ''
        ? String(state.targetPrice)
        : defaults.targetPrice,
    negotiable: state.negotiable ?? defaults.negotiable,
    trackingEmails: normalizeTrackingEmails(
      state.trackingEmails ?? defaults.trackingEmails,
      extractTrackingOrderIds(stops)
    ),
    driverNotes: state.driverNotes ?? defaults.driverNotes,
    notesList: normalizeNotesList(state.notesList ?? defaults.notesList ?? []),
    gpsRequired: state.gpsRequired ?? defaults.gpsRequired,
    orderValue: state.orderValue ?? defaults.orderValue,
    documentsList: normalizeDocumentsList(state.documentsList ?? defaults.documentsList ?? []),
  };
}

function normalizeNotesList(
  raw: unknown
): NonNullable<WizardFormValues['notesList']> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = row.id ?? row.note_id;
      const text = String(row.text ?? row.body ?? '');
      if (id == null || text === '') return null;
      const visibilityRaw = String(row.visibility ?? 'carrier').toLowerCase();
      const visibility = visibilityRaw === 'internal' ? 'internal' : 'carrier';
      return {
        id: typeof id === 'number' || typeof id === 'string' ? id : String(id),
        text,
        visibility,
        date: row.date != null ? String(row.date) : row.timestamp != null ? String(row.timestamp) : null,
        author: row.author != null ? String(row.author) : 'Shipper',
      };
    })
    .filter((n): n is NonNullable<typeof n> => n != null);
}

/** Normalize wizard/API document rows into Formik documentsList shape. */
function normalizeDocumentsList(
  raw: unknown
): NonNullable<WizardFormValues['documentsList']> {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = row.id ?? row.document_id;
      if (id == null || id === '') return null;

      return {
        id: typeof id === 'number' || typeof id === 'string' ? id : String(id),
        name: String(row.name ?? ''),
        description: row.description != null ? String(row.description) : '',
        fileName: String(row.fileName ?? row.file_name ?? ''),
        fileType: String(row.fileType ?? row.file_type ?? ''),
        fileSize:
          typeof row.fileSize === 'number'
            ? row.fileSize
            : typeof row.file_size === 'number'
              ? row.file_size
              : undefined,
        url: row.url != null ? String(row.url) : undefined,
        ...(row.file instanceof File ? { file: row.file } : {}),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d != null);
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
  const rawTargetPrice = String(values.targetPrice ?? '').trim();
  const targetPrice = rawTargetPrice === '' ? NaN : parseFloat(rawTargetPrice);
  const selectedCarriers = (values.selectedCarriers || [])
    .map((id) => parseInt(String(id), 10))
    .filter((id) => !Number.isNaN(id) && id > 0);

  const orderValueRaw = String(values.orderValue ?? '').trim();
  const orderValue = orderValueRaw === '' ? NaN : parseFloat(orderValueRaw);
  const trackingOrderIds = extractTrackingOrderIds(values.stops || []);
  const trackingEmails = sanitizeTrackingEmails(
    normalizeTrackingEmails(values.trackingEmails, trackingOrderIds)
  );

  const payload: SaveStepThreePayload = {
    mode,
    broadcast_type: values.broadcastType,
    selected_carriers: selectedCarriers,
    // Blank price is allowed (matches legacy negotiable create flow); persist 0 explicitly.
    target_price: Number.isNaN(targetPrice) ? 0 : targetPrice,
    negotiable: Boolean(values.negotiable),
    tracking_emails: trackingEmails,
    driver_notes: values.driverNotes || '',
    gps_required: Boolean(values.gpsRequired),
    bulk_mode: 'single',
    // Always send so clearing order value persists (empty string clears on backend).
    order_value: Number.isNaN(orderValue) || orderValue <= 0 ? '' : orderValue,
  };

  // Re-assert vehicles when present so Step 3 Save Draft keeps Step 2 selection.
  // Always attach vehicle_specs when selection exists (backend merges; omits empty wipe).
  const vehicleSpecs = normalizeVehicleSpecs(values.vehicleSpecs);
  const hasVehicles = Object.values(vehicleSpecs).some((ids) => ids.length > 0);
  if (hasVehicles) {
    payload.vehicle_specs = vehicleSpecs;
    payload.vehicle_selection_confirmed =
      values.vehicleSelectionConfirmed !== false;
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
    notesList: values.notesList,
    gpsRequired: values.gpsRequired,
    orderValue: values.orderValue,
    documentsList: values.documentsList,
  };
}
