"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { loadGpxEntry } from "@/lib/gpx/storage";
import {
  buildTabQuery,
  readTabQuery,
  sanitizeTabQuery,
  TAB_QUERY_PARAMS,
  type TabValue,
  writeTabQuery,
} from "./tabState";

function isTabValue(value: string | null): value is TabValue {
  return value !== null && Object.hasOwn(TAB_QUERY_PARAMS, value);
}

function localStore(): Storage | null {
  try {
    return typeof globalThis.localStorage === "undefined"
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

function restorableViewQuery(stored: Record<string, string>): string | null {
  if (!stored.view) return null;
  const id = new URLSearchParams(stored.view).get("id");
  return id !== null && loadGpxEntry(id) !== null ? stored.view : null;
}

export function useTabNavigation(): [TabValue, (next: TabValue) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab");
  const tab: TabValue = isTabValue(rawTab) ? rawTab : "view";
  const cleanedUrl = useRef(false);

  const setTab = useCallback(
    (next: TabValue) => {
      const store = localStore();
      const stored = store === null ? {} : readTabQuery(store);
      const currentQuery = sanitizeTabQuery(tab, searchParams.toString());
      if (store !== null) {
        if (currentQuery === "") delete stored[tab];
        else stored[tab] = currentQuery;
        writeTabQuery(store, stored);
      }
      const viewQuery = next === "view" ? restorableViewQuery(stored) : null;
      const query = buildTabQuery(
        next,
        "",
        viewQuery === null ? {} : { view: viewQuery },
      );
      router.replace(query === "" ? pathname : `${pathname}?${query}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, tab],
  );

  useEffect(() => {
    if (cleanedUrl.current) return;
    cleanedUrl.current = true;
    const store = localStore();
    const current = searchParams.toString();
    const sanitized = sanitizeTabQuery(tab, current);
    if (store !== null) {
      const stored = readTabQuery(store);
      if (sanitized === "") delete stored[tab];
      else stored[tab] = sanitized;
      if (tab !== "view") {
        const droppedId = new URLSearchParams(current).get("id");
        if (droppedId !== null) {
          stored.view = new URLSearchParams({ id: droppedId }).toString();
        }
      }
      writeTabQuery(store, stored);
    }
    if (sanitized === current) return;
    router.replace(sanitized === "" ? pathname : `${pathname}?${sanitized}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams, tab]);

  return [tab, setTab];
}
