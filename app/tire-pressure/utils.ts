import type {
  BikeType,
  CalculatorInputs,
  CalculatorResult,
  MtbRideType,
  RideType,
  RideTypeOption,
  RoadRideType,
  TireWidthOption,
} from "./types";

/**
 * Pure tire-pressure model. Every constant names its source tier:
 * [Berto] = Frank Berto's 15%-drop curve (Bicycle Quarterly), chart fit ±2 psi
 *   for 23–37 mm, verified to ~46 mm; reads 10–15 psi high below 23 mm.
 * [BQ] = Jan Heine / Bicycle Quarterly rolling-resistance testing.
 * [vendor] = SRAM/Zipp + tire-vendor tubeless guidance.
 * [consensus] = MTB blog rule-of-thumb convergence — lowest-confidence tier.
 */

/** [consensus] Typical complete-bike weight per category, added to rider weight. */
export const BIKE_DEFAULT_WEIGHT_KG: Record<BikeType, number> = {
  road: 8,
  gravel: 10,
  mtb: 13,
};

/** [BQ] Drop-% target → pressure multiplier on the 15% baseline (15/target). */
export const RIDE_TYPE_MULTIPLIER: Record<RoadRideType, number> = {
  racing: 1.25, // 12% drop
  endurance: 1.0, // 15% drop (Berto baseline)
  mixed: 1.0, // gravel "mixed terrain", same 15% tier
  rough: 0.75, // 20% drop
};

/** [consensus] MTB baseline PSI at 74.8 kg rider, 2.4" tire, tubeless. */
export const MTB_BASELINE_PRESSURE: Record<
  MtbRideType,
  { front: number; rear: number }
> = {
  xc: { front: 22, rear: 24 },
  trail: { front: 20, rear: 23 },
  enduro: { front: 18, rear: 22 },
};

export const MTB_BASELINE_WEIGHT_KG = 74.8; // [consensus] 165 lb
export const MTB_WEIGHT_STEP_KG = 7; // [consensus] ±1 psi per 7 kg
export const MTB_HEAVY_REAR_THRESHOLD_KG = 83.8; // [consensus] baseline + 9 kg → +1 psi rear
export const MTB_WIDTH_BASELINE_IN = 2.4; // [consensus]
// ponytail: MTB width interpolation is the weakest-grounded constant in this
// tool — no single chart states it; ±1.5 psi per 0.2" is a coarse consensus
// interpolation. First to revisit if rider feedback disputes width sensitivity.
export const MTB_WIDTH_STEP_IN = 0.2;
export const MTB_WIDTH_STEP_PSI = 1.5;

/** [vendor] 8% = conservative low end of the 8–15% tubeless reduction range. */
export const TUBELESS_FACTOR = 0.92;

/** Generic clamps (tire/rim unknown); sidewall and rim limits always win. */
export const PSI_FLOOR = 15;
export const PSI_CEILING = 130;

/** [Berto] Curve validity floor: reads 10–15 psi high below 23 mm. */
export const BERTO_MIN_WIDTH_MM = 23;

const KG_TO_LB = 2.2046226218;
const MM_PER_INCH = 25.4;
const PSI_TO_BAR = 0.0689476;

/** [consensus] Widely-cited public 45/55 split (SRAM AXS uses finer undisclosed values). */
const FRONT_SHARE = 0.45;
const REAR_SHARE = 0.55;

export const DEFAULT_WEIGHT_KG = 75;
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 160;

export const BIKE_TIRE_WIDTHS: Record<BikeType, TireWidthOption[]> = {
  road: [
    { value: 23, unit: "mm", label: "23 mm" },
    { value: 24, unit: "mm", label: "24 mm" },
    { value: 25, unit: "mm", label: "25 mm" },
    { value: 26, unit: "mm", label: "26 mm" },
    { value: 28, unit: "mm", label: "28 mm" },
    { value: 30, unit: "mm", label: "30 mm" },
    { value: 32, unit: "mm", label: "32 mm" },
    { value: 35, unit: "mm", label: "35 mm" },
  ],
  gravel: [
    { value: 35, unit: "mm", label: "35 mm" },
    { value: 38, unit: "mm", label: "38 mm" },
    { value: 40, unit: "mm", label: "40 mm" },
    { value: 45, unit: "mm", label: "45 mm" },
    { value: 47, unit: "mm", label: "47 mm" },
    // ponytail: 50–60 mm extrapolates past the Berto curve's verified ~46 mm;
    // results stay plausible but uncertainty grows with width. Sidewall
    // guidance wins; revisit if feedback disputes wide-gravel numbers.
    { value: 50, unit: "mm", label: "50 mm" },
    { value: 54, unit: "mm", label: "54 mm" },
    { value: 60, unit: "mm", label: "60 mm" },
  ],
  mtb: [
    { value: 1.9, unit: "in", label: "1.9 in" },
    { value: 2.0, unit: "in", label: "2.0 in" },
    { value: 2.1, unit: "in", label: "2.1 in" },
    { value: 2.25, unit: "in", label: "2.25 in" },
    { value: 2.3, unit: "in", label: "2.3 in" },
    { value: 2.4, unit: "in", label: "2.4 in" },
    { value: 2.5, unit: "in", label: "2.5 in" },
    { value: 2.6, unit: "in", label: "2.6 in" },
    { value: 2.8, unit: "in", label: "2.8 in" },
    { value: 3.0, unit: "in", label: "3.0 in" },
  ],
};

export const BIKE_RIDE_TYPES: Record<BikeType, RideTypeOption[]> = {
  road: [
    { value: "racing", label: "Racing / smooth pavement" },
    { value: "endurance", label: "Endurance / all-round" },
    { value: "rough", label: "Rough roads / cobbles" },
  ],
  gravel: [
    { value: "racing", label: "Racing / hardpack" },
    { value: "mixed", label: "Mixed terrain" },
    { value: "rough", label: "Rough & technical" },
  ],
  mtb: [
    { value: "xc", label: "Cross-country (XC)" },
    { value: "trail", label: "Trail" },
    { value: "enduro", label: "Enduro" },
  ],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * [Berto] 15%-drop pressure for a single wheel:
 * P = 600·L/W² + 0.75·W − 25, with W clamped to the curve's validity floor.
 */
export function bertoP15(loadLbs: number, widthMm: number): number {
  const width = Math.max(widthMm, BERTO_MIN_WIDTH_MM);
  return (600 * loadLbs) / (width * width) + 0.75 * width - 25;
}

export function resolveBikeType(stored: string): BikeType {
  return stored === "gravel" || stored === "mtb" ? stored : "road";
}

export function resolveTireWidth(
  bike: BikeType,
  stored: string,
): TireWidthOption {
  const options = BIKE_TIRE_WIDTHS[bike];
  return (
    options.find((option) => String(option.value) === stored) ?? options[0]
  );
}

export function resolveRideType(bike: BikeType, stored: string): RideType {
  const options = BIKE_RIDE_TYPES[bike];
  return (options.find((option) => option.value === stored) ?? options[0])
    .value;
}

export function parseWeight(stored: string): number {
  const parsed = Number(stored);
  if (stored === "" || !Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_WEIGHT_KG;
  }
  return clamp(parsed, WEIGHT_MIN_KG, WEIGHT_MAX_KG);
}

export const BIKE_WEIGHT_MIN_KG = 4;
export const BIKE_WEIGHT_MAX_KG = 25;

/** Optional bike weight for the road/gravel load; undefined → per-bike default. */
export function parseBikeWeight(stored: string): number | undefined {
  const parsed = Number(stored);
  if (stored === "" || !Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return clamp(parsed, BIKE_WEIGHT_MIN_KG, BIKE_WEIGHT_MAX_KG);
}

/**
 * Deterministic per-bike model. The page validates width/ride against the
 * bike type before calling, so the internal casts below are safe. An explicit
 * bikeWeightKg feeds the road/gravel load; the MTB heuristic is
 * rider-weight-based and ignores it.
 */
export function calculatePressure(inputs: CalculatorInputs): CalculatorResult {
  const weightKg = clamp(inputs.weightKg, WEIGHT_MIN_KG, WEIGHT_MAX_KG);
  const bikeWeightKg =
    inputs.bikeWeightKg === undefined
      ? BIKE_DEFAULT_WEIGHT_KG[inputs.bikeType]
      : clamp(inputs.bikeWeightKg, BIKE_WEIGHT_MIN_KG, BIKE_WEIGHT_MAX_KG);
  const perWheel =
    inputs.bikeType === "mtb"
      ? mtbPerWheel(inputs, weightKg)
      : bertoPerWheel(inputs, weightKg, bikeWeightKg);
  const factor = inputs.tubeless ? TUBELESS_FACTOR : 1;
  const frontPsi = Math.round(
    clamp(perWheel.front * factor, PSI_FLOOR, PSI_CEILING),
  );
  const rearPsi = Math.round(
    clamp(perWheel.rear * factor, PSI_FLOOR, PSI_CEILING),
  );
  return {
    frontPsi,
    rearPsi,
    frontBar: Math.round(frontPsi * PSI_TO_BAR * 10) / 10,
    rearBar: Math.round(rearPsi * PSI_TO_BAR * 10) / 10,
  };
}

function bertoPerWheel(
  inputs: CalculatorInputs,
  weightKg: number,
  bikeWeightKg: number,
): { front: number; rear: number } {
  const multiplier = RIDE_TYPE_MULTIPLIER[inputs.rideType as RoadRideType];
  const systemKg = weightKg + bikeWeightKg;
  const widthMm =
    inputs.tireWidthUnit === "mm"
      ? inputs.tireWidth
      : inputs.tireWidth * MM_PER_INCH;
  return {
    front: bertoP15(systemKg * FRONT_SHARE * KG_TO_LB, widthMm) * multiplier,
    rear: bertoP15(systemKg * REAR_SHARE * KG_TO_LB, widthMm) * multiplier,
  };
}

function mtbPerWheel(
  inputs: CalculatorInputs,
  weightKg: number,
): { front: number; rear: number } {
  const baseline = MTB_BASELINE_PRESSURE[inputs.rideType as MtbRideType];
  const weightPsi = (weightKg - MTB_BASELINE_WEIGHT_KG) / MTB_WEIGHT_STEP_KG;
  const heavyRearPsi = weightKg > MTB_HEAVY_REAR_THRESHOLD_KG ? 1 : 0;
  const widthIn =
    inputs.tireWidthUnit === "in"
      ? inputs.tireWidth
      : inputs.tireWidth / MM_PER_INCH;
  const widthPsi =
    ((MTB_WIDTH_BASELINE_IN - widthIn) / MTB_WIDTH_STEP_IN) *
    MTB_WIDTH_STEP_PSI;
  return {
    front: baseline.front + weightPsi + widthPsi,
    rear: baseline.rear + weightPsi + widthPsi + heavyRearPsi,
  };
}
