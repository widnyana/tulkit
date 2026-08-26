"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * useState-like hook backed by the URL query string, so values survive tab
 * switches (which unmount the tab component), reloads, and shareable links.
 *
 * The returned setter has a stable identity across renders and skips
 * navigation entirely when the resulting query string is unchanged — this
 * prevents feedback loops where a render effect pushes a value, the URL
 * update recreates the callback, and the effect fires again.
 */
export function useQueryState(
  key: string,
  defaultValue = "",
): [string, (next: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = searchParams.get(key) ?? defaultValue;

  /** Latest params/pathname, read at call time so the setter stays stable. */
  const latest = useRef({ pathname, searchParams });
  useEffect(() => {
    latest.current = { pathname, searchParams };
  }, [pathname, searchParams]);

  const setValue = useCallback(
    (next: string) => {
      const { pathname: path, searchParams: params } = latest.current;
      const nextParams = new URLSearchParams(params.toString());
      if (next === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, next);
      }
      const query = nextParams.toString();
      if (query === params.toString()) return; // no-op: avoid redundant navigations
      router.replace(query ? `${path}?${query}` : path, { scroll: false });
    },
    [key, router],
  );

  return [value, setValue];
}
