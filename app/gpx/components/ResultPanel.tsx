import type { ReactNode } from "react";
import type { ParsedGpx } from "../types";
import { buildGpxStats } from "../utils";
import { GpxMap } from "./GpxMap";
import { MetadataPanel } from "./MetadataPanel";
import { StatTiles } from "./StatTiles";
import { WaypointList } from "./WaypointList";

export function ResultPanel({
  note,
  actions,
  parsed,
  children,
}: {
  /** Extra context not derivable from `parsed` itself, e.g. a failed-rows count. */
  note?: ReactNode;
  actions?: ReactNode;
  parsed: ParsedGpx;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <MetadataPanel parsed={parsed} />
      <StatTiles items={buildGpxStats(parsed)} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{note}</p>
        {actions}
      </div>
      {children}
      <GpxMap parsed={parsed} />
      <WaypointList parsed={parsed} />
    </div>
  );
}
