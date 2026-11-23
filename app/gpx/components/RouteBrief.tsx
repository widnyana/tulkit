import type { ParsedGpx } from "../types";
import { flattenDesc, routeBrief, safeExternalHref } from "../utils";

const EXCERPT_LENGTH = 240;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

function excerptOf(text: string): string {
  if (text.length <= EXCERPT_LENGTH) return text;
  const window = text.slice(0, EXCERPT_LENGTH);
  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window;
  return `${cut}…`;
}

export function RouteBrief({ parsed }: { parsed: ParsedGpx }) {
  const raw = routeBrief(parsed);
  const text = raw ? flattenDesc(raw) : "";
  if (!text) return null;

  const href = raw ? safeExternalHref(raw.match(URL_PATTERN)?.[0]) : undefined;
  const truncated = text.length > EXCERPT_LENGTH;

  return (
    <section
      aria-label="Route description"
      className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
    >
      {truncated ? (
        <>
          <p className="whitespace-pre-line">{excerptOf(text)}</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Show full description
            </summary>
            <p className="mt-2 whitespace-pre-line">{text}</p>
          </details>
        </>
      ) : (
        <p className="whitespace-pre-line">{text}</p>
      )}
      {href ? (
        <p className="mt-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Source
          </a>
        </p>
      ) : null}
    </section>
  );
}
