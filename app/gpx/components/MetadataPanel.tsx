import type { GpxMetadata } from "../types";
import { safeExternalHref } from "../utils";

/** Renders the declared file metadata, omitting every absent field. */
export function MetadataPanel({ metadata }: { metadata?: GpxMetadata }) {
  if (!metadata) return null;

  const author =
    metadata.author && metadata.email
      ? `${metadata.author} (${metadata.email})`
      : (metadata.author ?? metadata.email);
  const keywords = metadata.keywords ?? [];
  const linkLabel = metadata.link?.text ?? metadata.link?.href;
  const linkHref = safeExternalHref(metadata.link?.href);
  const bounds = metadata.bounds
    ? `${metadata.bounds.minLat.toFixed(5)}, ${metadata.bounds.minLon.toFixed(5)} to ${metadata.bounds.maxLat.toFixed(5)}, ${metadata.bounds.maxLon.toFixed(5)}`
    : undefined;

  if (
    !metadata.name &&
    !metadata.desc &&
    !author &&
    !metadata.time &&
    keywords.length === 0 &&
    !linkLabel &&
    !bounds
  ) {
    return null;
  }

  return (
    <section
      aria-label="File metadata"
      className="rounded-lg border border-border bg-card p-4"
    >
      {metadata.name ? (
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {metadata.name}
        </h2>
      ) : null}
      {metadata.desc ? (
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {metadata.desc}
        </p>
      ) : null}
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {author ? (
          <div className="flex flex-wrap gap-1.5">
            <dt className="text-muted-foreground">Author</dt>
            <dd className="text-foreground">{author}</dd>
          </div>
        ) : null}
        {metadata.time ? (
          <div className="flex flex-wrap gap-1.5">
            <dt className="text-muted-foreground">Time</dt>
            <dd>
              <time
                dateTime={metadata.time}
                className="font-mono text-xs text-foreground"
              >
                {metadata.time}
              </time>
            </dd>
          </div>
        ) : null}
        {bounds ? (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            <dt className="text-muted-foreground">Bounds</dt>
            <dd className="font-mono text-xs text-foreground">{bounds}</dd>
          </div>
        ) : null}
        {linkLabel ? (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            <dt className="text-muted-foreground">Source</dt>
            <dd>
              {linkHref ? (
                <a
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-foreground underline underline-offset-2"
                >
                  {linkLabel}
                </a>
              ) : (
                <span className="break-all text-foreground">{linkLabel}</span>
              )}
            </dd>
          </div>
        ) : null}
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            <dt className="text-muted-foreground">Keywords</dt>
            <dd className="flex flex-wrap gap-1.5">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs text-foreground"
                >
                  {keyword}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
