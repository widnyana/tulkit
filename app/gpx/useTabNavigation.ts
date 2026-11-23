"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { GPX_INDEX_KEY, loadGpxEntry } from "@/lib/gpx/storage";
import {
  buildTabQuery,
  gpxStorage,
  isTabValue,
  readActiveTab,
  readTabQuery,
  sanitizeTabQuery,
  type TabValue,
  writeActiveTab,
  writeTabQuery,
} from "./tabState";

function storedViewQuery(
  store: Storage | null,
  stored: Record<string, string>,
): string | null {
  const remembered = stored.view;
  if (remembered) {
    const id = new URLSearchParams(remembered).get("id");
    if (id !== null && loadGpxEntry(id) !== null) return remembered;
  }
  if (store === null) return null;
  try {
    const raw = store.getItem(GPX_INDEX_KEY);
    if (raw === null) return null;
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids)) return null;
    for (let index = ids.length - 1; index >= 0; index -= 1) {
      const id: unknown = ids[index];
      if (typeof id === "string" && loadGpxEntry(id) !== null) {
        return new URLSearchParams({ id }).toString();
      }
    }
    return null;
  } catch {
    return null;
  }
}

function queryUrl(pathname: string, query: string): string {
  return query === "" ? pathname : `${pathname}?${query}`;
}

export function useTabNavigation(): [TabValue, (next: TabValue) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const explicitTab = searchParams.get("tab");
  const explicitId = searchParams.get("id");
  const explicitSrc = searchParams.get("src");
  const tab: TabValue =
    explicitSrc !== null
      ? "view"
      : isTabValue(explicitTab)
        ? explicitTab
        : "view";

  const setTab = useCallback(
    (next: TabValue) => {
      const store = gpxStorage();
      const stored = store === null ? {} : readTabQuery(store);
      const currentQuery = sanitizeTabQuery(tab, searchParams.toString());
      if (store !== null) {
        if (currentQuery === "") delete stored[tab];
        else stored[tab] = currentQuery;
        writeTabQuery(store, stored);
        writeActiveTab(store, next);
      }
      const viewQuery = next === "view" ? storedViewQuery(store, stored) : null;
      const query = buildTabQuery(
        next,
        "",
        viewQuery === null ? {} : { view: viewQuery },
      );
      router.replace(queryUrl(pathname, query), { scroll: false });
    },
    [pathname, router, searchParams, tab],
  );

  useEffect(() => {
    const store = gpxStorage();
    const current = searchParams.toString();
    const stored = store === null ? {} : readTabQuery(store);
    const remembered = store === null ? null : readActiveTab(store);
    if (
      explicitTab === null &&
      explicitSrc === null &&
      (explicitId === null || explicitId === "") &&
      remembered !== null &&
      remembered !== "view"
    ) {
      const query = sanitizeTabQuery(remembered, stored[remembered] ?? "");
      router.replace(queryUrl(pathname, query), { scroll: false });
      return;
    }
    const viewQuery = tab === "view" ? storedViewQuery(store, stored) : null;
    const sanitized = buildTabQuery(
      tab,
      current,
      viewQuery === null ? {} : { view: viewQuery },
    );
    if (store !== null) {
      if (sanitized === "") delete stored[tab];
      else stored[tab] = sanitized;
      if (tab !== "view") {
        const droppedId = new URLSearchParams(current).get("id");
        if (droppedId !== null) {
          stored.view = new URLSearchParams({ id: droppedId }).toString();
        }
      }
      writeTabQuery(store, stored);
      writeActiveTab(store, tab);
    }
    if (sanitized === current) return;
    router.replace(queryUrl(pathname, sanitized), { scroll: false });
  }, [
    explicitId,
    explicitSrc,
    explicitTab,
    pathname,
    router,
    searchParams,
    tab,
  ]);

  return [tab, setTab];
}
