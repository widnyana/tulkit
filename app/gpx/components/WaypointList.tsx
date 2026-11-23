import type { ParsedGpx } from "../types";

const POINT_LIST_LIMIT = 200;

function keyedWaypoints(parsed: ParsedGpx) {
  const seen = new Map<string, number>();
  return parsed.waypoints.slice(0, POINT_LIST_LIMIT).map((waypoint) => {
    const base = `${waypoint.lat}:${waypoint.lon}:${waypoint.name ?? ""}:${waypoint.sym ?? ""}:${waypoint.desc ?? ""}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return {
      waypoint,
      key: occurrence === 0 ? base : `${base}#${occurrence}`,
    };
  });
}

export function WaypointList({
  parsed,
  onSelect,
}: {
  parsed: ParsedGpx;
  onSelect: (index: number) => void;
}) {
  const total = parsed.waypoints.length;
  if (total === 0) return null;

  const rows = keyedWaypoints(parsed);

  return (
    <details className="rounded-lg border border-border bg-card p-3 text-sm lg:max-h-[500px] lg:overflow-y-auto lg:text-xs">
      <summary className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 cursor-pointer border-b border-border bg-card px-3 py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        All points ({total})
      </summary>
      <ol className="space-y-2">
        {rows.map(({ waypoint, key }, index) => (
          <li key={key}>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(index)}
              className="block w-full p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="break-words font-medium">
                {waypoint.name ?? waypoint.sym ?? `Point ${index + 1}`}
              </span>
              {waypoint.name && waypoint.sym ? (
                <span className="ml-2 text-muted-foreground">
                  {waypoint.sym}
                </span>
              ) : null}
              {waypoint.desc ? (
                <span className="mt-1 block break-words text-muted-foreground">
                  {waypoint.desc}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>
      {total > POINT_LIST_LIMIT ? (
        <p className="mt-2 text-muted-foreground">
          First {POINT_LIST_LIMIT} of {total} points shown.
        </p>
      ) : null}
    </details>
  );
}
