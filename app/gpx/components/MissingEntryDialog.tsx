"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useId, useRef } from "react";
import { MissingEntryCopy } from "./MissingEntryPanel";

export function MissingEntryDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="gpx-sheet fixed inset-x-0 bottom-0 top-auto m-0 w-full max-h-[85dvh] rounded-t-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/30 sm:static sm:inset-auto sm:top-auto sm:m-auto sm:w-[min(100vw-2rem,32rem)] sm:max-h-none sm:rounded-xl"
    >
      <div
        aria-hidden="true"
        className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted sm:hidden"
      />
      <div className="p-5">
        <h2 id={titleId} className="text-base font-medium text-foreground">
          That saved GPX is not on this device
        </h2>
        <MissingEntryCopy id={id} />
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => ref.current?.close()}
            autoFocus
          >
            Got it
          </Button>
        </div>
      </div>
    </dialog>
  );
}
