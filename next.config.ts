import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const version = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
).version as string;
const commitSha = (() => {
  const fromEnv =
    process.env.COMMIT_REF ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
})();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
  },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  serverExternalPackages: ["@react-pdf/renderer"],
  typescript: {
    ignoreBuildErrors: false,
  },
  compiler: {
    // Strip console.log/info from production bundles on any host. Netlify sets
    // CONTEXT=production, Vercel sets VERCEL_ENV. error/warn stay (diagnostics).
    removeConsole:
      (process.env.CONTEXT ?? process.env.VERCEL_ENV) === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    // Inline the single global stylesheet so the first paint needs no
    // render-blocking CSS request. Static pages only, so caching is a wash.
    inlineCss: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
