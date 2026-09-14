"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { toolIcon } from "@/components/tools-ui";
import {
  addRecentTool,
  ALL_CATEGORIES,
  categoryNames,
  groupToolsByCategory,
  readRecentTools,
  scopeTools,
} from "@/lib/tool-search";
import type { Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface Indicator {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function ToolsDirectory({ tools }: { tools: Tool[] }) {
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [recents, setRecents] = useState<string[]>([]);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  const categories = useMemo(() => categoryNames(tools), [tools]);
  const scoped = useMemo(() => scopeTools(tools, category), [tools, category]);
  const groups = useMemo(() => groupToolsByCategory(scoped), [scoped]);
  const recentTools = useMemo(() => {
    const byHref = new Map(tools.map((tool) => [tool.href, tool]));
    return recents
      .map((href) => byHref.get(href))
      .filter((tool): tool is Tool => Boolean(tool));
  }, [recents, tools]);

  useEffect(() => {
    setRecents(readRecentTools(window.localStorage, tools.map((t) => t.href)));
  }, [tools]);

  const measure = useCallback(() => {
    const row = chipsRef.current;
    const chip = chipRefs.current.get(category);
    if (!row || !chip) {
      setIndicator(null);
      return;
    }
    const rowBox = row.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    setIndicator({
      left: chipBox.left - rowBox.left + row.scrollLeft,
      top: chipBox.top - rowBox.top + row.scrollTop,
      width: chipBox.width,
      height: chipBox.height,
    });
  }, [category]);

  useEffect(() => {
    measure();
    const row = chipsRef.current;
    window.addEventListener("resize", measure);
    row?.addEventListener("scroll", measure);
    // Web fonts land after first paint and change chip widths.
    void document.fonts?.ready.then(() => measure());
    return () => {
      window.removeEventListener("resize", measure);
      row?.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const statusText = `${scoped.length} ${
    scoped.length === 1 ? "tool" : "tools"
  }${category === ALL_CATEGORIES ? "" : ` in ${category}`}`;

  return (
    <div>
      <div className="relative -mx-5 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:px-0">
        <div ref={chipsRef} className="relative inline-flex min-w-full gap-1.5 pb-1">
          {indicator && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 rounded-full border border-foreground/60 bg-foreground/[0.08] transition-[transform,width,height] duration-300 ease-soft motion-reduce:transition-none"
              style={{
                transform: `translate(${indicator.left}px, ${indicator.top}px)`,
                width: indicator.width,
                height: indicator.height,
              }}
            />
          )}
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              ref={(node) => {
                if (node) chipRefs.current.set(name, node);
                else chipRefs.current.delete(name);
              }}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
              className={cn(
                "relative z-10 h-9 shrink-0 rounded-full px-3.5 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2",
                category === name
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <p
        role="status"
        className="mt-3 min-h-4 text-xs text-muted-foreground"
      >
        {category === ALL_CATEGORIES ? "" : statusText}
      </p>

      {category === ALL_CATEGORIES && recentTools.length > 0 && (
        <DirectoryGroup
          heading="Recently used"
          id="recently-used"
          tools={recentTools}
        />
      )}

      {groups.map((group) => (
        <DirectoryGroup
          key={group.category}
          heading={group.category}
          id={`category-${group.category.toLowerCase()}`}
          tools={group.tools}
        />
      ))}
    </div>
  );
}

function DirectoryGroup({
  heading,
  id,
  tools,
}: {
  heading: string;
  id: string;
  tools: Tool[];
}) {
  return (
    <section aria-labelledby={id} className="mt-6">
      <h3 id={id} className="text-xs font-medium text-muted-foreground">
        {heading}
      </h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tools.map((tool) => (
          <li key={`${id}-${tool.href}`}>
            <Link
              href={tool.href}
              aria-label={tool.title}
              onClick={() => addRecentTool(window.localStorage, tool.href)}
              className={cn(
                "group relative flex h-full flex-col gap-2.5 rounded-lg border border-border p-3",
                "transition-[background-color,transform] duration-150",
                "hover:bg-muted active:scale-[0.98] active:bg-accent",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground"
              >
                {toolIcon(tool.href)}
              </span>
              <span className="min-w-0">
                <span className="block pr-5 text-[15px] font-medium text-foreground">
                  {tool.title}
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {tool.description}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="absolute top-3 right-3 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 ease-soft group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
