import assert from "node:assert/strict";
import { test } from "node:test";
import { Duration, Effect, Schedule } from "effect";
import { fetchElevations } from "./elevation.ts";
import {
  InvalidPayload,
  ServiceRejected,
  ServiceUnavailable,
} from "./errors.ts";
import type { RequestPolicy } from "./http.ts";

const POINTS = [
  { lat: 10.5, lon: 20.5 },
  { lat: -7.782, lon: 110.369 },
  { lat: 0, lon: 0 },
];

const NO_RETRY: RequestPolicy = {
  schedule: Schedule.recurs(0),
  timeout: Duration.seconds(1),
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

test("fetchElevations posts the points to the same-origin elevation endpoint", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  await withMockedFetch(
    async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ elevations: [127, 168, 0] }), {
        status: 200,
      });
    },
    async () => {
      const elevations = await Effect.runPromise(fetchElevations(POINTS));
      assert.deepEqual(elevations, [127, 168, 0]);
    },
  );

  assert.equal(requestUrl, "/api/gpx/elevation");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), { points: POINTS });
});

test("fetchElevations keeps null gaps for missing values", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [127, null, 0] }), {
        status: 200,
      }),
    async () => {
      const elevations = await Effect.runPromise(fetchElevations(POINTS));
      assert.deepEqual(elevations, [127, null, 0]);
    },
  );
});

test("fetchElevations fails with InvalidPayload when the array is empty", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [] }), { status: 200 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchElevations(POINTS)),
      );
      assert.ok(error instanceof InvalidPayload);
    },
  );
});
test("fetchElevations fails with ServiceRejected on an HTTP error", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 503 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchElevations(POINTS, NO_RETRY)),
      );
      assert.ok(error instanceof ServiceRejected);
      assert.equal(error.status, 503);
    },
  );
});

test("fetchElevations fails with ServiceUnavailable on a network error", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchElevations(POINTS, NO_RETRY)),
      );
      assert.ok(error instanceof ServiceUnavailable);
    },
  );
});

test("fetchElevations fails with InvalidPayload when the response is misaligned", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [127] }), { status: 200 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchElevations(POINTS)),
      );
      assert.ok(error instanceof InvalidPayload);
    },
  );
});

test("fetchElevations returns an empty array for no points", async () => {
  const elevations = await Effect.runPromise(fetchElevations([]));
  assert.deepEqual(elevations, []);
});
