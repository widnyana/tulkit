import type { StatTile } from "../utils";

export function StatTiles({ items }: { items: StatTile[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border/70 bg-muted/40 p-3 text-center"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {item.label}
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
