import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

describe("public/maplibre-gl-worker.mjs", () => {
  it("matches the worker bundle shipped by the installed maplibre-gl version", () => {
    const installedPath = createRequire(import.meta.url).resolve(
      "maplibre-gl/dist/maplibre-gl-worker.mjs",
    );
    const installed = readFileSync(installedPath, "utf8");
    const vendored = readFileSync(
      new URL("../../public/maplibre-gl-worker.mjs", import.meta.url),
      "utf8",
    );
    assert.equal(
      vendored,
      installed,
      "public/maplibre-gl-worker.mjs is stale — re-run: " +
        "cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/maplibre-gl-worker.mjs",
    );
  });
});
