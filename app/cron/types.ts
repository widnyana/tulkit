/** Deployment target: per-user crontab vs a drop-in file under /etc/cron.d. */
export type Mode = "crontab" | "cron-d";

/** The five standard cron time fields, kept as raw strings for editing. */
export interface CronFields {
  minute: string;
  hour: string;
  dom: string;
  month: string;
  dow: string;
}

export const DEFAULT_FIELDS: CronFields = {
  minute: "*",
  hour: "*",
  dom: "*",
  month: "*",
  dow: "*",
};

/** Everything the UI needs to render the result panel in one pass. */
export interface GeneratedCron {
  /** The cron schedule, e.g. "0 3 * * 1" or a shortcut like "@reboot"; null when invalid. */
  expression: string | null;
  description: string;
  /** Ready-to-paste text for the selected mode. */
  output: string;
  nextRuns: Date[];
  error: string | null;
}

export interface Preset {
  label: string;
  /** "@" shortcuts are stored verbatim; otherwise five space-separated fields. */
  value: string;
}

export const PRESETS: Preset[] = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily at 03:00", value: "0 3 * * *" },
  { label: "Weekly (Sunday 00:00)", value: "0 0 * * 0" },
  { label: "Monthly (1st, 00:00)", value: "0 0 1 * *" },
  { label: "Yearly (Jan 1, 00:00)", value: "0 0 1 1 *" },
  { label: "@reboot", value: "@reboot" },
];
