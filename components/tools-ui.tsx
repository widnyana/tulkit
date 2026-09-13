import type { ReactNode } from "react";
import {
  Binary,
  Braces,
  Calculator,
  Clock,
  Dices,
  FileDiff,
  Gauge,
  Network,
  QrCode,
  ReceiptText,
} from "lucide-react";
import { splitHighlight } from "@/lib/tool-search";

const ICONS: Record<string, ReactNode> = {
  "/env-compare": <FileDiff className="size-[18px]" strokeWidth={1.75} />,
  "/ip-planner": <Network className="size-[18px]" strokeWidth={1.75} />,
  "/ipcalc": <Calculator className="size-[18px]" strokeWidth={1.75} />,
  "/random-string": <Dices className="size-[18px]" strokeWidth={1.75} />,
  "/invoice": <ReceiptText className="size-[18px]" strokeWidth={1.75} />,
  "/qr-gen": <QrCode className="size-[18px]" strokeWidth={1.75} />,
  "/json-schema": <Braces className="size-[18px]" strokeWidth={1.75} />,
  "/cron": <Clock className="size-[18px]" strokeWidth={1.75} />,
  "/base64": <Binary className="size-[18px]" strokeWidth={1.75} />,
  "/tire-pressure": <Gauge className="size-[18px]" strokeWidth={1.75} />,
};

export function toolIcon(href: string): ReactNode {
  return ICONS[href] ?? null;
}

/** Search-hit highlighting: tint plus a weight change, never colour alone. */
export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const segments = splitHighlight(text, terms);
  if (segments.length === 1 && !segments[0].match) return <>{text}</>;
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            key={`${index}-${segment.text}`}
            className="rounded-sm bg-highlight px-0.5 font-medium text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </>
  );
}
