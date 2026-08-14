import type { Metadata } from "next";
import { SITE_NAME } from "./site";

/**
 * Serializable tool catalog — the single source of truth for the homepage
 * grid, sitemap, per-tool metadata, OG images, and JSON-LD. Presentation
 * (icons, category colors) stays in the components that render it.
 */
export interface Tool {
  href: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
}

export const tools: Tool[] = [
  {
    href: "/env-compare",
    title: ".env Comparator",
    description:
      "Compare environment files across staging and production to identify differences and missing keys",
    category: "Development",
    keywords: ["env diff", "dotenv compare", "environment variables", "config diff"],
  },
  {
    href: "/ip-planner",
    title: "NetPlan",
    description:
      "IP network planning with VLSM, collision detection, and boundary validation",
    category: "Network",
    keywords: ["VLSM", "subnet planner", "IP planning", "network design"],
  },
  {
    href: "/ipcalc",
    title: "IP Calculator",
    description:
      "Comprehensive IP calculator with subnet, supernet operations and CIDR deaggregation",
    category: "Network",
    keywords: ["IP calculator", "subnet calculator", "CIDR", "supernet", "deaggregation"],
  },
  {
    href: "/random-string",
    title: "Random String Generator",
    description:
      "Generate secure random strings with customizable length and character types",
    category: "Data",
    keywords: ["random string", "password generator", "secure token", "nonce"],
  },
  {
    href: "/invoice",
    title: "Invoice Generator",
    description:
      "Create professional invoices with live PDF preview and multiple template support",
    category: "Productivity",
    keywords: ["invoice generator", "PDF invoice", "billing", "invoice template"],
  },
  {
    href: "/qr-gen",
    title: "QR Code Generator",
    description:
      "Generate customizable QR codes with error correction and download support",
    category: "Data",
    keywords: ["QR code generator", "QR code", "barcode", "download QR"],
  },
  {
    href: "/json-schema",
    title: "JSON Schema Visualizer",
    description:
      "Visualize and explore JSON Schema structures with interactive tree view",
    category: "Development",
    keywords: ["JSON Schema", "schema visualizer", "JSON tree", "schema explorer"],
  },
  {
    href: "/base64",
    title: "Base64 Encoder / Decoder",
    description:
      "Encode text to Base64 or decode it back, with fixed-width or single-line output",
    category: "Data",
    keywords: ["base64 encode", "base64 decode", "base64 converter", "text to base64"],
  },
];

export function getTool(href: string): Tool | undefined {
  return tools.find((t) => t.href === href);
}

/**
 * Build per-tool page metadata. Route layouts call this so each is two lines.
 * Relative `url`/`canonical` resolve against `metadataBase` from the root layout.
 */
export function buildToolMetadata(href: string): Metadata {
  const tool = getTool(href);
  if (!tool) return {};

  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: href },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: href,
      title: `${tool.title} · ${SITE_NAME}`,
      description: tool.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.title} · ${SITE_NAME}`,
      description: tool.description,
    },
  };
}
