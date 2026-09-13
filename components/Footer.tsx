import Link from "next/link";
import { GITHUB_URL, SITE_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {SITE_NAME}
            <span aria-hidden="true" className="text-signal">
              *
            </span>
            <span className="ml-2 font-normal text-muted-foreground">
              © 2025 – now
            </span>
          </p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            Solving your tiny, annoying problems so you can get back to the big
            ones.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 font-mono text-xs text-muted-foreground sm:items-end">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            source: github.com/widnyana/tulkit
          </a>
          <Link
            href="/llms.txt"
            className="transition-colors hover:text-foreground"
          >
            agents: /llms.txt
          </Link>
          <a
            href="https://github.com/sponsors/widnyana"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            tip jar: github.com/sponsors/widnyana
          </a>
        </div>
      </div>
    </footer>
  );
}
