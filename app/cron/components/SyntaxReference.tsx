"use client";

import { KNOWN_SHORTCUTS } from "../utils";

interface SyntaxReferenceProps {
  /** Set the expression to a shortcut like "@reboot". */
  onShortcut: (value: string) => void;
}

interface Operator {
  symbol: string;
  name: string;
  /** A real expression using the operator, shown as a hover hint. */
  example: string;
}

const OPERATORS: Operator[] = [
  { symbol: "*", name: "any value", example: "* * * * *" },
  { symbol: ",", name: "value list", example: "0,15,30,45 * * * *" },
  { symbol: "-", name: "range of values", example: "0 9-17 * * *" },
  { symbol: "/", name: "step values", example: "*/5 * * * *" },
];

const SHORTCUT_MEANINGS: Record<(typeof KNOWN_SHORTCUTS)[number], string> = {
  "@reboot": "At system reboot",
  "@yearly": "Once a year",
  "@annually": "Once a year",
  "@monthly": "Once a month",
  "@weekly": "Once a week",
  "@daily": "Once a day",
  "@midnight": "Once a day",
  "@hourly": "Every hour",
};

const GROUP_LABEL =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * Compact cheat sheet rendered directly under the expression input so it is
 * visible without scrolling: the four value forms each field accepts (hover
 * a symbol for a real expression using it) and the "@" shortcuts as
 * click-to-apply pills.
 */
export default function SyntaxReference({ onShortcut }: SyntaxReferenceProps) {
  return (
    <div
      data-testid="cron-syntax"
      className="mt-3 rounded-lg border border-border bg-muted/70 px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className={GROUP_LABEL}>Field values</span>
        {OPERATORS.map((op) => (
          <span
            key={op.symbol}
            title={`${op.example} — ${op.name}`}
            className="inline-flex items-center gap-1.5"
          >
            <code className="flex h-5 w-5 items-center justify-center rounded border border-blue-200 bg-blue-50 font-mono text-[11px] font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
              {op.symbol}
            </code>
            <span className="text-xs text-muted-foreground">{op.name}</span>
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
        <span className={GROUP_LABEL}>@ shortcuts</span>
        {KNOWN_SHORTCUTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onShortcut(s)}
            title={SHORTCUT_MEANINGS[s]}
            data-testid="cron-shortcut"
            className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:border-ring/50 hover:text-ring/80"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
