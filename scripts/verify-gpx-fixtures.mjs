import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { isParseError, parseGpx } from "../lib/gpx/parse.ts";

globalThis.DOMParser = XmldomDOMParser;

const ROOT = "e2e/fixtures/gpx";
const REGIONS = ["west-java", "bali"];

const totalPoints = (track) =>
  track.segments.reduce((sum, segment) => sum + segment.length, 0);

const CHECKS = {
  "track-only": (parsed) =>
    parsed.waypoints.length === 0 &&
    parsed.routes.length === 0 &&
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 260 &&
    parsed.tracks[0].desc === undefined,
  "track-multiseg": (parsed) =>
    parsed.tracks.length === 1 &&
    parsed.tracks[0].segments.length === 3 &&
    typeof parsed.tracks[0].desc === "string",
  "track-extensions": (parsed) =>
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 240 &&
    parsed.tracks[0].desc === undefined,
  "track-large": (parsed) =>
    parsed.tracks.length === 1 && totalPoints(parsed.tracks[0]) === 5000,
  "waypoints-sym-vocab": (parsed) =>
    parsed.waypoints.length === 25 &&
    new Set(parsed.waypoints.map((point) => point.sym)).size === 10,
  "waypoints-no-sym": (parsed) =>
    parsed.waypoints.length === 250 &&
    parsed.waypoints.every((point) => point.sym === undefined),
  "waypoints-links": (parsed) =>
    parsed.waypoints.length === 20 &&
    parsed.waypoints.every((point) => point.link?.href?.startsWith("https://")),
  "waypoints-legacy-1.0": (parsed) =>
    parsed.waypoints.length === 12 &&
    parsed.waypoints.every((point) => point.link?.href?.startsWith("https://")) &&
    parsed.metadata?.creator === "MapSource 6.16.3",
  "waypoints-and-track": (parsed) =>
    parsed.waypoints.length === 10 &&
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 300,
  "route-km-marks": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 61 &&
    parsed.routes[0].points.filter((point) => point.sym === "warningflag").length === 7 &&
    parsed.routes[0].points[0].name === "0.00km" &&
    typeof parsed.routes[0].desc === "string",
  "route-marks-large": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 250 &&
    parsed.routes[0].points.every((point) => /^\d+\.00km$/.test(point.name ?? "")),
  "route-named-no-km": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 40 &&
    parsed.routes[0].points.every((point) => !/\d\s*km$/i.test(point.name ?? "")) &&
    parsed.routes[0].points.filter((point) => point.sym !== undefined).length === 6,
  "route-and-track": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 200 &&
    typeof parsed.routes[0].desc === "string" &&
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 500 &&
    parsed.tracks[0].desc === undefined,
  "metadata-full": (parsed) =>
    parsed.metadata?.name !== undefined &&
    parsed.metadata?.creator === "MapSource 6.16.3" &&
    parsed.metadata?.bounds !== undefined &&
    parsed.metadata?.email === "fixtures@example.com" &&
    parsed.metadata?.link?.href?.startsWith("https://"),
  "no-metadata-fallback": (parsed) =>
    parsed.metadata === undefined &&
    parsed.tracks.length === 1 &&
    typeof parsed.tracks[0].name === "string",
  "brevet-controls": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 201 &&
    typeof parsed.routes[0].desc === "string" &&
    parsed.waypoints.length === 6 &&
    parsed.waypoints.every((point) => point.sym === "Control"),
  "sportive-supported": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 101 &&
    typeof parsed.routes[0].desc === "string" &&
    parsed.waypoints.filter((point) => point.sym === "Food").length === 3 &&
    parsed.waypoints.filter((point) => point.sym === "Drinking Water").length === 3 &&
    parsed.waypoints.filter((point) => point.sym === "Bike Repair").length === 2,
  "bikepacking-unsupported": (parsed) =>
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 600 &&
    typeof parsed.tracks[0].desc === "string" &&
    parsed.waypoints.length === 11 &&
    parsed.waypoints.filter((point) => point.sym === "Resupply").length === 2,
  "mtb-technical": (parsed) =>
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 400 &&
    typeof parsed.tracks[0].desc === "string" &&
    parsed.waypoints.length === 6 &&
    parsed.waypoints.filter((point) => point.sym === "Danger Area").length === 3,
  "brief-long": (parsed) =>
    parsed.routes.length === 1 &&
    (parsed.routes[0].desc ?? "").length > 400,
  "brief-both-desc": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].desc === "Route description" &&
    parsed.tracks.length === 1 &&
    parsed.tracks[0].desc === "Track description" &&
    totalPoints(parsed.tracks[0]) === 300,
  "marks-200": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 200 &&
    parsed.routes[0].points.every((point) => /^\d+\.00km$/.test(point.name ?? "")),
  "marks-201": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 201 &&
    parsed.routes[0].points.every((point) => /^\d+\.00km$/.test(point.name ?? "")),
  "marks-labels-extra": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 120 &&
    parsed.routes[0].points.filter((point) => point.name !== undefined).length === 12,
  "metadata-variants": (parsed) =>
    parsed.metadata?.author === "Fixture Author" &&
    parsed.metadata?.email === undefined &&
    parsed.metadata?.link?.href?.startsWith("https://") === true &&
    parsed.metadata?.link?.text === undefined,
  "loop-route": (parsed) =>
    parsed.tracks.length === 1 &&
    totalPoints(parsed.tracks[0]) === 201 &&
    parsed.tracks[0].segments[0][0].lat ===
      parsed.tracks[0].segments[0][200].lat &&
    parsed.tracks[0].segments[0][0].lon ===
      parsed.tracks[0].segments[0][200].lon,
  "single-waypoint": (parsed) =>
    parsed.waypoints.length === 1 &&
    parsed.tracks.length === 0 &&
    parsed.routes.length === 0,
  "multi-track": (parsed) =>
    parsed.tracks.length === 2 &&
    totalPoints(parsed.tracks[0]) === 200 &&
    totalPoints(parsed.tracks[1]) === 80,
  "named-fallback-from-sym": (parsed) =>
    parsed.routes.length === 1 &&
    parsed.routes[0].points.length === 30 &&
    parsed.routes[0].points.every((point) => point.name === undefined) &&
    parsed.routes[0].points.filter((point) => point.sym === "Summit").length === 5,
  "waypoints-many-symbols": (parsed) =>
    parsed.waypoints.length === 9 &&
    new Set(parsed.waypoints.map((point) => point.sym)).size === 9,
  "empty-valid": (parsed) =>
    parsed.waypoints.length === 0 &&
    parsed.routes.length === 0 &&
    parsed.tracks.length === 0 &&
    parsed.skipped === 0 &&
    parsed.metadata?.name !== undefined,
  "invalid-points-only": (parsed) =>
    parsed.waypoints.length === 0 &&
    parsed.routes.length === 0 &&
    parsed.tracks.length === 0 &&
    parsed.skipped === 3,
};

let parsedCount = 0;
const failures = [];

for (const region of REGIONS) {
  const directory = join(ROOT, region);
  for (const name of readdirSync(directory).sort()) {
    if (!name.endsWith(".gpx")) continue;
    const scenario = name.slice(0, -4);
    const source = readFileSync(join(directory, name), "utf8");
    const parsed = parseGpx(source);
    if (isParseError(parsed)) {
      failures.push(`${region}/${name}: parse error: ${parsed.message}`);
      continue;
    }
    parsedCount += 1;
    const check = CHECKS[scenario];
    if (!check) {
      failures.push(`${region}/${name}: no check defined`);
      continue;
    }
    if (!check(parsed)) {
      failures.push(
        `${region}/${name}: shape mismatch wpt=${parsed.waypoints.length} rte=${parsed.routes.length} trk=${parsed.tracks.length} skipped=${parsed.skipped}`,
      );
    }
  }
}

console.log(`parsed ${parsedCount} files, ${failures.length} failures`);
for (const failure of failures) console.log(`  ${failure}`);
process.exit(failures.length === 0 ? 0 : 1);
