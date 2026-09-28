import { describe, expect, it } from "vitest";
import { matchingLane, pickContractPrice, rankCarriers } from "./carrierRanking";

describe("carrierRanking (MS3-348)", () => {
  const partners = [
    {
      id: "1",
      name: "Zulu Freight",
      preferred: false,
      trips: 50,
      rating: 4.9,
      contractLanes: [],
    },
    {
      id: "2",
      name: "Alpha Contracted",
      preferred: false,
      trips: 1,
      rating: 4.0,
      contractLanes: [
        { originCity: "Athens", destinationCity: "London", price: 1250, inForce: true, banded: false },
      ],
    },
    {
      id: "3",
      name: "Beta Favorite",
      preferred: true,
      trips: 5,
      rating: 4.2,
      contractLanes: [],
    },
  ];

  it("ranks contract lane above favorite and history", () => {
    const ranked = rankCarriers(partners, "Athens", "London");
    expect(ranked.map((r) => r.partner.id)).toEqual(["2", "3", "1"]);
    expect(ranked[0]!.chips).toContain("Contract price");
    expect(ranked[1]!.chips).toContain("Favorite");
    expect(ranked[2]!.chips).toContain("Lane history");
  });

  it("pickContractPrice returns the lane price for a matching partner", () => {
    expect(pickContractPrice(partners[1]!, "Athens", "London")).toBe(1250);
    expect(pickContractPrice(partners[0]!, "Athens", "London")).toBeNull();
  });

  it("a per-pallet agreement still ranks the carrier but never fills the load price", () => {
    const perPallet = {
      id: "4",
      name: "Pallet Rate Co",
      preferred: false,
      trips: 0,
      rating: null,
      contractLanes: [
        { originCity: "Athens", destinationCity: "London", price: 45, unit: "pallet", inForce: true, banded: false },
      ],
    };
    expect(rankCarriers([perPallet], "Athens", "London")[0]!.chips).toContain("Contract price");
    expect(pickContractPrice(perPallet, "Athens", "London")).toBeNull();
  });

  it("matchingLane is case-insensitive on cities", () => {
    expect(matchingLane(partners[1]!, "athens", "LONDON")?.price).toBe(1250);
  });

  it("favorite beats history when no contract lane matches", () => {
    const ranked = rankCarriers(partners, "Athens", "Paris");
    expect(ranked[0]!.partner.id).toBe("3");
    expect(ranked[0]!.chips).toContain("Favorite");
  });
});
