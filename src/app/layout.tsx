import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { LazyCookie } from "@/components/common/Cookie";
import { AdaptiveGrid } from "@/components/common/grid";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { ScrollLayout } from "@/layouts/scroll-layout";

import "@/app/globals.css";

/**
 * Google Sans Flex — the typeface the Figma frame is set in. Shipped as static
 * 24 pt instances, so the four weights the design uses are loaded explicitly
 * (Figma's `wdth 100 / GRAD 0 / ROND 0` are these instances' defaults).
 */
const googleSansFlex = localFont({
  src: [
    { path: "./fonts/GoogleSansFlex_24pt-Thin.ttf", weight: "100", style: "normal" },
    { path: "./fonts/GoogleSansFlex_24pt-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/GoogleSansFlex_24pt-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/GoogleSansFlex_24pt-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-google-sans-flex",
  display: "swap",
});

/**
 * The same typeface as a **variable** font, carrying the `opsz` axis the static
 * cuts cannot.
 *
 * A static instance is drawn for one optical size: the 24 pt Thin thickens its
 * strokes so they hold up at 24 pt, which is right for body copy and wrong for
 * an 801 px wordmark — it rendered visibly heavier than the Figma frame, which
 * is set in the variable font and lets `opsz` follow the type size. This file
 * is the official Google Fonts build (latin subset — the wordmark is three
 * distinct letters), used **only** where optical size matters.
 */
const googleSansFlexDisplay = localFont({
  src: "./fonts/GoogleSansFlex-Variable-latin.woff2",
  variable: "--font-google-sans-flex-display",
  display: "swap",
  weight: "1 1000",
});

export const metadata: Metadata = generateMetadata();
export const viewport: Viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${googleSansFlex.variable} ${googleSansFlexDisplay.variable} font-sans antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getSiteStructuredData()),
          }}
        />
        <ScrollLayout>
          {/* coef 1 = fully proportional scale-up; the damped default would
              let the 1440 design drift off its Figma proportions above 1440. */}
          <AdaptiveGrid coef={1} />
          <ReducedMotion />
          <LazyCookie />
          {children}
        </ScrollLayout>
      </body>
    </html>
  );
}
