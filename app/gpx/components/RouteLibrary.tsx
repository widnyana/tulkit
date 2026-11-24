"use client";

import { Download, Eye, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { libraryBasePath, libraryRoutes } from "@/lib/gpx/library";
import { cn } from "@/lib/utils";
import {
  gpxStorage,
  LAST_VIEWED_ROUTE_KEY,
  readStoredText,
  writeStoredText,
} from "../tabState";

const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatDistance(km: number | null): string | null {
  return km === null ? null : `${numberFormat.format(km)} km`;
}

function formatElevation(m: number | null): string | null {
  return m === null ? null : `${numberFormat.format(m)} m gain`;
}

function locationOf(
  city: string | null,
  province: string | null,
): string | null {
  if (city && province) return `${city}, ${province}`;
  return city ?? province;
}

function viewerHref(file: string): string {
  return `/gpx?src=${encodeURIComponent(`${libraryBasePath}/${file}`)}`;
}

export function RouteLibrary() {
  const [query, setQuery] = useState("");
  const [lastViewed, setLastViewed] = useState<string | null>(null);
  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    const store = gpxStorage();
    if (store === null) return;
    const stored = readStoredText(store, LAST_VIEWED_ROUTE_KEY);
    setLastViewed(stored === "" ? null : stored);
  }, []);

  const visible = useMemo(() => {
    if (normalized === "") return libraryRoutes;
    return libraryRoutes.filter((route) =>
      [route.name, route.city, route.province]
        .filter((value): value is string => value !== null)
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [normalized]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, city, or province"
          aria-label="Filter routes"
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
          No route matches that filter.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((route) => {
            const location = locationOf(route.city, route.province);
            const facts = [
              location,
              formatDistance(route.distanceKm),
              formatElevation(route.elevationM),
            ].filter((fact): fact is string => fact !== null);
            const wasViewed = lastViewed === route.slug;
            return (
              <li
                key={route.slug}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3",
                  wasViewed ? "border-foreground/40" : "border-border/70",
                )}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <span className="truncate">{route.name}</span>
                    {wasViewed && (
                      <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                        Last viewed
                      </span>
                    )}
                  </p>
                  {facts.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {facts.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link
                      href={viewerHref(route.file)}
                      aria-label={`View ${route.name} on the map`}
                      onClick={() => {
                        const store = gpxStorage();
                        if (store === null) return;
                        writeStoredText(
                          store,
                          LAST_VIEWED_ROUTE_KEY,
                          route.slug,
                        );
                      }}
                    >
                      <Eye aria-hidden="true" />
                      View
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <a
                      href={`${libraryBasePath}/${route.file}`}
                      download={route.file}
                      aria-label={`Download ${route.name}`}
                    >
                      <Download aria-hidden="true" />
                      GPX
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
