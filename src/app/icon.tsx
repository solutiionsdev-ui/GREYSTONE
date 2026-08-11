import { ImageResponse } from "next/og";

/**
 * Favicon, generated from the brand mark rather than shipped as a binary — the
 * logo lives in exactly one place (`components/ui/icons/brand-mark.tsx`), so a
 * change to it cannot leave a stale `.ico` behind.
 *
 * The starter's `favicon.ico` still covers browsers that ask for the legacy
 * path; Next serves this for everything that understands `icon`.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: 7,
        }}
      >
        <svg width="20" height="21" viewBox="0 0 120 129" fill="none">
          <path
            d="M28.596 81.9388C28.596 99.4431 42.8424 113.633 60.4162 113.633C77.99 113.633 92.2364 99.4431 92.2364 81.9388H107.664C107.664 107.93 86.5107 129 60.4162 129C34.3218 129 13.168 107.93 13.168 81.9388H28.596Z"
            fill="#ffffff"
          />
          <path
            d="M120 59.7644L109.092 70.6293L60 21.7335L10.9081 70.6293L0 59.7644L60 0L120 59.7644Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    size,
  );
}
