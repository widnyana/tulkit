import type { ReactNode } from "react";
import type { ParsedGpx } from "../types";
import { GpxMap } from "./GpxMap";

export function ResultPanel({
  summary,
  actions,
  parsed,
  children,
}: {
  summary: ReactNode;
  actions?: ReactNode;
  parsed: ParsedGpx;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{summary}</p>
        {actions}
      </div>
      {children}
      <GpxMap parsed={parsed} />
    </div>
  );
}
