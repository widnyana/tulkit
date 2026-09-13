import { ImageResponse } from "next/og";
import { SITE_HOST, SITE_NAME } from "./site";

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
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#0f1216",
        color: "#e8ecf1",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#a5b0bd",
        }}
      >
        {SITE_NAME}
        <span style={{ color: "#a5b0bd" }}>*</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              lineHeight: 1.35,
              color: "#a5b0bd",
              maxWidth: "880px",
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            width: 56,
            height: 10,
            background: "#56b4e9",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.08em",
            color: "#6b7784",
          }}
        >
          {SITE_HOST.toUpperCase()}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
