"use client";

import { useEffect } from "react";

interface MapGateProps {
  active: boolean;
  onChange: (active: boolean) => void;
}

export function MapGate({ active, onChange }: MapGateProps) {
  useEffect(() => {
    if (!active) return;
    const release = (event: KeyboardEvent) => {
      if (event.key === "Escape") onChange(false);
    };
    document.addEventListener("keydown", release);
    return () => document.removeEventListener("keydown", release);
  }, [active, onChange]);

  if (active) return null;

  return (
    <button
      type="button"
      onClick={() => onChange(true)}
      aria-label="Activate map interaction"
      className="absolute inset-0 z-10 flex items-end justify-center bg-foreground/5 p-3"
    >
      <span className="rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
        Click or tap to interact with the map
      </span>
    </button>
  );
}
