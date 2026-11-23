import type { MapsLinkError, MapsWaypoint } from "../../app/gpx/types.ts";

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

const DIR_PREFIX = "/maps/dir/";
const PLACE_PREFIX = "/maps/place/";
const COORD_PAIR = /!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/g;
const AT_LAT_LON = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;
const TRAVEL_MODE_FLAG = /!3e(\d)/;

export type MapsTravelMode = "driving" | "bicycling" | "walking" | "transit";

const TRAVEL_MODES: Record<string, MapsTravelMode> = {
  "0": "driving",
  "1": "bicycling",
  "2": "walking",
  "3": "transit",
};

function decodeSegment(segment: string): string {
  return decodeURIComponent(segment.replace(/\+/g, " "));
}

function parseDir(
  pathname: string,
  href: string,
): MapsWaypoint[] | MapsLinkError {
  const afterPrefix = pathname.slice(
    pathname.indexOf(DIR_PREFIX) + DIR_PREFIX.length,
  );
  const atIndex = afterPrefix.indexOf("/@");
  const namesSegment =
    atIndex === -1 ? afterPrefix : afterPrefix.slice(0, atIndex);
  const names = namesSegment.split("/").filter(Boolean).map(decodeSegment);

  const coordPairs = [...href.matchAll(COORD_PAIR)];
  if (coordPairs.length === 0) {
    return {
      message: "No coordinates found in this Google Maps directions link",
    };
  }

  return coordPairs.map((match, i) => ({
    lon: Number(match[1]),
    lat: Number(match[2]),
    name: names[i],
  }));
}

function parsePlace(pathname: string): MapsWaypoint[] | MapsLinkError {
  const afterPrefix = pathname.slice(
    pathname.indexOf(PLACE_PREFIX) + PLACE_PREFIX.length,
  );
  const atIndex = afterPrefix.indexOf("/@");
  if (atIndex === -1) {
    return { message: "No coordinates found in this Google Maps place link" };
  }

  const namePart = afterPrefix.slice(0, atIndex);
  const coordsPart = afterPrefix.slice(atIndex + 2);
  const match = coordsPart.match(AT_LAT_LON);
  if (!match) {
    return { message: "No coordinates found in this Google Maps place link" };
  }

  return [
    {
      lat: Number(match[1]),
      lon: Number(match[2]),
      name: decodeSegment(namePart),
    },
  ];
}

export function parseMapsUrl(url: string): MapsWaypoint[] | MapsLinkError {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { message: "Not a valid URL" };
  }

  const pathname = parsed.pathname;
  if (pathname.includes(DIR_PREFIX)) {
    return parseDir(pathname, url);
  }
  if (pathname.includes(PLACE_PREFIX)) {
    return parsePlace(pathname);
  }

  return {
    message:
      "Unsupported Google Maps URL. Only directions (/maps/dir/) and place (/maps/place/) links are supported.",
  };
}

export function isShortMapsLink(url: string): boolean {
  try {
    return SHORT_LINK_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parseMapsTravelMode(url: string): MapsTravelMode | null {
  const match = url.match(TRAVEL_MODE_FLAG);
  return match ? (TRAVEL_MODES[match[1]] ?? null) : null;
}
