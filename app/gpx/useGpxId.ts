"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useGpxId(): [string | null, (next: string | null) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const id = searchParams.get("id");

  const setId = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === null || next === "") {
        params.delete("id");
      } else {
        params.set("id", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return [id, setId];
}
