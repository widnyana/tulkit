import { parseGPXWithCustomParser } from "@we-gold/gpxjs";
import type {
  LatLon,
  ParsedGpx,
  ParseError,
  Route,
  Track,
  Waypoint,
} from "../../app/gpx/types.ts";

const INVALID_XML = "The file is not well-formed XML.";

function readDocument(xml: string): Document | undefined {
  if (typeof DOMParser === "undefined") return undefined;
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return doc.getElementsByTagName("parsererror").length > 0 ? undefined : doc;
  } catch {
    return undefined;
  }
}

function textOf(parent: Element | undefined, tag: string): string | undefined {
  const text = parent?.getElementsByTagName(tag)[0]?.textContent?.trim();
  return text ? text : undefined;
}

function nameOf(el: Element | undefined): string | undefined {
  return textOf(el, "name") ?? textOf(el, "urlname") ?? textOf(el, "url");
}

function toLatLon(source: {
  latitude: number;
  longitude: number;
}): LatLon | undefined {
  if (!Number.isFinite(source.latitude) || !Number.isFinite(source.longitude)) {
    return undefined;
  }
  return { lat: source.latitude, lon: source.longitude };
}

export function isParseError(
  result: ParsedGpx | ParseError,
): result is ParseError {
  return "message" in result;
}

export function parseGpx(xml: string): ParsedGpx | ParseError {
  const doc = readDocument(xml);
  if (!doc) return { message: INVALID_XML };

  const [parsed, error] = parseGPXWithCustomParser(xml, () => doc);
  if (!parsed) return { message: error?.message ?? INVALID_XML };

  let skipped = 0;

  const waypointEls = Array.from(doc.getElementsByTagName("wpt"));
  const waypoints: Waypoint[] = [];
  parsed.waypoints.forEach((source, index) => {
    const point = toLatLon(source);
    if (!point) {
      skipped++;
      return;
    }
    waypoints.push({
      ...point,
      name: source.name?.trim() || nameOf(waypointEls[index]),
      desc: source.description?.trim() || textOf(waypointEls[index], "desc"),
    });
  });

  const routeEls = Array.from(doc.getElementsByTagName("rte"));
  const routes: Route[] = parsed.routes.map((source, index) => {
    const points: LatLon[] = [];
    for (const candidate of source.points) {
      const point = toLatLon(candidate);
      if (!point) {
        skipped++;
        continue;
      }
      points.push(point);
    }
    return {
      name: source.name?.trim() || nameOf(routeEls[index]),
      points,
    };
  });

  const trackEls = Array.from(doc.getElementsByTagName("trk"));
  const tracks: Track[] = parsed.tracks.map((source, index) => {
    const trackEl = trackEls[index];
    const segmentSizes = trackEl
      ? Array.from(trackEl.getElementsByTagName("trkseg")).map(
          (segment) => segment.getElementsByTagName("trkpt").length,
        )
      : [];

    const segments: LatLon[][] = [];
    let offset = 0;
    for (const size of segmentSizes) {
      const segment: LatLon[] = [];
      for (const candidate of source.points.slice(offset, offset + size)) {
        const point = toLatLon(candidate);
        if (!point) {
          skipped++;
          continue;
        }
        segment.push(point);
      }
      offset += size;
      segments.push(segment);
    }
    for (const candidate of source.points.slice(offset)) {
      const point = toLatLon(candidate);
      if (!point) {
        skipped++;
        continue;
      }
      segments.push([point]);
    }

    return {
      name: source.name?.trim() || nameOf(trackEl),
      segments,
    };
  });

  return { waypoints, routes, tracks, skipped };
}
