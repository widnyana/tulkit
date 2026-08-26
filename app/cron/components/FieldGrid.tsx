"use client";

import { useId } from "react";
import { FIELD_LABELS, FIELD_ORDER, type FieldName } from "../utils";

/** Per-field accent colors, carried over from the original chip palette. */
const FIELD_ACCENTS: Record<FieldName, { chip: string; focus: string }> = {
  minute: {
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    focus: "focus:ring-blue-500 focus:border-blue-500",
  },
  hour: {
    chip: "bg-green-50 text-green-700 border-green-200",
    focus: "focus:ring-green-500 focus:border-green-500",
  },
  dom: {
    chip: "bg-purple-50 text-purple-700 border-purple-200",
    focus: "focus:ring-purple-500 focus:border-purple-500",
  },
  month: {
    chip: "bg-pink-50 text-pink-700 border-pink-200",
    focus: "focus:ring-pink-500 focus:border-pink-500",
  },
  dow: {
    chip: "bg-cyan-50 text-cyan-700 border-cyan-200",
    focus: "focus:ring-cyan-500 focus:border-cyan-500",
  },
};

interface FieldGridProps {
  /** The five field tokens, padded to length 5 by splitTokens. */
  tokens: string[];
  /** Per-cell validation messages; null when a cell is valid. */
  errors: (string | null)[];
  /** Replace one field token in the expression. */
  onTokenChange: (index: number, value: string) => void;
}

/**
 * Five labeled inputs, one per cron field. Cells mirror the expression's
 * tokens (expression is the single source of truth); editing a cell
 * rewrites that token and rebuilds the expression.
 */
export default function FieldGrid({
  tokens,
  errors,
  onTokenChange,
}: FieldGridProps) {
  const idPrefix = useId();

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Fields
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {FIELD_ORDER.map((name, i) => {
          const accent = FIELD_ACCENTS[name];
          const id = `${idPrefix}-${name}`;
          const error = errors[i] ?? null;
          return (
            <div key={name}>
              <label
                htmlFor={id}
                className={`mb-1 block w-fit rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${accent.chip}`}
              >
                {FIELD_LABELS[name]}
              </label>
              <input
                id={id}
                type="text"
                value={tokens[i] ?? ""}
                onChange={(e) =>
                  onTokenChange(i, e.target.value.replace(/\s/g, ""))
                }
                aria-label={FIELD_LABELS[name]}
                aria-invalid={error ? true : undefined}
                data-testid={`cron-field-${name}`}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                className={`w-full rounded-md border px-2 py-1.5 font-mono text-sm outline-none ${accent.focus} ${
                  error ? "border-red-400 bg-red-50/30" : "border-gray-300"
                }`}
              />
              {error && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
