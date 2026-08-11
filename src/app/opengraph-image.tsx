import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

/**
 * Share card, generated from the brand mark and `siteConfig` so the title,
 * description and logo can never drift from the page's own metadata.
 *
 * 1200 × 630 is the size every scraper expects; `generate-page-metadata.ts`
 * declares the same numbers.
 */
export const alt = `${siteConfig.name} — ${siteConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          // The hero's sky ramp, flattened to two stops.
          backgroundImage: "linear-gradient(160deg, #1a506d 0%, #6f9fb5 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="46" height="49" viewBox="0 0 120 129" fill="none">
            <path
              d="M28.596 81.9388C28.596 99.4431 42.8424 113.633 60.4162 113.633C77.99 113.633 92.2364 99.4431 92.2364 81.9388H107.664C107.664 107.93 86.5107 129 60.4162 129C34.3218 129 13.168 107.93 13.168 81.9388H28.596Z"
              fill="#ffffff"
            />
            <path
              d="M120 59.7644L109.092 70.6293L60 21.7335L10.9081 70.6293L0 59.7644L60 0L120 59.7644Z"
              fill="#ffffff"
            />
          </svg>
          <div style={{ fontSize: 34, letterSpacing: 6, textTransform: "uppercase" }}>
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, maxWidth: 900 }}>
            Where the road ends and the quiet begins
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.35, maxWidth: 820, opacity: 0.85 }}>
            {siteConfig.description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
