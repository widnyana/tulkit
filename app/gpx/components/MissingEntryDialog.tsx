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
      className="m-auto w-[min(100vw-2rem,32rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/30"
    >
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
