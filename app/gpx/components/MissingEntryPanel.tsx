import { Button } from "@/components/ui/button";

export function MissingEntryPanel({
  id,
  onDismiss,
}: {
  id: string;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-label="Saved GPX not found"
      className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm"
    >
      <h2 className="font-medium text-foreground">
        That saved GPX is not on this device
      </h2>
      <p className="mt-1 text-muted-foreground">
        Saved GPX entries live in the browser that created them, and an ID opens
        only there. To share a route, send the .gpx file and open it with the
        upload control above.
      </p>
      <p className="mt-2 font-mono text-xs break-all text-muted-foreground">
        ID {id}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="mt-3"
      >
        Dismiss
      </Button>
    </section>
  );
}
