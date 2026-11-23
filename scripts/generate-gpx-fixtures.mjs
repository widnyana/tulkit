import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_ROOT = "e2e/fixtures/gpx";
const NS11 = 'xmlns="http://www.topografix.com/GPX/1/1"';
const NS10 = 'xmlns="http://www.topografix.com/GPX/1/0"';

const REGIONS = {
  "west-java": {
    label: "West Java",
    slug: "west-java",
    base: { lat: -6.87, lon: 107.6 },
    elevation: 900,
    amplitude: 320,
    trackName: "Bandung Utara Loop",
    routeName: "Bandung - Lembang - Tangkuban Perahu",
    places: [
      "Lembang",
      "Cikole",
      "Tangkuban Perahu",
      "Ciater",
      "Dago",
      "Pasteur",
      "Ciumbuleuit",
      "Maribaya",
      "Cisarua",
      "Cimahi",
    ],
  },
  bali: {
    label: "Bali",
    slug: "bali",
    base: { lat: -8.45, lon: 115.22 },
    elevation: 300,
    amplitude: 420,
    trackName: "Denpasar - Ubud Loop",
    routeName: "Denpasar - Kintamani - Ubud",
    places: [
      "Denpasar",
      "Ubud",
      "Kintamani",
      "Bedugul",
      "Tegallalang",
      "Sukawati",
      "Bangli",
      "Payangan",
      "Tampaksiring",
      "Sanur",
    ],
  },
};

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function coordinate(value) {
  return value.toFixed(5);
}

function jitter(rng, amount) {
  return (rng() * 2 - 1) * amount;
}

function trackPoints(region, rng, count) {
  const points = [];
  const turns = 0.9 + rng() * 0.5;
  const radiusLat = 0.085 + rng() * 0.04;
  const radiusLon = 0.11 + rng() * 0.05;
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0 : index / (count - 1);
    const angle = t * Math.PI * 2 * turns;
    const radius = 0.72 + 0.28 * Math.sin(t * Math.PI * 3);
    points.push({
      lat: region.base.lat + radiusLat * radius * Math.sin(angle) + jitter(rng, 0.0006),
      lon: region.base.lon + radiusLon * radius * Math.cos(angle) + jitter(rng, 0.0006),
      ele: Math.round(
        region.elevation + region.amplitude * Math.sin(t * Math.PI * 2.2) + jitter(rng, 6),
      ),
    });
  }
  return points;
}

function routePoints(region, rng, count) {
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0 : index / (count - 1);
    points.push({
      lat:
        region.base.lat +
        0.1 * Math.sin(t * 2.2) +
        0.06 * t +
        jitter(rng, 0.0004),
      lon:
        region.base.lon +
        0.16 * t +
        0.03 * Math.cos(t * 3.1) +
        jitter(rng, 0.0004),
      ele: Math.round(region.elevation + region.amplitude * Math.sin(t * Math.PI * 1.4)),
    });
  }
  return points;
}

function trkpt(point) {
  return `      <trkpt lat="${coordinate(point.lat)}" lon="${coordinate(point.lon)}"><ele>${point.ele}</ele></trkpt>`;
}

function trk(region, options) {
  const segments = options.segments
    .map(
      (segment) =>
        `    <trkseg>\n${segment.map((point) => trkpt(point)).join("\n")}\n    </trkseg>`,
    )
    .join("\n");
  const desc = options.desc ? `\n    <desc>${escapeXml(options.desc)}</desc>` : "";
  const extensions = options.extensions
    ? `\n    <extensions><gpxx:TrackExtension xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"><gpxx:DisplayColor>Blue</gpxx:DisplayColor></gpxx:TrackExtension></extensions>`
    : "";
  return `  <trk>\n    <name>${escapeXml(options.name ?? region.trackName)}</name>${desc}${extensions}\n${segments}\n  </trk>`;
}

function rtept(point, extra = "") {
  return `    <rtept lat="${coordinate(point.lat)}" lon="${coordinate(point.lon)}">${extra}</rtept>`;
}

function wpt(point) {
  const parts = [`lat="${coordinate(point.lat)}"`, `lon="${coordinate(point.lon)}"`];
  const body = [];
  if (point.ele !== undefined) body.push(`<ele>${point.ele}</ele>`);
  if (point.name) body.push(`<name>${escapeXml(point.name)}</name>`);
  if (point.desc) body.push(`<desc>${escapeXml(point.desc)}</desc>`);
  if (point.sym) body.push(`<sym>${escapeXml(point.sym)}</sym>`);
  if (point.link) {
    body.push(
      `<link href="${escapeXml(point.link.href)}"><text>${escapeXml(point.link.text)}</text></link>`,
    );
  }
  if (point.legacyLink) {
    body.push(`<url>${escapeXml(point.legacyLink.href)}</url>`);
    body.push(`<urlname>${escapeXml(point.legacyLink.text)}</urlname>`);
  }
  return `  <wpt ${parts.join(" ")}>${body.join("")}</wpt>`;
}

function poiPoint(region, rng, name, sym, desc) {
  return {
    lat: region.base.lat + jitter(rng, 0.09),
    lon: region.base.lon + jitter(rng, 0.12),
    name,
    ele: Math.round(region.elevation + jitter(rng, region.amplitude)),
    sym,
    desc,
  };
}

function documentXml(options) {
  const version = options.version ? ` version="${options.version}"` : "";
  const creator = options.creator ? ` creator="${escapeXml(options.creator)}"` : "";
  const ns = options.version === "1.0" ? NS10 : NS11;
  const metadata = options.metadata ? `\n${options.metadata}` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx${version}${creator} ${ns}>${metadata}\n${options.body}\n</gpx>\n`;
}

function boundsOf(points) {
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  return `  <bounds minlat="${coordinate(Math.min(...lats))}" minlon="${coordinate(
    Math.min(...lons),
  )}" maxlat="${coordinate(Math.max(...lats))}" maxlon="${coordinate(Math.max(...lons))}"/>`;
}

const SCENARIOS = [
  {
    id: "track-only",
    note: "Single-segment track with elevation. Expect one line group, distance and elevation gain, no brief.",
    build(region, rng) {
      const points = trackPoints(region, rng, 260);
      return documentXml({
        version: "1.1",
        creator: "StravaGPX",
        body: trk(region, { segments: [points] }),
      });
    },
  },
  {
    id: "track-multiseg",
    note: "Track split into three segments with a track desc. Expect segment boundaries kept and a brief from the track.",
    build(region, rng) {
      const points = trackPoints(region, rng, 270);
      return documentXml({
        version: "1.1",
        creator: "GPSies",
        body: trk(region, {
          segments: [points.slice(0, 110), points.slice(110, 200), points.slice(200)],
          desc: `Three-part ride across ${region.label}`,
        }),
      });
    },
  },
  {
    id: "track-extensions",
    note: "Vendor extensions and no desc. Expect extensions ignored and no brief.",
    build(region, rng) {
      return documentXml({
        version: "1.1",
        creator: "GPSies",
        body: trk(region, {
          segments: [trackPoints(region, rng, 240)],
          extensions: true,
        }),
      });
    },
  },
  {
    id: "track-large",
    note: "5000 points in one segment. Expect a drawn line, no per-point label layer, interactive map.",
    build(region, rng) {
      return documentXml({
        version: "1.1",
        creator: "RideWithGPS",
        body: trk(region, { segments: [trackPoints(region, rng, 5000)] }),
      });
    },
  },
  {
    id: "waypoints-sym-vocab",
    note: "Known OSM-style symbols plus unknown ones. Expect grouped colours, canonical labels, unrecognised groups rendered with deterministic colours.",
    build(region, rng) {
      const vocabulary = [
        ["Camp", 6],
        ["Drinking Water", 5],
        ["Summit", 3],
        ["Viewpoint", 2],
        ["Parking", 2],
        ["Food", 2],
        ["Bike Repair", 1],
        ["Danger Area", 1],
        ["Bakso", 2],
        ["Warteg", 1],
      ];
      const points = [];
      let index = 0;
      for (const [sym, count] of vocabulary) {
        for (let n = 0; n < count; n += 1) {
          index += 1;
          points.push(
            poiPoint(
              region,
              rng,
              `${region.places[index % region.places.length]} ${index}`,
              sym,
              `${sym} stop ${index} in ${region.label}`,
            ),
          );
        }
      }
      return documentXml({
        version: "1.1",
        creator: "PoiEdit v5.2.0",
        body: points.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    id: "waypoints-no-sym",
    note: "250 points with names only. Expect one Points group, 200 name labels, list cap note.",
    build(region, rng) {
      const points = [];
      for (let index = 1; index <= 250; index += 1) {
        points.push(
          poiPoint(
            region,
            rng,
            `${region.places[index % region.places.length]} ${index}`,
          ),
        );
      }
      return documentXml({
        version: "1.1",
        creator: "PoiEdit v5.2.0",
        body: points.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    id: "waypoints-links",
    note: "Every point carries a GPX 1.1 link. Expect a popup anchor and a linked list entry.",
    build(region, rng) {
      const points = [];
      for (let index = 1; index <= 20; index += 1) {
        const place = region.places[index % region.places.length];
        points.push({
          ...poiPoint(region, rng, `${place} ${index}`, "Camp"),
          link: {
            href: `https://example.com/poi/${region.slug}-${index}`,
            text: `${place} campsite`,
          },
        });
      }
      return documentXml({
        version: "1.1",
        creator: "ViewRanger",
        body: points.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    id: "waypoints-legacy-1.0",
    note: "GPX 1.0 with flat url, urlname, root name and Camp symbols. Expect legacy link parsing and creator row.",
    build(region, rng) {
      const points = [];
      for (let index = 1; index <= 12; index += 1) {
        points.push({
          ...poiPoint(
            region,
            rng,
            `${region.places[index % region.places.length]} municipal campsite ${index}`,
            "Camp",
            `Municipal campsite ${index}, ${region.label}`,
          ),
          legacyLink: {
            href: `https://example.com/legacy/${region.slug}-${index}`,
            text: `Campsite ${index}`,
          },
        });
      }
      return documentXml({
        version: "1.0",
        creator: "MapSource 6.16.3",
        metadata: `  <name>${escapeXml(region.trackName)}</name>`,
        body: points.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    id: "waypoints-and-track",
    note: "Points of interest plus a track. Expect one line group, one POI group, start and finish rows.",
    build(region, rng) {
      const points = [];
      for (let index = 1; index <= 10; index += 1) {
        points.push(
          poiPoint(
            region,
            rng,
            `${region.places[index % region.places.length]} ${index}`,
            index % 2 === 0 ? "Camp" : "Drinking Water",
          ),
        );
      }
      return documentXml({
        version: "1.1",
        creator: "QGIS",
        body: `${points
          .map((point) => wpt(point))
          .join("\n")}\n${trk(region, { segments: [trackPoints(region, rng, 300)] })}`,
      });
    },
  },
  {
    id: "route-km-marks",
    note: "Route with km-named marks every 10 km, warning flags, and a CDATA desc with a URL. Expect 7 marks, step 10, plain-text brief with one Source link.",
    build(region, rng) {
      const points = routePoints(region, rng, 61);
      const body = points
        .map((point, index) => {
          const km = index;
          if (km % 10 !== 0) return rtept(point);
          return rtept(
            point,
            `<name>${km.toFixed(2)}km</name><sym>warningflag</sym><cmt>${km.toFixed(2)}km</cmt>`,
          );
        })
        .join("\n");
      const desc = `<![CDATA[<h2>Route notes</h2><p>${escapeXml(
        region.routeName,
      )} covers 60 km with 7 flagged points.</p><p>Source: <a href="https://example.com/routes/${
        region.slug
      }">route page</a></p>]]>`;
      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        body: `  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n    <desc>${desc}</desc>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "route-marks-large",
    note: "Route with 250 km-named marks. Expect the mark layer skipped above 200 with one plain note row.",
    build(region, rng) {
      const points = routePoints(region, rng, 250);
      const body = points
        .map((point, index) => rtept(point, `<name>${index + 1}.00km</name>`))
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        body: `  <rte>\n    <name>${escapeXml(region.routeName)}</name>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "route-named-no-km",
    note: "Route whose points carry place names and scattered symbols, no km values. Expect no distance marks and a namedPoints fallback.",
    build(region, rng) {
      const points = routePoints(region, rng, 40);
      const symbols = ["Viewpoint", "Drinking Water", "Summit"];
      const body = points
        .map((point, index) => {
          const name = `${region.places[index % region.places.length]} stop ${index + 1}`;
          const symbol =
            index % 7 === 0 ? `<sym>${symbols[(index / 7) % symbols.length]}</sym>` : "";
          return rtept(point, `<name>${escapeXml(name)}</name>${symbol}`);
        })
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "BaseCamp",
        body: `  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "route-and-track",
    note: "Route desc with a larger track that has no desc. Expect the track to be primary and the brief to fall back to the route desc.",
    build(region, rng) {
      const route = routePoints(region, rng, 200);
      const body = route
        .map((point, index) =>
          index % 10 === 0
            ? rtept(point, `<name>${index.toFixed(2)}km</name>`)
            : rtept(point),
        )
        .join("\n");
      const desc = `Planned line for ${region.routeName}`;
      return documentXml({
        version: "1.1",
        creator: "QGIS",
        body: `  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n    <desc>${escapeXml(desc)}</desc>\n${body}\n  </rte>\n${trk(
          region,
          { segments: [trackPoints(region, rng, 500)] },
        )}`,
      });
    },
  },
  {
    id: "metadata-full",
    note: "Full metadata block plus a track with no desc. Expect every provenance row, metadata desc rendered as metadata only, no brief.",
    build(region, rng) {
      const points = trackPoints(region, rng, 260);
      const metadata = `  <metadata>\n    <name>${escapeXml(
        region.label,
      )} fixture route</name>\n    <desc>Generated scenario covering the full metadata ladder.</desc>\n    <author><name>Fixture Author</name><email id="fixtures" domain="example.com"/></author>\n    <link href="https://example.com/gpx/${
        region.slug
      }"><text>${escapeXml(
        region.label,
      )} route page</text><type>text/html</type></link>\n    <time>2026-03-14T06:30:00Z</time>\n    <keywords>cycling, ${escapeXml(
        region.label,
      )}, fixtures</keywords>\n  ${boundsOf(points)}\n  </metadata>`;
      return documentXml({
        version: "1.1",
        creator: "MapSource 6.16.3",
        metadata,
        body: trk(region, { segments: [points] }),
      });
    },
  },
  {
    id: "no-metadata-fallback",
    note: "No version, no creator, no metadata element, track name only. Expect a title from the track, computed bounds, no creator row.",
    build(region, rng) {
      return documentXml({
        body: trk(region, { segments: [trackPoints(region, rng, 180)] }),
      });
    },
  },
  {
    id: "invalid-points-only",
    note: "Every point has a missing or non-numeric coordinate. Expect skipped counts, no markers, legend hidden, no error.",
    build(region) {
      const body = [
        `  <wpt lon="${coordinate(region.base.lon)}"><name>Missing latitude</name></wpt>`,
        `  <wpt lat="${coordinate(region.base.lat)}"><name>Missing longitude</name></wpt>`,
        `  <wpt lat="not-a-number" lon="${coordinate(region.base.lon)}"><name>Bad latitude</name></wpt>`,
      ].join("\n");
      return documentXml({ version: "1.1", creator: "broken-export", body });
    },
  },
  {
    id: "brevet-controls",
    note: "Unsupported 200 km brevet: km-named marks, six Control waypoints with open and close windows, brevet desc with a link. Expect distance marks, an unrecognised Control group and a brief.",
    build(region, rng) {
      const points = routePoints(region, rng, 201);
      const body = points
        .map((point, index) =>
          index % 10 === 0
            ? rtept(point, `<name>${index.toFixed(2)}km</name>`)
            : rtept(point),
        )
        .join("\n");
      const controls = [];
      for (let index = 0; index < 6; index += 1) {
        controls.push(
          poiPoint(
            region,
            rng,
            `Control ${index + 1} - ${region.places[index]}`,
            "Control",
            `Open 0${index + 4}:00 Close 0${index + 5}:30`,
          ),
        );
      }
      const desc = `<![CDATA[<p>200 km brevet, unsupported. Expect controls with open and close times.</p><p>Route: <a href="https://example.com/brevet/${region.slug}">brevet page</a></p>]]>`;
      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        body: `${controls
          .map((point) => wpt(point))
          .join("\n")}\n  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n    <desc>${desc}</desc>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "sportive-supported",
    note: "Supported 100 km sportive: feed stations, water points and mechanics. Expect Food, Water and Repair groups plus a brief.",
    build(region, rng) {
      const points = routePoints(region, rng, 101);
      const body = points
        .map((point, index) =>
          index % 10 === 0
            ? rtept(point, `<name>${index.toFixed(2)}km</name>`)
            : rtept(point),
        )
        .join("\n");
      const stops = [];
      for (let index = 0; index < 3; index += 1) {
        stops.push(
          poiPoint(region, rng, `Feed station ${index + 1}`, "Food", `Feed station ${index + 1}`),
        );
      }
      for (let index = 0; index < 3; index += 1) {
        stops.push(poiPoint(region, rng, `Water ${index + 1}`, "Drinking Water"));
      }
      for (let index = 0; index < 2; index += 1) {
        stops.push(poiPoint(region, rng, `Mechanic ${index + 1}`, "Bike Repair"));
      }
      return documentXml({
        version: "1.1",
        creator: "RideWithGPS",
        body: `${stops
          .map((point) => wpt(point))
          .join("\n")}\n  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n    <desc>Supported ride across ${escapeXml(
          region.label,
        )}: feed stations, water and mechanical support.</desc>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "bikepacking-unsupported",
    note: "Unsupported bikepacking track: water, camp, resupply and summit points. Expect four POI groups including an unrecognised Resupply group.",
    build(region, rng) {
      const stops = [];
      for (let index = 0; index < 4; index += 1) {
        stops.push(
          poiPoint(region, rng, `${region.places[index]} water`, "Drinking Water"),
        );
      }
      for (let index = 0; index < 3; index += 1) {
        stops.push(poiPoint(region, rng, `${region.places[index + 3]} camp`, "Camp"));
      }
      for (let index = 0; index < 2; index += 1) {
        stops.push(
          poiPoint(region, rng, `${region.places[index + 5]} resupply`, "Resupply"),
        );
      }
      for (let index = 0; index < 2; index += 1) {
        stops.push(
          poiPoint(region, rng, `${region.places[index + 7]} summit`, "Summit"),
        );
      }
      return documentXml({
        version: "1.1",
        creator: "bikepacking.com",
        body: `${stops.map((point) => wpt(point)).join("\n")}\n${trk(region, {
          segments: [trackPoints(region, rng, 600)],
          desc: `Unsupported ride. No outside help. Resupply at warungs in ${region.label}.`,
        })}`,
      });
    },
  },
  {
    id: "mtb-technical",
    note: "Technical MTB loop with hazard, viewpoint and summit points. Expect three POI groups and a track brief.",
    build(region, rng) {
      const stops = [];
      for (let index = 0; index < 3; index += 1) {
        stops.push(poiPoint(region, rng, `Hazard ${index + 1}`, "Danger Area"));
      }
      for (let index = 0; index < 2; index += 1) {
        stops.push(
          poiPoint(region, rng, `${region.places[index]} viewpoint`, "Viewpoint"),
        );
      }
      stops.push(poiPoint(region, rng, `${region.places[2]} summit`, "Summit"));
      return documentXml({
        version: "1.1",
        creator: "Trailforks",
        body: `${stops.map((point) => wpt(point)).join("\n")}\n${trk(region, {
          segments: [trackPoints(region, rng, 400)],
          desc: `Technical singletrack loop in ${region.label}.`,
        })}`,
      });
    },
  },
  {
    id: "brief-long",
    note: "Route desc above 240 characters with one http URL and one unsafe URL. Expect an excerpt plus Show full description and a single Source link.",
    build(region, rng) {
      const body = routePoints(region, rng, 120)
        .map((point) => rtept(point))
        .join("\n");
      const paragraph =
        "This route leaves the city and climbs steadily through plantations, then follows a ridge with three short descents and a long exposed section before the final run into town. ";
      const desc = `${paragraph}${paragraph}More notes at https://example.com/notes/${region.slug} and ignore javascript:alert(1).`;
      return documentXml({
        version: "1.1",
        creator: "Komoot",
        body: `  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n    <desc>${escapeXml(desc)}</desc>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "brief-both-desc",
    note: "Route and track both carry a desc and the track has more points. Expect the track desc to win the brief.",
    build(region, rng) {
      const body = routePoints(region, rng, 50)
        .map((point) => rtept(point))
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "QGIS",
        body: `  <rte>\n    <name>${escapeXml(
          region.routeName,
        )}</name>\n    <desc>Route description</desc>\n${body}\n  </rte>\n${trk(
          region,
          {
            segments: [trackPoints(region, rng, 300)],
            desc: "Track description",
          },
        )}`,
      });
    },
  },
  {
    id: "marks-200",
    note: "Exactly 200 km-named marks. Expect the label layer to stay on and no note row.",
    build(region, rng) {
      const body = routePoints(region, rng, 200)
        .map((point, index) => rtept(point, `<name>${index + 1}.00km</name>`))
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        body: `  <rte>\n    <name>${escapeXml(region.routeName)}</name>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "marks-201",
    note: "201 km-named marks, one above the cap. Expect the label layer skipped and the note row present.",
    build(region, rng) {
      const body = routePoints(region, rng, 201)
        .map((point, index) => rtept(point, `<name>${index + 1}.00km</name>`))
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        body: `  <rte>\n    <name>${escapeXml(region.routeName)}</name>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "marks-labels-extra",
    note: "Twelve marks but only eight labels. Expect the label array to stop at eight while the count stays twelve.",
    build(region, rng) {
      const body = routePoints(region, rng, 120)
        .map((point, index) =>
          index % 10 === 0
            ? rtept(point, `<name>${(index + 10).toFixed(2)}km</name>`)
            : rtept(point),
        )
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        body: `  <rte>\n    <name>${escapeXml(region.routeName)}</name>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "metadata-variants",
    note: "Author without email and a link without text. Expect an author row, no email, and a Source anchor labelled by its href.",
    build(region, rng) {
      const metadata = `  <metadata>\n    <name>${escapeXml(
        region.label,
      )} variant route</name>\n    <author><name>Fixture Author</name></author>\n    <link href="https://example.com/no-text/${
        region.slug
      }"/>\n  </metadata>`;
      return documentXml({
        version: "1.1",
        creator: "BaseCamp",
        metadata,
        body: trk(region, { segments: [trackPoints(region, rng, 120)] }),
      });
    },
  },
  {
    id: "loop-route",
    note: "Track that returns to its first point. Expect the loop row instead of separate start and finish rows.",
    build(region, rng) {
      const points = trackPoints(region, rng, 200);
      points.push({ ...points[0] });
      return documentXml({
        version: "1.1",
        creator: "StravaGPX",
        body: trk(region, { segments: [points] }),
      });
    },
  },
  {
    id: "single-waypoint",
    note: "One waypoint and nothing else. Expect a single marker and the waypoint fallback label.",
    build(region, rng) {
      return documentXml({
        version: "1.1",
        creator: "organicmaps",
        body: wpt(
          poiPoint(
            region,
            rng,
            `${region.places[0]} meeting point`,
            "Viewpoint",
          ),
        ),
      });
    },
  },
  {
    id: "multi-track",
    note: "Two tracks in one file. Expect two line groups with separate colours and distances.",
    build(region, rng) {
      return documentXml({
        version: "1.1",
        creator: "Garmin Connect",
        body: `${trk(region, {
          segments: [trackPoints(region, rng, 200)],
          name: `${region.trackName} day 1`,
        })}\n${trk(region, {
          segments: [trackPoints(region, rng, 80)],
          name: `${region.trackName} day 2`,
        })}`,
      });
    },
  },
  {
    id: "named-fallback-from-sym",
    note: "Route points with symbols and no names. Expect the named-point fallback label taken from the first symbol.",
    build(region, rng) {
      const body = routePoints(region, rng, 30)
        .map((point, index) =>
          index % 6 === 0
            ? rtept(point, `<sym>Summit</sym>`)
            : rtept(point),
        )
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "BaseCamp",
        body: `  <rte>\n    <name>${escapeXml(region.routeName)}</name>\n${body}\n  </rte>`,
      });
    },
  },
  {
    id: "empty-valid",
    note: "Metadata only, no points at all. Expect a metadata panel, no map markers, no legend, no error.",
    build(region) {
      const metadata = `  <metadata>\n    <name>${escapeXml(
        region.label,
      )} empty route</name>\n  </metadata>`;
      return documentXml({
        version: "1.1",
        creator: "BaseCamp",
        metadata,
        body: "",
      });
    },
  },
];

rmSync(OUT_ROOT, { recursive: true, force: true });

let fileCount = 0;
const rows = [];

for (const [regionKey, region] of Object.entries(REGIONS)) {
  const regionDir = join(OUT_ROOT, regionKey);
  mkdirSync(regionDir, { recursive: true });
  for (const scenario of SCENARIOS) {
    const rng = mulberry32(hashSeed(`${regionKey}:${scenario.id}`));
    const xml = scenario.build(region, rng);
    writeFileSync(join(regionDir, `${scenario.id}.gpx`), xml);
    fileCount += 1;
    rows.push(
      `| ${scenario.id} | ${region.label} | \`${regionKey}/${scenario.id}.gpx\` | ${scenario.note} |`,
    );
  }
}

const readme = `# GPX viewer fixtures

Generated by \`scripts/generate-gpx-fixtures.mjs\`. Deterministic: the same seeds produce the
same bytes. Every scenario exists once for West Java and once for Bali.

| Scenario | Region | File | What it exercises |
|---|---|---|---|
${rows.join("\n")}

Regenerate: \`node scripts/generate-gpx-fixtures.mjs\`
Verify: \`node --experimental-strip-types scripts/verify-gpx-fixtures.mjs\`
`;

writeFileSync(join(OUT_ROOT, "README.md"), readme);

console.log(`wrote ${fileCount} files across ${Object.keys(REGIONS).length} regions`);
