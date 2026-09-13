"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Highlighted, toolIcon } from "@/components/tools-ui";
import {
  addRecentTool,
  filterTools,
  groupToolsByCategory,
  parseQuery,
  readRecentTools,
} from "@/lib/tool-search";
import type { Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolsPalette({ tools }: { tools: Tool[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [isMac, setIsMac] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const inputId = useId();

  const terms = useMemo(() => parseQuery(query), [query]);
  const matches = useMemo(() => filterTools(tools, query), [tools, query]);
  const groups = useMemo(() => groupToolsByCategory(matches), [matches]);
  const recentTools = useMemo(() => {
    const byHref = new Map(tools.map((tool) => [tool.href, tool]));
    return recents
      .map((href) => byHref.get(href))
      .filter((tool): tool is Tool => Boolean(tool));
  }, [recents, tools]);

  useEffect(() => {
    // Platform hint and recents are client-only; the server renders the Ctrl+K
    // label and no recents, so there is no hydration mismatch.
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
    setRecents(readRecentTools(window.localStorage, tools.map((t) => t.href)));
  }, [tools]);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const openPalette = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setQuery("");
    if (!dialog.open) dialog.showModal();
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      const combo =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (combo || (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  function resultLinks(): HTMLAnchorElement[] {
    return Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
    );
  }

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    const links = resultLinks();
    if (event.key === "Enter" && document.activeElement === inputRef.current) {
      if (links.length === 0) return;
      event.preventDefault();
      links[0].click();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (links.length === 0) return;
    event.preventDefault();
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === "ArrowDown"
        ? (links[current + 1] ?? links[0])
        : links[current <= 0 ? links.length - 1 : current - 1];
    next.focus();
    next.scrollIntoView({ block: "nearest" });
  }

  const statusText =
    matches.length === 0
      ? "No tools match"
      : `${matches.length} ${matches.length === 1 ? "tool" : "tools"}`;

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-haspopup="dialog"
        aria-label="Search tools"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search tools</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-sans text-[11px] leading-4 sm:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
          setQuery("");
        }}
        onCancel={(event) => {
          if (query) {
            event.preventDefault();
            setQuery("");
          }
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        onKeyDown={onDialogKeyDown}
        className="m-auto max-h-[min(32rem,85vh)] w-[min(100vw-1.5rem,38rem)] overflow-hidden rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/30"
      >
        <h2 id={titleId} className="sr-only">
          Search tools
        </h2>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label className="sr-only" htmlFor={inputId}>
            Search tools
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a tool…"
            autoComplete="off"
            className="h-12 flex-1 rounded-none border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <p role="status" className="sr-only">
          {open ? statusText : ""}
        </p>
        {open && (
        <div
          ref={listRef}
          className="max-h-[min(26rem,70vh)] overflow-y-auto p-2"
        >
          {matches.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No tools match “{query}”
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a shorter word, like “cron” or “ip”.
              </p>
            </div>
          ) : (
            <>
              {query === "" && recentTools.length > 0 && (
                <PaletteGroup
                  label="Recently used"
                  tools={recentTools}
                  terms={terms}
                  onSelect={close}
                />
              )}
              {groups.map((group) => (
                <PaletteGroup
                  key={group.category}
                  label={group.category}
                  tools={group.tools}
                  terms={terms}
                  onSelect={close}
                />
              ))}
            </>
          )}
        </div>
        )}
      </dialog>
    </>
  );
}

function PaletteGroup({
  label,
  tools,
  terms,
  onSelect,
}: {
  label: string;
  tools: Tool[];
  terms: string[];
  onSelect: () => void;
}) {
  return (
    <div>
      <p className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <ul>
        {tools.map((tool) => (
          <li key={`${label}-${tool.href}`}>
            <Link
              href={tool.href}
              aria-label={tool.title}
              onClick={() => {
                addRecentTool(window.localStorage, tool.href);
                onSelect();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                "hover:bg-accent focus:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2",
              )}
            >
              <span aria-hidden="true" className="shrink-0 text-muted-foreground">
                {toolIcon(tool.href)}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">
                <Highlighted text={tool.title} terms={terms} />
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {tool.category}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
