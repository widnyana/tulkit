import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTabQuery,
  readTabQuery,
  sanitizeTabQuery,
  TAB_QUERY_KEY,
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
