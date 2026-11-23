import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_ROOT = "e2e/fixtures/gpx";
const NS11 = 'xmlns="http://www.topografix.com/GPX/1/1"';
const NS10 = 'xmlns="http://www.topografix.com/GPX/1/0"';

const REGIONS = {
  "west-java": {
    label: "West Java",
    base: { lat: -6.87, lon: 107.6 },
    profile: {
      kind: "grid-and-climb",
      urbanFraction: 0.45,
      urbanElevation: 700,
      climbElevation: 1350,
    },
    places: {
      bandung: [
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
      ciwidey: [
        "Ciwidey",
        "Ranca Upas",
        "Kawah Putih",
        "Situ Patenggang",
        "Rancabali",
        "Cimanggu",
        "Panundaan",
        "Alam Endah",
        "Lebak Muncang",
        "Nengkelan",
      ],
      cikarang: [
        "Cikarang",
        "Jababeka",
        "Lippo Cikarang",
        "Cibatu",
        "Serang Baru",
        "Lemahabang",
        "Pasirsari",
        "Sukamahi",
        "Cikarang Utara",
        "Karang Asih",
      ],
      pangandaran: [
        "Pangandaran",
        "Cijulang",
        "Parigi",
        "Cigugur",
        "Kalipucang",
        "Sidomulyo",
        "Putrapinggan",
        "Babakan",
        "Cikembulan",
        "Karangpamulang",
      ],
    },
  },
  bali: {
    label: "Bali",
    base: { lat: -8.45, lon: 115.22 },
    profile: {
      kind: "coast-and-volcano",
      coastFraction: 0.4,
      coastBase: 30,
      climbBase: 30,
      peakElevation: 1500,
    },
    places: {
      kintamani: [
        "Kintamani",
        "Penelokan",
        "Batur",
        "Toyabungkah",
        "Songan",
        "Trunyan",
        "Pinggan",
        "Belandingan",
        "Abangsongan",
        "Suter",
      ],
      coast: [
        "Sanur",
        "Denpasar",
        "Ketewel",
        "Sukawati",
        "Batubulan",
        "Tampaksiring",
        "Tegallalang",
        "Payangan",
        "Bangli",
        "Kintamani",
      ],
      ubud: [
        "Ubud",
        "Tegallalang",
        "Tampaksiring",
        "Kedewatan",
        "Sayan",
        "Pengosekan",
        "Nyuh Kuning",
        "Mas",
        "Peliatan",
        "Lodtunduh",
      ],
      bedugul: [
        "Bedugul",
        "Candikuning",
        "Pancasari",
        "Wanagiri",
        "Gitgit",
        "Munduk",
        "Catur",
        "Baturiti",
        "Pacung",
        "Apuan",
      ],
      amed: [
        "Amed",
        "Jemeluk",
        "Lipah",
        "Banyuning",
        "Selang",
        "Purwakerti",
        "Tulamben",
        "Candidasa",
        "Bugbug",
        "Tenganan",
      ],
    },
  },
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

function jitter(rng, amount) {
  return (rng() * 2 - 1) * amount;
}

const NAME_PREFIXES = {
  Camp: ["Bumi Perkemahan", "Bumi Perkemahan"],
  "Drinking Water": ["Mata Air", "Sumur", "Pancuran Umum"],
  Food: ["Warung Nasi", "Kedai Kopi", "Saung Makan"],
  "Bike Repair": ["Bengkel Sepeda", "Toko Sepeda"],
  "Danger Area": ["Tikungan Tajam", "Turunan Curam"],
  Control: ["Pos Kontrol"],
  Summit: ["Puncak"],
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
  Summit: "Puncak dengan pandangan terbuka",
  Viewpoint: "Titik pandang tepi jalan",
  Parking: "Parkir kendaraan pendukung",
  Bakso: "Bakso dan mie ayam setempat",
  Warteg: "Warteg dengan nasi dan sayur",
  Shelter: "Pondok beratap untuk berteduh",
};

function placesFor(region, area) {
  return region.places[area] ?? Object.values(region.places)[0];
}

function localName(places, sym, index) {
  const prefixes = NAME_PREFIXES[sym] ?? [sym];
  const place = places[index % places.length];
  const prefix =
    prefixes[Math.floor(index / places.length) % prefixes.length];
  return `${prefix} ${place}`;
}

function localDesc(places, sym, index) {
  const place = places[index % places.length];
  return `${SYM_DESCRIPTIONS[sym] ?? sym} di ${place}`;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const EARTH_RADIUS_METERS = 6371008.8;
const METERS_PER_DEGREE = (EARTH_RADIUS_METERS * Math.PI) / 180;
const GRADE_TARGET = 0.085;
const SWITCHBACK_ANGLE = (75 * Math.PI) / 180;
const HALF_PI = Math.PI / 2;

function metersBetween(from, to) {
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLon = ((to.lon - from.lon) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function cumulativeKm(points) {
  const result = [0];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += metersBetween(points[index - 1], points[index]);
    result.push(total / 1000);
  }
  return result;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Step length is chosen per file: km-labelled scenarios pass an explicit step
// so the labels land where the scenario expects them, while tracks spread the
// climb over their point count at roughly the profile's target grade.
function naturalStep(region, count) {
  const segments = Math.max(1, count - 1);
  const { profile } = region;
  if (profile.kind === "grid-and-climb") {
    const climbSegments = Math.max(
      1,
      Math.round(segments * (1 - profile.urbanFraction)),
    );
    const rise = profile.climbElevation - profile.urbanElevation;
    return clamp(rise / (GRADE_TARGET * climbSegments), 2, 600);
  }
  const climbSegments = Math.max(
    1,
    Math.round(segments * (1 - profile.coastFraction)),
  );
  const rise = profile.peakElevation - profile.climbBase;
  return clamp(rise / (GRADE_TARGET * climbSegments), 2, 600);
}

function advance(state, heading, step) {
  state.lat += (Math.cos(heading) * step) / METERS_PER_DEGREE;
  state.lon +=
    (Math.sin(heading) * step) /
    (METERS_PER_DEGREE * Math.cos((state.lat * Math.PI) / 180));
}

function varyingSteps(rng, count, base) {
  const steps = [];
  for (let index = 0; index < count; index += 1) {
    steps.push(base * (0.7 + rng() * 0.6));
  }
  return steps;
}

// Each block still measures its exact metre budget, so a km-named mark lands
// on the real 10 km boundary while points inside the block stay irregular.
function blockSteps(rng, count, blockSize, blockMeters) {
  const steps = [];
  for (let start = 0; start < count; start += blockSize) {
    const size = Math.min(blockSize, count - start);
    const weights = [];
    let weight = 0;
    for (let index = 0; index < size; index += 1) {
      const value = 0.7 + rng() * 0.6;
      weights.push(value);
      weight += value;
    }
    const meters = (blockMeters * size) / blockSize;
    for (const value of weights) {
      steps.push((meters * value) / weight);
    }
  }
  return steps;
}

// Urban grid: headings snap to the four cardinal bearings and every block
// ends in a right-angle turn. The block length varies, so the grid does not
// repeat.
function gridPhase(rng, count, step, state, profile, steps) {
  const points = [];
  const headings = [0, HALF_PI, Math.PI, -HALF_PI];
  let headingIndex = Math.floor(rng() * headings.length);
  let remaining = Math.max(1, Math.round((45 + rng() * 55) / step));
  for (let index = 0; index < count; index += 1) {
    points.push({
      lat: state.lat,
      lon: state.lon,
      ele: Math.round(profile.urbanElevation + jitter(rng, 1.2)),
    });
    if (index === count - 1) break;
    advance(state, headings[headingIndex], steps ? steps[index] : step);
    remaining -= 1;
    if (remaining <= 0) {
      const turn = rng() < 0.5 ? 1 : -1;
      headingIndex = (headingIndex + turn + headings.length) % headings.length;
      remaining = Math.max(1, Math.round((45 + rng() * 55) / step));
    }
  }
  return points;
}

// Basin to ridge: a mean-reverting heading with occasional hard bends, rising
// steadily from the basin floor to the ridge.
function climbPhase(rng, count, step, state, profile, steps) {
  const points = [];
  const rise = profile.climbElevation - profile.urbanElevation;
  let heading = (rng() - 0.5) * 0.3;
  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 0 : index / (count - 1);
    points.push({
      lat: state.lat,
      lon: state.lon,
      ele: Math.round(
        profile.urbanElevation + rise * progress + jitter(rng, 1.5),
      ),
    });
    if (index === count - 1) break;
    heading += (rng() - 0.5) * 0.028;
    heading += normalizeAngle(0 - heading) * 0.08;
    if (rng() < 0.02) {
      heading += (rng() < 0.5 ? -1 : 1) * (0.25 + rng() * 0.3);
    }
    advance(state, heading, steps ? steps[index] : step);
  }
  return points;
}

// Coastal run: a low, irregular elevation and long sweeping headings with no
// right angles. No sine profile and no repeating geometry.
function coastPhase(rng, count, step, state, profile, steps) {
  const points = [];
  let heading = HALF_PI + (rng() - 0.5) * 0.4;
  let elevation = profile.coastBase;
  for (let index = 0; index < count; index += 1) {
    points.push({
      lat: state.lat,
      lon: state.lon,
      ele: Math.round(clamp(elevation + jitter(rng, 2), 5, 50)),
    });
    if (index === count - 1) break;
    elevation += (rng() - 0.5) * 1.6;
    elevation += (profile.coastBase - elevation) * 0.12;
    heading += (rng() - 0.5) * 0.02;
    if (rng() < 0.015) {
      heading += (rng() < 0.5 ? -1 : 1) * (0.2 + rng() * 0.3);
    }
    advance(state, heading, steps ? steps[index] : step);
  }
  return points;
}

// Volcano: one uninterrupted climb to the summit, broken by an irregular
// number of hairpins. Each switchback is a real heading reversal.
function volcanoPhase(rng, count, step, state, profile, options = {}, steps) {
  const points = [];
  const switchbackCount = options.switchbacks ?? 14;
  const positions = new Set();
  let cursor = Math.max(2, Math.round(count * 0.05));
  const averageGap = Math.max(
    3,
    Math.floor((count * 0.88) / Math.max(1, switchbackCount)),
  );
  while (positions.size < switchbackCount && cursor < count - 2) {
    positions.add(cursor);
    cursor += Math.max(3, Math.round(averageGap * (0.55 + rng() * 0.9)));
  }
  for (
    let index = 2;
    positions.size < switchbackCount && index < count - 2;
    index += 2
  ) {
    positions.add(index);
  }

  const rise = profile.peakElevation - profile.climbBase;
  let sign = -1;
  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 1 : index / (count - 1);
    points.push({
      lat: state.lat,
      lon: state.lon,
      ele: Math.round(
        profile.climbBase + rise * progress + jitter(rng, 1.5),
      ),
    });
    if (index === count - 1) break;
    if (positions.has(index)) sign *= -1;
    const heading = sign * SWITCHBACK_ANGLE + (rng() - 0.5) * 0.03;
    advance(state, heading, steps ? steps[index] : step);
  }
  return points;
}

// Each phase emits exactly `count` points and leaves the cursor on its last
// point. The caller drops the duplicate first point of the next phase, so the
// joined path has exactly one step per interval and no length is doubled.
function walkPoints(region, rng, count, options = {}) {
  if (count <= 0) return [];
  const step = options.step ?? naturalStep(region, count);
  const steps = options.steps ?? varyingSteps(rng, count - 1, step);
  const state = { ...region.base };
  const { profile } = region;

  if (profile.kind === "grid-and-climb") {
    const urbanFraction = options.urbanFraction ?? profile.urbanFraction;
    const urbanCount =
      count <= 1 ? 1 : clamp(Math.round(count * urbanFraction), 1, count - 1);
    const urban = gridPhase(
      rng,
      urbanCount,
      step,
      state,
      profile,
      steps.slice(0, urbanCount - 1),
    );
    const climbCount = count - urbanCount;
    if (climbCount <= 0) return urban;
    const climb = climbPhase(
      rng,
      climbCount + 1,
      step,
      state,
      profile,
      steps.slice(urbanCount - 1),
    ).slice(1);
    return [...urban, ...climb];
  }

  const coastFraction = options.coastFraction ?? profile.coastFraction;
  const coastCount =
    count <= 1 ? 1 : clamp(Math.round(count * coastFraction), 1, count - 1);
  const coast = coastPhase(
    rng,
    coastCount,
    step,
    state,
    profile,
    steps.slice(0, coastCount - 1),
  );
  const climbCount = count - coastCount;
  if (climbCount <= 0) return coast;
  const climb = volcanoPhase(
    rng,
    climbCount + 1,
    step,
    state,
    profile,
    options,
    steps.slice(coastCount - 1),
  ).slice(1);
  return [...coast, ...climb];
}

function trackPoints(region, rng, count, options = {}) {
  return walkPoints(region, rng, count, options);
}

function routePoints(region, rng, count, options = {}) {
  return walkPoints(region, rng, count, options);
}

function offsetLatLon(base, dx, dy) {
  return {
    lat: base.lat + dy / METERS_PER_DEGREE,
    lon:
      base.lon +
      dx / (METERS_PER_DEGREE * Math.cos((base.lat * Math.PI) / 180)),
  };
}

// A hand-laid volcano circuit: a short low coastal leg, zig-zag climbs, then a
// descending return to the exact starting point. Points are spread with
// random weights along the control polyline, so spacing stays irregular.
function closedVolcanoLoop(region, rng, count) {
  const controls = [
    [0, 0],
    [900, 120],
    [1800, -40],
    [2700, 260],
    [3600, 900],
    [2200, 1400],
    [3600, 1900],
    [2200, 2400],
    [3600, 2900],
    [2200, 3400],
    [3400, 3900],
    [2000, 4400],
    [1300, 3800],
    [2100, 3200],
    [1200, 2600],
    [1900, 2000],
    [1000, 1400],
    [1200, 600],
    [0, 0],
  ].map(([dx, dy]) => offsetLatLon(region.base, dx, dy));

  const segments = [];
  let total = 0;
  for (let index = 1; index < controls.length; index += 1) {
    const length = metersBetween(controls[index - 1], controls[index]);
    segments.push({ from: controls[index - 1], to: controls[index], length });
    total += length;
  }

  const targets = [0];
  let weight = 0;
  for (let index = 0; index < count - 2; index += 1) {
    weight += 0.5 + rng();
    targets.push(weight);
  }
  for (let index = 1; index < targets.length; index += 1) {
    targets[index] = (targets[index] / weight) * total;
  }
  targets.push(total);

  const points = [];
  let segmentIndex = 0;
  let segmentStart = 0;
  for (let index = 0; index < count; index += 1) {
    const target = targets[index];
    while (
      segmentIndex < segments.length - 1 &&
      target > segmentStart + segments[segmentIndex].length
    ) {
      segmentStart += segments[segmentIndex].length;
      segmentIndex += 1;
    }
    const segment = segments[segmentIndex];
    const t = clamp((target - segmentStart) / segment.length, 0, 1);
    const progress = count <= 1 ? 0 : index / (count - 1);
    let elevation;
    if (progress < 0.15) {
      elevation = region.profile.coastBase;
    } else if (progress < 0.72) {
      elevation =
        region.profile.coastBase +
        (region.profile.peakElevation - region.profile.coastBase) *
          ((progress - 0.15) / 0.57);
    } else {
      elevation =
        region.profile.peakElevation -
        (region.profile.peakElevation - region.profile.coastBase) *
          ((progress - 0.72) / 0.28);
    }
    points.push({
      lat: segment.from.lat + (segment.to.lat - segment.from.lat) * t,
      lon: segment.from.lon + (segment.to.lon - segment.from.lon) * t,
      ele: Math.round(elevation + jitter(rng, 4)),
    });
  }
  return points;
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
  const elevation =
    point.ele === undefined ? "" : `<ele>${point.ele}</ele>`;
  return `    <rtept lat="${coordinate(point.lat)}" lon="${coordinate(point.lon)}">${elevation}${extra}</rtept>`;
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

function pathPoint(points, fraction, rng) {
  const index = clamp(
    Math.round(fraction * (points.length - 1)),
    0,
    points.length - 1,
  );
  const point = points[index];
  return {
    lat: point.lat + jitter(rng, 0.00004),
    lon: point.lon + jitter(rng, 0.00004),
    ele: point.ele,
  };
}

function stop(rng, points, fraction, name, sym, desc) {
  return { ...pathPoint(points, fraction, rng), name, sym, desc };
}

function stopAtKm(rng, points, cumulative, km, name, sym, desc) {
  let best = 0;
  for (let index = 1; index < cumulative.length; index += 1) {
    if (
      Math.abs(cumulative[index] - km) < Math.abs(cumulative[best] - km)
    ) {
      best = index;
    }
  }
  const point = points[best];
  return {
    lat: point.lat + jitter(rng, 0.00004),
    lon: point.lon + jitter(rng, 0.00004),
    ele: point.ele,
    name,
    sym,
    desc,
  };
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

const SCENARIOS = [
  {
    region: "west-java",
    id: "bandung-lembang-brevet",
    note: "200 km brevet: 21 real-km marks, six waypoint groups, a long HTML brief with an excerpt and one Source link.",
    build(region, rng) {
      const places = placesFor(region, "bandung");
      const points = routePoints(region, rng, 1001, {
        step: 200,
        urbanFraction: 0.18,
        steps: blockSteps(rng, 1000, 50, 10000),
      });
      const cumulative = cumulativeKm(points);
      const body = points
        .map((point, index) =>
          index % 50 === 0
            ? rtept(
                point,
                `<name>${cumulative[index].toFixed(2)}km</name>`,
              )
            : rtept(point),
        )
        .join("\n");

      const stops = [
        [9, "Drinking Water"],
        [18, "Food"],
        [27, "Bike Repair"],
        [36, "Danger Area"],
        [45, "Camp"],
        [54, "Control"],
        [63, "Drinking Water"],
        [72, "Food"],
        [81, "Bike Repair"],
        [90, "Danger Area"],
        [99, "Camp"],
        [108, "Control"],
        [117, "Drinking Water"],
        [126, "Food"],
        [135, "Danger Area"],
        [144, "Control"],
        [153, "Control"],
      ];
      const waypoints = stops.map(([km, sym], index) => {
        const name = localName(places, sym, index);
        return stopAtKm(
          rng,
          points,
          cumulative,
          km,
          name,
          sym,
          localDesc(places, sym, index),
        );
      });

      const description = `<h2>Bandung–Lembang 200 km</h2><p>Brevet ini memutar cekungan Bandung lewat jalan kota, lalu mendaki terus ke Lembang dan Tangkuban Perahu. Kontrol tersebar di jalur utama dan tidak ada dukungan luar.</p><ul><li>Kontrol buka dan tutup sesuai jadwal brevet.</li><li>Bawa lampu karena start pukul 22.00.</li><li>Isi air di Cikole dan Ciater sebelum tanjakan panjang.</li></ul><p>Lembar rute lengkap ada di https://example.com/brevet/bandung-lembang dan wajib dibaca sebelum start.</p>`;

      const metadata = metadataXml({
        name: "Bandung–Lembang 200 km Brevet",
        desc: "Brevet keliling cekungan Bandung lalu mendaki ke Lembang.",
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

      return documentXml({
        version: "1.1",
        creator: "gps-touring",
        metadata,
        body: `${waypoints
          .map((point) => wpt(point))
          .join("\n")}\n${routeXml({
          name: "Bandung–Lembang 200 km Brevet",
          descCdata: description,
          body,
        })}`,
      });
    },
  },
  {
    region: "west-java",
    id: "bandung-utara-track",
    note: "Three-segment track with no creator or metadata; the title comes from the track name and bounds are computed.",
    build(region, rng) {
      const points = trackPoints(region, rng, 3000);
      const segments = [
        points.slice(0, 1500),
        points.slice(1500, 2400),
        points.slice(2400, 3000),
      ];
      return documentXml({
        version: "1.1",
        body: trk(region, {
          name: "Bandung Utara: Dago - Lembang - Tangkuban Perahu",
          desc: "Rute pagi dari Dago menembus grid kota Bandung lalu mendaki ke Lembang. Tiga segmen mengikuti jalan utama sampai Tangkuban Perahu.",
          segments,
        }),
      });
    },
  },
  {
    region: "west-java",
    id: "ciwidey-poi-1.0",
    note: "GPX 1.0, 250 unlined waypoints with legacy links; ten symbols fold to six rows plus Other.",
    build(region, rng) {
      const places = placesFor(region, "ciwidey");
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
      const corridor = routePoints(region, rng, 500, {
        step: 120,
        urbanFraction: 0.35,
      });
      const waypoints = symbols.map((sym, index) => {
        const name = localName(places, sym, index);
        return {
          ...pathPoint(corridor, (index + 1) / (symbols.length + 1), rng),
          name,
          sym,
          desc: localDesc(places, sym, index),
          legacyLink: {
            href: `https://example.com/ciwidey/${index + 1}`,
            text: name,
          },
        };
      });
      return documentXml({
        version: "1.0",
        creator: "MapSource 6.16.3",
        metadata: rootName("Ciwidey, Ranca Upas dan Kawah Putih"),
        body: waypoints.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    region: "west-java",
    id: "pangandaran-sportive",
    note: "100 km route with a longer silent track; the brief falls back to the route desc while the track leads.",
    build(region, rng) {
      const places = placesFor(region, "pangandaran");
      const route = routePoints(region, rng, 501, {
        step: 200,
        urbanFraction: 0.28,
        steps: blockSteps(rng, 500, 50, 10000),
      });
      const cumulative = cumulativeKm(route);
      const body = route
        .map((point, index) =>
          index % 50 === 0
            ? rtept(
                point,
                `<name>${cumulative[index].toFixed(2)}km</name>`,
              )
            : rtept(point),
        )
        .join("\n");

      const track = trackPoints(region, rng, 800, {
        urbanFraction: 0.3,
      });

      const stops = [
        [6, "Food"],
        [18, "Drinking Water"],
        [30, "Food"],
        [45, "Bike Repair"],
        [60, "Drinking Water"],
        [75, "Food"],
        [88, "Drinking Water"],
        [96, "Bike Repair"],
      ];
      const waypoints = stops.map(([km, sym], index) => {
        const name = localName(places, sym, index);
        return stopAtKm(
          rng,
          route,
          cumulative,
          km,
          name,
          sym,
          localDesc(places, sym, index),
        );
      });

      const metadata = metadataXml({
        name: "Pangandaran Sportive 100",
        bounds: boundsOf([...route, ...track, ...waypoints]),
      });

      return documentXml({
        version: "1.1",
        creator: "RideWithGPS",
        metadata,
        body: `${waypoints
          .map((point) => wpt(point))
          .join("\n")}\n${routeXml({
          name: "Pangandaran Sportive 100",
          desc: "Sportive 100 km dari Pantai Pangandaran ke perbukitan Cijulang dengan tiga pos makan, tiga titik air, dan dua bengkel. Rute ditutup untuk lalu lintas penuh.",
          body,
        })}\n${trk(region, {
          name: "Pangandaran Sportive warm-up lap",
          segments: [track],
        })}`,
      });
    },
  },
  {
    region: "west-java",
    id: "cikarang-commute-links",
    note: "Unlined commute POIs with GPX 1.1 links; metadata carries an author and email but no link or bounds.",
    build(region, rng) {
      const places = placesFor(region, "cikarang");
      const symbols = roundRobin([
        ["Drinking Water", 10],
        ["Camp", 10],
        ["Viewpoint", 10],
        ["Bakso", 10],
      ]);
      const corridor = routePoints(region, rng, 160, {
        step: 50,
        urbanFraction: 0.55,
      });
      const waypoints = symbols.map((sym, index) => {
        const name = localName(places, sym, index);
        return {
          ...pathPoint(corridor, (index + 1) / (symbols.length + 1), rng),
          name,
          sym,
          desc: localDesc(places, sym, index),
          link: {
            href: `https://example.com/commute/cikarang/${index + 1}`,
            text: name,
          },
        };
      });
      return documentXml({
        version: "1.1",
        creator: "ViewRanger",
        metadata: metadataXml({
          name: "Cikarang Commute Links",
          author: "Komunitas Gowes Cikarang",
          email: { id: "gowes", domain: "example.com" },
        }),
        body: waypoints.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    region: "bali",
    id: "kintamani-climb-track",
    note: "1200-point volcano climb from the coast to 1500 m with fourteen switchbacks and a CDATA HTML brief.",
    build(region, rng) {
      const places = placesFor(region, "kintamani");
      const track = trackPoints(region, rng, 1200, { switchbacks: 14 });
      const stops = [
        [0.06, "Drinking Water"],
        [0.2, "Camp"],
        [0.38, "Drinking Water"],
        [0.55, "Camp"],
        [0.74, "Summit"],
        [0.93, "Summit"],
      ];
      const waypoints = stops.map(([fraction, sym], index) => {
        const name = localName(places, sym, index);
        return stop(
          rng,
          track,
          fraction,
          name,
          sym,
          localDesc(places, sym, index),
        );
      });
      const description = `<h2>Kintamani ke Puncak Batur</h2><p>Jalur ini menyusuri pantai timur lalu mendaki lava Batur dengan empat belas tikungan tajam. Profilnya naik terus sampai sekitar 1500 m tanpa turunan panjang.</p><p>Catatan rute dan jadwal angkutan ada di https://example.com/routes/kintamani-batur sebelum berangkat.</p>`;
      return documentXml({
        version: "1.1",
        creator: "Garmin Connect",
        body: `${waypoints
          .map((point) => wpt(point))
          .join("\n")}\n${trk(region, {
          name: "Kintamani Batur Climb",
          descCdata: description,
          segments: [track],
        })}`,
      });
    },
  },
  {
    region: "bali",
    id: "bali-coast-route",
    note: "40 km coastal route with five 10 km marks, a short plain desc and no waypoints.",
    build(region, rng) {
      const route = routePoints(region, rng, 401, {
        step: 100,
        coastFraction: 0.4,
        steps: blockSteps(rng, 400, 100, 10000),
      });
      const cumulative = cumulativeKm(route);
      const body = route
        .map((point, index) =>
          index % 100 === 0
            ? rtept(
                point,
                `<name>${cumulative[index].toFixed(2)}km</name>`,
              )
            : rtept(point),
        )
        .join("\n");
      return documentXml({
        version: "1.1",
        creator: "Komoot",
        body: routeXml({
          name: "Sanur - Kintamani Coast Route",
          desc: "Rute pantai dari Sanur lalu tanjakan panjang ke Kintamani.",
          body,
        }),
      });
    },
  },
  {
    region: "bali",
    id: "ubud-waypoints-1.1",
    note: "120 unlined Ubud waypoints in six symbol groups; metadata has a name and time only.",
    build(region, rng) {
      const places = placesFor(region, "ubud");
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
      const corridor = routePoints(region, rng, 240, {
        step: 60,
        coastFraction: 0.5,
      });
      const waypoints = symbols.map((sym, index) => {
        const name = localName(places, sym, index);
        return {
          ...pathPoint(corridor, (index + 1) / (symbols.length + 1), rng),
          name,
          sym,
          desc: localDesc(places, sym, index),
        };
      });
      return documentXml({
        version: "1.1",
        creator: "organicmaps",
        metadata: metadataXml({
          name: "Ubud Water and Camp Points",
          time: "2026-06-18T05:30:00Z",
        }),
        body: waypoints.map((point) => wpt(point)).join("\n"),
      });
    },
  },
  {
    region: "bali",
    id: "bedugul-loop-track",
    note: "Two-segment track that closes within 5 m, with no desc and no waypoints; the legend shows the loop row.",
    build(region, rng) {
      const points = closedVolcanoLoop(region, rng, 600);
      return documentXml({
        version: "1.1",
        creator: "StravaGPX",
        body: trk(region, {
          name: "Bedugul Lake Loop",
          segments: [points.slice(0, 300), points.slice(300)],
        }),
      });
    },
  },
  {
    region: "bali",
    id: "amed-dive-spots",
    note: "GPX 1.0 dive spots with legacy links; Shelter stays an unknown symbol group.",
    build(region, rng) {
      const places = placesFor(region, "amed");
      const symbols = roundRobin([
        ["Drinking Water", 20],
        ["Shelter", 20],
        ["Viewpoint", 20],
      ]);
      const corridor = routePoints(region, rng, 180, {
        step: 70,
        coastFraction: 0.7,
      });
      const waypoints = symbols.map((sym, index) => {
        const name = localName(places, sym, index);
        return {
          ...pathPoint(corridor, (index + 1) / (symbols.length + 1), rng),
          name,
          sym,
          desc: localDesc(places, sym, index),
          legacyLink: {
            href: `https://example.com/amed/${index + 1}`,
            text: name,
          },
        };
      });
      return documentXml({
        version: "1.0",
        creator: "ViewRanger",
        metadata: rootName("Amed Dive and Snorkel Points"),
        body: waypoints.map((point) => wpt(point)).join("\n"),
      });
    },
  },
];

rmSync(OUT_ROOT, { recursive: true, force: true });

let fileCount = 0;
const readmeSections = [];

for (const [regionKey, region] of Object.entries(REGIONS)) {
  const regionDir = join(OUT_ROOT, regionKey);
  mkdirSync(regionDir, { recursive: true });
  const lines = [];
  for (const scenario of SCENARIOS.filter(
    (entry) => entry.region === regionKey,
  )) {
    const rng = mulberry32(hashSeed(`${regionKey}:${scenario.id}`));
    const xml = scenario.build(region, rng);
    writeFileSync(join(regionDir, `${scenario.id}.gpx`), xml);
    fileCount += 1;
    lines.push(
      `- \`${regionKey}/${scenario.id}.gpx\` — ${scenario.note}`,
    );
  }
  readmeSections.push(`## ${region.label}\n\n${lines.join("\n")}`);
}

const readme = `# GPX viewer fixtures

Generated by \`scripts/generate-gpx-fixtures.mjs\`. The same seeds produce the same bytes.

${readmeSections.join("\n\n")}

Regenerate: \`node scripts/generate-gpx-fixtures.mjs\`
`;

writeFileSync(join(OUT_ROOT, "README.md"), readme);

console.log(
  `wrote ${fileCount} files across ${Object.keys(REGIONS).length} regions`,
);
