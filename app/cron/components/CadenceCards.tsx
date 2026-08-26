"use client";

import { PRESETS } from "../types";

interface CadenceCardsProps {
  /** Normalized expression; the matching card renders as active. */
  active: string | null;
  onSelect: (value: string) => void;
}

/**
 * One-click common schedules. Each card sets the whole expression; the
 * field grid below handles fine-tuning.
 */
export default function CadenceCards({ active, onSelect }: CadenceCardsProps) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Quick start
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => {
          const isActive = active === p.value;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onSelect(p.value)}
              aria-pressed={isActive}
              data-testid="cron-example"
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                isActive
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-300 bg-white hover:border-blue-400"
              }`}
            >
              <span
                className={`block text-sm font-medium ${
                  isActive ? "text-blue-700" : "text-gray-700"
                }`}
              >
                {p.label}
              </span>
              <span className="mt-0.5 block font-mono text-xs text-gray-400">
                {p.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
