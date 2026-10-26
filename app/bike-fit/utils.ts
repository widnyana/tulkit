import type { BikeFitResult, FitHint, LegFrame, Point } from "./types.ts";

/** Acceptable knee flexion window (degrees) at bottom dead center. */
export const TARGET_FLEXION_MIN = 30;
/** Upper bound of the acceptable knee flexion window (degrees). */
export const TARGET_FLEXION_MAX = 40;
/** Minimum MediaPipe visibility for a joint to be trusted. */
export const MIN_VISIBILITY = 0.5;
/** Minimum kept frames required to attempt an analysis. */
export const MIN_FRAMES = 30;

/** Knee flexion in degrees (0 = straight leg) from hip, knee and ankle points. */
export function kneeFlexionDeg(hip: Point, knee: Point, ankle: Point): number {
  const v1x = hip.x - knee.x;
  const v1y = hip.y - knee.y;
  const v2x = ankle.x - knee.x;
  const v2y = ankle.y - knee.y;
  const l1 = Math.hypot(v1x, v1y);
  const l2 = Math.hypot(v2x, v2y);
  if (l1 === 0 || l2 === 0) return 0;
  const dot = v1x * v2x + v1y * v2y;
  const interior =
    (Math.acos(Math.min(1, Math.max(-1, dot / (l1 * l2)))) * 180) / Math.PI;
  return 180 - interior;
}

/** Centered moving average; edges average over the samples that exist. */
export function movingAverage(values: number[], window = 5): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += values[j];
    return sum / (end - start + 1);
  });
}

/** Median of a numeric array; empty array returns NaN. */
export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Saddle height hint: "raise" if too bent, "lower" if too straight, else "ok". */
export function classifyFlexion(deg: number): FitHint {
  if (deg > TARGET_FLEXION_MAX) return "raise";
  if (deg < TARGET_FLEXION_MIN) return "lower";
  return "ok";
}

/** Analyze pedal cycles and estimate knee flexion at bottom dead center. */
export function analyze(frames: LegFrame[]): BikeFitResult | null {
  const kept = frames.filter(
    (f) =>
      f.hip.visibility >= MIN_VISIBILITY &&
      f.knee.visibility >= MIN_VISIBILITY &&
      f.ankle.visibility >= MIN_VISIBILITY,
  );
  if (kept.length < MIN_FRAMES) return null;

  const ankleY = movingAverage(kept.map((f) => f.ankle.y));
  const flex = movingAverage(
    kept.map((f) => kneeFlexionDeg(f.hip, f.knee, f.ankle)),
  );

  const lo = Math.min(...ankleY);
  const hi = Math.max(...ankleY);
  const threshold = lo + 0.8 * (hi - lo);

  const candidates: number[] = [];
  for (let i = 1; i < ankleY.length - 1; i++) {
    if (
      ankleY[i] >= ankleY[i - 1] &&
      ankleY[i] > ankleY[i + 1] &&
      ankleY[i] >= threshold
    ) {
      if (
        candidates.length === 0 ||
        i - candidates[candidates.length - 1] >= 5
      ) {
        candidates.push(i);
      }
    }
  }
  if (candidates.length === 0) return null;

  const flexionAtBdcDeg = median(candidates.map((i) => flex[i]));
  return {
    flexionAtBdcDeg,
    cycles: candidates.length,
    keptRatio: kept.length / frames.length,
    hint: classifyFlexion(flexionAtBdcDeg),
  };
}
