import type { CronFields, GeneratedCron, Mode } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOW_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Allowed numeric ranges per field. dow allows 0-7 (7 is normalized to 0). */
export const FIELD_LIMITS = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dom: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dow: { min: 0, max: 7 },
} as const;

export type FieldName = keyof typeof FIELD_LIMITS;

/** The eight standard "@" shortcuts recognized by Vixie cron. */
export const KNOWN_SHORTCUTS = [
  "@reboot",
  "@yearly",
  "@annually",
  "@monthly",
  "@weekly",
  "@daily",
  "@midnight",
  "@hourly",
] as const;

/** The five standard cron time fields in expression order. */
export const FIELD_ORDER: FieldName[] = [
  "minute",
  "hour",
  "dom",
  "month",
  "dow",
];

/** Display labels for the five fields. */
export const FIELD_LABELS: Record<FieldName, string> = {
  minute: "minute",
  hour: "hour",
  dom: "day of month",
  month: "month",
  dow: "day of week",
};

export interface ParsedSchedule {
  /** "@" shortcut like @reboot, when the expression is one. */
  shortcut: string | null;
  fields: CronFields | null;
  error: string | null;
}

/** Parse a raw expression into a shortcut, five fields, or an error message. */
export function parseSchedule(raw: string): ParsedSchedule {
  const trimmed = raw.trim().replace(/\s+/g, " ");

  if (!trimmed) return { shortcut: null, fields: null, error: null };

  if (trimmed.startsWith("@")) {
    if ((KNOWN_SHORTCUTS as readonly string[]).includes(trimmed)) {
      return { shortcut: trimmed, fields: null, error: null };
    }
    return {
      shortcut: null,
      fields: null,
      error: `Unknown cron shortcut "${trimmed}" (@reboot, @daily, @hourly…)`,
    };
  }

  const parts = trimmed.split(" ");
  if (parts.length !== 5) {
    return {
      shortcut: null,
      fields: null,
      error:
        "A cron schedule needs exactly five fields: minute hour day-of-month month day-of-week",
    };
  }

  const [minute, hour, dom, month, dow] = parts;
  const fields = { minute, hour, dom, month, dow };
  for (const name of FIELD_ORDER) {
    const err = validateField(name, fields[name]);
    if (err) return { shortcut: null, fields: null, error: err };
  }
  return { shortcut: null, fields, error: null };
}

/**
 * Split an expression into its five field tokens. Missing tokens are padded
 * with "" and extra tokens are dropped, so the field grid always renders
 * exactly five cells regardless of parse state.
 */
export function splitTokens(expr: string): string[] {
  const tokens = expr.split(/\s+/).filter(Boolean);
  const padded = [...tokens];
  while (padded.length < 5) padded.push("");
  return padded.slice(0, 5);
}

interface FieldLimits {
  min: number;
  max: number;
}

function monthName(n: number): string {
  return MONTH_NAMES[n - 1] ?? String(n);
}

function dowName(n: number): string {
  return DOW_NAMES[n % 7] ?? String(n);
}

/**
 * Parse a single cron atom ("*", step syntax like "star-slash-5", "3-7/2",
 * "10") into the numbers it matches. Names (jan, mon...) are accepted for
 * month/dow. Returns null on invalid input.
 */
function expandAtom(
  atom: string,
  limits: FieldLimits,
  named?: (n: number) => string,
): number[] | null {
  const raw = atom.trim().toLowerCase();
  let step = 1;

  let rest = raw;
  const slashIdx = rest.indexOf("/");
  if (slashIdx !== -1) {
    step = Number(rest.slice(slashIdx + 1));
    if (!Number.isInteger(step) || step < 1) return null;
    rest = rest.slice(0, slashIdx);
  }

  let lo: number;
  let hi: number;

  if (rest === "*" || rest === "?") {
    lo = limits.min;
    hi = limits.max;
  } else {
    const dashIdx = rest.indexOf("-");
    if (dashIdx !== -1) {
      const a = resolveNameOrNumber(rest.slice(0, dashIdx), limits, named);
      const b = resolveNameOrNumber(rest.slice(dashIdx + 1), limits, named);
      if (a === null || b === null || a > b) return null;
      lo = a;
      hi = b;
    } else {
      if (slashIdx !== -1) return null; // "5/10" without a range is not standard
      const v = resolveNameOrNumber(rest, limits, named);
      if (v === null) return null;
      lo = v;
      hi = v;
    }
  }

  return range(lo, hi, step);
}

function resolveNameOrNumber(
  token: string,
  limits: FieldLimits,
  named?: (n: number) => string,
): number | null {
  if (/^\d+$/.test(token)) {
    const n = Number(token);
    return n >= limits.min && n <= limits.max ? n : null;
  }
  if (named && /^[a-z]{3}$/.test(token)) {
    for (let i = limits.min; i <= limits.max; i++) {
      if (named(i) === token) return i;
    }
  }
  return null;
}

function range(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i += step) out.push(i);
  return out;
}

/**
 * Expand a full field value (comma-separated atoms) into a Set of matching
 * numbers. Returns null when the value is invalid.
 */
export function expandField(
  value: string,
  limits: FieldLimits,
  named?: (n: number) => string,
): Set<number> | null {
  const atoms = value
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  if (atoms.length === 0) return null;
  const matched = new Set<number>();
  for (const atom of atoms) {
    const expanded = expandAtom(atom, limits, named);
    if (!expanded) return null;
    for (const n of expanded) {
      // dow: normalize 7 to Sunday (0)
      matched.add(limits.min === 0 && limits.max === 7 && n === 7 ? 0 : n);
    }
  }
  return matched;
}

/** Validate one field; returns an error message or null when valid. */
export function validateField(name: FieldName, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${name} is required`;
  const named =
    name === "month"
      ? (n: number) => monthName(n).toLowerCase().slice(0, 3)
      : name === "dow"
        ? (n: number) => dowName(n).toLowerCase().slice(0, 3)
        : undefined;
  if (!expandField(trimmed, FIELD_LIMITS[name], named)) {
    const { min, max } = FIELD_LIMITS[name];
    return `Invalid ${name} value "${trimmed}" (allowed ${min}-${max}, *, ranges, steps)`;
  }
  return null;
}

export interface BuiltExpression {
  expression: string;
  errors: string[];
}

/**
 * Validate all five fields and join them into an expression string.
 * Fields are trimmed; whitespace between fields collapses to single spaces.
 */
export function buildExpression(fields: CronFields): BuiltExpression {
  const order: FieldName[] = ["minute", "hour", "dom", "month", "dow"];
  const errors: string[] = [];
  for (const name of order) {
    const err = validateField(name, fields[name]);
    if (err) errors.push(err);
  }
  return {
    expression: order.map((n) => fields[n].trim()).join(" "),
    errors,
  };
}

/** True when the field restricts time beyond "*". */
function isRestricted(value: string): boolean {
  return value.trim() !== "*";
}

/** Human-readable rendering of one field for descriptions. */
function describeField(name: FieldName, value: string): string {
  switch (name) {
    case "month":
      return `in ${value
        .split(",")
        .map((v) => monthName(Number(v)))
        .join(", ")}`;
    case "dow":
      return `on ${value
        .split(",")
        .map((v) => dowName(Number(v)))
        .join(", ")}`;
    case "dom":
      return `on day-of-month ${value}`;
    default:
      return `${name}=${value}`;
  }
}

/** Plain-English description of a cron expression (best effort for common shapes). */
export function describeExpression(expression: string): string {
  if (expression.startsWith("@")) {
    switch (expression) {
      case "@reboot":
        return "At system reboot — runs once each time cron starts";
      case "@yearly":
      case "@annually":
        return 'Once a year (January 1st, 00:00) — equivalent to "0 0 1 1 *"';
      case "@monthly":
        return 'Once a month (1st, 00:00) — equivalent to "0 0 1 * *"';
      case "@weekly":
        return 'Once a week (Sunday, 00:00) — equivalent to "0 0 * * 0"';
      case "@daily":
      case "@midnight":
        return 'Once a day (00:00) — equivalent to "0 0 * * *"';
      case "@hourly":
        return 'Once an hour (at minute 0) — equivalent to "0 * * * *"';
      default:
        return `Cron shortcut ${expression}`;
    }
  }

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return "";

  const [minute, hour, dom, month, dow] = parts;
  const clauses: string[] = [];

  if (minute.startsWith("*/")) {
    const step = Number(minute.slice(2));
    if (hour === "*") {
      clauses.push(step === 1 ? "Every minute" : `Every ${step} minutes`);
    }
  }

  if (clauses.length === 0) {
    if (minute !== "*" && hour === "*") {
      clauses.push(`At minute ${minute} past every hour`);
    } else if (minute !== "*" && hour !== "*") {
      clauses.push(`At ${formatTimeList(hour, minute)}`);
    } else if (minute === "*" && hour !== "*") {
      clauses.push(`Every minute during hour(s) ${hour}`);
    } else {
      clauses.push("Every minute");
    }
  }

  if (isRestricted(month)) clauses.push(describeField("month", month));
  if (isRestricted(dom) && isRestricted(dow)) {
    clauses.push(
      `${describeField("dom", dom)} OR ${describeField("dow", dow)}`,
    );
  } else {
    if (isRestricted(dom)) clauses.push(describeField("dom", dom));
    if (isRestricted(dow)) clauses.push(describeField("dow", dow));
  }
  if (isRestricted(dom) && isRestricted(dow)) {
    clauses.push("(cron runs when either day field matches)");
  }

  return clauses.join(", ");
}

function formatTimeList(hour: string, minute: string): string {
  return hour
    .split(",")
    .map((h) => {
      const pad = (s: string) => s.padStart(2, "0");
      return `${pad(h)}:${pad(minute)}`;
    })
    .join(", ");
}

/**
 * Human-friendly relative time for the next-runs preview,
 * e.g. "in 3 minutes", "in 2 h 05 min", "in 4 d 3 h".
 */
export function formatRelativeTime(target: Date, now: Date): string {
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diffMinutes < 1) return "any moment now";
  if (diffMinutes === 1) return "in 1 minute";
  if (diffMinutes < 60) return `in ${diffMinutes} minutes`;

  const totalHours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  if (totalHours < 24) {
    if (remMinutes === 0) {
      return totalHours === 1 ? "in 1 hour" : `in ${totalHours} hours`;
    }
    const pad = String(remMinutes).padStart(2, "0");
    return `in ${totalHours} h ${pad} min`;
  }

  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  if (days < 60) {
    if (remHours === 0) return days === 1 ? "in 1 day" : `in ${days} days`;
    const pad = String(remHours).padStart(2, "0");
    return `in ${days} d ${pad} h`;
  }
  return `in ${Math.round(days / 30)} months`;
}

/**
 * Raw timestamp rendering: "2026-08-27 04:05:00".
 * Always local time, always zero-padded.
 */
export function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Expand every field into matcher sets for next-run scanning. */
function buildMatchers(fields: string[]): {
  minute: Set<number> | null;
  hour: Set<number> | null;
  dom: Set<number> | null;
  month: Set<number> | null;
  dow: Set<number> | null;
} {
  const [minute, hour, dom, month, dow] = fields;
  const namedMonth = (n: number) => monthName(n).toLowerCase().slice(0, 3);
  const namedDow = (n: number) => dowName(n).toLowerCase().slice(0, 3);

  return {
    minute: expandField(minute, FIELD_LIMITS.minute),
    hour: expandField(hour, FIELD_LIMITS.hour),
    dom: expandField(dom, FIELD_LIMITS.dom),
    month: expandField(month, FIELD_LIMITS.month, namedMonth),
    dow: expandField(dow, FIELD_LIMITS.dow, namedDow),
  };
}

function matchesAt(
  matchers: ReturnType<typeof buildMatchers>,
  d: Date,
): boolean {
  if (!matchers.minute?.has(d.getMinutes())) return false;
  if (!matchers.hour?.has(d.getHours())) return false;
  if (!matchers.month?.has(d.getMonth() + 1)) return false;

  // Vixie cron semantics: when both dom and dow are restricted, either may match.
  const domRestricted = matchers.dom !== null && !allDays(matchers.dom);
  const dowRestricted = matchers.dow !== null;
  const domOk = matchers.dom?.has(d.getDate()) ?? false;
  const dowOk = matchers.dow?.has(d.getDay()) ?? false;

  if (domRestricted && dowRestricted) return domOk || dowOk;
  if (domRestricted) return domOk;
  if (dowRestricted) return dowOk;
  return true;
}

/** A dom set covering every possible day means the field is unrestricted. */
function allDays(dom: Set<number>): boolean {
  return dom.size === 31 && [...dom].every((d) => d >= 1 && d <= 31);
}

/** Next `count` fire times after now. Empty for @-shortcuts (@reboot etc.). */
export function nextRuns(
  expression: string,
  count = 5,
  from = new Date(),
): Date[] {
  if (expression.startsWith("@")) return [];

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return [];
  const matchers = buildMatchers(parts);
  // dom/month can be unrestricted; only minute/hour must be present.
  if (!matchers.minute || !matchers.hour || !matchers.month) {
    return [];
  }

  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1); // strictly after `from`

  const runs: Date[] = [];
  // Cap at ~4 years of minutes; also bail on impossible dates like Feb 30.
  const limit = 4 * 366 * 24 * 60;
  for (let i = 0; i < limit && runs.length < count; i++) {
    if (matchesAt(matchers, cursor)) {
      runs.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return runs;
}

export interface FormatOptions {
  mode: Mode;
  expression: string;
  description: string;
  command: string;
  /** Only used in /etc/cron.d mode (the extra user column). */
  user?: string;
  /** Only used in /etc/cron.d mode (the drop-in file name). */
  fileName?: string;
}

/** Build the ready-to-paste output for the selected deployment target. */
export function formatOutput(opts: FormatOptions): string {
  const { mode, expression, description, command } = opts;

  if (mode === "crontab") {
    return [
      "# crontab -e",
      `# ${description}`,
      `${expression} ${command}`,
    ].join("\n");
  }

  const fileName = opts.fileName?.trim() || "my-job";
  const user = opts.user?.trim() || "root";
  return [
    `# /etc/cron.d/${fileName}`,
    `# ${description}`,
    `${expression} ${user} ${command}`,
    "",
    "# Notes:",
    "# - the file name must contain no dots and no slashes",
    "# - the file must be owned by root and end with a trailing newline",
    "# - use absolute paths for commands and output redirection",
  ].join("\n");
}

/** /etc/cron.d file names must be simple: letters, digits, hyphen, underscore. */
export function validateFileName(fileName: string): string | null {
  if (!fileName.trim()) return "File name is required for /etc/cron.d mode";
  if (/[^A-Za-z0-9_-]/.test(fileName)) {
    return "File name must contain only letters, digits, hyphens, or underscores (no dots)";
  }
  return null;
}

/** One-shot generation used by the page's render loop. */
export function generate(
  fields: CronFields,
  mode: Mode,
  command: string,
  user: string,
  fileName: string,
  /** "@reboot" and friends bypass field validation entirely. */
  shortcut?: string | null,
): GeneratedCron {
  let expression: string;

  if (shortcut) {
    expression = shortcut;
  } else {
    const built = buildExpression(fields);
    if (built.errors.length > 0) {
      return {
        expression: null,
        description: "",
        output: "",
        nextRuns: [],
        error: built.errors[0],
      };
    }
    expression = built.expression;
  }

  if (mode === "cron-d") {
    const err = validateFileName(fileName);
    if (err) {
      return {
        expression,
        description: describeExpression(expression),
        output: "",
        nextRuns: [],
        error: err,
      };
    }
  }

  const description = describeExpression(expression);
  const output = formatOutput({
    mode,
    expression,
    description,
    command: command.trim() || "<command>",
    user,
    fileName,
  });

  return {
    expression,
    description,
    output,
    nextRuns: nextRuns(expression),
    error: null,
  };
}
