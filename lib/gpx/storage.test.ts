import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  GPX_ENTRY_PREFIX,
  GPX_INDEX_KEY,
  generateGpxId,
  loadGpxEntry,
  removeGpxEntry,
  saveGpxEntry,
} from "./storage.ts";

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
}

const scope = globalThis as { localStorage?: Storage };
let original: Storage | undefined;

beforeEach(() => {
  original = scope.localStorage;
  scope.localStorage = memoryStorage();
});

afterEach(() => {
  if (original === undefined) Reflect.deleteProperty(scope, "localStorage");
  else scope.localStorage = original;
});

const indexIds = (): string[] =>
  JSON.parse(scope.localStorage?.getItem(GPX_INDEX_KEY) ?? "[]");

describe("saveGpxEntry: eviction", () => {
  it("keeps the five newest entries and drops the oldest payload", () => {
    const ids = ["id-1", "id-2", "id-3", "id-4", "id-5", "id-6"];
    for (const id of ids) saveGpxEntry(id, `<gpx>${id}</gpx>`);

    assert.equal(loadGpxEntry("id-1"), null);
    assert.equal(
      scope.localStorage?.getItem(`${GPX_ENTRY_PREFIX}id-1`),
      null,
      "evicted payload key must be deleted, not just unlinked",
    );
    for (const id of ids.slice(1)) {
      assert.equal(loadGpxEntry(id), `<gpx>${id}</gpx>`);
    }
    assert.deepEqual(indexIds(), ids.slice(1));
  });

  it("keeps a sixth save from growing the index past the cap", () => {
    for (let n = 1; n <= 7; n += 1) saveGpxEntry(`id-${n}`, `text-${n}`);
    assert.equal(indexIds().length, 5);
    assert.deepEqual(indexIds(), ["id-3", "id-4", "id-5", "id-6", "id-7"]);
  });
});

describe("saveGpxEntry: in-place overwrite", () => {
  it("rewrites the payload without reordering or evicting", () => {
    saveGpxEntry("a", "first");
    saveGpxEntry("b", "second");
    saveGpxEntry("a", "first again");

    assert.deepEqual(indexIds(), ["a", "b"]);
    assert.equal(loadGpxEntry("a"), "first again");
  });

  it("treats a resaved id as fresh so it survives a full index", () => {
    for (const id of ["a", "b", "c", "d", "e"]) saveGpxEntry(id, id);
    saveGpxEntry("a", "updated");
    assert.deepEqual(indexIds(), ["a", "b", "c", "d", "e"]);
    assert.equal(loadGpxEntry("a"), "updated");
  });
});

describe("loadGpxEntry: adversarial store state", () => {
  it("returns null rather than throwing on malformed JSON", () => {
    scope.localStorage?.setItem(`${GPX_ENTRY_PREFIX}bad`, "{not json");
    assert.equal(loadGpxEntry("bad"), null);
  });

  it("returns null when the stored shape is not an entry", () => {
    scope.localStorage?.setItem(`${GPX_ENTRY_PREFIX}shape`, '{"rawText":1}');
    assert.equal(loadGpxEntry("shape"), null);
    scope.localStorage?.setItem(`${GPX_ENTRY_PREFIX}shape`, '"a string"');
    assert.equal(loadGpxEntry("shape"), null);
  });

  it("returns null for an unknown id", () => {
    assert.equal(loadGpxEntry("never-saved"), null);
  });
});

describe("removeGpxEntry", () => {
  it("drops both the index row and the payload", () => {
    saveGpxEntry("a", "alpha");
    saveGpxEntry("b", "beta");
    removeGpxEntry("a");

    assert.deepEqual(indexIds(), ["b"]);
    assert.equal(loadGpxEntry("a"), null);
    assert.equal(loadGpxEntry("b"), "beta");
  });

  it("is a no-op for an id that was never stored", () => {
    saveGpxEntry("a", "alpha");
    removeGpxEntry("ghost");
    assert.deepEqual(indexIds(), ["a"]);
  });
});

describe("storage unavailable", () => {
  it("never throws when localStorage is absent", () => {
    Reflect.deleteProperty(scope, "localStorage");
    assert.doesNotThrow(() => saveGpxEntry("a", "alpha"));
    assert.equal(loadGpxEntry("a"), null);
    assert.doesNotThrow(() => removeGpxEntry("a"));
  });
});

describe("generateGpxId", () => {
  it("produces distinct ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateGpxId()));
    assert.equal(ids.size, 20);
  });
});
