import assert from "node:assert/strict";
import { test } from "node:test";
import { Duration, Effect, Fiber, Schedule } from "effect";
import {
  InvalidInput,
  InvalidPayload,
  ServiceRejected,
  ServiceUnavailable,
} from "./errors.ts";
import type { RequestPolicy } from "./http.ts";
import { fetchRoadRoute, snapToRoad } from "./routing.ts";

const POINTS = [
  { lat: 10.5, lon: 20.5 },
  { lat: 15.75, lon: 30.25 },
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
      const route = await Effect.runPromise(fetchRoadRoute(POINTS, "driving"));
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

test("fetchRoadRoute returns null when the proxy finds no route", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ coordinates: null }), { status: 200 }),
    async () => {
      const route = await Effect.runPromise(fetchRoadRoute(POINTS, "driving"));
      assert.equal(route, null);
    },
  );
});

test("fetchRoadRoute returns null on an empty geometry", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ coordinates: [] }), { status: 200 }),
    async () => {
      const route = await Effect.runPromise(fetchRoadRoute(POINTS, "driving"));
      assert.equal(route, null);
    },
  );
});

test("fetchRoadRoute fails with InvalidPayload for a wrong-typed geometry", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ coordinates: "not-geometry" }), {
        status: 200,
      }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchRoadRoute(POINTS, "driving")),
      );
      assert.ok(error instanceof InvalidPayload);
    },
  );
});

test("fetchRoadRoute fails with ServiceRejected on an HTTP error", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 503 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchRoadRoute(POINTS, "driving", NO_RETRY)),
      );
      assert.ok(error instanceof ServiceRejected);
      assert.equal(error.status, 503);
    },
  );
});

test("fetchRoadRoute fails with ServiceUnavailable on a network error", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchRoadRoute(POINTS, "driving", NO_RETRY)),
      );
      assert.ok(error instanceof ServiceUnavailable);
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
      const route = await Effect.runPromise(fetchRoadRoute(POINTS, "transit"));
      assert.equal(route, null);
    },
  );
  assert.equal(fetchCalled, false);
});

test("fetchRoadRoute returns null with fewer than two points", async () => {
  const route = await Effect.runPromise(fetchRoadRoute([POINTS[0]], "driving"));
  assert.equal(route, null);
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
      const route = await Effect.runPromise(fetchRoadRoute(points, "walking"));
      assert.equal(route, null);
    },
  );
  assert.equal(fetchCalled, false);
});

test("fetchRoadRoute retries a 5xx and succeeds", async () => {
  let calls = 0;
  await withMockedFetch(
    async () => {
      calls += 1;
      if (calls === 1) return new Response("", { status: 503 });
      return new Response(
        JSON.stringify({
          coordinates: [
            [20.5, 10.5],
            [30.25, 15.75],
          ],
        }),
        { status: 200 },
      );
    },
    async () => {
      const route = await Effect.runPromise(
        fetchRoadRoute(POINTS, "driving", {
          schedule: Schedule.recurs(1),
          timeout: Duration.seconds(1),
        }),
      );
      assert.deepEqual(route, [
        { lat: 10.5, lon: 20.5 },
        { lat: 15.75, lon: 30.25 },
      ]);
    },
  );
  assert.ok(calls >= 2);
});

test("fetchRoadRoute bounds a permanently failing request with the default policy", async () => {
  let calls = 0;
  await withMockedFetch(
    async () => {
      calls += 1;
      return new Response("", { status: 503 });
    },
    async () => {
      const start = performance.now();
      const error = await Effect.runPromise(
        Effect.flip(fetchRoadRoute(POINTS, "driving")),
      );
      const elapsed = performance.now() - start;
      assert.ok(error instanceof ServiceRejected);
      assert.ok(elapsed < 2000, `expected under 2000ms, took ${elapsed}ms`);
      assert.ok(calls >= 2);
    },
  );
});

test("fetchRoadRoute fails with ServiceRejected on a 400 without retrying", async () => {
  let calls = 0;
  await withMockedFetch(
    async () => {
      calls += 1;
      return new Response("", { status: 400 });
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchRoadRoute(POINTS, "driving")),
      );
      assert.ok(error instanceof ServiceRejected);
      assert.equal(error.status, 400);
    },
  );
  assert.equal(calls, 1);
});

test("fetchRoadRoute fails with TimeoutError when the request never resolves", async () => {
  await withMockedFetch(
    () => Promise.withResolvers<Response>().promise,
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(
          fetchRoadRoute(POINTS, "driving", {
            schedule: Schedule.recurs(0),
            timeout: Duration.millis(20),
          }),
        ),
      );
      assert.equal(error._tag, "TimeoutError");
    },
  );
});

test("fetchRoadRoute aborts the fetch when its fiber is interrupted", async () => {
  const started = Promise.withResolvers<void>();
  let aborted = false;
  await withMockedFetch(
    (_input, init) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
      });
      started.resolve();
      return Promise.withResolvers<Response>().promise;
    },
    async () => {
      const fiber = Effect.runFork(fetchRoadRoute(POINTS, "driving"));
      await started.promise;
      await Effect.runPromise(Fiber.interrupt(fiber));
    },
  );
  assert.equal(aborted, true);
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
      const snap = await Effect.runPromise(
        snapToRoad({ lat: -7.78, lon: 110.37 }, "bicycling"),
      );
      assert.deepEqual(snap, {
        point: { lat: -7.782, lon: 110.369 },
        distance: 29,
        reason: "ok",
      });
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
      const snap = await Effect.runPromise(
        snapToRoad({ lat: -3.879, lon: 111.408 }, "driving"),
      );
      assert.deepEqual(snap, {
        point: null,
        distance: null,
        reason: "no-road",
      });
    },
  );
});

test("snapToRoad fails with ServiceRejected on a 400", async () => {
  await withMockedFetch(
    async () => new Response("", { status: 400 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(snapToRoad({ lat: 10.5, lon: 20.5 }, "walking", NO_RETRY)),
      );
      assert.ok(error instanceof ServiceRejected);
      assert.equal(error.status, 400);
    },
  );
});

test("snapToRoad fails with ServiceUnavailable on a network error", async () => {
  await withMockedFetch(
    async () => {
      throw new Error("offline");
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(snapToRoad({ lat: 10.5, lon: 20.5 }, "driving", NO_RETRY)),
      );
      assert.ok(error instanceof ServiceUnavailable);
    },
  );
});

test("snapToRoad fails with InvalidPayload for a malformed body", async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ point: null, distance: null }), {
        status: 200,
      }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(snapToRoad({ lat: 10.5, lon: 20.5 }, "driving")),
      );
      assert.ok(error instanceof InvalidPayload);
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
      const snap = await Effect.runPromise(
        snapToRoad({ lat: 10.5, lon: 20.5 }, "transit"),
      );
      assert.deepEqual(snap, {
        point: null,
        distance: null,
        reason: "unavailable",
      });
    },
  );
  assert.equal(fetchCalled, false);
});

test("snapToRoad fails with InvalidInput for out-of-range coordinates", async () => {
  let fetchCalled = false;
  await withMockedFetch(
    async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(snapToRoad({ lat: 200, lon: 20.5 }, "driving")),
      );
      assert.ok(error instanceof InvalidInput);
    },
  );
  assert.equal(fetchCalled, false);
});
