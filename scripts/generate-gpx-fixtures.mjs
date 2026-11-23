import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_ROOT = "e2e/fixtures/gpx";
const ROUTE_ROOT = join(OUT_ROOT, "_routes");
const NS11 = 'xmlns="http://www.topografix.com/GPX/1/1"';
const NS10 = 'xmlns="http://www.topografix.com/GPX/1/0"';

const REGIONS = {
  "west-java": { label: "West Java" },
  bali: { label: "Bali" },
};

function hashSeed(value) {
  let hash = 0x811c9dc5;
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
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
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
  return value.toFixed(6);
}

const NAME_PREFIXES = {
  Camp: ["Bumi Perkemahan"],
  "Drinking Water": ["Mata Air", "Sumur", "Pancuran Umum"],
  Food: ["Warung Nasi", "Kedai Kopi", "Saung Makan"],
  "Bike Repair": ["Bengkel Sepeda", "Toko Sepeda"],
  "Danger Area": ["Tikungan Tajam", "Turunan Curam"],
  Control: ["Pos Kontrol"],
  Summit: ["Titik Tinggi"],
  Viewpoint: ["Titik Pandang"],
  Parking: ["Parkir"],
  Bakso: ["Bakso"],
  Warteg: ["Warteg"],
  Shelter: ["Pondok"],
};

const SYM_DESCRIPTIONS = {
  Camp: "Bumi perkemahan dengan sumber air",
  "Drinking Water": "Mata air, aman untuk isi ulang",
  Food: "Warung makan setempat",
  "Bike Repair": "Bengkel sepeda dengan suku cadang dasar",
  "Danger Area": "Tikungan tajam, kurangi kecepatan",
  Control: "Pos kontrol brevet",
  Summit: "Titik tinggi dengan pandangan terbuka",
  Viewpoint: "Titik pandang tepi jalan",
  Parking: "Parkir kendaraan pendukung",
  Bakso: "Bakso dan mie ayam setempat",
  Warteg: "Warteg dengan nasi dan sayur",
  Shelter: "Pondok beratap untuk berteduh",
};

const EARTH_RADIUS_METERS = 6371008.8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function metersBetween(from, to) {
  const fromLat = from[0] ?? from.lat;
  const fromLon = from[1] ?? from.lon;
  const toLat = to[0] ?? to.lat;
  const toLon = to[1] ?? to.lon;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function lineMetrics(points) {
  const cumulative = [0];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += metersBetween(points[index - 1], points[index]);
    cumulative.push(total);
  }
  return { cumulative, total };
}

function locateIndex(cumulative, distance) {
  let low = 0;
  let high = cumulative.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (cumulative[middle] <= distance) low = middle;
    else high = middle - 1;
  }
  return Math.min(low, cumulative.length - 2);
}

function interpolate(points, cumulative, distance) {
  if (points.length === 1) {
    const point = points[0];
    return { lat: point[0] ?? point.lat, lon: point[1] ?? point.lon };
  }
  const index = locateIndex(cumulative, distance);
  const span = cumulative[index + 1] - cumulative[index];
  const fraction = span <= 0 ? 0 : clamp((distance - cumulative[index]) / span, 0, 1);
  const from = points[index];
  const to = points[index + 1];
  const fromLat = from[0] ?? from.lat;
  const fromLon = from[1] ?? from.lon;
  const toLat = to[0] ?? to.lat;
  const toLon = to[1] ?? to.lon;
  return {
    lat: fromLat + (toLat - fromLat) * fraction,
    lon: fromLon + (toLon - fromLon) * fraction,
  };
}

function prepareRoute(id) {
  const raw = JSON.parse(
    readFileSync(join(ROUTE_ROOT, `${id}.json`), "utf8"),
  );
  const points = raw.points;
  const metrics = lineMetrics(points);
  const elevationSamples = (raw.elevationSamples ?? []).filter((sample) =>
    Number.isFinite(sample.ele),
  );
  const samplePoints = elevationSamples.map((sample) => [
    sample.lat,
    sample.lon,
  ]);
  const sampleMetrics = lineMetrics(samplePoints);
  return {
    ...raw,
    points,
    metrics,
    elevationSamples,
    samplePoints,
    sampleMetrics,
  };
}

function elevationAt(route, distance) {
  const { elevationSamples, sampleMetrics, metrics } = route;
  if (elevationSamples.length === 0) return null;
  const target =
    metrics.total <= 0
      ? 0
      : (distance / metrics.total) * sampleMetrics.total;
  if (elevationSamples.length === 1) {
    return Math.round(elevationSamples[0].ele);
  }
  const index = locateIndex(sampleMetrics.cumulative, target);
  const span =
    sampleMetrics.cumulative[index + 1] - sampleMetrics.cumulative[index];
  const fraction =
    span <= 0
      ? 0
      : clamp(
          (target - sampleMetrics.cumulative[index]) / span,
          0,
          1,
        );
  const from = elevationSamples[index].ele;
  const to = elevationSamples[index + 1].ele;
  return Math.round(from + (to - from) * fraction);
}

// Every fixture is sampled from the vendored road geometry by cumulative
// distance, so index does not leak into spacing or km labels.
function resample(route, count, options = {}) {
  const { points, metrics } = route;
  const denominator = Math.max(1, count - 1);
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const distance =
      index === count - 1 ? metrics.total : (metrics.total * index) / denominator;
    const point = interpolate(points, metrics.cumulative, distance);
    if (options.elevation) {
      const elevation = elevationAt(route, distance);
      if (elevation !== null) point.ele = elevation;
    }
    samples.push(point);
  }
  return samples;
}

function pointAtFraction(route, fraction, options = {}) {
  const distance = route.metrics.total * clamp(fraction, 0, 1);
  const point = interpolate(
    route.points,
    route.metrics.cumulative,
    distance,
  );
  if (options.elevation) {
    const elevation = elevationAt(route, distance);
    if (elevation !== null) point.ele = elevation;
  }
  return point;
}

// Each category walks the corridor place list one step per point, so
// consecutive points of the same category never share a name and any category
// with at least 8 points covers 8 distinct places.
function placeAt(places, occurrence) {
  return places[occurrence % places.length];
}

function localName(places, sym, occurrence) {
  const prefixes = NAME_PREFIXES[sym] ?? [sym];
  const prefix = prefixes[occurrence % prefixes.length];
  return `${prefix} ${placeAt(places, occurrence)}`;
}

function localDesc(places, sym, occurrence) {
  return `${SYM_DESCRIPTIONS[sym] ?? sym} di ${placeAt(places, occurrence)}`;
}

function stopAtFraction(route, fraction, places, sym, occurrence, options = {}) {
  const point = pointAtFraction(route, fraction, { elevation: true });
  return {
    ...point,
    name: options.name ?? localName(places, sym, occurrence),
    desc: options.desc ?? localDesc(places, sym, occurrence),
    sym,
  };
}

function stopAtKm(route, km, places, sym, occurrence) {
  const fraction = clamp(km / (route.metrics.total / 1000), 0, 1);
  return stopAtFraction(route, fraction, places, sym, occurrence);
}

function trkpt(point) {
  const elevation =
    point.ele === undefined ? "" : `<ele>${point.ele}</ele>`;
  return `      <trkpt lat="${coordinate(point.lat)}" lon="${coordinate(point.lon)}">${elevation}</trkpt>`;
}

function trk(region, options) {
  const name = options.name ?? region.label;
  const segments = options.segments
    .map(
      (segment) =>
        `    <trkseg>\n${segment.map((point) => trkpt(point)).join("\n")}\n    </trkseg>`,
    )
    .join("\n");
  const desc = options.descCdata
    ? `\n    <desc><![CDATA[${options.descCdata}]]></desc>`
    : options.desc
      ? `\n    <desc>${escapeXml(options.desc)}</desc>`
      : "";
  return `  <trk>\n    <name>${escapeXml(name)}</name>${desc}\n${segments}\n  </trk>`;
}

function rtept(point, extra = "") {
  return `    <rtept lat="${coordinate(point.lat)}" lon="${coordinate(point.lon)}">${extra}</rtept>`;
}

function routeXml(options) {
  const name = options.name
    ? `\n    <name>${escapeXml(options.name)}</name>`
    : "";
  const desc = options.descCdata
    ? `\n    <desc><![CDATA[${options.descCdata}]]></desc>`
    : options.desc
      ? `\n    <desc>${escapeXml(options.desc)}</desc>`
      : "";
  return `  <rte>${name}${desc}\n${options.body}\n  </rte>`;
}

function wpt(point) {
  const attributes = [
    `lat="${coordinate(point.lat)}"`,
    `lon="${coordinate(point.lon)}"`,
  ];
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
  return `  <wpt ${attributes.join(" ")}>${body.join("")}</wpt>`;
}

function documentXml(options) {
  const version = options.version ? ` version="${options.version}"` : "";
  const creator = options.creator
    ? ` creator="${escapeXml(options.creator)}"`
    : "";
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

function metadataXml(options) {
  const lines = ["  <metadata>"];
  if (options.name) {
    lines.push(`    <name>${escapeXml(options.name)}</name>`);
  }
  if (options.desc) {
    lines.push(`    <desc>${escapeXml(options.desc)}</desc>`);
  }
  if (options.author) {
    const email = options.email
      ? `<email id="${escapeXml(options.email.id)}" domain="${escapeXml(
          options.email.domain,
        )}"/>`
      : "";
    lines.push(
      `    <author><name>${escapeXml(options.author)}</name>${email}</author>`,
    );
  }
  if (options.link) {
    const type = options.link.type
      ? `<type>${escapeXml(options.link.type)}</type>`
      : "";
    lines.push(
      `    <link href="${escapeXml(options.link.href)}"><text>${escapeXml(
        options.link.text,
      )}</text>${type}</link>`,
    );
  }
  if (options.time) {
    lines.push(`    <time>${escapeXml(options.time)}</time>`);
  }
  if (options.keywords?.length) {
    lines.push(
      `    <keywords>${escapeXml(options.keywords.join(", "))}</keywords>`,
    );
  }
  if (options.bounds) lines.push(options.bounds);
  lines.push("  </metadata>");
  return lines.join("\n");
}

function rootName(name) {
  return `  <name>${escapeXml(name)}</name>`;
}

function shuffle(rng, values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function expandSymbols(specification) {
  const symbols = [];
  for (const [sym, count] of specification) {
    for (let index = 0; index < count; index += 1) symbols.push(sym);
  }
  return symbols;
}

function roundRobin(specification) {
  const remaining = specification.map(([sym, count]) => [sym, count]);
  const symbols = [];
  let moved = true;
  while (moved) {
    moved = false;
    for (const bucket of remaining) {
      if (bucket[1] <= 0) continue;
      symbols.push(bucket[0]);
      bucket[1] -= 1;
      moved = true;
    }
  }
  return symbols;
}

function countBySymbols(symbols) {
  const counts = new Map();
  for (const sym of symbols) {
    counts.set(sym, (counts.get(sym) ?? 0) + 1);
  }
  return [...counts.entries()];
}

function formatGroups(groups) {
  if (groups.length === 0) return "none";
  return groups
    .map(([sym, count]) => `${sym} ${count}`)
    .join(", ");
}

function markBody(route, points, stride) {
  const totalKm = route.metrics.total / 1000;
  const denominator = Math.max(1, points.length - 1);
  let marks = 0;
  const body = points
    .map((point, index) => {
      if (index % stride !== 0) return rtept(point);
      marks += 1;
      const label = `${((totalKm * index) / denominator).toFixed(2)}km`;
      return rtept(point, `<name>${label}</name><sym>Control</sym>`);
    })
    .join("\n");
  return { body, marks };
}

function waypointCorridor(route, symbols, places, linkKind) {
  const occurrences = new Map();
  return symbols.map((sym, index) => {
    const occurrence = occurrences.get(sym) ?? 0;
    occurrences.set(sym, occurrence + 1);
    const fraction = (index + 1) / (symbols.length + 1);
    const point = pointAtFraction(route, fraction, { elevation: true });
    const name = localName(places, sym, occurrence);
    const waypoint = {
      ...point,
      name,
      sym,
      desc: localDesc(places, sym, occurrence),
    };
    if (linkKind === "link") {
      waypoint.link = {
        href: `https://example.com/poi/${index + 1}`,
        text: name,
      };
    }
    if (linkKind === "legacy") {
      waypoint.legacyLink = {
        href: `https://example.com/poi/${index + 1}`,
        text: name,
      };
    }
    return waypoint;
  });
}

const SCENARIOS = [
  {
    region: "west-java",
    id: "bandung-lembang-brevet",
    route: "bandung-lembang-brevet",
    anchors:
      "Bandung → Lembang → Ciater → Subang → Purwakarta → Bandung",
    places: [
      "Bandung",
      "Dago",
      "Lembang",
      "Cikole",
      "Ciater",
      "Cijambe",
      "Subang",
      "Kalijati",
      "Cipeundeuy",
      "Purwakarta",
      "Darangdan",
      "Cikalong Wetan",
      "Padalarang",
      "Cimahi",
    ],
    build(route, region, rng) {
      const points = resample(route, 1001);
      const { body, marks } = markBody(route, points, 50);
      const stops = [
        [9, "Drinking Water"],
        [19, "Food"],
        [29, "Bike Repair"],
        [39, "Danger Area"],
        [49, "Camp"],
        [59, "Control"],
        [69, "Drinking Water"],
        [79, "Food"],
        [89, "Bike Repair"],
        [99, "Danger Area"],
        [109, "Camp"],
        [119, "Control"],
        [129, "Drinking Water"],
        [139, "Food"],
        [149, "Danger Area"],
        [159, "Control"],
        [169, "Control"],
      ];
      const occurrences = new Map();
      const waypoints = stops.map(([km, sym]) => {
        const occurrence = occurrences.get(sym) ?? 0;
        occurrences.set(sym, occurrence + 1);
        return stopAtKm(route, km, this.places, sym, occurrence);
      });

      const description = `<h2>Bandung–Lembang–Purwakarta Brevet</h2><p>Brevet ini memutar cekungan Bandung lewat jalan kota, lalu mendaki ke Lembang, Ciater, dan Subang sebelum kembali lewat Purwakarta. Kontrol tersebar di jalur utama dan tidak ada dukungan luar.</p><ul><li>Kontrol buka dan tutup sesuai jadwal brevet.</li><li>Bawa lampu karena start pukul 22.00.</li><li>Isi air di Cikole dan Ciater sebelum tanjakan panjang.</li></ul><p>Lembar rute lengkap ada di https://example.com/brevet/bandung-lembang dan wajib dibaca sebelum start.</p>`;

      const metadata = metadataXml({
        name: "Bandung–Lembang–Purwakarta Brevet",
        desc: "Brevet dari Bandung ke Lembang, Ciater, Subang, dan Purwakarta lalu kembali ke Bandung.",
        author: "Rully Santoso",
        email: { id: "brevet", domain: "example.com" },
        link: {
          href: "https://example.com/brevet/bandung-lembang",
          text: "Brevet Bandung–Lembang",
          type: "text/html",
        },
        time: "2026-05-16T22:00:00Z",
        keywords: ["brevet", "randonneuring", "West Java"],
        bounds: boundsOf([...points, ...waypoints]),
      });

      return {
        xml: documentXml({
          version: "1.1",
          creator: "gps-touring",
          metadata,
          body: `${waypoints
            .map((point) => wpt(point))
            .join("\n")}\n${routeXml({
            name: "Bandung–Lembang–Purwakarta Brevet",
            descCdata: description,
            body,
          })}`,
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks,
          groups: countBySymbols(stops.map(([, sym]) => sym)),
        },
      };
    },
  },
  {
    region: "west-java",
    id: "bandung-utara-track",
    route: "bandung-utara-track",
    anchors: "Dago → Lembang → Tangkuban Perahu",
    places: [
      "Dago",
      "Ciumbuleuit",
      "Cidadap",
      "Lembang",
      "Cikole",
      "Maribaya",
      "Cisarua",
      "Parongpong",
      "Tangkuban Perahu",
    ],
    build(route, region) {
      const points = resample(route, 3000, { elevation: true });
      const segments = [
        points.slice(0, 1500),
        points.slice(1500, 2400),
        points.slice(2400, 3000),
      ];
      return {
        xml: documentXml({
          version: "1.1",
          body: trk(region, {
            name: "Bandung Utara: Dago - Lembang - Tangkuban Perahu",
            desc: "Rute pagi dari Dago menembus grid kota Bandung lalu mendaki ke Lembang. Tiga segmen mengikuti jalan utama sampai Tangkuban Perahu.",
            segments,
          }),
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks: null,
          groups: [],
        },
      };
    },
  },
  {
    region: "west-java",
    id: "ciwidey-poi-1.0",
    route: "ciwidey-poi-1.0",
    anchors: "Ciwidey → Rancabali → Situ Patenggang",
    noLine: true,
    places: [
      "Ciwidey",
      "Tenjolaya",
      "Margamulya",
      "Panundaan",
      "Alamendah",
      "Rancabali",
      "Cimanggu",
      "Cipelah",
      "Patengan",
      "Situ Patenggang",
    ],
    build(route, region, rng) {
      const specification = [
        ["Camp", 120],
        ["Drinking Water", 50],
        ["Summit", 25],
        ["Viewpoint", 20],
        ["Parking", 15],
        ["Food", 10],
        ["Bike Repair", 5],
        ["Danger Area", 3],
        ["Bakso", 1],
        ["Warteg", 1],
      ];
      const symbols = shuffle(rng, expandSymbols(specification));
      const waypoints = waypointCorridor(
        route,
        symbols,
        this.places,
        "legacy",
      );
      return {
        xml: documentXml({
          version: "1.0",
          creator: "MapSource 6.16.3",
          metadata: rootName("Ciwidey, Rancabali dan Situ Patenggang"),
          body: waypoints.map((point) => wpt(point)).join("\n"),
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks: null,
          groups: countBySymbols(symbols),
        },
      };
    },
  },
  {
    region: "west-java",
    id: "pangandaran-sportive",
    route: "pangandaran-sportive",
    anchors: "Pangandaran → Cijulang → Parigi → Pangandaran",
    places: [
      "Pangandaran",
      "Sukaresik",
      "Cibenda",
      "Karangbenda",
      "Cijulang",
      "Parigi",
      "Karangjaladri",
    ],
    build(route, region, rng) {
      const points = resample(route, 501);
      const { body, marks } = markBody(route, points, 50);
      const track = resample(route, 800, { elevation: true });

      const stops = [
        [6, "Food"],
        [13, "Drinking Water"],
        [20, "Food"],
        [27, "Bike Repair"],
        [34, "Drinking Water"],
        [41, "Food"],
        [48, "Drinking Water"],
        [54, "Bike Repair"],
      ];
      const occurrences = new Map();
      const waypoints = stops.map(([km, sym]) => {
        const occurrence = occurrences.get(sym) ?? 0;
        occurrences.set(sym, occurrence + 1);
        return stopAtKm(route, km, this.places, sym, occurrence);
      });

      const metadata = metadataXml({
        name: "Pangandaran Sportive",
        bounds: boundsOf([...points, ...track, ...waypoints]),
      });

      return {
        xml: documentXml({
          version: "1.1",
          creator: "RideWithGPS",
          metadata,
          body: `${waypoints
            .map((point) => wpt(point))
            .join("\n")}\n${routeXml({
            name: "Pangandaran Sportive",
            desc: "Sportive dari Pantai Pangandaran ke perbukitan Cijulang lewat Parigi dengan tiga pos makan, tiga titik air, dan dua bengkel. Rute ditutup untuk lalu lintas penuh.",
            body,
          })}\n${trk(region, {
            name: "Pangandaran Sportive warm-up lap",
            segments: [track],
          })}`,
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          trackKm: lineMetrics(track).total / 1000,
          marks,
          groups: countBySymbols(stops.map(([, sym]) => sym)),
        },
      };
    },
  },
  {
    region: "west-java",
    id: "cikarang-commute-links",
    route: "cikarang-commute-links",
    anchors: "Cikarang → Tambun → Bekasi",
    places: [
      "Cikarang",
      "Pasirgombong",
      "Harjamekar",
      "Sukadanau",
      "Tambun",
      "Mekarsari",
      "Bekasi",
      "Margahayu",
      "Bekasi Kaum",
      "Jakasampurna",
    ],
    build(route, region) {
      const track = resample(route, 600, { elevation: true });
      const symbols = roundRobin([
        ["Drinking Water", 10],
        ["Camp", 10],
        ["Viewpoint", 10],
        ["Bakso", 10],
      ]);
      const waypoints = waypointCorridor(
        route,
        symbols,
        this.places,
        "link",
      );
      return {
        xml: documentXml({
          version: "1.1",
          creator: "ViewRanger",
          metadata: metadataXml({
            name: "Cikarang Commute Links",
            author: "Komunitas Gowes Cikarang",
            email: { id: "gowes", domain: "example.com" },
          }),
          body: `${waypoints
            .map((point) => wpt(point))
            .join("\n")}\n${trk(region, {
            name: "Cikarang - Tambun - Bekasi Commute",
            desc: "Rute komuter dari Cikarang ke Bekasi lewat Tambun.",
            segments: [track],
          })}`,
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          trackKm: lineMetrics(track).total / 1000,
          trackLabel: "commute",
          marks: null,
          groups: countBySymbols(symbols),
        },
      };
    },
  },
  {
    region: "bali",
    id: "sanur-kintamani-climb-track",
    route: "sanur-kintamani-climb-track",
    anchors: "Sanur → Kintamani",
    places: [
      "Sanur",
      "Denpasar Selatan",
      "Kesiman Kertalangu",
      "Celuk",
      "Mas",
      "Pejeng",
      "Sanding",
      "Tampaksiring",
      "Penglumbaran",
      "Sekardadi",
      "Kedisan",
      "Kintamani",
    ],
    build(route, region) {
      const track = resample(route, 1200, { elevation: true });
      const stops = [
        [0.06, "Drinking Water"],
        [0.2, "Camp"],
        [0.38, "Drinking Water"],
        [0.55, "Camp"],
        [
          0.74,
          "Summit",
          "Puncak Batur",
          "Titik tinggi jalur Kintamani dengan pandangan ke Batur",
        ],
        [
          0.93,
          "Summit",
          "Rim Kintamani",
          "Rim kawah Kintamani, titik tinggi sebelum kota",
        ],
      ];
      const occurrences = new Map();
      const waypoints = stops.map(([fraction, sym, name, desc]) => {
        const occurrence = occurrences.get(sym) ?? 0;
        occurrences.set(sym, occurrence + 1);
        return stopAtFraction(
          route,
          fraction,
          this.places,
          sym,
          occurrence,
          { name, desc },
        );
      });
      const highPoint = Math.max(
        ...route.elevationSamples.map((sample) => sample.ele),
      );
      const description = `<h2>Sanur ke Kintamani</h2><p>Jalur ini menyusuri pantai Sanur lalu mendaki lewat Denpasar, Celuk, Mas, Pejeng, dan Tampaksiring menuju dataran tinggi Kintamani. Titik tertinggi rute sekitar ${highPoint} m; dua titik tinggi di jalur ini, Puncak Batur dan Rim Kintamani, ditandai sebagai Summit.</p><p>Catatan rute dan jadwal angkutan ada di https://example.com/routes/sanur-kintamani sebelum berangkat.</p>`;
      return {
        xml: documentXml({
          version: "1.1",
          creator: "Garmin Connect",
          body: `${waypoints
            .map((point) => wpt(point))
            .join("\n")}\n${trk(region, {
            name: "Sanur - Kintamani Climb",
            descCdata: description,
            segments: [track],
          })}`,
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks: null,
          groups: countBySymbols(stops.map(([, sym]) => sym)),
        },
      };
    },
  },
  {
    region: "bali",
    id: "sanur-candidasa-coast-route",
    route: "sanur-candidasa-coast-route",
    anchors: "Sanur → Candidasa",
    places: [
      "Sanur",
      "Kesiman Kertalangu",
      "Ketewel",
      "Saba",
      "Lebih",
      "Satra",
      "Gunaksa",
      "Antiga",
      "Manggis",
      "Candidasa",
    ],
    build(route) {
      const points = resample(route, 401);
      const { body, marks } = markBody(route, points, 100);
      return {
        xml: documentXml({
          version: "1.1",
          creator: "Komoot",
          body: routeXml({
            name: "Sanur - Candidasa Coast Route",
            desc: "Rute pantai dari Sanur ke Candidasa lewat Ketewel, Gianyar, Klungkung, dan Manggis.",
            body,
          }),
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks,
          groups: [],
        },
      };
    },
  },
  {
    region: "bali",
    id: "ubud-waypoints-1.1",
    route: "ubud-waypoints-1.1",
    anchors: "Ubud → Tampaksiring",
    noLine: true,
    places: [
      "Ubud",
      "Peliatan",
      "Nyuh Kuning",
      "Sayan",
      "Penestanan",
      "Kedewatan",
      "Mas",
      "Pejeng",
      "Pejeng Kaja",
      "Sanding",
      "Tampaksiring",
      "Manukaya",
      "Sukawati",
      "Batubulan",
    ],
    build(route, region, rng) {
      const symbols = shuffle(
        rng,
        expandSymbols([
          ["Drinking Water", 40],
          ["Camp", 30],
          ["Food", 20],
          ["Viewpoint", 15],
          ["Bakso", 10],
          ["Warteg", 5],
        ]),
      );
      const waypoints = waypointCorridor(route, symbols, this.places);
      return {
        xml: documentXml({
          version: "1.1",
          creator: "organicmaps",
          metadata: metadataXml({
            name: "Ubud Water and Camp Points",
            time: "2026-06-18T05:30:00Z",
          }),
          body: waypoints.map((point) => wpt(point)).join("\n"),
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks: null,
          groups: countBySymbols(symbols),
        },
      };
    },
  },
  {
    region: "bali",
    id: "bedugul-loop-track",
    route: "bedugul-loop-track",
    anchors: "Bedugul → Pancasari → Candikuning → Bedugul",
    places: [
      "Bedugul",
      "Candikuning",
      "Pancasari",
      "Baturiti",
      "Catur",
    ],
    build(route, region) {
      const points = resample(route, 600, { elevation: true });
      return {
        xml: documentXml({
          version: "1.1",
          creator: "StravaGPX",
          body: trk(region, {
            name: "Bedugul Lake Loop",
            segments: [points.slice(0, 300), points.slice(300)],
          }),
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks: null,
          groups: [],
        },
      };
    },
  },
  {
    region: "bali",
    id: "amed-dive-spots",
    route: "amed-dive-spots",
    anchors: "Amed → Tulamben",
    noLine: true,
    places: [
      "Amed",
      "Jemeluk",
      "Bunutan",
      "Lipa",
      "Selang",
      "Banyuning",
      "Purwa Kerthi",
      "Culik",
      "Laba Sari",
      "Datah",
      "Baturinggit",
      "Tulamben",
    ],
    build(route, region) {
      const symbols = roundRobin([
        ["Drinking Water", 20],
        ["Shelter", 20],
        ["Viewpoint", 20],
      ]);
      const waypoints = waypointCorridor(
        route,
        symbols,
        this.places,
        "legacy",
      );
      return {
        xml: documentXml({
          version: "1.0",
          creator: "ViewRanger",
          metadata: rootName("Amed Dive and Snorkel Points"),
          body: waypoints.map((point) => wpt(point)).join("\n"),
        }),
        stats: {
          lengthKm: route.metrics.total / 1000,
          marks: null,
          groups: countBySymbols(symbols),
        },
      };
    },
  },
];

for (const regionKey of Object.keys(REGIONS)) {
  rmSync(join(OUT_ROOT, regionKey), { recursive: true, force: true });
}
rmSync(join(OUT_ROOT, "README.md"), { force: true });
mkdirSync(ROUTE_ROOT, { recursive: true });

let fileCount = 0;
const readmeSections = [];
const preparedCache = new Map();

for (const [regionKey, region] of Object.entries(REGIONS)) {
  const regionDir = join(OUT_ROOT, regionKey);
  mkdirSync(regionDir, { recursive: true });
  const lines = [];
  for (const scenario of SCENARIOS.filter(
    (entry) => entry.region === regionKey,
  )) {
    const route =
      preparedCache.get(scenario.route) ??
      prepareRoute(scenario.route);
    preparedCache.set(scenario.route, route);
    const rng = mulberry32(hashSeed(`${regionKey}:${scenario.id}`));
    const { xml, stats } = scenario.build(route, region, rng);
    writeFileSync(join(regionDir, `${scenario.id}.gpx`), xml);
    fileCount += 1;
    const marks =
      stats.marks === null ? "none" : `${stats.marks}`;
    const track =
      stats.trackKm === undefined
        ? ""
        : ` (plus a ${stats.trackKm.toFixed(2)} km ${stats.trackLabel ?? "warm-up"} track)`;
    const noLine = scenario.noLine
      ? " No line by design: point-of-interest file."
      : "";
    lines.push(
      `- \`${regionKey}/${scenario.id}.gpx\` — Anchors: ${scenario.anchors}. Length: ${stats.lengthKm.toFixed(2)} km${track}. Marks: ${marks}. Groups: ${formatGroups(stats.groups)}.${noLine}`,
    );
  }
  readmeSections.push(`## ${region.label}\n\n${lines.join("\n")}`);
}

const readme = `# GPX viewer fixtures

Generated by \`scripts/generate-gpx-fixtures.mjs\`. The same seeds produce the same bytes. Route geometry is vendored in \`_routes/*.json\` from the OSRM cycling profile (OpenStreetMap data) and sampled by cumulative distance; no network access is needed to regenerate. Elevations come from OpenTopoData SRTM90m, sampled at 100 even points per route, and are interpolated along the line for track points.

${readmeSections.join("\n\n")}

Regenerate: \`node scripts/generate-gpx-fixtures.mjs\`
`;

writeFileSync(join(OUT_ROOT, "README.md"), readme);

console.log(
  `wrote ${fileCount} files across ${Object.keys(REGIONS).length} regions`,
);
