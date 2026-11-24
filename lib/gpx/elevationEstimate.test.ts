import assert from "node:assert/strict";
import { test } from "node:test";
import { Duration, Effect, Schedule } from "effect";
import type { ParsedGpx } from "../../app/gpx/types.ts";
import { estimateElevationGain } from "./elevationEstimate.ts";
import { InvalidInput, InvalidPayload, ServiceRejected } from "./errors.ts";
import type { RequestPolicy } from "./http.ts";

const NO_RETRY: RequestPolicy = {
  schedule: Schedule.recurs(0),
  timeout: Duration.seconds(1),
};

const TRACK: ParsedGpx = {
  waypoints: [],
  routes: [],
  tracks: [
    {
      segments: [
        [
          { lat: 0, lon: 0 },
          { lat: 0.009, lon: 0 },
          { lat: 0.018, lon: 0 },
        ],
      ],
    },
  ],
  skipped: 0,
};

const EMPTY: ParsedGpx = {
  waypoints: [],
  routes: [],
  tracks: [],
  skipped: 0,
};

const OPENTOPOGRAPHY_ELEVATIONS: Record<string, number> = {
  "0": 100,
  "0.009": 150,
  "0.018": 100,
};

const withMockedFetch = async (
  response: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = response as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test("estimateElevationGain queries OpenTopography per sampled point and accumulates gain", async () => {
  const requestedUrls: string[] = [];
  await withMockedFetch(
    async (input) => {
      const url = new URL(String(input));
      requestedUrls.push(url.toString());
      const lat = url.searchParams.get("latitude") ?? "";
      return new Response(
        JSON.stringify({
          Status: "OK",
          Elevation: OPENTOPOGRAPHY_ELEVATIONS[lat],
        }),
        { status: 200 },
      );
    },
    async () => {
      const gain = await Effect.runPromise(
        estimateElevationGain(TRACK, "opentopography", "test-key", NO_RETRY),
      );
      assert.equal(gain, 50);
    },
  );

  assert.equal(requestedUrls.length, 3);
  const first = new URL(requestedUrls[0]);
  assert.equal(first.hostname, "portal.opentopography.org");
  assert.equal(first.searchParams.get("dataset"), "SRTMGL1");
  assert.equal(first.searchParams.get("API_Key"), "test-key");
});

test("estimateElevationGain batches sampled points through the Google proxy", async () => {
  let requestUrl = "";
  let requestBody: unknown;
  await withMockedFetch(
    async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ elevations: [100, 150, 100] }), {
        status: 200,
      });
    },
    async () => {
      const gain = await Effect.runPromise(
        estimateElevationGain(TRACK, "google", "test-key", NO_RETRY),
      );
      assert.equal(gain, 50);
    },
  );

  assert.equal(requestUrl, "/api/gpx/elevation-estimate");
  assert.deepEqual(requestBody, {
    locations: [
      { lat: 0, lon: 0 },
      { lat: 0.009, lon: 0 },
      { lat: 0.018, lon: 0 },
    ],
    credential: "test-key",
  });
});

test("estimateElevationGain reports a rejected OpenTopography credential", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 401 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(
          estimateElevationGain(TRACK, "opentopography", "bad-key", NO_RETRY),
        ),
      );
      assert.ok(error instanceof ServiceRejected);
      assert.equal(error.status, 401);
    },
  );
});

test("estimateElevationGain reports a misaligned Google response as invalid", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [] }), { status: 200 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(
          estimateElevationGain(TRACK, "google", "bad-key", NO_RETRY),
        ),
      );
      assert.ok(error instanceof InvalidPayload);
    },
  );
});

test("estimateElevationGain refuses a file with no usable coordinates", async () => {
  let calls = 0;
  await withMockedFetch(
    async () => {
      calls += 1;
      return new Response("", { status: 200 });
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(
          estimateElevationGain(EMPTY, "opentopography", "test-key", NO_RETRY),
        ),
      );
      assert.ok(error instanceof InvalidInput);
    },
  );
  assert.equal(calls, 0);
});

test("estimateElevationGain downsamples a long track instead of querying every point", async () => {
  const LAT_STEP_DEGREES = 0.0008994;
  const points = Array.from({ length: 2000 }, (_, index) => ({
    lat: index * LAT_STEP_DEGREES,
    lon: 0,
  }));
  const longTrack: ParsedGpx = {
    waypoints: [],
    routes: [],
    tracks: [{ segments: [points] }],
    skipped: 0,
  };

  let calls = 0;
  await withMockedFetch(
    async () => {
      calls += 1;
      return new Response(JSON.stringify({ Status: "OK", Elevation: 100 }), {
        status: 200,
      });
    },
    async () => {
      await Effect.runPromise(
        estimateElevationGain(
          longTrack,
          "opentopography",
          "test-key",
          NO_RETRY,
        ),
      );
    },
  );

  assert.ok(calls < points.length);
  assert.ok(calls > 50);
  assert.ok(calls <= 520);
});
