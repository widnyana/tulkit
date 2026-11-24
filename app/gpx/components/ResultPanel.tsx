import { type ReactNode, useId, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  type ElevationProvider,
  estimateElevationGain,
} from "@/lib/gpx/elevationEstimate";
import { runToResult } from "../effects";
import type { ParsedGpx } from "../types";
import { buildGpxStats, elevationGain } from "../utils";
import { GpxMap } from "./GpxMap";
import { MetadataPanel } from "./MetadataPanel";
import { RouteBrief } from "./RouteBrief";
import { StatTiles } from "./StatTiles";
import { WaypointList } from "./WaypointList";

const ELEVATION_PROVIDER_KEY = "tulkit:gpx:elevation-provider";

const ELEVATION_PROVIDERS: ReadonlyArray<{
  value: ElevationProvider;
  label: string;
}> = [
  { value: "opentopography", label: "OpenTopography" },
  { value: "google", label: "Google" },
];

interface StoredElevationCredential {
  readonly provider: ElevationProvider;
  readonly credential: string;
}

function loadStoredCredential(): StoredElevationCredential | null {
  try {
    const raw = globalThis.localStorage?.getItem(ELEVATION_PROVIDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredElevationCredential>;
    if (
      (parsed.provider !== "opentopography" && parsed.provider !== "google") ||
      typeof parsed.credential !== "string"
    ) {
      return null;
    }
    return { provider: parsed.provider, credential: parsed.credential };
  } catch {
    return null;
  }
}

function saveStoredCredential(value: StoredElevationCredential): void {
  try {
    globalThis.localStorage?.setItem(
      ELEVATION_PROVIDER_KEY,
      JSON.stringify(value),
    );
  } catch {}
}

function ElevationEstimatePanel({ parsed }: { parsed: ParsedGpx }) {
  const credentialId = useId();
  const [source, setSource] = useState(parsed);
  const [provider, setProvider] = useState<ElevationProvider>(
    () => loadStoredCredential()?.provider ?? "opentopography",
  );
  const [credential, setCredential] = useState(
    () => loadStoredCredential()?.credential ?? "",
  );
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (source !== parsed) {
    setSource(parsed);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  const handleEstimate = async () => {
    setStatus("loading");
    setError(null);
    const outcome = await runToResult(
      estimateElevationGain(parsed, provider, credential),
    );
    setStatus("idle");
    if (outcome.ok) {
      saveStoredCredential({ provider, credential });
      setResult(outcome.value);
    } else {
      setError(outcome.message);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <p className="text-sm text-muted-foreground">
        This file has no elevation data. Estimate gain from terrain data using
        your own API key.
      </p>

      <div
        role="group"
        aria-label="Elevation provider"
        className="flex flex-wrap gap-2"
      >
        {ELEVATION_PROVIDERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={provider === option.value ? "default" : "outline"}
            aria-pressed={provider === option.value}
            onClick={() => setProvider(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={credentialId} className="sr-only">
          API key
        </label>
        <Input
          id={credentialId}
          type="password"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          placeholder="API key"
          className="max-w-xs font-mono text-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={credential.trim() === "" || status === "loading"}
          onClick={() => void handleEstimate()}
        >
          Estimate elevation gain
        </Button>
        {status === "loading" && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Estimating...
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {result !== null && (
        <div className="inline-block rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center">
          <div className="text-xs font-medium text-muted-foreground">
            Elevation gain (estimated from terrain)
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
            +{result} m
          </div>
        </div>
      )}
    </div>
  );
}

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
  const showElevationEstimate = elevationGain(parsed) === null;

  return (
    <div className="space-y-4">
      <MetadataPanel parsed={parsed} />
      <RouteBrief parsed={parsed} />
      <StatTiles items={buildGpxStats(parsed)} />
      {showElevationEstimate && <ElevationEstimatePanel parsed={parsed} />}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{note}</p>
        {actions}
      </div>
      {children}
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
    </div>
  );
}
