/**
 * MS3-332 - when a greenfield product SelectionCard is answered and the gateway
 * has not yet emitted flow_context / create_shipment, mount a minimal review
 * card so Save can appear once sites + schedules are filled.
 */
import type {
  CargoCapture,
  FlowBundle,
  FlowContextEvent,
  FlowDraftSeed,
  FlowLocation,
  SelectionRequest,
} from "../../hooks/useChat";
import { applyProductChoiceToDraft } from "./applyProductChoiceToDraft";
import {
  applyLocationChoiceToDraft,
  ensureStopSchedules,
  type LocationSlot,
} from "./applyLocationChoiceToDraft";

export type PriorLocationPick = {
  slot: LocationSlot;
  locationId: string;
  locationName?: string | null;
};

function emptySeed(): FlowDraftSeed {
  return {
    customerReference: null,
    stops: [
      { locationId: "", locationName: null, from: "", to: null, lines: [] },
      { locationId: "", locationName: null, from: "", to: null, lines: [] },
    ],
    vehicleTypeIds: [],
    vehicleCategoryIds: [],
    broadcast: { channels: ["private"], carrierPartnerIds: [], driverId: null },
    pricing: {
      negotiable: true,
      startingPrice: null,
      negotiableFloor: null,
      currency: "EUR",
    },
    requireTracking: false,
    responseWindow: "48h",
    settlement: "direct",
    bulk: { mode: "single" },
    trackingOrderIds: [],
  };
}

function emptyBundle(seed: FlowDraftSeed, request: SelectionRequest, locations: FlowLocation[] = []): FlowBundle {
  const products = (request.options ?? [])
    .filter((o) => o.kind === "record")
    .map((o) => {
      const m = o.id.match(/^product:(\d+)$/i);
      return {
        id: m ? m[1]! : o.id,
        name: o.title,
        sku: null as string | null,
        category: null as string | null,
        type: null as string | null,
        defaults: o.captureDefaults
          ? {
              unit: o.captureDefaults.qty_unit,
              weightPerUnit: o.captureDefaults.weight_per_unit,
              weightUnit: o.captureDefaults.weight_unit,
            }
          : undefined,
      };
    });

  const gaps: FlowBundle["gaps"] = [];
  if (!seed.stops[0]?.locationId) {
    gaps.push({
      field: "stops[0].locationId",
      severity: "blocks_save",
      question: "Choose the pickup site.",
    });
  }
  if (!seed.stops[seed.stops.length - 1]?.locationId) {
    gaps.push({
      field: `stops[${Math.max(seed.stops.length - 1, 1)}].locationId`,
      severity: "blocks_save",
      question: "Choose the delivery site.",
    });
  }

  return {
    draft: seed,
    gaps,
    suggestions: { vehicle: null, partner: null, partnerAlternatives: [] },
    orders: [],
    locations,
    products,
    partners: [],
    vehicleTypes: [],
    defaults: {
      responseWindow: "48h",
      settlement: "direct",
      requireTracking: false,
      negotiable: true,
      currency: "EUR",
      bulkMode: "single",
    },
    rules: {},
    notes: [],
    truncated: {},
  };
}

/** Build a create_shipment flow when the thread does not already have one. */
export function synthesizeShipmentFlowFromProduct(input: {
  request: SelectionRequest;
  productId: string;
  productName?: string | null;
  cargo?: CargoCapture | null;
  flowId?: string;
  /** Location SelectionCards answered earlier in the same thread (or address-book matches). */
  priorLocations?: PriorLocationPick[];
  /** Sites to expose on the review card picker (usually the shipper address book). */
  catalogLocations?: FlowLocation[];
}): FlowContextEvent {
  let seed = applyProductChoiceToDraft(
    ensureStopSchedules(emptySeed()),
    input.productId,
    input.productName ?? null,
    input.cargo,
  );

  const applied: FlowLocation[] = [];
  for (const pick of input.priorLocations ?? []) {
    if (!pick.locationId) continue;
    seed = applyLocationChoiceToDraft(
      seed,
      pick.slot,
      pick.locationId,
      pick.locationName ?? null,
    );
    const fromCatalog = (input.catalogLocations ?? []).find((l) => l.id === pick.locationId);
    applied.push(
      fromCatalog ?? {
        id: pick.locationId,
        name: pick.locationName?.trim() || pick.locationId,
        city: null,
        country: null,
        role: pick.slot === "pickup" ? "pickup" : "delivery",
        lat: null,
        lng: null,
      },
    );
  }

  // Dedupe catalog + applied for the review-card site picker.
  const byId = new Map<string, FlowLocation>();
  for (const loc of [...(input.catalogLocations ?? []), ...applied]) {
    if (loc?.id) byId.set(String(loc.id), loc);
  }

  return {
    id: input.flowId ?? `ms332-local-${Date.now()}`,
    flow: "create_shipment",
    bundle: emptyBundle(seed, input.request, Array.from(byId.values())),
  };
}
