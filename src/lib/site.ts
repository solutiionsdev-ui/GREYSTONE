/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { publicEnv } from "@/env";

export const siteConfig = {
  name: "AERRA",
  description:
    "A 240 m² house on a south-facing slope, 40 minutes from the city. One owner, one view, no neighbours in sight.",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: publicEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /**
   * Default Open Graph / Twitter share image.
   *
   * Generated at `src/app/opengraph-image.tsx` from the brand mark and the
   * values in this file, so the card cannot drift from the page's metadata.
   * Next serves it at this route and wires it into `<meta>` automatically; the
   * path is kept here because the metadata generator takes it as a parameter.
   */
  ogImage: "/opengraph-image",
  twitterHandle: "@aerra",
  author: "AERRA",
  /** Browser theme-color (address bar / PWA) — the hero sky, not black. */
  themeColor: "#1a506d",
} as const;
