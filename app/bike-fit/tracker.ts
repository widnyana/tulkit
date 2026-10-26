import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { LegFrame, Point, Side } from "./types.ts";

const WASM_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";

const JOINTS = {
  left: { hip: 23, knee: 25, ankle: 27 },
  right: { hip: 24, knee: 26, ankle: 28 },
} as const;

export interface Tracker {
  /** Returns the tracked leg for this frame, or null when no person is found.
   *  Coordinates are isotropic: x is scaled by the video aspect ratio, y is in 0-1 of the frame height.
   */
  detect(video: HTMLVideoElement, side: Side, tMs: number): LegFrame | null;
  close(): void;
}

/** Creates a MediaPipe pose landmarker-backed tracker (dynamic import, GPU with CPU fallback). */
export async function createTracker(): Promise<Tracker> {
  const { FilesetResolver, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

  let landmarker: PoseLandmarker;
  try {
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  } catch {
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  }

  return {
    detect(video: HTMLVideoElement, side: Side, tMs: number): LegFrame | null {
      const result = landmarker.detectForVideo(video, tMs);
      const landmarks = result.landmarks[0];
      if (!landmarks) return null;
      const aspect =
        video.videoWidth > 0 && video.videoHeight > 0
          ? video.videoWidth / video.videoHeight
          : 1;
      const toPoint = (index: number): Point => {
        const lm = landmarks[index];
        return { x: lm.x * aspect, y: lm.y, visibility: lm.visibility ?? 0 };
      };
      const joints = JOINTS[side];
      return {
        t: tMs,
        hip: toPoint(joints.hip),
        knee: toPoint(joints.knee),
        ankle: toPoint(joints.ankle),
      };
    },
    close() {
      landmarker.close();
    },
  };
}
