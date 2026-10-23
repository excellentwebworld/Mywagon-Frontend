/**
 * The wizard's own state, as a schedulable shipment draft.
 *
 * ## Why this file exists, and why it is the whole trick
 *
 * Scheduling N copies of a load needs a template, and a template has to be
 * built out of record ids: `stops[].locationId` and `lines[].productId` are what
 * the gateway publishes with, and its draft schema says in as many words that an
 * id is never to be invented.
 *
 * The first version of this feature took its template from a *published
 * shipment*, and that was the mistake. MYVAGON reports a shipment with display
 * strings — `location`, `city`, `product_name` — and no ids anywhere, so the
 * gateway had to match names back to records and then ask the shipper about
 * everything it could not pin down unambiguously. That question appeared for
 * almost every load, and it was unanswerable in the one case that matters: at
 * posting time there is nobody there to ask.
 *
 * `WizardFormValues` has none of that problem. Every value in it was picked out
 * of a dropdown backed by the shipper's own Address Book and Product Master, so
 * `ApiStop.locationId` and `ApiCargoLine.productId` are already real ids. This
 * file is therefore a rename-and-reshape and nothing more — **there is no name
 * matching here, and there must never be.** If a future edit is tempted to
 * resolve something by its label, the answer is to refuse instead.
 *
 * ## Two rules it holds, each with a test
 *
 * 1. **Stop times carry no offset; the posting time does.** `from` and `to` are
 *    zone-less wall clock (`YYYY-MM-DDTHH:mm`) because Laravel re-materializes
 *    stop times against its own zone at publish, so a value carrying an offset
 *    would be shifted twice. `fireAt` is the opposite — a real instant, built by
 *    the modal with `localPartsToUtcIso`. Migration 004 stores the two as
 *    `timestamp` and `timestamptz` so the database refuses to let them be
 *    confused quietly.
 * 2. **A value that cannot be expressed is refused, never coerced.** See the
 *    unit note on `toQtyUnit`.
 *
 * Pure, and free of React so it can be tested in the node environment
 * `vitest.config.ts` runs — like `createShipmentDraft.ts` beside it. Note that
 * `.test.tsx` is silently excluded by that config, so the tests are `.ts`.
 */
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import type { ApiCargoLine } from '../../api/types/createShipment';
import type { WizardVehicleType } from '../../components/CreateShipmentWizard/vehicleTypes';
import type {
  DraftLine,
  DraftStop,
  QtyUnit,
  ShipmentDraft,
  WeightUnit,
} from '../VagonAI/createShipmentDraft';

export interface WizardRouteSummary {
  total_dist_km: number;
  total_drive_min?: number;
}

export type WizardDraftMapping =
  | {
      ok: true;
      draft: ShipmentDraft;
      /**
       * The measured road distance, sent alongside the draft.
       *
       * Not part of the draft itself because it is not a property of the load —
       * it is what the browser measured, and only the browser can. MYVAGON
       * refuses to publish without one.
       */
      routeSummary: WizardRouteSummary | null;
      /** Fidelity the shipper should be told about. Never silent. */
      warnings: string[];
    }
  | {
      ok: false;
      /** Field paths in the gateway's own vocabulary, so a refusal routes to a step. */
      missing: string[];
      reason: string;
    };

/* ── Units ────────────────────────────────────────────────────────────────── */

/**
 * The wizard's five quantity units onto the draft's two.
 *
 * `US Pallets`, `Boxes` and `Big Bags` have **no** representation in the draft
 * schema, and this returns null for them rather than picking the nearest thing.
 *
 * That refusal is deliberate. `QTY_UNITS` is shared with the assistant's tool
 * schema, so widening it would move the model's tool surface — and the
 * alternative, quietly reclassifying a shipper's Big Bags as Units, would do it
 * on every load in the batch, to carriers who bid on what they were shown.
 * Refusing costs one clear sentence; coercing costs the shipper's trust in the
 * numbers. The extension point is documented at `shipmentFlow/translate.ts`'s
 * `QTY_UNIT_TO_API` if the vocabulary is ever widened for real.
 */
function toQtyUnit(unit: string | undefined): QtyUnit | null {
  const key = (unit ?? '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (key === 'eur pallets' || key === 'eur pallet') return 'EUR_PALLET';
  if (key === 'units' || key === 'unit') return 'UNIT';
  return null;
}

/** The wizard's two weight units are the draft's two. An exact match, unlike quantity. */
function toWeightUnit(unit: string | undefined): WeightUnit {
  const key = (unit ?? '').toLowerCase().trim();
  return key === 'tonnes' || key === 'tonne' || key === 't' ? 'T' : 'KG';
}

function toNumber(value: string | number | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/* ── Stops ────────────────────────────────────────────────────────────────── */

/**
 * `YYYY-MM-DD` plus `HH:mm` as one wall clock, or null.
 *
 * Null rather than a default, and that is load-bearing for the closing time: an
 * absent time defaulted to `00:00` would put a window's close BEFORE its open,
 * which the publish gate then reports as "closes at or before it opens" — a
 * failure invented entirely by this converter.
 */
function wallClock(date: string | undefined, time: string | undefined): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d/.test(time)) return null;
  return `${date}T${time.slice(0, 5)}`;
}

/* ── Vehicles ─────────────────────────────────────────────────────────────── */

/**
 * The selected vehicle type ids, and a warning when that loses precision.
 *
 * `vehicleSpecs` is keyed by `formKey`, which is `String(vehicleType.id)` — so
 * its keys already are the ids the draft wants. Its *values* are the individual
 * subtypes the shipper ticked, and those have nowhere to go: the draft carries
 * `vehicleTypeIds` only, and the gateway re-expands each id to every category on
 * that type.
 *
 * So a shipper who asked for one specific trailer gets a batch that will accept
 * any trailer of that type. That is the assistant's existing behaviour for every
 * load it creates rather than something new here, which is why it warns instead
 * of refusing — but it is a real difference from what they ticked, and going
 * unsaid is how it becomes a surprise. Carrying the exact specs through would
 * mean widening the shared tool schema; see the plan's follow-ups.
 */
function vehicleTypeIdsOf(
  specs: Record<string, string[]> | undefined,
  catalog: WizardVehicleType[] | undefined,
): { ids: string[]; warnings: string[] } {
  const entries = Object.entries(specs ?? {}).filter(([, items]) => Array.isArray(items) && items.length > 0);
  const ids = entries.map(([formKey]) => formKey);
  if (ids.length === 0 || !catalog || catalog.length === 0) return { ids, warnings: [] };

  const narrowed: string[] = [];
  for (const [formKey, items] of entries) {
    const type = catalog.find((candidate) => candidate.formKey === formKey);
    if (!type) continue;
    const total = type.categories.reduce((sum, category) => sum + category.items.length, 0);
    if (total > 0 && items.length < total) narrowed.push(type.name);
  }

  return {
    ids,
    warnings:
      narrowed.length > 0
        ? [
            `Scheduled loads will ask for any ${narrowed.join(' or ')}, not only the specific subtypes you picked. Publish this load directly if the subtype matters.`,
          ]
        : [],
  };
}

/* ── The mapping ──────────────────────────────────────────────────────────── */

/**
 * One wizard state, as a draft the gateway can arm a batch from.
 *
 * Refuses rather than half-fills. Every path in `missing` is the gateway's own
 * spelling, so a refusal can send the shipper back to the wizard step that owns
 * the field — the same routing the guided flow's `missing[]` drives.
 *
 * In practice a refusal should be unreachable: the wizard cannot reach step 3
 * without a location and a product per line, and the Schedule button is disabled
 * while `ok` is false. It stays loud anyway, because "unreachable" is a claim
 * about today's wizard and this file outlives it.
 */
export function wizardValuesToDraft(
  values: WizardFormValues,
  options: { vehicleTypes?: WizardVehicleType[] } = {},
): WizardDraftMapping {
  const missing: string[] = [];
  const reasons: string[] = [];
  const warnings: string[] = [];

  const apiStops = values.stops ?? [];
  if (apiStops.length < 2) {
    return {
      ok: false,
      missing: ['stops'],
      reason: 'A load needs at least a pickup and a drop-off before it can be scheduled.',
    };
  }

  const stops: DraftStop[] = [];
  let lineCount = 0;

  apiStops.forEach((stop, index) => {
    if (!stop.locationId) {
      missing.push(`stops[${index}].locationId`);
      reasons.push('Every stop needs a saved location.');
    }

    const from = wallClock(stop.dateFrom, stop.timeFrom);
    if (!from) {
      missing.push(`stops[${index}].from`);
      reasons.push('Every stop needs a date and an opening time.');
    }

    // Only when the wizard has both halves. A date with no time is a window
    // whose close this file would have to invent - see `wallClock`.
    const to = wallClock(stop.dateTo, stop.timeTo);
    if (stop.dateTo && !to) {
      warnings.push('A stop had a closing date but no closing time, so it was scheduled with an opening time only.');
    }

    // Each stop keeps its own cargo, so a wizard-built multi-stop load can be
    // scheduled as the load it actually is. Flattening here was what made a
    // 1-pickup / 2-delivery run come back as a two-stop load with everything
    // piled on the final site.
    const lines: DraftLine[] = [];

    (stop.lines ?? []).forEach((line: ApiCargoLine, lineIndex) => {
      const path = `stops[${index}].lines[${lineIndex}]`;

      if (!line.productId) {
        missing.push(`${path}.productId`);
        reasons.push('Every cargo line needs a product from your Product Master.');
      }

      const qty = toNumber(line.qty);
      if (qty === null || qty <= 0) {
        missing.push(`${path}.qty`);
        reasons.push('Every cargo line needs a quantity greater than zero.');
      }

      const weight = toNumber(line.weight);
      if (weight === null || weight <= 0) {
        missing.push(`${path}.weight`);
        reasons.push('Every cargo line needs a weight greater than zero.');
      }

      const unit = toQtyUnit(line.unit);
      if (unit === null) {
        missing.push(`${path}.unit`);
        reasons.push(
          `Scheduled batches support EUR Pallets and Units only, and stop ${index + 1} line ${
            lineIndex + 1
          } is counted in ${line.unit || 'an unsupported unit'}. Publish this load directly, or change the unit.`,
        );
      }

      lines.push({
        productId: line.productId ?? '',
        action: line.action === 'dropoff' ? 'drop' : 'pick',
        qty: qty ?? 0,
        unit: unit ?? 'UNIT',
        weight: weight ?? 0,
        wUnit: toWeightUnit(line.wtUnit),
        orderId: line.orderId || null,
        orderLineId: line.orderLineId ? String(line.orderLineId) : null,
        customerId: line.customerId || null,
      });
    });

    lineCount += lines.length;
    stops.push({ locationId: stop.locationId ?? '', from: from ?? '', to, lines });
  });

  const collects = stops.some((stop) => stop.lines.some((line) => line.action === 'pick'));
  const delivers = stops.some((stop) => stop.lines.some((line) => line.action === 'drop'));
  if (!collects || !delivers) {
    missing.push('stops');
    reasons.push('A load needs at least one pickup and one drop-off.');
  }

  if (lineCount === 0) {
    missing.push('lines');
    reasons.push('A load needs at least one cargo line.');
  }

  const vehicles = vehicleTypeIdsOf(values.vehicleSpecs, options.vehicleTypes);
  warnings.push(...vehicles.warnings);

  if (missing.length > 0) {
    return {
      ok: false,
      missing: [...new Set(missing)],
      reason: [...new Set(reasons)].join(' '),
    };
  }

  // A marketplace load cannot become a scheduled batch here.
  //
  // The gateway builds and posts private loads only, so a template saying
  // `public` would either be refused there or - worse - quietly posted to the
  // shipper's own carriers instead of the market they chose. Refused with the
  // same shape as every other gap, so the drawer reports it like one.
  if (values.broadcastType === 'public') {
    return {
      ok: false,
      missing: ['broadcast.channels'],
      reason:
        'Copies of a marketplace load cannot be scheduled from here - Vagon AI posts to your own carriers only. Choose the carriers on this load, or schedule it from the shipment itself.',
    };
  }

  const startingPrice = toNumber(values.targetPrice);

  const draft: ShipmentDraft = {
    customerReference: values.custRef?.trim() ? values.custRef.trim() : null,
    stops,
    vehicleTypeIds: vehicles.ids,
    // Empty on purpose: the wizard's ticked subtypes are not the gateway's
    // category ids, so the batch asks for each type whole - and says so, in the
    // warning `vehicleTypeIdsOf` raises above.
    vehicleCategoryIds: [],
    broadcast: {
      channels: ['private'],
      carrierPartnerIds: [...(values.selectedCarriers ?? [])],
      // The wizard has no own-fleet path - MYVAGON exposes no fleet-driver
      // endpoint, and the freelancers among the partners are partners.
      driverId: null,
    },
    pricing: {
      negotiable: values.negotiable !== false,
      startingPrice: startingPrice !== null && startingPrice > 0 ? startingPrice : null,
      negotiableFloor: null,
      currency: 'EUR',
    },
    requireTracking: Boolean(values.gpsRequired),
    responseWindow: '48h',
    settlement: 'direct',
    // Each queued load is one ordinary single-load create+publish. The batch
    // lives in the gateway's queue, not in a bulk mode the core API refuses.
    bulk: { mode: 'single' },
    trackingOrderIds: Object.entries(values.trackingEmails ?? {})
      .filter(([, emails]) => Array.isArray(emails) && emails.length > 0)
      .map(([orderId]) => orderId),
  };

  const measured = values.routeSummary;
  const routeSummary: WizardRouteSummary | null =
    measured && Number.isFinite(measured.totalDistKm) && measured.totalDistKm > 0
      ? {
          total_dist_km: measured.totalDistKm,
          ...(Number.isFinite(measured.totalDriveMin) ? { total_drive_min: measured.totalDriveMin } : {}),
        }
      : null;

  if (!routeSummary) {
    warnings.push(
      'This load has no measured route yet. Confirm the itinerary in step 2 first, or the batch will be refused.',
    );
  }

  return { ok: true, draft, routeSummary, warnings };
}

/**
 * The pickup and drop-off the modal starts from.
 *
 * Seeded from the load being scheduled rather than from today, because a shipper
 * arming a repeat of the load in front of them is almost always moving its dates
 * forward, not inventing new ones. Empty strings where the wizard has nothing,
 * so the modal's own required-field checks still run.
 */
export function windowsFromWizard(values: WizardFormValues): {
  pickup: { date: string; time: string };
  dropoff: { date: string; time: string };
} {
  const stops = values.stops ?? [];
  const first = stops[0];
  const last = stops.length > 0 ? stops[stops.length - 1] : undefined;

  return {
    pickup: { date: first?.dateFrom ?? '', time: first?.timeFrom ?? '' },
    dropoff: { date: last?.dateFrom ?? '', time: last?.timeFrom ?? '' },
  };
}
