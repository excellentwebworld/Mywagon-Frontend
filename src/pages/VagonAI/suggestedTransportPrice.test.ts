import { describe, expect, it } from "vitest";
import { suggestTransportPriceFromRanking } from "./suggestedTransportPrice";

describe("suggestTransportPriceFromRanking (MS3-354)", () => {
  it("returns empty when no lane prices", () => {
    const s = suggestTransportPriceFromRanking([null, undefined, 0, -5]);
    expect(s.sampleSize).toBe(0);
    expect(s.market).toBeNull();
    expect(s.attractive).toBeNull();
    expect(s.conservative).toBeNull();
  });

  it("single price fills all three bands", () => {
    const s = suggestTransportPriceFromRanking([1500]);
    expect(s).toMatchObject({ attractive: 1500, market: 1500, conservative: 1500, sampleSize: 1 });
  });

  it("odd sample uses middle as market; min/max as attractive/conservative", () => {
    const s = suggestTransportPriceFromRanking([1100, 1350, 1500]);
    expect(s.attractive).toBe(1100);
    expect(s.market).toBe(1350);
    expect(s.conservative).toBe(1500);
    expect(s.sampleSize).toBe(3);
  });

  it("even sample averages the two middle values for market", () => {
    const s = suggestTransportPriceFromRanking([1000, 1200, 1400, 2000]);
    expect(s.attractive).toBe(1000);
    expect(s.market).toBe(1300);
    expect(s.conservative).toBe(2000);
  });
});
