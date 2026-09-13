import { SITE_URL } from "@/lib/site";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DOC = `# Tire Pressure Calculator (tulkit)

Canonical page: ${SITE_URL}/tire-pressure
Recommended front/rear bicycle tire pressure (PSI + bar) from rider weight,
bike type, tire width, tubeless setup, and ride style. Runs entirely in the
browser; there is no programmatic API. The model below is deterministic, so
an agent can apply it directly or build a shareable deep link.

## Model

Road & gravel — Berto 15%-drop curve (Bicycle Quarterly), valid for tire
widths >= 23 mm (reads high below that):

    P = 600*L / W^2 + 0.75*W - 25

P in psi, W = tire width in mm, L = single-wheel load in lb. System weight =
rider + bike weight (defaults road 8 kg, gravel 10 kg; the optional bikeWeight
param overrides, clamped 4-25 kg); split 45% front / 55% rear; kg to lb:
x 2.20462.

Ride-type multiplier on P: racing x1.25 (12% drop), endurance or gravel
mixed x1.0 (15% drop), rough x0.75 (20% drop).

MTB — separate weight heuristic (the Berto curve is road-only by its own
author's caveat). Baseline at 74.8 kg rider, 2.4" tire, tubeless:

    xc: 22 front / 24 rear, trail: 20/23, enduro: 18/22

    +/- 1 psi per 7 kg deviation from 74.8 kg (both wheels)
    +1 psi rear only when rider > 83.8 kg
    -/+ 1.5 psi per 0.2" step from the 2.4" baseline

The MTB heuristic is rider-weight-based; the bikeWeight param does not
affect it.

Tubeless: multiply the final pressure by 0.92 (8%, conservative low end of
the vendor 8-15% reduction range).

Output: clamp to 15-130 psi, round to whole psi; bar = psi x 0.0689476
(1 decimal).

## Web UI query params

All params are optional; the full state is shareable via URL.

| Param    | Values                                                                       | Default      |
| -------- | ---------------------------------------------------------------------------- | ------------ |
| weight   | rider weight in kg (clamped 30-160)                                          | 75           |
| bike     | road, gravel, mtb                                                            | road         |
| bikeWeight | bike weight in kg, optional, clamped 4-25; applies to road/gravel only | per-bike default: road 8, gravel 10, mtb 13 |
| width    | road: 23, 24, 25, 26, 28, 30, 32, 35 mm; gravel: 35, 38, 40, 45, 47, 50, 54, 60 mm; mtb: 1.9, 2.0, 2.1, 2.25, 2.3, 2.4, 2.5, 2.6, 2.8, 3.0 in | bike's first |
| tubeless | 1 when tubeless                                                              | tubed        |
| ride     | road: racing, endurance, rough; gravel: racing, mixed, rough; mtb: xc, trail, enduro | bike's first |

Invalid width/ride values fall back to the bike type's first option; the
bike type decides which lists apply.

Widths beyond the Berto curve's verified range (~46 mm) — gravel 50, 54, and
60 mm — are extrapolations; treat those results as rough and defer to the
tire sidewall. Road options below 23 mm are intentionally absent: the curve
is unreliable there and would under-inflate.

## Worked examples

- 75 kg, road, 28 mm, tubed, endurance -> front 59 psi (4.1 bar), rear 73 psi (5.0 bar)
- 74.8 kg, mtb, 2.4 in, tubed, xc -> front 22 psi (1.5 bar), rear 24 psi (1.7 bar)
- 75 kg, gravel, 40 mm, tubed, mixed -> front 37 psi (2.6 bar), rear 44 psi (3.0 bar)

## Safety clamps

Generic floor 15 psi and ceiling 130 psi. These do NOT replace the maximum
pressure printed on the tire sidewall, and hookless (straight-side) carbon
rims are ETRTO-capped at 72.5 psi / 5.0 bar regardless of the computed value.

## References

- Frank Berto's 15%-drop chart: published in Bicycle Quarterly (ed. Jan
  Heine). The PSI curve fit used here (P = 600*L/W^2 + 0.75*W - 25) is the
  community chart fit from the BikeForums Bicycle Mechanics thread 915821:
  https://www.bikeforums.net/bicycle-mechanics/915821-15-drop-formula-tire-pressure-function-width-load.html
- Jan Heine, "The Tire Pressure Revolution" — Bicycle Quarterly
  rolling-resistance testing, republished:
  https://www.roadbikerider.com/the-tire-pressure-revolution-by-jan-heine-d1/
  (ride-type pressure guidance summary:
  https://road.cc/content/feature/how-choose-your-tyre-pressure-180830)
- MTB baseline heuristics: converged rule-of-thumb from current MTB pressure
  guides — All Mountain Style (allmountainstyle.com), Two Wheel Tales
  (twowheeltales.com), The Good Pressure (thegoodpressure.com), and
  bike-size.com. Blog consensus, not peer-reviewed; lowest-confidence tier.
- Tubeless reduction (8%): SRAM/Zipp tire pressure guidance and SILCA
  rolling-resistance testing; 8% is the conservative low end of the vendor
  8-15% range.
- Hookless rim cap: ETRTO hookless (straight-side) rim standard, 72.5 psi /
  5.0 bar maximum.
`;

export async function GET(_request: NextRequest) {
  return new NextResponse(DOC, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
