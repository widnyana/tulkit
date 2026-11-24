import { type ReactNode, useState } from "react";
import { flushSync } from "react-dom";
import type { ParsedGpx } from "../types";
import { buildGpxStats } from "../utils";
import { GpxMap } from "./GpxMap";
import { MetadataPanel } from "./MetadataPanel";
import { RouteBrief } from "./RouteBrief";
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
  const [selected, setSelected] = useState<number | null>(null);
  const [selectionSource, setSelectionSource] = useState(parsed);
  if (selectionSource !== parsed) {
    setSelectionSource(parsed);
    setSelected(null);
  }

  const handleSelect = (index: number) => {
    if (selected === index) {
      flushSync(() => setSelected(null));
    }
    setSelected(index);
  };

  const hasPoints = parsed.waypoints.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div
          className={`min-w-0 ${hasPoints ? "lg:col-span-10" : "lg:col-span-12"}`}
        >
          <GpxMap parsed={parsed} focusIndex={selected} />
        </div>
        {hasPoints ? (
          <div className="min-w-0 lg:col-span-2">
            <WaypointList parsed={parsed} onSelect={handleSelect} />
          </div>
        ) : null}
      </div>
      <MetadataPanel parsed={parsed} />
      <RouteBrief parsed={parsed} />
      <StatTiles items={buildGpxStats(parsed)} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{note}</p>
        {actions}
      </div>
      {children}
    </div>
  );
}
