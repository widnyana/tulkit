import type { Tool } from "./tools";

/** Category display order; categories outside this list follow in first-seen order. */
export const CATEGORY_ORDER = [
  "Development",
  "Network",
  "Data",
  "Productivity",
  "Lifestyle",
] as const;

export const ALL_CATEGORIES = "All";
export const RECENT_TOOLS_KEY = "tulkit:recent-tools";
export const RECENT_TOOLS_MAX = 3;

export interface ToolGroup {
  category: string;
  tools: Tool[];
}

export interface TextSegment {
  text: string;
  match: boolean;
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "getItem" | "setItem">;

/** Lowercase, trim, split on whitespace; empty terms are dropped. */
export function parseQuery(query: string): string[] {
  return query.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function haystack(tool: Tool): string {
  return [tool.title, tool.description, tool.category, ...tool.keywords]
    .join("\n")
    .toLowerCase();
}

/** Empty terms match everything; otherwise every term must appear somewhere. */
export function matchTool(tool: Tool, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const text = haystack(tool);
  return terms.every((term) => text.includes(term));
}

export function filterTools(tools: Tool[], query: string): Tool[] {
  const terms = parseQuery(query);
  return tools.filter((tool) => matchTool(tool, terms));
}

/** Known categories first (CATEGORY_ORDER), then unknown ones in first-seen order. */
export function groupToolsByCategory(tools: Tool[]): ToolGroup[] {
  const buckets = new Map<string, Tool[]>();
  for (const tool of tools) {
    const bucket = buckets.get(tool.category);
    if (bucket) bucket.push(tool);
    else buckets.set(tool.category, [tool]);
  }
  const known: string[] = CATEGORY_ORDER.filter((name) => buckets.has(name));
  const unknown = [...buckets.keys()].filter(
    (name) => !(CATEGORY_ORDER as readonly string[]).includes(name),
  );
  return [...known, ...unknown].map((category) => ({
    category,
    tools: buckets.get(category) ?? [],
  }));
}

/** Case-insensitive, non-overlapping, longest-term-first split for match highlighting. */
export function splitHighlight(text: string, terms: string[]): TextSegment[] {
  const usable = [...new Set(terms.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (usable.length === 0) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const segments: TextSegment[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const hit = usable.find((term) => lower.startsWith(term, cursor));
    if (hit) {
      segments.push({ text: text.slice(cursor, cursor + hit.length), match: true });
      cursor += hit.length;
      continue;
    }
    const char = text[cursor];
    const last = segments[segments.length - 1];
    if (last && !last.match) last.text += char;
    else segments.push({ text: char, match: false });
    cursor += 1;
  }
  return segments;
}

/** Reads recents, keeping only known hrefs, deduped, capped at RECENT_TOOLS_MAX. */
export function readRecentTools(
  storage: ReadableStorage | null,
  knownHrefs: string[],
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_TOOLS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const known = new Set(knownHrefs);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of parsed) {
      if (typeof value !== "string" || !known.has(value) || seen.has(value)) continue;
      seen.add(value);
      result.push(value);
      if (result.length === RECENT_TOOLS_MAX) break;
    }
    return result;
  } catch {
    return [];
  }
}

/** Unshifts an href to the front of the recents list. Never throws. */
export function addRecentTool(storage: WritableStorage | null, href: string): void {
  if (!storage) return;
  try {
    const raw = storage.getItem(RECENT_TOOLS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const previous = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
    const next = [href, ...previous.filter((value) => value !== href)].slice(
      0,
      RECENT_TOOLS_MAX,
    );
    storage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); recents are optional.
  }
}

/** Chip labels: "All" then every category present, in display order. */
export function categoryNames(tools: Tool[]): string[] {
  return [ALL_CATEGORIES, ...groupToolsByCategory(tools).map((g) => g.category)];
}

export function scopeTools(tools: Tool[], category: string): Tool[] {
  return category === ALL_CATEGORIES
    ? tools
    : tools.filter((tool) => tool.category === category);
}
