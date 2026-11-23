import assert from "node:assert/strict";
import { test } from "node:test";
import { Duration, Effect, Schedule } from "effect";
import { InvalidInput, ServiceUnavailable } from "./errors.ts";
import type { RequestPolicy } from "./http.ts";
import { fetchGpxText } from "./remote.ts";

const LOAD_FAILURE =
  "Could not load a GPX file from that link. The site may not allow it.";

const GPX = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1"></gpx>`;

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

test("fetchGpxText returns the text of a successful response", async () => {
  let requestUrl = "";
  await withMockedFetch(
    async (input) => {
      requestUrl = String(input);
      return new Response(GPX, { status: 200 });
    },
    async () => {
      const text = await Effect.runPromise(
        fetchGpxText("https://example.com/trail.gpx", NO_RETRY),
      );
      assert.equal(text, GPX);
      assert.equal(requestUrl, "https://example.com/trail.gpx");
    },
  );
});

test("fetchGpxText reports a 404 as a load failure", async () => {
  await withMockedFetch(
    async () => new Response("missing", { status: 404 }),
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchGpxText("https://example.com/trail.gpx", NO_RETRY)),
      );
      assert.ok(error instanceof ServiceUnavailable);
      assert.equal(error.message, LOAD_FAILURE);
    },
  );
});

test("fetchGpxText reports a throwing fetch as a load failure", async () => {
  await withMockedFetch(
    async () => {
      throw new TypeError("network down");
    },
    async () => {
      const error = await Effect.runPromise(
        Effect.flip(fetchGpxText("https://example.com/trail.gpx", NO_RETRY)),
      );
      assert.ok(error instanceof ServiceUnavailable);
      assert.equal(error.message, LOAD_FAILURE);
    },
  );
});

test("fetchGpxText rejects non-GPX schemes without a request", async () => {
  let calls = 0;
  await withMockedFetch(
    async () => {
      calls += 1;
      return new Response(GPX, { status: 200 });
    },
    async () => {
      for (const source of ["ftp://x", "not a url"]) {
        const error = await Effect.runPromise(
          Effect.flip(fetchGpxText(source, NO_RETRY)),
        );
        assert.ok(error instanceof InvalidInput);
        assert.equal(error.message, "That link is not a GPX address.");
      }
    },
  );
  assert.equal(calls, 0);
});
