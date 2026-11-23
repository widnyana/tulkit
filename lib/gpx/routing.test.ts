import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchRoadRoute } from "./routing.ts";

const POINTS = [
  { lat: 10.5, lon: 20.5 },
  { lat: 15.75, lon: 30.25 },
];

const withMockedFetch = async (
  response: () => Promise<Response>,
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

test("fetchRoadRoute decodes the OSRM geometry into LatLon points", async () => {
  await withMockedFetch(
    async () =>
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: {
                coordinates: [
                  [20.5, 10.5],
                  [25, 13],
                  [30.25, 15.75],
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    async () => {
      const route = await fetchRoadRoute(POINTS, "driving");
      assert.deepEqual(route, [
        { lat: 10.5, lon: 20.5 },
        { lat: 13, lon: 25 },
        { lat: 15.75, lon: 30.25 },
      ]);
    },
  );
});

test("fetchRoadRoute falls back to null when OSRM finds no route", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ code: "NoRoute" }), { status: 200 }),
    async () => {
      assert.equal(await fetchRoadRoute(POINTS, "driving"), null);
    },
  );
});

test("fetchRoadRoute falls back to null on an HTTP error", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 503 }),
    async () => {
      assert.equal(await fetchRoadRoute(POINTS, "driving"), null);
    },
  );
});

test("fetchRoadRoute falls back to null on a network error", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      assert.equal(await fetchRoadRoute(POINTS, "driving"), null);
    },
  );
});

test("fetchRoadRoute returns null for transit, which OSRM cannot route", async () => {
  assert.equal(await fetchRoadRoute(POINTS, "transit"), null);
});

test("fetchRoadRoute returns null with fewer than two points", async () => {
  assert.equal(await fetchRoadRoute([POINTS[0]], "driving"), null);
});
