/**
 * Suggested AI transport ask derived from MS3-348 ranking / price-list lanes.
 *
 * Distinct from order value: these figures are a suggested ask for the haul,
 * built from contract lane prices already on ranked carriers. Not a full ML
 * pricing engine (out of scope for MS3-354).
 */

export interface TransportPriceSuggestion {
  /** Lowest in-force load-lane price among ranked carriers (attractive ask). */
  attractive: number | null;
  /** Median of those lane prices (market / typical ask). */
  market: number | null;
  /** Highest of those lane prices (conservative ask). */
  conservative: number | null;
  /** Count of load-lane prices that contributed. */
  sampleSize: number;
  /** Label explaining the source for the UI. */
  sourceLabel: string;
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 100) / 100;
}

/**
 * Build market / attractive / conservative asks from ranked carriers' lane prices.
 * Only finite positive load-lane prices count (same unit filter as pickContractPrice).
 */
export function suggestTransportPriceFromRanking(
  lanePrices: readonly (number | null | undefined)[],
): TransportPriceSuggestion {
  const prices = lanePrices
    .map((p) => (p == null ? null : Number(p)))
    .filter((p): p is number => p !== null && Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return {
      attractive: null,
      market: null,
      conservative: null,
      sampleSize: 0,
      sourceLabel: "No lane prices on this route yet",
    };
  }

  return {
    attractive: prices[0]!,
    market: median(prices),
    conservative: prices[prices.length - 1]!,
    sampleSize: prices.length,
    sourceLabel:
      prices.length === 1
        ? "From your price-list / contract lane on this route"
        : `From ${prices.length} price-list / lane-history rates on this route`,
  };
}
