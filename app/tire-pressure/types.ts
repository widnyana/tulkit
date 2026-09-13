export type BikeType = "road" | "gravel" | "mtb";

/** Road/gravel ride tiers; each maps to a Berto drop-% multiplier. */
export type RoadRideType = "racing" | "endurance" | "mixed" | "rough";

/** MTB ride tiers; each has its own baseline pressure pair. */
export type MtbRideType = "xc" | "trail" | "enduro";

export type RideType = RoadRideType | MtbRideType;

export interface TireWidthOption {
  value: number;
  unit: "mm" | "in";
  label: string;
}

export interface RideTypeOption {
  value: RideType;
  label: string;
}

export interface CalculatorInputs {
  bikeType: BikeType;
  tireWidth: number;
  tireWidthUnit: "mm" | "in";
  weightKg: number;
  bikeWeightKg?: number;
  tubeless: boolean;
  rideType: RideType;
}

export interface CalculatorResult {
  frontPsi: number;
  rearPsi: number;
  frontBar: number;
  rearBar: number;
}
