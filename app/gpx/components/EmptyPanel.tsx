/** Dashed placeholder for a tab's idle state: names what to do, not just that nothing's there. */
export function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
