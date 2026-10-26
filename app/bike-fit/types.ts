export type Side = "left" | "right";

/** Normalized image coordinates (0-1, y grows downward) plus MediaPipe visibility (0-1). */
export interface Point {
  x: number;
  y: number;
  visibility: number;
}

/** One video frame of the tracked leg. t is milliseconds. */
export interface LegFrame {
  t: number;
  hip: Point;
  knee: Point;
  ankle: Point;
}

export type FitHint = "raise" | "lower" | "ok";

export interface BikeFitResult {
  /** Median knee flexion (degrees, 0 = straight leg) at bottom dead center. */
  flexionAtBdcDeg: number;
  /** Number of pedal strokes the median is based on. */
  cycles: number;
  /** Share of frames with all three joints visible (0-1). */
  keptRatio: number;
  hint: FitHint;
}
