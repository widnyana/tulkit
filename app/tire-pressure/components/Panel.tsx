import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/**
 * Single source of truth for the workbench panel surface (tool-card idiom).
 * Takes style so callers can pass entrance stagger (`--i`) for `.tool-enter`.
 */
export function Panel({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border/70 bg-card p-5 sm:p-6",
        className,
      )}
      style={style}
    >
      {children}
    </section>
  );
}
