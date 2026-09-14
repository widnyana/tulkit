/**
 * tree-ui: shared primitives for the schema tree.
 *
 * One source of truth for row anatomy (toggle, badges, copy-path, guides)
 * so every NodeRenderer view renders identically. Type badge hues are
 * categorical (data labels), always paired for dark mode; state is never
 * carried by hue alone — required/default/enum badges carry text.
 */

import { useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  string:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  number:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  integer:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  boolean:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  array:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  object:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
};

export function TypeBadge({ type }: { type: string | string[] }) {
  const types = Array.isArray(type) ? type : [type];
  const style =
    types.map((t) => TYPE_STYLES[t]).find(Boolean) ??
    "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "text-xs font-mono px-2 py-0.5 rounded border whitespace-nowrap",
        style,
      )}
    >
      {types.join(" | ")}
    </span>
  );
}

export function RequiredBadge() {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
      required
    </span>
  );
}

export function MetaBadge({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border whitespace-nowrap",
        mono && "font-mono",
      )}
    >
      {children}
    </span>
  );
}

export function DefaultBadge({ value }: { value: unknown }) {
  const text = JSON.stringify(value);
  return (
    <span
      title={text}
      className="text-xs font-mono px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 max-w-xs truncate"
    >
      default: {text.length > 50 ? `${text.slice(0, 50)}…` : text}
    </span>
  );
}

export function TreeToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse" : "Expand"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring/60 transition-colors duration-150"
    >
      <ChevronRight
        className={cn(
          "size-4 transition-transform duration-200 ease-soft",
          expanded && "rotate-90",
        )}
      />
    </button>
  );
}

export function LeafDot() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground/50">
      <span className="size-1 rounded-full bg-current" />
    </span>
  );
}

export function CopyPathButton({ path }: { path?: string }) {
  const [copied, setCopied] = useState(false);
  if (!path) return null;
  return (
    <button
      type="button"
      title={`Copy path: ${path}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring/60 transition-opacity duration-150 text-muted-foreground hover:text-foreground"
      aria-label="Copy path"
    >
      {copied ? (
        <Check className="size-3.5 text-green-600 dark:text-green-400" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

interface TreeRowProps {
  /** Row toggles expansion when clicked (mouse + Enter/Space). */
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}

export function TreeRow({
  expandable = false,
  onToggle,
  children,
}: TreeRowProps) {
  const interactive = expandable && !!onToggle;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onToggle : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
      className={cn(
        "group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors duration-150 hover:bg-muted",
        interactive &&
          "cursor-pointer focus-visible:outline-2 focus-visible:outline-ring/60 -outline-offset-2",
      )}
    >
      {children}
    </div>
  );
}

/** Guide-lined container for a node's expanded children. */
export function TreeChildren({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-border pl-2">
      {children}
    </div>
  );
}

/** Metadata block under a row (description, enum, constraints). */
export function TreeDetail({
  accent = false,
  children,
}: {
  /** Accent the left rule with the focus hue (descriptions); neutral otherwise. */
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "ml-12 mb-1 rounded-r border-l-2 bg-muted px-3 py-1.5",
        accent ? "border-ring/40" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

export function DescriptionBlock({ text }: { text: string }) {
  return (
    <TreeDetail accent>
      <p className="text-sm text-foreground">{text}</p>
    </TreeDetail>
  );
}

export function EnumValuesBlock({ values }: { values: unknown[] }) {
  const [showAll, setShowAll] = useState(false);
  const formatted = values.map((v) => JSON.stringify(v));
  const shown =
    formatted.length > 5 && !showAll
      ? `${formatted.slice(0, 5).join(", ")} …`
      : formatted.join(", ");
  return (
    <TreeDetail>
      <div className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Accepted values: </span>
        <code className="font-mono break-all">{shown}</code>
        {formatted.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="ml-2 text-ring hover:text-ring/80 font-semibold focus-visible:outline-2 focus-visible:outline-ring/60 rounded-sm"
          >
            {showAll ? "Show less" : `Show all ${values.length}`}
          </button>
        )}
      </div>
    </TreeDetail>
  );
}

export function ConstraintsBlock({
  constraints,
}: {
  constraints: { type: string; value: unknown }[];
}) {
  return (
    <TreeDetail>
      <div className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Constraints: </span>
        <span className="space-x-3 font-mono">
          {constraints.map((c) => (
            <span key={`${c.type}-${String(c.value)}`}>
              {c.type}: {String(c.value)}
            </span>
          ))}
        </span>
      </div>
    </TreeDetail>
  );
}
