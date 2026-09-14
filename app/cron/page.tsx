"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { Mode } from "./types";
import { DEFAULT_FIELDS } from "./types";
import { useQueryState } from "./useQueryState";
import CadenceCards from "./components/CadenceCards";
import DeployPanel from "./components/DeployPanel";
import FieldGrid from "./components/FieldGrid";
import NextRuns from "./components/NextRuns";
import SyntaxReference from "./components/SyntaxReference";
import {
  describeExpression,
  FIELD_ORDER,
  generate,
  nextRuns,
  parseSchedule,
  splitTokens,
  validateField,
  validateFileName,
} from "./utils";

const DEFAULT_EXPRESSION = "* * * * *";

/**
 * Clipboard write with a legacy fallback; resolves false when both fail
 * (e.g. non-secure context without permissions) so callers can toast an
 * error instead of silently doing nothing.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CronPage() {
  return (
    <Suspense fallback={null}>
      <CronEditor />
    </Suspense>
  );
}

function CronEditor() {
  // URL-backed value + a local mirror so typing stays instant even though
  // router.replace lands asynchronously.
  const [paramValue, setParamValue] = useQueryState("e", DEFAULT_EXPRESSION);
  const [expr, setExprState] = useState(paramValue);
  /** Value we last pushed to the URL; ignored once reflected back. */
  const pendingPush = useRef<string | null>(null);

  // Adopt external URL changes (shared links, back/forward). Our own pushes
  // are cleared as soon as they're visible locally or in the URL.
  useEffect(() => {
    const pending = pendingPush.current;
    if (pending === null) {
      setExprState(paramValue);
      return;
    }
    if (paramValue === pending || expr === pending) {
      pendingPush.current = null;
    }
  }, [paramValue, expr]);

  const setExpr = useCallback(
    (next: string) => {
      pendingPush.current = next;
      setExprState(next);
      setParamValue(next);
    },
    [setParamValue],
  );

  const [now, setNow] = useState<Date | null>(null);
  const [mode, setMode] = useState<Mode>("crontab");
  const [command, setCommand] = useState("/usr/local/bin/backup.sh");
  const [user, setUser] = useState("root");
  const [fileName, setFileName] = useState("my-job");

  const exprId = useId();

  // Ticking clock so run times stay fresh; null until mounted to keep SSR
  // markup deterministic.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const parsed = useMemo(() => parseSchedule(expr), [expr]);
  const normalized = expr.trim().replace(/\s+/g, " ");

  /** The five field tokens as rendered by the grid (padded to 5). */
  const tokens = useMemo(() => splitTokens(expr), [expr]);

  /** Per-cell validation; silent while the expression is blank. */
  const fieldErrors = useMemo(() => {
    if (normalized === "") return Array<string | null>(5).fill(null);
    return FIELD_ORDER.map((name, i) => validateField(name, tokens[i] ?? ""));
  }, [normalized, tokens]);

  const description = useMemo(() => {
    if (parsed.error || (!parsed.fields && !parsed.shortcut)) return "";
    return describeExpression(parsed.shortcut ?? normalized);
  }, [parsed, normalized]);

  const upcoming = useMemo(() => {
    if (!now || parsed.error || !parsed.fields) return []; // @shortcuts are indeterminate
    return nextRuns(parsed.shortcut ?? normalized, 5, now);
  }, [parsed, now, normalized]);

  const fileNameError = mode === "cron-d" ? validateFileName(fileName) : null;

  /** Single schedule+command line, for the Copy line button. */
  const deployLine = useMemo(() => {
    if (parsed.error || (!parsed.fields && !parsed.shortcut)) return "";
    const schedule = parsed.shortcut ?? normalized;
    const cmd = command.trim() || "<command>";
    return mode === "cron-d"
      ? `${schedule} ${user.trim() || "root"} ${cmd}`
      : `${schedule} ${cmd}`;
  }, [parsed, normalized, command, user, mode]);

  /** Full commented output block via the tested generate() path. */
  const generated = useMemo(() => {
    if (parsed.error || (!parsed.fields && !parsed.shortcut)) return null;
    return generate(
      parsed.fields ?? DEFAULT_FIELDS,
      mode,
      command,
      user,
      fileName,
      parsed.shortcut,
    );
  }, [parsed, mode, command, user, fileName]);

  const copy = useCallback(async (text: string, what: string) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${what} copied`);
    else toast.error(`Couldn't copy ${what}`);
  }, []);

  /** Rewrite one field token inside the expression. */
  const handleTokenChange = useCallback(
    (index: number, value: string) => {
      const next = [...tokens];
      next[index] = value;
      setExpr(next.join(" "));
    },
    [tokens, setExpr],
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-xl font-bold text-foreground mb-1">
            Cron Expression Generator
          </h1>
          <p className="sr-only">
            Edit a cron expression and get an instant plain-English description
            plus the next run times. Includes a schedule builder, presets,
            validation, and ready-to-paste crontab or /etc/cron.d output with
            the required user column. Everything runs in your browser; nothing
            is sent to a server.
          </p>
          <p className="text-muted-foreground text-sm">
            The quick and simple editor for cron schedule expressions — runs in
            your browser; nothing is sent to a server.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="bg-card rounded-lg shadow-lg border border-border p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 gap-2">
              <label
                htmlFor={exprId}
                className="text-sm font-medium text-foreground"
              >
                Cron schedule
              </label>
              {!parsed.error && expr.trim() !== "" && (
                <button
                  type="button"
                  onClick={() =>
                    copy(parsed.shortcut ?? normalized, "Expression")
                  }
                  className="text-xs font-medium text-muted-foreground hover:text-ring/80 transition-colors"
                >
                  copy
                </button>
              )}
            </div>

            {/* The one input box — real, visible text. */}
            <input
              id={exprId}
              type="text"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder="* * * * *   (minute hour day month weekday)"
              aria-invalid={parsed.error ? true : undefined}
              data-testid="cron-expression"
              className={`w-full px-4 py-3 font-mono text-xl rounded-lg border outline-none focus:ring-2 focus:ring-ring focus:border-transparent ${
                parsed.error
                  ? "border-red-300 bg-red-50/30 dark:border-red-800 dark:bg-red-950/30"
                  : "border-input"
              }`}
            />

            {parsed.error && (
              <p
                role="alert"
                className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-950 dark:border-red-900 dark:text-red-400"
              >
                {parsed.error}
              </p>
            )}
            {/* Cheat sheet: operators + @ shortcuts, visible without scrolling. */}
            <SyntaxReference onShortcut={setExpr} />

            {/* Per-field editor, hidden for @ shortcuts (no fields to edit). */}
            {!parsed.shortcut && (
              <FieldGrid
                tokens={tokens}
                errors={fieldErrors}
                onTokenChange={handleTokenChange}
              />
            )}

            <CadenceCards
              active={parsed.error ? null : normalized}
              onSelect={setExpr}
            />

            <NextRuns
              description={description}
              upcoming={upcoming}
              now={now}
              isShortcut={parsed.shortcut !== null}
            />
          </section>

          <div className="lg:sticky lg:top-8">
            <DeployPanel
              mode={mode}
              setMode={setMode}
              command={command}
              setCommand={setCommand}
              user={user}
              setUser={setUser}
              fileName={fileName}
              setFileName={setFileName}
              output={generated?.output ?? ""}
              deployLine={deployLine}
              fileNameError={fileNameError}
              onCopy={copy}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
