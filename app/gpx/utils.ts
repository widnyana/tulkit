import type { LatLon, ParsedGpx } from "./types";

export function allPoints(parsed: ParsedGpx): LatLon[] {
  return [
    ...parsed.waypoints,
    ...parsed.routes.flatMap((r) => r.points),
    ...parsed.tracks.flatMap((t) => t.segments.flat()),
  ];
}

export function computeBounds(
  parsed: ParsedGpx,
): [[number, number], [number, number]] | null {
  const points = allPoints(parsed);
  const first = points[0];
  if (!first) return null;

  let minLat = first.lat;
  let maxLat = first.lat;
  let minLon = first.lon;
  let maxLon = first.lon;

  for (const { lat, lon } of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

export function trackSegmentCount(parsed: ParsedGpx): number {
  return parsed.tracks.reduce((n, t) => n + t.segments.length, 0);
}

export function pathEndpoints(
  parsed: ParsedGpx,
): { start: LatLon; end: LatLon } | null {
  const segments = parsed.tracks.flatMap((track) =>
    track.segments.filter((segment) => segment.length > 0),
  );
  const trackStart = segments[0]?.[0];
  const trackEnd = segments[segments.length - 1]?.at(-1);
  if (trackStart && trackEnd) return { start: trackStart, end: trackEnd };

  const routePoints = parsed.routes.flatMap((route) => route.points);
  const routeStart = routePoints[0];
  const routeEnd = routePoints[routePoints.length - 1];
  if (routePoints.length >= 2 && routeStart && routeEnd) {
    return { start: routeStart, end: routeEnd };
  }

  return null;
}
