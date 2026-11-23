import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchRoadRoute, snapToRoad } from "./routing.ts";

const POINTS = [
  { lat: 10.5, lon: 20.5 },
  { lat: 15.75, lon: 30.25 },
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

test("fetchRoadRoute posts the points to the same-origin routing endpoint", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  await withMockedFetch(
    async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          coordinates: [
            [20.5, 10.5],
            [25, 13],
            [30.25, 15.75],
          ],
        }),
        { status: 200 },
      );
    },
    async () => {
      const route = await fetchRoadRoute(POINTS, "driving");
      assert.deepEqual(route, [
        { lat: 10.5, lon: 20.5 },
        { lat: 13, lon: 25 },
        { lat: 15.75, lon: 30.25 },
      ]);
    },
  );

  assert.equal(requestUrl, "/api/gpx/routing");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    points: POINTS,
    mode: "driving",
  });
});

test("fetchRoadRoute falls back to null when the proxy finds no route", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ coordinates: null }), { status: 200 }),
    async () => {
      assert.equal(await fetchRoadRoute(POINTS, "driving"), null);
    },
  );
});

test("fetchRoadRoute falls back to null on an empty geometry", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ coordinates: [] }), { status: 200 }),
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
  let fetchCalled = false;
  await withMockedFetch(
    async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    },
    async () => {
      assert.equal(await fetchRoadRoute(POINTS, "transit"), null);
    },
  );
  assert.equal(fetchCalled, false);
});

test("fetchRoadRoute returns null with fewer than two points", async () => {
  assert.equal(await fetchRoadRoute([POINTS[0]], "driving"), null);
});

test("fetchRoadRoute returns null with more than 100 points", async () => {
  const points = Array.from({ length: 101 }, (_, index) => ({
    lat: 0,
    lon: index / 10,
  }));
  let fetchCalled = false;
  await withMockedFetch(
    async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    },
    async () => {
      assert.equal(await fetchRoadRoute(points, "walking"), null);
    },
  );
  assert.equal(fetchCalled, false);
});

test("snapToRoad posts the click to the same-origin snap endpoint", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  await withMockedFetch(
    async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(
        JSON.stringify({
          point: { lat: -7.782, lon: 110.369 },
          distance: 29,
          reason: "ok",
        }),
        { status: 200 },
      );
    },
    async () => {
      assert.deepEqual(
        await snapToRoad({ lat: -7.78, lon: 110.37 }, "bicycling"),
        {
          point: { lat: -7.782, lon: 110.369 },
          distance: 29,
          reason: "ok",
        },
      );
    },
  );

  assert.equal(requestUrl, "/api/gpx/snap");
  assert.equal(requestInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    lat: -7.78,
    lon: 110.37,
    mode: "bicycling",
  });
});

test("snapToRoad reports no road when the proxy finds none", async () => {
  await withMockedFetch(
    async () =>
      new Response(
        JSON.stringify({ point: null, distance: null, reason: "no-road" }),
        { status: 200 },
      ),
    async () => {
      assert.deepEqual(
        await snapToRoad({ lat: -3.879, lon: 111.408 }, "driving"),
        { point: null, distance: null, reason: "no-road" },
      );
    },
  );
});

test("snapToRoad reports unavailable on an HTTP error", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 400 }),
    async () => {
      assert.deepEqual(await snapToRoad({ lat: 10.5, lon: 20.5 }, "walking"), {
        point: null,
        distance: null,
        reason: "unavailable",
      });
    },
  );
});

test("snapToRoad reports unavailable on a network error", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      assert.deepEqual(await snapToRoad({ lat: 10.5, lon: 20.5 }, "driving"), {
        point: null,
        distance: null,
        reason: "unavailable",
      });
    },
  );
});

test("snapToRoad reports unavailable for a malformed body", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ point: null, distance: null }), {
        status: 200,
      }),
    async () => {
      assert.deepEqual(await snapToRoad({ lat: 10.5, lon: 20.5 }, "driving"), {
        point: null,
        distance: null,
        reason: "unavailable",
      });
    },
  );
});

test("snapToRoad skips the request for transit", async () => {
  let fetchCalled = false;
  await withMockedFetch(
    async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    },
    async () => {
      assert.deepEqual(await snapToRoad({ lat: 10.5, lon: 20.5 }, "transit"), {
        point: null,
        distance: null,
        reason: "unavailable",
      });
    },
  );
  assert.equal(fetchCalled, false);
});

test("snapToRoad rejects out-of-range coordinates without a request", async () => {
  let fetchCalled = false;
  await withMockedFetch(
    async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    },
    async () => {
      assert.deepEqual(await snapToRoad({ lat: 200, lon: 20.5 }, "driving"), {
        point: null,
        distance: null,
        reason: "unavailable",
      });
    },
  );
  assert.equal(fetchCalled, false);
});
