"use client";

import { formatRelativeTime, formatTimestamp } from "../utils";

interface NextRunsProps {
  /** Plain-English description; empty when the expression is blank. */
  description: string;
  upcoming: Date[];
  /** null until mounted, so SSR markup stays deterministic. */
  now: Date | null;
  isShortcut: boolean;
}

/**
 * Live feedback: the plain-English description plus the next five run
 * times with relative labels. Rendered as a dedicated card nested inside
 * the expression card so the feedback reads as its own section.
 */
export default function NextRuns({
  description,
  upcoming,
  now,
  isShortcut,
}: NextRunsProps) {
  const showRuns = isShortcut || upcoming.length > 0 || description !== "";
  if (!showRuns) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/70 p-3 sm:p-4">
      <p
        data-testid="cron-description"
        className="text-2xl leading-snug text-foreground sm:text-3xl"
      >
        {description ? `${description}.` : ""}
      </p>

      {isShortcut ? (
        <p className="mt-2 text-sm text-muted-foreground">No fixed next run time.</p>
      ) : upcoming.length > 0 && now !== null ? (
        <div data-testid="cron-next-runs" className="mt-2 text-sm">
          {upcoming.map((d) => (
            <div key={d.toISOString()}>
              <span className="font-medium text-muted-foreground">
                {formatRelativeTime(d, now)}
              </span>
              <span aria-hidden className="mx-1.5 text-muted-foreground">
                —
              </span>
              <span className="font-mono text-muted-foreground">
                {formatTimestamp(d)}
              </span>
            </div>
          ))}
        </div>
      ) : description ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No upcoming runs found within the next 4 years
        </p>
      ) : null}
    </div>
  );
}
