import type { GpxBounds, GpxLink, LatLon, ParsedGpx, Waypoint } from "./types";

export const LINE_PALETTE = [
  "#0072b2",
  "#d55e00",
  "#009e73",
  "#cc79a7",
  "#e69f00",
  "#56b4e9",
] as const;

export interface LineGroup {
  id: string;
  kind: "track" | "route";
  label: string;
  segments: LatLon[][];
  color: string;
  distanceMeters: number;
}

const EARTH_RADIUS_METERS = 6371008.8;

export function distanceMeters(a: LatLon, b: LatLon): number {
  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lon) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lon)
  ) {
    return 0;
  }

  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathDistanceMeters(points: ReadonlyArray<LatLon>): number {
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    total += distanceMeters(points[index - 1], points[index]);
  }
  return total;
}

function segmentDistanceMeters(segment: LatLon[]): number {
  return pathDistanceMeters(segment);
}

export function lineGroups(parsed: ParsedGpx): LineGroup[] {
  const groups: LineGroup[] = [];
  let trackNumber = 0;
  parsed.tracks.forEach((track, index) => {
    const segments = track.segments.filter((segment) => segment.length > 0);
    if (segments.length === 0) return;
    trackNumber += 1;
    groups.push({
      id: `track-${index}`,
      kind: "track",
      label: track.name?.trim() || `Track ${trackNumber}`,
      segments,
      color: "",
      distanceMeters: segments.reduce(
        (total, segment) => total + segmentDistanceMeters(segment),
        0,
      ),
    });
  });

  let routeNumber = 0;
  parsed.routes.forEach((route, index) => {
    if (route.points.length < 2) return;
    routeNumber += 1;
    groups.push({
      id: `route-${index}`,
      kind: "route",
      label: route.name?.trim() || `Route ${routeNumber}`,
      segments: [route.points],
      color: "",
      distanceMeters: segmentDistanceMeters(route.points),
    });
  });

  return groups.map((group, index) => ({
    ...group,
    color: LINE_PALETTE[index % LINE_PALETTE.length],
  }));
}

export function totalDistanceMeters(parsed: ParsedGpx): number {
  return lineGroups(parsed).reduce(
    (total, group) => total + group.distanceMeters,
    0,
  );
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "0 m";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** A GPX link is untrusted input, so only web URLs may become an anchor. */
export function safeExternalHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

// Altitude jitters by a few metres and gain only accumulates, so raw deltas
// overstate ascent. Count a point after 3 m of movement from the last accepted elevation.
const ELEVATION_NOISE_THRESHOLD_METERS = 3;

export function elevationGain(parsed: ParsedGpx): number | null {
  let samples = 0;
  let gain = 0;

  for (const group of lineGroups(parsed)) {
    for (const segment of group.segments) {
      let base: number | undefined;
      for (const point of segment) {
        const ele = point.ele;
        if (ele === undefined || !Number.isFinite(ele)) {
          base = undefined;
          continue;
        }
        samples += 1;
        if (base === undefined) {
          base = ele;
          continue;
        }
        const delta = ele - base;
        if (delta > ELEVATION_NOISE_THRESHOLD_METERS) {
          gain += delta;
          base = ele;
        } else if (delta < -ELEVATION_NOISE_THRESHOLD_METERS) {
          base = ele;
        }
      }
    }
  }

  if (samples < 2) return null;
  return Math.round(gain);
}

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

export interface PointCounts {
  waypoints: number;
  routePoints: number;
  trackPoints: number;
}

export interface ResolvedMetadata {
  title?: string;
  desc?: string;
  creator?: string;
  author?: string;
  email?: string;
  link?: GpxLink;
  time?: string;
  keywords?: string[];
  bounds?: GpxBounds;
  pointCounts?: PointCounts;
}

export function resolveMetadata(parsed: ParsedGpx): ResolvedMetadata {
  const metadata = parsed.metadata;
  const routeName = parsed.routes.find((route) => route.name?.trim())?.name;
  const trackName = parsed.tracks.find((track) => track.name?.trim())?.name;
  const title =
    metadata?.name?.trim() || routeName?.trim() || trackName?.trim();

  const pointCounts: PointCounts = {
    waypoints: parsed.waypoints.length,
    routePoints: parsed.routes.reduce((n, route) => n + route.points.length, 0),
    trackPoints: parsed.tracks.reduce(
      (n, track) =>
        n + track.segments.reduce((m, segment) => m + segment.length, 0),
      0,
    ),
  };

  let bounds = metadata?.bounds;
  if (!bounds) {
    const computed = computeBounds(parsed);
    if (computed) {
      const [[minLon, minLat], [maxLon, maxLat]] = computed;
      bounds = { minLat, minLon, maxLat, maxLon };
    }
  }

  const resolved: ResolvedMetadata = {};
  if (title) resolved.title = title;
  if (metadata?.desc) resolved.desc = metadata.desc;
  if (metadata?.creator) resolved.creator = metadata.creator;
  if (metadata?.author) resolved.author = metadata.author;
  if (metadata?.email) resolved.email = metadata.email;
  if (metadata?.link) resolved.link = metadata.link;
  if (metadata?.time) resolved.time = metadata.time;
  if (metadata?.keywords && metadata.keywords.length > 0) {
    resolved.keywords = metadata.keywords;
  }
  if (bounds) resolved.bounds = bounds;
  const totalPoints =
    pointCounts.waypoints + pointCounts.routePoints + pointCounts.trackPoints;
  if (totalPoints > 0) resolved.pointCounts = pointCounts;
  return resolved;
}

export function waypointsToParsedGpx(
  waypoints: Waypoint[],
  roadRoute?: LatLon[] | null,
): ParsedGpx {
  if (roadRoute && roadRoute.length >= 2) {
    return {
      waypoints,
      routes: [],
      tracks: [{ segments: [roadRoute] }],
      skipped: 0,
    };
  }
  return {
    waypoints,
    routes: waypoints.length >= 2 ? [{ points: waypoints }] : [],
    tracks: [],
    skipped: 0,
  };
}

export function trackSegmentCount(parsed: ParsedGpx): number {
  return parsed.tracks.reduce((n, t) => n + t.segments.length, 0);
}

export interface StatTile {
  label: string;
  value: string;
}

export function buildGpxStats(parsed: ParsedGpx): StatTile[] {
  const stats: StatTile[] = [
    { label: "Waypoints", value: String(parsed.waypoints.length) },
  ];

  if (parsed.routes.length > 0) {
    stats.push({ label: "Routes", value: String(parsed.routes.length) });
  }

  const segments = trackSegmentCount(parsed);
  if (segments > 0) {
    stats.push({ label: "Track segments", value: String(segments) });
  }

  const distance = totalDistanceMeters(parsed);
  if (distance > 0) {
    stats.push({ label: "Distance", value: formatDistance(distance) });
  }

  const gain = elevationGain(parsed);
  if (gain !== null && gain > 0) {
    stats.push({ label: "Elevation gain", value: `+${gain} m` });
  }

  if (parsed.skipped > 0) {
    stats.push({ label: "Points skipped", value: String(parsed.skipped) });
  }

  return stats;
}

export function pathEndpoints(
  parsed: ParsedGpx,
): { start: LatLon; end: LatLon } | null {
  const segments = parsed.tracks.flatMap((track) =>
    track.segments.filter((segment) => segment.length > 0),
  );
  const trackStart = segments[0]?.[0];
  const trackEnd = segments[segments.length - 1]?.at(-1);
  if (trackStart && trackEnd) {
    return {
      start: { lat: trackStart.lat, lon: trackStart.lon },
      end: { lat: trackEnd.lat, lon: trackEnd.lon },
    };
  }

  const routePoints = parsed.routes.flatMap((route) => route.points);
  const routeStart = routePoints[0];
  const routeEnd = routePoints[routePoints.length - 1];
  if (routePoints.length >= 2 && routeStart && routeEnd) {
    return {
      start: { lat: routeStart.lat, lon: routeStart.lon },
      end: { lat: routeEnd.lat, lon: routeEnd.lon },
    };
  }

  if (parsed.waypoints.length >= 2) {
    const start = parsed.waypoints[0];
    const end = parsed.waypoints[parsed.waypoints.length - 1];
    return {
      start: { lat: start.lat, lon: start.lon },
      end: { lat: end.lat, lon: end.lon },
    };
  }

  return null;
}
