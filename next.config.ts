import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
