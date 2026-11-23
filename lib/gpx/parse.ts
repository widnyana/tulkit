import { parseGPXWithCustomParser } from "@we-gold/gpxjs";
import type {
  GpxBounds,
  GpxLink,
  GpxMetadata,
  LatLon,
  ParsedGpx,
  ParseError,
  Route,
  RoutePoint,
  Track,
  Waypoint,
} from "../../app/gpx/types.ts";

const INVALID_XML = "The file is not well-formed XML.";

function readDocument(xml: string): Document | undefined {
  if (typeof DOMParser === "undefined") return undefined;
  try {
    const doc = new DOMParser().parseFromString(
      xml.replace(/^\uFEFF/, ""),
      "application/xml",
    );
    return doc.getElementsByTagName("parsererror").length > 0 ? undefined : doc;
  } catch {
    return undefined;
  }
}

function nameOf(el: Element | undefined): string | undefined {
  return directText(el, "name") ?? directText(el, "urlname");
}

function directChild(
  parent: Element | undefined,
  tag: string,
): Element | undefined {
  return directChildren(parent, tag)[0];
}

function directText(
  parent: Element | undefined,
  tag: string,
): string | undefined {
  const text = directChild(parent, tag)?.textContent?.trim();
  return text ? text : undefined;
}

function directChildren(parent: Element | undefined, tag: string): Element[] {
  if (!parent) return [];
  const children: Element[] = [];
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType !== 1) continue;
    const element = node as Element;
    const name = (element.localName || element.nodeName).split(":").pop();
    if (name === tag) children.push(element);
  }
  return children;
}

function parseBounds(element: Element | undefined): GpxBounds | undefined {
  if (!element) return undefined;
  const attributes = ["minlat", "minlon", "maxlat", "maxlon"].map((name) =>
    element.getAttribute(name),
  );
  if (attributes.some((value) => value === null || value.trim() === "")) {
    return undefined;
  }
  const [minLat, minLon, maxLat, maxLon] = attributes.map(Number);
  if (
    ![minLat, minLon, maxLat, maxLon].every(Number.isFinite) ||
    minLat > maxLat ||
    minLon > maxLon ||
    minLat < -90 ||
    maxLat > 90 ||
    minLon < -180 ||
    maxLon > 180
  ) {
    return undefined;
  }
  return { minLat, minLon, maxLat, maxLon };
}

function parseEmail(element: Element | undefined): string | undefined {
  if (!element) return undefined;
  const id = element.getAttribute("id")?.trim();
  const domain = element.getAttribute("domain")?.trim();
  if (id && domain) return `${id}@${domain}`;
  const text = element.textContent?.trim();
  return text ? text : undefined;
}

function parseLink(element: Element | undefined): GpxLink | undefined {
  if (!element) return undefined;
  const href = element.getAttribute("href")?.trim() || undefined;
  const text = directText(element, "text");
  const type = directText(element, "type");
  return href || text || type ? { href, text, type } : undefined;
}

function parseLegacyLink(element: Element | undefined): GpxLink | undefined {
  const href = directText(element, "url");
  return href ? { href, text: directText(element, "urlname") } : undefined;
}

function parseKeywords(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const keywords = value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  return keywords.length > 0 ? keywords : undefined;
}

// GPX 1.1 nests these fields in <metadata>; 1.0 puts them under <gpx>.
// Both shapes are read, and absent fields are dropped, not rendered empty.
function parseMetadata(doc: Document): GpxMetadata | undefined {
  const root = doc.documentElement;
  if (!root) return undefined;

  const metadataEl = directChild(root, "metadata");
  const authorEl = directChild(metadataEl, "author");

  const metadata: GpxMetadata = {};
  const creator = root.getAttribute("creator")?.trim();
  if (creator) metadata.creator = creator;
  const name = directText(metadataEl, "name") ?? directText(root, "name");
  if (name) metadata.name = name;
  const desc = directText(metadataEl, "desc") ?? directText(root, "desc");
  if (desc) metadata.desc = desc;
  const author = directText(authorEl, "name") ?? directText(root, "author");
  if (author) metadata.author = author;
  const email =
    parseEmail(directChild(authorEl, "email")) ?? directText(root, "email");
  if (email) metadata.email = email;
  const metadataLink = parseLink(directChild(metadataEl, "link"));
  const link = metadataLink?.href
    ? metadataLink
    : (parseLegacyLink(root) ?? metadataLink);
  if (link) metadata.link = link;
  const time = directText(metadataEl, "time") ?? directText(root, "time");
  if (time) metadata.time = time;
  const keywords = parseKeywords(
    directText(metadataEl, "keywords") ?? directText(root, "keywords"),
  );
  if (keywords) metadata.keywords = keywords;
  const bounds =
    parseBounds(directChild(metadataEl, "bounds")) ??
    parseBounds(directChild(root, "bounds"));
  if (bounds) metadata.bounds = bounds;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function toLatLon(source: {
  latitude: number;
  longitude: number;
  elevation?: number | null;
}): LatLon | undefined {
  if (!Number.isFinite(source.latitude) || !Number.isFinite(source.longitude)) {
    return undefined;
  }
  const point: LatLon = { lat: source.latitude, lon: source.longitude };
  if (
    typeof source.elevation === "number" &&
    Number.isFinite(source.elevation)
  ) {
    point.ele = source.elevation;
  }
  return point;
}

export function isParseError(
  result: ParsedGpx | ParseError,
): result is ParseError {
  return "message" in result;
}

export function parseGpx(xml: string): ParsedGpx | ParseError {
  const cleanXml = xml.replace(/^\uFEFF/, "");
  const doc = readDocument(cleanXml);
  if (!doc) return { message: INVALID_XML };

  const [parsed, error] = parseGPXWithCustomParser(cleanXml, () => doc);
  if (!parsed) return { message: error?.message ?? INVALID_XML };

  let skipped = 0;
  const root = doc.documentElement ?? undefined;

  const waypointEls = directChildren(root, "wpt");
  const waypoints: Waypoint[] = [];
  parsed.waypoints.forEach((source, index) => {
    const point = toLatLon(source);
    if (!point) {
      skipped++;
      return;
    }
    const waypointEl = waypointEls[index];
    const link = parseLink(directChild(waypointEl, "link"));
    const legacy = parseLegacyLink(waypointEl);
    const resolved = link?.href ? link : (legacy ?? link);
    waypoints.push({
      ...point,
      name: source.name?.trim() || nameOf(waypointEl),
      desc: directText(waypointEl, "desc") || source.description?.trim(),
      sym: directText(waypointEl, "sym"),
      ...(resolved ? { link: resolved } : {}),
    });
  });

  const routeEls = directChildren(root, "rte");
  const routes: Route[] = parsed.routes.map((source, index) => {
    const routeEl = routeEls[index];
    const pointEls = directChildren(routeEl, "rtept");
    const points: RoutePoint[] = [];
    source.points.forEach((candidate, pointIndex) => {
      const point = toLatLon(candidate);
      if (!point) {
        skipped++;
        return;
      }
      const pointEl = pointEls[pointIndex];
      points.push({
        ...point,
        name: candidate.name?.trim() || nameOf(pointEl),
        sym: directText(pointEl, "sym"),
        cmt: directText(pointEl, "cmt"),
      });
    });
    return {
      name: source.name?.trim() || nameOf(routeEl),
      desc: directText(routeEl, "desc"),
      points,
    };
  });

  const trackEls = directChildren(root, "trk");
  const tracks: Track[] = parsed.tracks.map((source, index) => {
    const trackEl = trackEls[index];
    const segmentSizes = directChildren(trackEl, "trkseg").map(
      (segment) => directChildren(segment, "trkpt").length,
    );

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
      desc: directText(trackEl, "desc"),
      segments,
    };
  });

  const metadata = parseMetadata(doc);
  return metadata
    ? { waypoints, routes, tracks, skipped, metadata }
    : { waypoints, routes, tracks, skipped };
}
