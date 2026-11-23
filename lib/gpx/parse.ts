import type {
  LatLon,
  ParsedGpx,
  ParseError,
  Route,
  Track,
  Waypoint,
} from "../../app/gpx/types.ts";

function textOf(parent: Element, tag: string): string | undefined {
  const text = parent.getElementsByTagName(tag)[0]?.textContent?.trim();
  return text ? text : undefined;
}

function extractName(el: Element): string | undefined {
  return textOf(el, "name") ?? textOf(el, "urlname") ?? textOf(el, "url");
}

function extractLatLon(el: Element): LatLon | undefined {
  const latAttr = el.getAttribute("lat");
  const lonAttr = el.getAttribute("lon");
  if (latAttr === null || lonAttr === null) return undefined;
  const lat = Number(latAttr);
  const lon = Number(lonAttr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { lat, lon };
}

function hasParserError(doc: Document): boolean {
  return doc.getElementsByTagName("parsererror").length > 0;
}

export function isParseError(
  result: ParsedGpx | ParseError,
): result is ParseError {
  return "message" in result;
}

export function parseGpx(xml: string): ParsedGpx | ParseError {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, "application/xml");
  } catch {
    return { message: "The file is not well-formed XML." };
  }
  if (hasParserError(doc)) {
    return { message: "The file is not well-formed XML." };
  }

  let skipped = 0;

  const waypoints: Waypoint[] = [];
  for (const wpt of Array.from(doc.getElementsByTagName("wpt"))) {
    const point = extractLatLon(wpt);
    if (!point) {
      skipped++;
      continue;
    }
    waypoints.push({
      ...point,
      name: extractName(wpt),
      desc: textOf(wpt, "desc"),
    });
  }

  const routes: Route[] = [];
  for (const rte of Array.from(doc.getElementsByTagName("rte"))) {
    const points: LatLon[] = [];
    for (const rtept of Array.from(rte.getElementsByTagName("rtept"))) {
      const point = extractLatLon(rtept);
      if (!point) {
        skipped++;
        continue;
      }
      points.push(point);
    }
    routes.push({ name: extractName(rte), points });
  }

  const tracks: Track[] = [];
  for (const trk of Array.from(doc.getElementsByTagName("trk"))) {
    const segments: LatLon[][] = [];
    for (const trkseg of Array.from(trk.getElementsByTagName("trkseg"))) {
      const segment: LatLon[] = [];
      for (const trkpt of Array.from(trkseg.getElementsByTagName("trkpt"))) {
        const point = extractLatLon(trkpt);
        if (!point) {
          skipped++;
          continue;
        }
        segment.push(point);
      }
      segments.push(segment);
    }
    tracks.push({ name: extractName(trk), segments });
  }

  return { waypoints, routes, tracks, skipped };
}
