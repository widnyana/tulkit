import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect } from "effect";
import {
  fetchAllowed,
  hostsOf,
  isPrivateHostname,
  pinnedUrl,
  validateOutbound,
  type OriginRule,
} from "./outbound.ts";

const RULES = [
  { host: "example.com", origin: "https://example.com" },
  { host: "maps.app.goo.gl", origin: "https://maps.app.goo.gl" },
  { host: "schemas.test", origin: "https://schemas.test:8443" },
] as const satisfies ReadonlyArray<OriginRule>;

const ALLOWED = hostsOf(RULES);

const HOST_ERROR = "Host is not allowed";

type FetchOptions = Parameters<typeof fetchAllowed>[2];

const OPTIONS: FetchOptions = {
  headers: { "User-Agent": "Tulkit/test" },
  timeoutMs: 1000,
  maxRedirects: 2,
  hostError: HOST_ERROR,
};

const runFetchAllowed = (raw: string, options: FetchOptions = OPTIONS) =>
  Effect.runPromise(
    Effect.match(fetchAllowed(raw, RULES, options), {
      onFailure: (error) => ({ ok: false as const, error }),
      onSuccess: (value) => ({ ok: true as const, value }),
    }),
  );

const rejects = (raw: string): boolean =>
  "error" in validateOutbound(raw, ALLOWED);

test("validateOutbound rejects non-http protocols", () => {
  assert.equal(rejects("ftp://example.com/file"), true);
  assert.equal(rejects("file:///etc/passwd"), true);
});

test("validateOutbound rejects hosts outside the allowlist", () => {
  assert.equal(rejects("https://unknown.example.net/path"), true);
  assert.equal(rejects("https://example.com.attacker.net/path"), true);
});

test("validateOutbound rejects private network hosts", () => {
  for (const host of [
    "127.0.0.1",
    "10.1.2.3",
    "192.168.1.1",
    "172.20.0.1",
    "169.254.1.1",
    "foo.local",
  ]) {
    const privateUrl = new URL("https://placeholder.example/path");
    privateUrl.hostname = host;
    assert.equal(isPrivateHostname(host), true, host);
    assert.equal(
      rejects(privateUrl.href),
      true,
      "allowlisted private host must still be rejected",
    );
  }
  assert.equal(
    "error" in validateOutbound("http://127.0.0.1/", ["127.0.0.1"]),
    true,
  );
});

test("validateOutbound accepts allowlisted hosts", () => {
  const result = validateOutbound("https://example.com/a?b=1", ALLOWED);
  assert.equal("error" in result, false);
  if ("error" in result) return;
  assert.equal(result.url.href, "https://example.com/a?b=1");
});

test("validateOutbound keeps the route-specific host error wording", () => {
  const result = validateOutbound(
    "https://nope.test/",
    ALLOWED,
    "Host is not an allowed Google Maps host",
  );
  assert.deepEqual(result, {
    error: "Host is not an allowed Google Maps host",
  });
});

test("pinnedUrl keeps path and query and forces https", () => {
  const pinned = pinnedUrl(new URL("http://example.com/a/b?c=1&d=2"), RULES);
  assert.ok(pinned);
  assert.equal(pinned.href, "https://example.com/a/b?c=1&d=2");
});

test("pinnedUrl uses the rule's literal origin for http input", () => {
  const pinned = pinnedUrl(new URL("http://schemas.test/a/b?c=1"), RULES);
  assert.ok(pinned);
  assert.equal(pinned.origin, "https://schemas.test:8443");
  assert.equal(pinned.pathname, "/a/b");
  assert.equal(pinned.search, "?c=1");
});

test("pinnedUrl keeps protocol-relative paths on the rule's origin", () => {
  const pinned = pinnedUrl(
    new URL("https://example.com//evil.test/steal"),
    RULES,
  );
  assert.ok(pinned);
  assert.equal(pinned.hostname, "example.com");
  assert.equal(pinned.origin, "https://example.com");
  assert.equal(pinned.pathname, "//evil.test/steal");
});

test("pinnedUrl returns null for unknown hosts", () => {
  assert.equal(pinnedUrl(new URL("https://unknown.test/a"), RULES), null);
});

test("fetchAllowed returns the response for an allowed host", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(input instanceof Request ? input.url : input.toString());
    return new Response('{"ok":true}', { status: 200 });
  }) as typeof fetch;

  try {
    const result = await runFetchAllowed("https://example.com/a?b=1");

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.finalUrl.href, "https://example.com/a?b=1");
    assert.equal(result.value.response.status, 200);
    assert.deepEqual(calls, ["https://example.com/a?b=1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchAllowed follows a redirect to an allowed host", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push(url);

    if (calls.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: "https://example.com/next?x=1" },
      });
    }

    return new Response('{"ok":true}', { status: 200 });
  }) as typeof fetch;

  try {
    const result = await runFetchAllowed("https://maps.app.goo.gl/start");

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.finalUrl.href, "https://example.com/next?x=1");
    assert.deepEqual(calls, [
      "https://maps.app.goo.gl/start",
      "https://example.com/next?x=1",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchAllowed rejects a redirect to a blocked host", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://evil.test/steal" },
    })) as typeof fetch;

  try {
    const result = await runFetchAllowed("https://maps.app.goo.gl/start");

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error._tag, "BlockedTarget");
    if (result.error._tag !== "BlockedTarget") return;
    assert.equal(result.error.reason, HOST_ERROR);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchAllowed fails when the redirect budget is exhausted", async () => {
  const originalFetch = globalThis.fetch;
  let hops = 0;

  globalThis.fetch = (async () => {
    hops++;
    return new Response(null, {
      status: 302,
      headers: { location: `https://example.com/hop-${hops}` },
    });
  }) as typeof fetch;

  try {
    const result = await runFetchAllowed("https://example.com/start");

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error._tag, "TooManyRedirects");
    assert.equal(hops, OPTIONS.maxRedirects + 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchAllowed times out slow hops", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) => {
    const { promise, reject } = Promise.withResolvers<Response>();
    init?.signal?.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    });
    return promise;
  }) as typeof fetch;

  try {
    const result = await runFetchAllowed("https://example.com/start", {
      ...OPTIONS,
      timeoutMs: 20,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error._tag, "RequestTimeout");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchAllowed reports network failures", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new Error("boom");
  }) as typeof fetch;

  try {
    const result = await runFetchAllowed("https://example.com/start");

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error._tag, "UpstreamFailure");
    if (result.error._tag !== "UpstreamFailure") return;
    assert.equal(result.error.status, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
