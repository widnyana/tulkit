"use client";

import type { CSSProperties } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalculatorResult } from "../types";
import { PSI_CEILING, PSI_FLOOR } from "../utils";
import { Panel } from "./Panel";

/** ETRTO hookless cap named in the disclaimer below; also drawn on the rail. */
const HOOKLESS_CAP_PSI = 72.5;
/** Rail span: the model's own output clamps. */
const RAIL_SPAN_PSI = PSI_CEILING - PSI_FLOOR; // 115 → cap sits at exactly 50%

interface ResultPanelProps {
  result: CalculatorResult;
  /** Display-only echo line, already formatted by the page. */
  echo: string;
  onShare: () => void;
}

function Readout({
  label,
  psi,
  bar,
}: {
  label: string;
  psi: number;
  bar: number;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-4 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {psi}
        </span>
        <span className="text-sm font-medium text-muted-foreground">psi</span>
      </div>
      <div className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
        {bar.toFixed(1)} bar
      </div>
    </div>
  );
}

function RailMarker({ at, label }: { at: number; label: string }) {
  return (
    <span
      className="pointer-events-none absolute inset-y-0 left-0 w-full transition-transform duration-200 ease-swift"
      style={{ transform: `translateX(${at}%)` }}
    >
      <span className="absolute top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-foreground" />
      <span className="absolute top-6 -translate-x-1/2 font-mono text-[10px] font-semibold tabular-nums text-foreground">
        {label}
      </span>
    </span>
  );
}

export function ResultPanel({ result, echo, onShare }: ResultPanelProps) {
  const pos = (psi: number) =>
    ((Math.min(PSI_CEILING, Math.max(PSI_FLOOR, psi)) - PSI_FLOOR) /
      RAIL_SPAN_PSI) *
    100;
  const capPos = ((HOOKLESS_CAP_PSI - PSI_FLOOR) / RAIL_SPAN_PSI) * 100; // 50

  const totalPsi = result.frontPsi + result.rearPsi;
  const frontPct = Math.round((result.frontPsi / totalPsi) * 100);
  const rearPct = 100 - frontPct; // exact complement → no gap/overlap

  return (
    <Panel
      className="tool-enter lg:sticky lg:top-8"
      style={{ "--i": 3 } as CSSProperties}
    >
      <h2 className="text-lg font-semibold text-foreground">
        Recommended Pressure
      </h2>
      <div className="my-4 h-px bg-border" />

      <div className="grid grid-cols-2 gap-3">
        <Readout label="Front" psi={result.frontPsi} bar={result.frontBar} />
        <Readout label="Rear" psi={result.rearPsi} bar={result.rearBar} />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Load balance</span>
          <span className="tabular-nums">
            {frontPct}% front · {rearPct}% rear
          </span>
        </div>
        <div
          aria-hidden
          className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="absolute inset-y-0 left-0 w-full origin-left bg-foreground/70 transition-transform duration-200 ease-swift"
            style={{ transform: `scaleX(${frontPct / 100})` }}
          />
          <div
            className="absolute inset-y-0 right-0 w-full origin-right bg-foreground/30 transition-transform duration-200 ease-swift"
            style={{ transform: `scaleX(${rearPct / 100})` }}
          />
        </div>
      </div>

      <div aria-hidden className="relative mt-5 h-9">
        <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-muted" />
        <div
          className="absolute top-3 h-1.5 rounded-r-full bg-destructive/20"
          style={{ left: `${capPos}%`, right: 0 }}
        />
        <div
          className="absolute top-1 h-5 w-px bg-destructive/60"
          style={{ left: `${capPos}%` }}
        />
        <span
          className="absolute top-6 -translate-x-1/2 font-mono text-[10px] tabular-nums text-muted-foreground"
          style={{ left: `${capPos}%` }}
        >
          72.5 cap
        </span>
        <span className="absolute top-6 left-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          15
        </span>
        <span className="absolute top-6 right-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          130 psi
        </span>
        <RailMarker at={pos(result.frontPsi)} label="F" />
        <RailMarker at={pos(result.rearPsi)} label="R" />
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">{echo}</p>

      <Button variant="secondary" className="mt-4 w-full" onClick={onShare}>
        <Link2 /> Copy share link
      </Button>

      <ul className="mt-4 space-y-2 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
        <li className="flex gap-2">
          <span
            aria-hidden
            className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
          />
          <span>
            Never exceed the maximum pressure printed on the tire sidewall.
          </span>
        </li>
        <li className="flex gap-2">
          <span
            aria-hidden
            className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
          />
          <span>
            Hookless (straight-side) carbon rims are capped at 72.5 psi / 5.0
            bar regardless of this result.
          </span>
        </li>
        <li className="flex gap-2">
          <span
            aria-hidden
            className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
          />
          <span>
            Starting point only — adjust by feel, and check pressure before
            every ride.
          </span>
        </li>
      </ul>
    </Panel>
  );
}
