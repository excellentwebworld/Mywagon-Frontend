/**
 * Carrier ranking + contract-price pick for the Vagon AI review card (MS3-348).
 *
 * Mirrors ChatBot `partnerChoice` weights so the picker order and the "why top"
 * chips stay honest when the shipper changes stops after prepare:
 *   1. in-force contract / price-list lane on this O-D
 *   2. preferred flag (favorite)
 *   3. lane history (trips)
 * Manual SearchBox filtering still applies on top of this order (MS3-347).
 */

export type RankingChip = "Contract price" | "Favorite" | "Lane history";

export interface RankableLane {
  originCity?: string | null;
  destinationCity?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  price?: number | null;
  unit?: string | null;
  inForce?: boolean;
  in_force?: boolean;
  banded?: boolean;
}

export interface RankablePartner {
  id: string;
  name: string;
  preferred?: boolean;
  trips?: number;
  rating?: number | null;
  contractLanes?: RankableLane[] | unknown[];
}

export interface RankedCarrier {
  partner: RankablePartner;
  score: number;
  chips: RankingChip[];
  lanePrice: number | null;
  reason: string;
}

const WEIGHTS = {
  contractLane: 1000,
  preferred: 200,
  perTrip: 4,
  historyCap: 100,
  perRatingPoint: 2,
} as const;

export function foldCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function asLane(raw: unknown): RankableLane | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as RankableLane;
}

function laneOrigin(lane: RankableLane): string | null {
  return lane.originCity ?? lane.origin_city ?? null;
}

function laneDestination(lane: RankableLane): string | null {
  return lane.destinationCity ?? lane.destination_city ?? null;
}

function laneInForce(lane: RankableLane): boolean {
  if (typeof lane.inForce === "boolean") return lane.inForce;
  if (typeof lane.in_force === "boolean") return lane.in_force;
  return true;
}

/** Matching in-force non-banded lane for this O-D, if any. */
export function matchingLane(
  partner: RankablePartner,
  originCity: string | null | undefined,
  destinationCity: string | null | undefined,
): RankableLane | null {
  if (!originCity || !destinationCity) return null;
  const o = foldCity(originCity);
  const d = foldCity(destinationCity);
  const lanes = (partner.contractLanes ?? [])
    .map(asLane)
    .filter((lane): lane is RankableLane => lane !== null);

  return (
    lanes.find((lane) => {
      const lo = laneOrigin(lane);
      const ld = laneDestination(lane);
      if (!lo || !ld) return false;
      if (!laneInForce(lane) || lane.banded) return false;
      return foldCity(lo) === o && foldCity(ld) === d;
    }) ?? null
  );
}

/**
 * The contract price to put in the asking-price box, if any.
 *
 * Per LOAD only. Laravel's lanes are agreed per load or per pallet, and a
 * per-pallet rate still ranks the carrier (there IS an agreement on this lane)
 * but is not a price for the whole load — filling it in would offer sixteen
 * pallets for the price of one.
 */
export function pickContractPrice(
  partner: RankablePartner,
  originCity: string | null | undefined,
  destinationCity: string | null | undefined,
): number | null {
  const lane = matchingLane(partner, originCity, destinationCity);
  if (!lane || lane.price == null) return null;
  if ((lane.unit ?? 'load').toLowerCase() !== 'load') return null;
  const n = Number(lane.price);
  return Number.isFinite(n) ? n : null;
}

function scorePartner(
  partner: RankablePartner,
  originCity: string | null | undefined,
  destinationCity: string | null | undefined,
): RankedCarrier {
  const chips: RankingChip[] = [];
  const reasons: string[] = [];
  let score = 0;

  const lane = matchingLane(partner, originCity, destinationCity);
  const lanePrice = lane && lane.price != null && Number.isFinite(Number(lane.price)) ? Number(lane.price) : null;
  if (lane) {
    score += WEIGHTS.contractLane;
    chips.push("Contract price");
    reasons.push(
      lanePrice !== null
        ? `agreed rate ${lanePrice} on this route`
        : "agreed rate on this route",
    );
  }

  if (partner.preferred) {
    score += WEIGHTS.preferred;
    chips.push("Favorite");
    reasons.push("marked preferred");
  }

  const trips = Number(partner.trips ?? 0) || 0;
  if (trips > 0) {
    score += Math.min(trips * WEIGHTS.perTrip, WEIGHTS.historyCap);
    chips.push("Lane history");
    reasons.push(`${trips} load${trips === 1 ? "" : "s"} with you`);
  }

  const rating = partner.rating == null ? null : Number(partner.rating);
  if (rating !== null && Number.isFinite(rating) && rating > 0) {
    score += rating * WEIGHTS.perRatingPoint;
    if (reasons.length === 0) reasons.push(`rated ${rating}`);
  }

  return {
    partner,
    score,
    chips,
    lanePrice,
    reason:
      reasons.length > 0
        ? `${partner.name} — ${reasons.join(", ")}`
        : `${partner.name} — active carrier`,
  };
}

/** Rank partners for the picker. Stable tie-break by name. */
export function rankCarriers(
  partners: readonly RankablePartner[],
  originCity: string | null | undefined,
  destinationCity: string | null | undefined,
): RankedCarrier[] {
  return partners
    .map((partner) => scorePartner(partner, originCity, destinationCity))
    .sort((a, b) => (b.score === a.score ? a.partner.name.localeCompare(b.partner.name) : b.score - a.score));
}
