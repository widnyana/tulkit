"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CameraPanel } from "./components/CameraPanel";
import type { BikeFitResult, Side } from "./types";
import { TARGET_FLEXION_MAX, TARGET_FLEXION_MIN } from "./utils";

export default function BikeFitPage() {
  const [side, setSide] = useState<Side>("right");
  const [result, setResult] = useState<BikeFitResult | null>(null);

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
            Bike Fit Check
          </h1>
          <p className="mt-2 text-muted-foreground">
            Check your saddle height from a side-view clip of you pedaling
          </p>
          <p className="sr-only">
            Estimate bike saddle height from a webcam or an uploaded video. The
            tool tracks your hip, knee and ankle with an on-device pose model,
            measures knee angle at the bottom of the pedal stroke and tells you
            whether to raise or lower the saddle. Everything runs in your
            browser; your video is never sent to a server.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="rounded-lg border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Leg facing the camera</span>
              <Button
                variant={side === "left" ? "default" : "outline"}
                size="sm"
                aria-pressed={side === "left"}
                onClick={() => setSide("left")}
              >
                Left
              </Button>
              <Button
                variant={side === "right" ? "default" : "outline"}
                size="sm"
                aria-pressed={side === "right"}
                onClick={() => setSide("right")}
              >
                Right
              </Button>
            </div>
            <div className="mt-4">
              <CameraPanel side={side} onResult={setResult} />
            </div>
          </section>

          <div className="grid gap-6">
            <section className="rounded-lg border border-border/70 bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Setup tips</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  Put the camera side-on, about 2 to 3 m away, at the height of
                  the bottom bracket.
                </li>
                <li>Keep hip, knee and foot in frame the whole time.</li>
                <li>Wear fitted clothes and use even light.</li>
                <li>
                  Pedal at a steady pace for 10 seconds on a trainer or rollers.
                </li>
                <li>Pick the leg that faces the camera.</li>
              </ul>
            </section>

            <section className="rounded-lg border border-border/70 bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Result</h2>
              {result === null ? (
                <p className="text-sm text-muted-foreground">
                  Run a capture to see your knee angle.
                </p>
              ) : (
                <div className="mt-2">
                  <p className="text-4xl font-semibold tracking-tight">
                    {Math.round(result.flexionAtBdcDeg)}°
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Knee bend at the bottom of the stroke
                  </p>
                  <p className="mt-2 text-sm">
                    Target: {TARGET_FLEXION_MIN} to {TARGET_FLEXION_MAX}°
                  </p>
                  <p className="mt-2 text-sm">
                    {result.hint === "ok" &&
                      "Within the target range. Saddle height looks fine."}
                    {result.hint === "raise" &&
                      "Knee bends more than the target. Try raising the saddle in steps of 2 to 3 mm."}
                    {result.hint === "lower" &&
                      "Leg is nearly straight. Try lowering the saddle in steps of 2 to 3 mm."}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Based on {result.cycles} pedal strokes,{" "}
                    {Math.round(result.keptRatio * 100)}% of frames usable.
                  </p>
                  {(result.cycles < 3 || result.keptRatio < 0.6) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Low confidence: improve the setup and capture again.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          This is an estimate with an error of several degrees, not a
          professional bike fit. It runs in your browser and your video never
          leaves your device.
        </p>
      </div>
    </div>
  );
}
