// Copies the MediaPipe WASM runtime from node_modules to public/ so it is
// served from our own origin (no third-party request, matches the privacy copy).
// The model file public/mediapipe/pose_landmarker_lite.task is committed.
import { cpSync, mkdirSync } from "node:fs";

const src = new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url);
const dst = new URL("../public/mediapipe/wasm/", import.meta.url);
mkdirSync(dst, { recursive: true });
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) {
  cpSync(new URL(f, src), new URL(f, dst));
}
