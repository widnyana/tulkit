import { ImageResponse } from "next/og";
import { SITE_NAME } from "./site";

/** Shared config + renderer for OpenGraph/social cards (next/og, no deps). */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function renderOgCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#94a3b8",
          }}
        >
          {SITE_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 34,
                lineHeight: 1.3,
                color: "#cbd5e1",
                maxWidth: "900px",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            height: "12px",
            width: "220px",
            borderRadius: "9999px",
            background: "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
