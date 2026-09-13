"use client";

import {
  Suspense,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  BIKE_DEFAULT_WEIGHT_KG,
  BIKE_RIDE_TYPES,
  BIKE_TIRE_WIDTHS,
  BIKE_WEIGHT_MAX_KG,
  BIKE_WEIGHT_MIN_KG,
  calculatePressure,
  DEFAULT_WEIGHT_KG,
  MTB_BASELINE_WEIGHT_KG,
  parseBikeWeight,
  parseWeight,
  resolveBikeType,
  resolveRideType,
  resolveTireWidth,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
} from "./utils";
import { useQueryState } from "./useQueryState";
import { OptionGroup, type OptionGroupOption } from "./components/OptionGroup";
import { Panel } from "./components/Panel";
import { ResultPanel } from "./components/ResultPanel";
import { Switch } from "./components/Switch";

const BIKE_TYPE_OPTIONS: OptionGroupOption[] = [
  { value: "road", label: "Road" },
  { value: "gravel", label: "Gravel" },
  { value: "mtb", label: "Mountain" },
];

export default function TirePressurePage() {
  return (
    <Suspense fallback={null}>
      <TirePressureContent />
    </Suspense>
  );
}

/** One settings row: label + control + optional helper text. */
function Field({
  id,
  label,
  helper,
  children,
}: {
  id: string;
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {helper ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </p>
  );
}

function TirePressureContent() {
  const [weightStr, setWeightStr] = useQueryState("weight");
  const [bikeWeightStr, setBikeWeightStr] = useQueryState("bikeWeight");
  const [bikeStr, setBikeStr] = useQueryState("bike", "road");
  const [widthStr, setWidthStr] = useQueryState("width");
  const [tubelessStr, setTubelessStr] = useQueryState("tubeless");
  const [rideStr, setRideStr] = useQueryState("ride");

  const weightId = useId();
  const bikeWeightId = useId();

  const bikeType = resolveBikeType(bikeStr);
  const width = resolveTireWidth(bikeType, widthStr);
  const rideType = resolveRideType(bikeType, rideStr);
  const tubeless = tubelessStr === "1";

  // Weight slider holds a local draft while dragging; the URL gets one write
  // per gesture, on commit (repo precedent: app/cron/page.tsx draft pattern).
  // Readouts/echo use the live draft so the panel updates during the drag.
  const [weightDraft, setWeightDraft] = useState<number | null>(null);
  const weightValue = weightDraft ?? parseWeight(weightStr);

  const result = calculatePressure({
    bikeType,
    tireWidth: width.value,
    tireWidthUnit: width.unit,
    weightKg: weightValue,
    bikeWeightKg: parseBikeWeight(bikeWeightStr),
    tubeless,
    rideType,
  });

  // Number inputs reject non-numeric strings; sanitize hand-edited URLs.
  const weightDisplay = Number.isFinite(Number(weightStr)) ? weightStr : "";
  const bikeWeightDisplay = Number.isFinite(Number(bikeWeightStr))
    ? bikeWeightStr
    : "";

  // Display-only echo of the model's system weight — mirrors the road/gravel
  // path of calculatePressure; the MTB heuristic is rider-weight-based.
  const riderKg = weightValue;
  const bikeWeightKg =
    parseBikeWeight(bikeWeightStr) ?? BIKE_DEFAULT_WEIGHT_KG[bikeType];
  const echo =
    bikeType === "mtb"
      ? `Rider-weight heuristic — ${MTB_BASELINE_WEIGHT_KG} kg baseline`
      : `System weight: ${riderKg} + ${bikeWeightKg} kg bike = ${riderKg + bikeWeightKg} kg`;

  const handleShare = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Share link copied"))
      .catch(() =>
        toast.error("Couldn't copy — copy the URL from the address bar"),
      );
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pb-28 pt-10 sm:px-6 sm:pt-14 lg:pb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors duration-200 ease-soft hover:text-foreground"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>

        <header className="hero-enter mb-8 mt-6 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tire Pressure Calculator
          </h1>
          <p className="mt-2 text-muted-foreground">
            Find the right front and rear pressure for your bike
          </p>
          <p className="sr-only">
            Calculate recommended bicycle tire pressure in PSI and bar from
            rider weight, bike type (road, gravel, or mountain bike), tire
            width, tubeless setup, and ride style. Based on Frank Berto&apos;s
            15% tire drop method with mountain bike and tubeless adjustments,
            including a heavier-rider rear bias. Get a starting point for
            comfort, grip, and rolling resistance on pavement, gravel, or
            trails. Everything runs in your browser; nothing is sent to a
            server.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-4">
            <Panel className="tool-enter" style={{ "--i": 0 } as CSSProperties}>
              <GroupTitle>Rider</GroupTitle>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id={weightId}
                  label="Body weight"
                  helper={`${WEIGHT_MIN_KG}–${WEIGHT_MAX_KG} kg`}
                >
                  <div className="relative">
                    <Input
                      id={weightId}
                      type="number"
                      min={WEIGHT_MIN_KG}
                      max={WEIGHT_MAX_KG}
                      value={
                        weightDraft !== null
                          ? String(weightDraft)
                          : weightDisplay
                      }
                      onChange={(e) => {
                        setWeightDraft(null);
                        setWeightStr(e.target.value);
                      }}
                      placeholder={String(DEFAULT_WEIGHT_KG)}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      kg
                    </span>
                  </div>
                  <Slider
                    className="mt-3"
                    min={WEIGHT_MIN_KG}
                    max={WEIGHT_MAX_KG}
                    step={1}
                    value={[weightValue]}
                    onValueChange={([next]) => setWeightDraft(next)}
                    onValueCommit={([next]) => {
                      setWeightStr(String(next));
                      setWeightDraft(null);
                    }}
                    aria-labelledby={weightId}
                  />
                </Field>
                <Field
                  id={bikeWeightId}
                  label="Bike weight"
                  helper={`${BIKE_WEIGHT_MIN_KG}–${BIKE_WEIGHT_MAX_KG} kg · road/gravel only · default ${BIKE_DEFAULT_WEIGHT_KG[bikeType]} kg`}
                >
                  <div className="relative">
                    <Input
                      id={bikeWeightId}
                      type="number"
                      min={BIKE_WEIGHT_MIN_KG}
                      max={BIKE_WEIGHT_MAX_KG}
                      value={bikeWeightDisplay}
                      onChange={(e) => setBikeWeightStr(e.target.value)}
                      placeholder={String(BIKE_DEFAULT_WEIGHT_KG[bikeType])}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      kg
                    </span>
                  </div>
                </Field>
              </div>
            </Panel>

            <Panel className="tool-enter" style={{ "--i": 1 } as CSSProperties}>
              <GroupTitle>Bike</GroupTitle>
              <div className="space-y-4">
                <OptionGroup
                  variant="segment"
                  name="bike-type"
                  legend="Bike type"
                  value={bikeType}
                  options={BIKE_TYPE_OPTIONS}
                  onChange={setBikeStr}
                  helper="Width and ride options follow the selected bike type."
                />
                <OptionGroup
                  variant="chip"
                  name="tire-width"
                  legend="Tire width"
                  value={String(width.value)}
                  options={BIKE_TIRE_WIDTHS[bikeType].map((o) => ({
                    value: String(o.value),
                    label: o.label,
                  }))}
                  onChange={setWidthStr}
                />
                <div>
                  <Switch
                    checked={tubeless}
                    onChange={(next) => setTubelessStr(next ? "1" : "")}
                    label="Tubeless"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Runs ~8% lower pressure — no pinch flats to worry about.
                  </p>
                </div>
              </div>
            </Panel>

            <Panel className="tool-enter" style={{ "--i": 2 } as CSSProperties}>
              <GroupTitle>Riding style</GroupTitle>
              <OptionGroup
                variant="chip"
                name="ride-type"
                legend="Ride type"
                value={rideType}
                options={BIKE_RIDE_TYPES[bikeType]}
                onChange={setRideStr}
              />
            </Panel>
          </div>

          <ResultPanel result={result} echo={echo} onShare={handleShare} />
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">Front</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {result.frontPsi}
            </span>
            <span className="text-xs text-muted-foreground">psi</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">Rear</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {result.rearPsi}
            </span>
            <span className="text-xs text-muted-foreground">psi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
