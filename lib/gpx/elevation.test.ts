import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchElevations } from "./elevation.ts";

const POINTS = [
  { lat: 10.5, lon: 20.5 },
  { lat: -7.782, lon: 110.369 },
  { lat: 0, lon: 0 },
];

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
      assert.deepEqual(await fetchElevations(POINTS), [127, 168, 0]);
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
      assert.deepEqual(await fetchElevations(POINTS), [127, null, 0]);
    },
  );
});

test("fetchElevations returns all nulls when the proxy fails", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [] }), { status: 200 }),
    async () => {
      assert.deepEqual(await fetchElevations(POINTS), [null, null, null]);
    },
  );
});

test("fetchElevations returns all nulls on an HTTP error", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 503 }),
    async () => {
      assert.deepEqual(await fetchElevations(POINTS), [null, null, null]);
    },
  );
});

test("fetchElevations returns all nulls on a network error", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      assert.deepEqual(await fetchElevations(POINTS), [null, null, null]);
    },
  );
});

test("fetchElevations returns all nulls when the response is misaligned", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [127] }), { status: 200 }),
    async () => {
      assert.deepEqual(await fetchElevations(POINTS), [null, null, null]);
    },
  );
});

test("fetchElevations returns an empty array for no points", async () => {
  assert.deepEqual(await fetchElevations([]), []);
});
