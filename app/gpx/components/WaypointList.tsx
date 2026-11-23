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

export function WaypointList({ parsed }: { parsed: ParsedGpx }) {
  const total = parsed.waypoints.length;
  if (total === 0) return null;

  const rows = keyedWaypoints(parsed);

  return (
    <details className="rounded-lg border border-border bg-card p-4 text-sm">
      <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        All points ({total})
      </summary>
      <ol className="mt-3 space-y-2">
        {rows.map(({ waypoint, key }, index) => (
          <li key={key}>
            <span className="font-medium">
              {waypoint.name ?? waypoint.sym ?? `Point ${index + 1}`}
            </span>
            {waypoint.name && waypoint.sym ? (
              <span className="ml-2 text-muted-foreground">{waypoint.sym}</span>
            ) : null}
            {waypoint.desc ? (
              <p className="mt-1 text-muted-foreground">{waypoint.desc}</p>
            ) : null}
          </li>
        ))}
      </ol>
      {total > POINT_LIST_LIMIT ? (
        <p className="mt-3 text-muted-foreground">
          First {POINT_LIST_LIMIT} of {total} points shown.
        </p>
      ) : null}
    </details>
  );
}
