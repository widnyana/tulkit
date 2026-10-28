"use client";

import { useEffect, useRef } from "react";

// Absolutely positioned <input> over the node or edge being renamed.
// Enter or blur commits, Escape cancels.
export function LabelEditor({
  value,
  x,
  y,
  width,
  onCommit,
  onCancel,
}: {
  value: string;
  x: number;
  y: number;
  width: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      aria-label="Label"
      defaultValue={value}
      className="absolute z-20 rounded-sm border border-indigo-400 bg-white px-1 text-xs text-indigo-950 dark:bg-zinc-900 dark:border-indigo-400 dark:text-indigo-100"
      style={{ left: x, top: y, width }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        } else if (e.key === "Enter") {
          e.preventDefault();
          onCommit(e.currentTarget.value);
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.value)}
    />
  );
}
