import assert from "node:assert/strict";
import { test } from "node:test";
import { Duration, Effect, Schedule } from "effect";
import { fetchElevations } from "./elevation.ts";
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

const pointAt = (index: number) => ({ lat: index, lon: -index });

const elevationsFromRequest = (init?: RequestInit) => {
  const body = JSON.parse(String(init?.body)) as {
    points: { lat: number; lon: number }[];
  };
  return {
    body,
    response: new Response(
      JSON.stringify({ elevations: body.points.map((point) => point.lat) }),
      { status: 200 },
    ),
  };
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

test("fetchElevations returns nulls when the array is empty", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [] }), { status: 200 }),
    async () => {
      const elevations = await Effect.runPromise(fetchElevations(POINTS));
      assert.deepEqual(elevations, [null, null, null]);
    },
  );
});

test("fetchElevations returns nulls for a wrong-typed body", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: "not-elevations" }), {
        status: 200,
      }),
    async () => {
      const elevations = await Effect.runPromise(fetchElevations(POINTS));
      assert.deepEqual(elevations, [null, null, null]);
    },
  );
});

test("fetchElevations returns nulls when the service rejects the request", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 503 }),
    async () => {
      const elevations = await Effect.runPromise(
        fetchElevations(POINTS, NO_RETRY),
      );
      assert.deepEqual(elevations, [null, null, null]);
    },
  );
});

test("fetchElevations returns nulls when the network fails", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      const elevations = await Effect.runPromise(
        fetchElevations(POINTS, NO_RETRY),
      );
      assert.deepEqual(elevations, [null, null, null]);
    },
  );
});

test("fetchElevations returns nulls when the response is misaligned", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ elevations: [127] }), { status: 200 }),
    async () => {
      const elevations = await Effect.runPromise(fetchElevations(POINTS));
      assert.deepEqual(elevations, [null, null, null]);
    },
  );
});

test("fetchElevations splits requests into batches of 2000 points", async () => {
  const points = Array.from({ length: 2001 }, (_, index) => pointAt(index));
  const bodies: { points: { lat: number; lon: number }[] }[] = [];

  await withMockedFetch(
    async (_input, init) => {
      const { body, response } = elevationsFromRequest(init);
      bodies.push(body);
      return response;
    },
    async () => {
      const elevations = await Effect.runPromise(fetchElevations(points));
      assert.equal(elevations.length, 2001);
      assert.equal(elevations[0], 0);
      assert.equal(elevations[1999], 1999);
      assert.equal(elevations[2000], 2000);
    },
  );

  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].points.length, 2000);
  assert.equal(bodies[1].points.length, 1);
});

test("fetchElevations degrades a failed batch to nulls and keeps the rest", async () => {
  const points = Array.from({ length: 2001 }, (_, index) => pointAt(index));

  await withMockedFetch(
    async (_input, init) => {
      const { body, response } = elevationsFromRequest(init);
      if (body.points.length === 1) {
        return new Response("", { status: 503 });
      }
      return response;
    },
    async () => {
      const elevations = await Effect.runPromise(
        fetchElevations(points, NO_RETRY),
      );
      assert.equal(elevations.length, 2001);
      assert.deepEqual(
        elevations.slice(0, 2000),
        points.slice(0, 2000).map((point) => point.lat),
      );
      assert.equal(elevations[2000], null);
    },
  );
});

test("fetchElevations returns an empty array for no points", async () => {
  const elevations = await Effect.runPromise(fetchElevations([]));
  assert.deepEqual(elevations, []);
});
