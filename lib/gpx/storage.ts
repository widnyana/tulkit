import { decodeStoredEntry, type StoredEntry } from "./schemas.ts";

export const GPX_INDEX_KEY = "tulkit:gpx:index";
export const GPX_ENTRY_PREFIX = "tulkit:gpx:entry:";
export const GPX_MAX_ENTRIES = 5;

function storage(): Storage | null {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

function readIndex(store: Storage): string[] {
  try {
    const raw = store.getItem(GPX_INDEX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function writeIndex(store: Storage, ids: string[]): void {
  try {
    store.setItem(GPX_INDEX_KEY, JSON.stringify(ids));
  } catch {}
}

function dropEntry(store: Storage, id: string): void {
  try {
    store.removeItem(GPX_ENTRY_PREFIX + id);
  } catch {}
}

export function saveGpxEntry(id: string, rawText: string): void {
  const store = storage();
  if (!store) return;
  const entry: StoredEntry = { rawText, savedAt: Date.now() };
  try {
    store.setItem(GPX_ENTRY_PREFIX + id, JSON.stringify(entry));
  } catch {
    return;
  }
  const ids = readIndex(store);
  if (ids.includes(id)) return;
  ids.push(id);
  const overflow = Math.max(0, ids.length - GPX_MAX_ENTRIES);
  for (const evicted of ids.slice(0, overflow)) dropEntry(store, evicted);
  writeIndex(store, ids.slice(overflow));
}

export function loadGpxEntry(id: string): string | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(GPX_ENTRY_PREFIX + id);
    if (!raw) return null;
    const entry = decodeStoredEntry(JSON.parse(raw));
    return entry ? entry.rawText : null;
  } catch {
    return null;
  }
}

export function removeGpxEntry(id: string): void {
  const store = storage();
  if (!store) return;
  dropEntry(store, id);
  const ids = readIndex(store).filter((value) => value !== id);
  writeIndex(store, ids);
}

export function generateGpxId(): string {
  return crypto.randomUUID();
}
