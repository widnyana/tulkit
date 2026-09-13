import assert from "node:assert/strict";
import { test } from "node:test";
import type { Tool } from "./tools.ts";
import {
  ALL_CATEGORIES,
  addRecentTool,
  categoryNames,
  filterTools,
  groupToolsByCategory,
  matchTool,
  parseQuery,
  RECENT_TOOLS_KEY,
  readRecentTools,
  splitHighlight,
} from "./tool-search.ts";

const makeTool = (over: Partial<Tool>): Tool => ({
  href: "/x",
  title: "X",
  description: "d",
  category: "Data",
  keywords: [],
  ...over,
});

type Entry = {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
};
function memoryStorage(initial: Record<string, string> = {}): Entry {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
  };
}

test("parseQuery lowercases, trims and splits on whitespace", () => {
  assert.deepEqual(parseQuery("  Net PLAN "), ["net", "plan"]);
  assert.deepEqual(parseQuery("   "), []);
  assert.deepEqual(parseQuery(""), []);
});

test("matchTool searches title, description, category and keywords", () => {
  const tool = makeTool({
    title: "Cron Expression Generator",
    description: "Build cron schedules",
    category: "Development",
    keywords: ["crontab", "scheduler"],
  });
  assert.equal(matchTool(tool, []), true);
  assert.equal(matchTool(tool, ["cron"]), true);
  assert.equal(matchTool(tool, ["schedules"]), true);
  assert.equal(matchTool(tool, ["development"]), true);
  assert.equal(matchTool(tool, ["crontab"]), true);
  assert.equal(matchTool(tool, ["cron", "scheduler"]), true);
  assert.equal(matchTool(tool, ["cron", "unicorn"]), false);
});

test("filterTools matches every term and returns everything for an empty query", () => {
  const tools = [
    makeTool({ href: "/cron", title: "Cron Expression Generator", category: "Development" }),
    makeTool({ href: "/base64", title: "Base64 Encoder / Decoder" }),
  ];
  assert.equal(filterTools(tools, "").length, 2);
  assert.deepEqual(filterTools(tools, "cron").map((t) => t.href), ["/cron"]);
  assert.deepEqual(filterTools(tools, "zzz"), []);
});

test("groupToolsByCategory follows CATEGORY_ORDER then first-seen unknowns, dropping empties", () => {
  const tools = [
    makeTool({ href: "/a", category: "Lifestyle" }),
    makeTool({ href: "/b", category: "Development" }),
    makeTool({ href: "/c", category: "Whatever" }),
    makeTool({ href: "/d", category: "Network" }),
  ];
  assert.deepEqual(
    groupToolsByCategory(tools).map((g) => g.category),
    ["Development", "Network", "Lifestyle", "Whatever"],
  );
  assert.deepEqual(groupToolsByCategory([]), []);
});

test("categoryNames starts with All and lists each category once", () => {
  const names = categoryNames([
    makeTool({ category: "Network" }),
    makeTool({ category: "Development" }),
  ]);
  assert.deepEqual(names, [ALL_CATEGORIES, "Development", "Network"]);
});

test("splitHighlight returns whole-text segment when there are no terms", () => {
  assert.deepEqual(splitHighlight("tulkit", []), [{ text: "tulkit", match: false }]);
});

test("splitHighlight is case-insensitive, longest-first and lossless", () => {
  const segments = splitHighlight("Cron and cron", ["cron"]);
  assert.deepEqual(segments, [
    { text: "Cron", match: true },
    { text: " and ", match: false },
    { text: "cron", match: true },
  ]);
  assert.equal(
    splitHighlight("Portable port", ["port", "portable"])
      .map((s) => s.text)
      .join(""),
    "Portable port",
  );
  assert.deepEqual(splitHighlight("Portable", ["port", "portable"]), [
    { text: "Portable", match: true },
  ]);
});

test("readRecentTools tolerates missing, corrupt and foreign data", () => {
  assert.deepEqual(readRecentTools(null, ["/a"]), []);
  assert.deepEqual(readRecentTools(memoryStorage(), ["/a"]), []);
  assert.deepEqual(
    readRecentTools(memoryStorage({ [RECENT_TOOLS_KEY]: "not json" }), ["/a"]),
    [],
  );
  assert.deepEqual(
    readRecentTools(memoryStorage({ [RECENT_TOOLS_KEY]: '{"a":1}' }), ["/a"]),
    [],
  );
  assert.deepEqual(
    readRecentTools(memoryStorage({ [RECENT_TOOLS_KEY]: '["/gone","/a"]' }), ["/a"]),
    ["/a"],
  );
  assert.deepEqual(
    readRecentTools(memoryStorage({ [RECENT_TOOLS_KEY]: '["/a","/a","/b"]' }), ["/a", "/b"]),
    ["/a", "/b"],
  );
  assert.deepEqual(
    readRecentTools(
      memoryStorage({ [RECENT_TOOLS_KEY]: '["/a","/b","/c","/d"]' }),
      ["/a", "/b", "/c", "/d"],
    ),
    ["/a", "/b", "/c"],
  );
});

test("addRecentTool unshifts, dedupes, caps at 3 and never throws", () => {
  const storage = memoryStorage();
  addRecentTool(storage, "/a");
  addRecentTool(storage, "/b");
  addRecentTool(storage, "/a");
  addRecentTool(storage, "/c");
  addRecentTool(storage, "/d");
  assert.deepEqual(JSON.parse(storage.store.get(RECENT_TOOLS_KEY) ?? "[]"), [
    "/d",
    "/c",
    "/a",
  ]);
  const hostile = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => addRecentTool(hostile, "/a"));
  assert.doesNotThrow(() => addRecentTool(null, "/a"));
});
