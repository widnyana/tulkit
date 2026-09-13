import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BIKE_TIRE_WIDTHS,
  bertoP15,
  calculatePressure,
  DEFAULT_WEIGHT_KG,
  parseBikeWeight,
  parseWeight,
  resolveBikeType,
  resolveRideType,
  resolveTireWidth,
} from "./utils.ts";

// 75 kg, road, 28 mm, tubed, endurance — the all-round baseline.
const base = {
  bikeType: "road",
  tireWidth: 28,
  tireWidthUnit: "mm",
  weightKg: 75,
  tubeless: false,
  rideType: "endurance",
} as const;

const press = (overrides = {}) => calculatePressure({ ...base, ...overrides });

describe("bertoP15", () => {
  it("matches the published worked example (150 lb load, 32 mm ≈ 87 psi)", () => {
    // 600*150/32² + 0.75*32 - 25 = 86.89
    assert.equal(Math.round(bertoP15(150, 32)), 87);
  });

  it("clamps widths below the 23 mm validity floor", () => {
    assert.equal(bertoP15(150, 20), bertoP15(150, 23));
  });
});

describe("calculatePressure", () => {
  it("gives the road endurance baseline for the default rider", () => {
    const r = press();
    assert.deepEqual([r.frontPsi, r.rearPsi], [59, 73]);
    assert.deepEqual([r.frontBar, r.rearBar], [4.1, 5.0]);
  });

  it("applies the ride-type multiplier", () => {
    assert.equal(press({ rideType: "racing" }).frontPsi, 74); // 59 × 1.25
    assert.equal(press({ rideType: "rough" }).frontPsi, 44); // 59 × 0.75
  });

  it("treats gravel mixed terrain as the 15% baseline", () => {
    const r = press({ bikeType: "gravel", tireWidth: 40, rideType: "mixed" });
    assert.deepEqual([r.frontPsi, r.rearPsi], [37, 44]);
  });

  it("covers the modern wide-road end of the range (35 mm)", () => {
    const r = press({ tireWidth: 35 });
    assert.deepEqual([r.frontPsi, r.rearPsi], [42, 51]);
    assert.deepEqual([r.frontBar, r.rearBar], [2.9, 3.5]);
  });

  it("matches the MTB baseline table exactly", () => {
    const r = press({
      bikeType: "mtb",
      tireWidth: 2.4,
      tireWidthUnit: "in",
      rideType: "xc",
      weightKg: 74.8,
    });
    assert.deepEqual([r.frontPsi, r.rearPsi], [22, 24]);
    assert.deepEqual([r.frontBar, r.rearBar], [1.5, 1.7]);
  });

  it("applies MTB width steps on the 0.2 in grid (3.0 in = −4.5 psi)", () => {
    const r = press({
      bikeType: "mtb",
      tireWidth: 3.0,
      tireWidthUnit: "in",
      rideType: "xc",
      weightKg: 74.8,
    });
    assert.deepEqual([r.frontPsi, r.rearPsi], [18, 20]); // 17.5 / 19.5 rounded
  });

  it("applies the tubeless reduction", () => {
    const r = press({
      bikeType: "mtb",
      tireWidth: 2.4,
      tireWidthUnit: "in",
      rideType: "xc",
      weightKg: 74.8,
      tubeless: true,
    });
    assert.deepEqual([r.frontPsi, r.rearPsi], [20, 22]); // × 0.92
  });

  it("adds rear pressure for heavy MTB riders", () => {
    const r = press({
      bikeType: "mtb",
      tireWidth: 2.4,
      tireWidthUnit: "in",
      rideType: "trail",
      weightKg: 90,
    });
    assert.equal(r.frontPsi, 22); // 20 + (90−74.8)/7
    assert.equal(r.rearPsi, 26); // 23 + same + 1 rear-only
  });

  it("clamps to the 15–130 psi window", () => {
    const heavy = press({ weightKg: 160, tireWidth: 23, rideType: "racing" });
    assert.deepEqual([heavy.frontPsi, heavy.rearPsi], [130, 130]);
    const light = press({
      bikeType: "mtb",
      tireWidth: 2.8,
      tireWidthUnit: "in",
      rideType: "enduro",
      weightKg: 30,
      tubeless: true,
    });
    assert.deepEqual([light.frontPsi, light.rearPsi], [15, 15]);
  });

  it("puts more load on the rear wheel", () => {
    const r = press();
    assert.ok(r.frontPsi < r.rearPsi);
  });

  it("uses an explicit bike weight for road/gravel loads", () => {
    const r = press({ tireWidth: 28, bikeWeightKg: 12 });
    assert.deepEqual([r.frontPsi, r.rearPsi], [62, 77]);
    assert.deepEqual([r.frontBar, r.rearBar], [4.3, 5.3]);
  });

  it("keeps the MTB heuristic rider-weight-based (bike weight ignored)", () => {
    const r = press({
      bikeType: "mtb",
      tireWidth: 2.4,
      tireWidthUnit: "in",
      rideType: "xc",
      weightKg: 74.8,
      bikeWeightKg: 25,
    });
    assert.deepEqual([r.frontPsi, r.rearPsi], [22, 24]);
  });
});

describe("url param resolution", () => {
  it("falls back to the bike's first option on invalid stored values", () => {
    assert.equal(resolveTireWidth("road", "2.4"), BIKE_TIRE_WIDTHS.road[0]);
    assert.equal(resolveRideType("mtb", "endurance"), "xc");
    assert.equal(resolveBikeType("bmx"), "road");
  });

  it("keeps valid stored values", () => {
    assert.equal(resolveTireWidth("mtb", "2.25").value, 2.25);
    assert.equal(resolveRideType("gravel", "mixed"), "mixed");
  });
});

describe("parseWeight", () => {
  it("defaults on missing or garbage input", () => {
    assert.equal(parseWeight(""), DEFAULT_WEIGHT_KG);
    assert.equal(parseWeight("abc"), DEFAULT_WEIGHT_KG);
    assert.equal(parseWeight("0"), DEFAULT_WEIGHT_KG);
  });

  it("clamps to 30–160 kg", () => {
    assert.equal(parseWeight("10"), 30);
    assert.equal(parseWeight("999"), 160);
    assert.equal(parseWeight("68"), 68);
  });
});

describe("parseBikeWeight", () => {
  it("returns undefined on missing or garbage input", () => {
    assert.equal(parseBikeWeight(""), undefined);
    assert.equal(parseBikeWeight("abc"), undefined);
  });

  it("clamps to 4–25 kg", () => {
    assert.equal(parseBikeWeight("2"), 4);
    assert.equal(parseBikeWeight("40"), 25);
    assert.equal(parseBikeWeight("9.5"), 9.5);
  });
});
