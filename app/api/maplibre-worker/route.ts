import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const resolveModule = createRequire(import.meta.url).resolve;

let workerSource: string | undefined;

function readWorkerSource(): string {
  if (workerSource === undefined) {
    const workerPath = resolveModule("maplibre-gl/dist/maplibre-gl-worker.mjs");
    workerSource = readFileSync(workerPath, "utf8");
  }
  return workerSource;
}

export async function GET() {
  return new Response(readWorkerSource(), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
