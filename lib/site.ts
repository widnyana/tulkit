/**
 * Central site metadata constants. Consumed by root metadata, per-tool
 * metadata, sitemap, robots, manifest, JSON-LD, and OG images.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tulkit.widnyana.web.id";

/** Bare host without scheme, e.g. "tulkit.widnyana.web.id". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

export const SITE_NAME = "tulkit";

export const SITE_TITLE = "tulkit — Utility Toolkit";

export const SITE_DESCRIPTION =
  "A collection of utilities that solves your tiny, annoying problems — IP calculators, .env comparison, QR codes, invoices, JSON Schema visualization, and more.";

export const SITE_AUTHOR = "Widnyana";

export const THEME_COLOR = "#0f172a";

export const GITHUB_URL = "https://github.com/widnyana/tulkit";

export const TWITTER_URL = "https://x.com/widnyana_";
