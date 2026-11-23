import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { Effect } from "effect";
import {
  GpxParseFailure,
  importMapsLink,
  MapsLinkFailure,
  parseGpxText,
  readGpxFile,
  runToResult,
} from "./effects.ts";

(globalThis as { DOMParser?: typeof DOMParser }).DOMParser =
  XmldomDOMParser as unknown as typeof DOMParser;

const fixture = (name: string) =>
  readFileSync(
    new URL(`../../.harness/ref/gpx/${name}`, import.meta.url),
    "utf8",
  );

const PLACE_URL =
  "https://www.google.com/maps/place/Test+Landmark/@12.5,25.5,17z";

describe("parseGpxText", () => {
  it("parses a real track export", async () => {
    const parsed = await Effect.runPromise(
      parseGpxText(fixture("audax-jakarta-212-km.gpx")),
    );
    assert.equal(parsed.tracks.length, 1);
    assert.ok(parsed.tracks[0].segments[0].length > 0);
  });

  it("fails with a typed GpxParseFailure on malformed XML", async () => {
    const error = await Effect.runPromise(
      Effect.flip(parseGpxText("<gpx><trk><trkseg></gpx>")),
    );
    assert.ok(error instanceof GpxParseFailure);
    assert.ok(error.message.length > 0);
  });
});

describe("readGpxFile", () => {
  it("returns the file text and the parsed geometry", async () => {
    const xml = fixture("audax-yogyakarta-yucc-2025-100-km.gpx");
    const result = await Effect.runPromise(
      readGpxFile(new File([xml], "route.gpx")),
    );
    assert.equal(result.text, xml);
    assert.equal(result.parsed.tracks.length, 1);
  });
});

describe("importMapsLink", () => {
  it("parses a place link without touching the network", async () => {
    const waypoints = await Effect.runPromise(importMapsLink(PLACE_URL));
    assert.equal(waypoints.length, 1);
    assert.equal(waypoints[0].name, "Test Landmark");
  });

  it("resolves a short link through the API before parsing", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ resolvedUrl: PLACE_URL }), {
        status: 200,
      })) as typeof fetch;
    try {
      const waypoints = await Effect.runPromise(
        importMapsLink("https://maps.app.goo.gl/abc123"),
      );
      assert.equal(waypoints[0].lat, 12.5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails with a typed MapsLinkFailure when the API rejects the link", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "Link expired" }), {
        status: 502,
      })) as typeof fetch;
    try {
      const error = await Effect.runPromise(
        Effect.flip(importMapsLink("https://maps.app.goo.gl/abc123")),
      );
      assert.ok(error instanceof MapsLinkFailure);
      assert.equal(error.message, "Link expired");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("runToResult", () => {
  it("returns the success value", async () => {
    const result = await runToResult(
      parseGpxText(fixture("audax-jakarta-212-km.gpx")),
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.value.tracks.length, 1);
  });

  it("returns the typed failure message", async () => {
    const result = await runToResult(parseGpxText("<gpx>"));
    assert.ok(!result.ok);
    if (result.ok) return;
    assert.equal(typeof result.message, "string");
  });
});
