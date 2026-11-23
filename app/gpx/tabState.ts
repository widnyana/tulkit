export const TAB_QUERY_KEY = "tulkit:gpx:tab-query:v1";
export const TAB_ACTIVE_KEY = "tulkit:gpx:active-tab:v1";
export const MAPS_INPUT_KEY = "tulkit:gpx:maps-input:v1";
export const CSV_INPUT_KEY = "tulkit:gpx:csv-input:v1";

export type TabValue = "view" | "maps" | "csv" | "plan";

export const TAB_QUERY_PARAMS: Record<TabValue, readonly string[]> = {
  view: ["id"],
  maps: [],
  csv: [],
  plan: [],
};

export function isTabValue(value: unknown): value is TabValue {
  return typeof value === "string" && Object.hasOwn(TAB_QUERY_PARAMS, value);
}

export function gpxStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function sanitizeTabQuery(tab: TabValue, search: string): string {
  const source = new URLSearchParams(search);
  const allowed = new Set(TAB_QUERY_PARAMS[tab]);
  const kept = new URLSearchParams();
  let hasTab = false;
  for (const [key, value] of source) {
    if (key === "tab") {
      if (tab === "view") continue;
      if (!hasTab) {
        kept.append("tab", tab);
        hasTab = true;
      }
      continue;
    }
    if (allowed.has(key)) kept.append(key, value);
  }
  if (tab !== "view" && !hasTab) kept.append("tab", tab);
  return kept.toString();
}

export function buildTabQuery(
  tab: TabValue,
  tabParams: string,
  stored: Record<string, string>,
): string {
  const sanitized = sanitizeTabQuery(tab, tabParams);
  if (tab !== "view") return sanitized;
  const params = new URLSearchParams(sanitized);
  if (params.has("id")) return sanitized;
  const storedId = new URLSearchParams(stored.view ?? "").get("id");
  if (!storedId) return sanitized;
  params.set("id", storedId);
  return params.toString();
}

export function readTabQuery(
  storage: Pick<Storage, "getItem">,
): Record<string, string> {
  try {
    const raw = storage.getItem(TAB_QUERY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function writeTabQuery(
  storage: Pick<Storage, "setItem">,
  stored: Record<string, string>,
): void {
  try {
    storage.setItem(TAB_QUERY_KEY, JSON.stringify(stored));
  } catch {}
}

export function readActiveTab(
  storage: Pick<Storage, "getItem">,
): TabValue | null {
  try {
    const raw = storage.getItem(TAB_ACTIVE_KEY);
    return isTabValue(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeActiveTab(
  storage: Pick<Storage, "setItem">,
  tab: TabValue,
): void {
  try {
    storage.setItem(TAB_ACTIVE_KEY, tab);
  } catch {}
}

export function readStoredText(
  storage: Pick<Storage, "getItem">,
  key: string,
): string {
  try {
    return storage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredText(
  storage: Pick<Storage, "setItem" | "removeItem">,
  key: string,
  value: string,
): void {
  try {
    if (value === "") storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {}
}
