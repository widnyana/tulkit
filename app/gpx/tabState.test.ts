import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTabQuery,
  CSV_INPUT_KEY,
  MAPS_INPUT_KEY,
  MAPS_RESULT_KEY,
  MAPS_RESULT_MAX_BYTES,
  readActiveTab,
  readMapsResult,
  readStoredText,
  readTabQuery,
  sanitizeTabQuery,
  TAB_ACTIVE_KEY,
  TAB_QUERY_KEY,
  writeActiveTab,
  writeMapsResult,
  writeStoredText,
  writeTabQuery,
} from "./tabState.ts";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value);
    },
    removeItem: (key: string): void => {
      data.delete(key);
    },
  };
}

describe("sanitizeTabQuery", () => {
  it("keeps only the tab marker for the planner", () => {
    assert.equal(sanitizeTabQuery("plan", "tab=plan&id=abc&foo=1"), "tab=plan");
  });

  it("drops the tab marker for the default view", () => {
    assert.equal(sanitizeTabQuery("view", "tab=view&id=abc"), "id=abc");
  });

  it("drops view-only parameters outside view", () => {
    assert.equal(sanitizeTabQuery("maps", "tab=maps&id=abc"), "tab=maps");
  });

  it("returns an empty query when view keeps nothing", () => {
    assert.equal(sanitizeTabQuery("view", "tab=view"), "");
  });

  it("forces the tab value to the active tab", () => {
    assert.equal(sanitizeTabQuery("maps", "tab=plan&id=abc"), "tab=maps");
  });

  it("preserves the first occurrence order of kept parameters", () => {
    assert.equal(
      sanitizeTabQuery("view", "foo=1&id=abc&tab=view&bar=2"),
      "id=abc",
    );
  });
});

describe("readTabQuery and writeTabQuery", () => {
  it("round-trips a record through storage", () => {
    const store = fakeStorage();
    writeTabQuery(store, { view: "id=abc", plan: "tab=plan" });
    assert.deepEqual(readTabQuery(store), {
      view: "id=abc",
      plan: "tab=plan",
    });
    assert.ok(store.data.has(TAB_QUERY_KEY));
  });

  it("returns an empty record for corrupt JSON", () => {
    const store = fakeStorage({ [TAB_QUERY_KEY]: "{not json" });
    assert.deepEqual(readTabQuery(store), {});
  });

  it("returns an empty record for non-object JSON", () => {
    const store = fakeStorage({ [TAB_QUERY_KEY]: JSON.stringify([1, 2]) });
    assert.deepEqual(readTabQuery(store), {});
  });

  it("drops non-string values", () => {
    const store = fakeStorage({
      [TAB_QUERY_KEY]: JSON.stringify({
        view: "id=abc",
        plan: 42,
        maps: null,
      }),
    });
    assert.deepEqual(readTabQuery(store), { view: "id=abc" });
  });
});

describe("buildTabQuery", () => {
  it("restores the stored view id", () => {
    assert.equal(buildTabQuery("view", "", { view: "id=abc" }), "id=abc");
  });

  it("keeps the current id over the stored one", () => {
    assert.equal(
      buildTabQuery("view", "id=live", { view: "id=stale" }),
      "id=live",
    );
  });

  it("never restores the view id into other tabs", () => {
    for (const tab of ["plan", "maps", "csv"] as const) {
      assert.equal(buildTabQuery(tab, "", { view: "id=abc" }), `tab=${tab}`);
    }
  });
});

describe("readActiveTab and writeActiveTab", () => {
  it("round-trips a valid tab", () => {
    const store = fakeStorage();
    writeActiveTab(store, "plan");
    assert.equal(store.data.get(TAB_ACTIVE_KEY), "plan");
    assert.equal(readActiveTab(store), "plan");
  });

  it("returns null when nothing is stored", () => {
    assert.equal(readActiveTab(fakeStorage()), null);
  });

  it("returns null for an unknown tab", () => {
    const store = fakeStorage({ [TAB_ACTIVE_KEY]: "planner" });
    assert.equal(readActiveTab(store), null);
  });
});

describe("readStoredText and writeStoredText", () => {
  it("round-trips text", () => {
    const store = fakeStorage();
    writeStoredText(store, MAPS_INPUT_KEY, "https://maps.example/place");
    assert.equal(
      readStoredText(store, MAPS_INPUT_KEY),
      "https://maps.example/place",
    );
  });

  it("returns an empty string when the key is missing", () => {
    assert.equal(readStoredText(fakeStorage(), CSV_INPUT_KEY), "");
  });

  it("removes the key when the value is empty", () => {
    const store = fakeStorage({ [CSV_INPUT_KEY]: "-7.782,110.369" });
    writeStoredText(store, CSV_INPUT_KEY, "");
    assert.equal(store.data.has(CSV_INPUT_KEY), false);
    assert.equal(readStoredText(store, CSV_INPUT_KEY), "");
  });
});

const MAPS_RESULT = {
  url: "https://maps.google.com/place/Test+Landmark",
  waypoints: [{ lat: -7.782, lon: 110.369, name: "Start" }],
  route: [
    { lat: -7.782, lon: 110.369 },
    { lat: -7.783, lon: 110.372 },
  ],
  savedAt: 1_700_000_000_000,
};

describe("readMapsResult and writeMapsResult", () => {
  it("round-trips a cached import", () => {
    const store = fakeStorage();
    writeMapsResult(store, MAPS_RESULT);
    assert.deepEqual(readMapsResult(store), MAPS_RESULT);
  });

  it("returns null when nothing is stored", () => {
    assert.equal(readMapsResult(fakeStorage()), null);
  });

  it("returns null for corrupt JSON", () => {
    const store = fakeStorage({ [MAPS_RESULT_KEY]: "{not json" });
    assert.equal(readMapsResult(store), null);
  });

  it("rejects a record without a url", () => {
    const store = fakeStorage({
      [MAPS_RESULT_KEY]: JSON.stringify({
        waypoints: MAPS_RESULT.waypoints,
        route: MAPS_RESULT.route,
        savedAt: MAPS_RESULT.savedAt,
      }),
    });
    assert.equal(readMapsResult(store), null);
  });

  it("rejects malformed waypoints", () => {
    for (const waypoint of [
      { lon: 110.369 },
      { lat: "0", lon: 110.369 },
      { lat: 0, lon: 0, name: 42 },
    ]) {
      const store = fakeStorage({
        [MAPS_RESULT_KEY]: JSON.stringify({
          ...MAPS_RESULT,
          waypoints: [waypoint],
        }),
      });
      assert.equal(readMapsResult(store), null);
    }
  });

  it("rejects malformed routes", () => {
    for (const route of [
      undefined,
      "route",
      [{ lat: 0 }],
      [{ lat: null, lon: 0 }],
    ]) {
      const store = fakeStorage({
        [MAPS_RESULT_KEY]: JSON.stringify({
          ...MAPS_RESULT,
          route,
        }),
      });
      assert.equal(readMapsResult(store), null);
    }
  });

  it("rejects a non-finite savedAt", () => {
    const store = fakeStorage({
      [MAPS_RESULT_KEY]: JSON.stringify({
        ...MAPS_RESULT,
        savedAt: "now",
      }),
    });
    assert.equal(readMapsResult(store), null);
  });

  it("skips records larger than the size guard", () => {
    const store = fakeStorage();
    writeMapsResult(store, {
      url: MAPS_RESULT.url,
      waypoints: [{ lat: 0, lon: 0, name: "x".repeat(MAPS_RESULT_MAX_BYTES) }],
      route: null,
      savedAt: 0,
    });
    assert.equal(store.data.has(MAPS_RESULT_KEY), false);
  });
});
