// 📖 Docs: obsidian/frontend/components/common.md

/**
 * Adaptive scaling grid configuration.
 *
 * The grid keeps a rem-based design proportional across viewports by scaling
 * the root (`<html>`) font-size. Each breakpoint maps a viewport `maxWidth` to
 * the design `baseWidth` it was laid out at — at `baseWidth` the root
 * font-size equals `FONT_BASE` and rem values match the design 1:1.
 *
 * - Scaling DOWN (viewport at or below `GRID_BASE_WIDTH`) is driven by the
 *   `vw` media queries in `src/app/globals.css`.
 * - Scaling UP (viewport above `GRID_BASE_WIDTH`) is driven at runtime by the
 *   `AdaptiveGrid` component / `useAdaptiveGrid` hook.
 *
 * Changing these values means updating the `html` media queries in
 * `globals.css` to match — the formula is:
 *   font-size: FONT_BASE * 100 / baseWidth  (vw)
 */

/** Root font-size (px) the design is measured against. */
export const FONT_BASE = 16;

export interface GridBreakpoint {
  /** Media-query `max-width` threshold (px). */
  maxWidth: number;
  /**
   * Design base width (px) the range was laid out at, or `null` for a range
   * that does **not** scale — a fixed 16 px root with a fluid layout.
   */
  baseWidth: number | null;
}

/**
 * Breakpoints, largest first — one per **design**, not per device.
 *
 * Each range re-bases rather than continuing to shrink the range above it,
 * because a composition scaled far below the width it was drawn at is
 * proportional and unreadable: the 1440 design at 834 px put body copy at
 * 9.3 px and the hero subtitle at 11.6 px (measured), and at phone width it
 * reached about 4 px — the documented consequence of the single-breakpoint
 * setup this replaces (ADR-0018).
 *
 * - **≥ 1280** — the Figma composition, at its own base.
 * - **540–1279** — tablets: **fixed 16 px root**, fluid layout.
 * - **< 540** — phones, based at 430.
 *
 * The tablet range is the one that does not scale, and that is deliberate. It
 * spans a 2.4× width ratio, so any single base width puts one end of it wrong:
 * based at 834 the root ran from 10.7 px at the bottom to 24.5 px at the top,
 * and 1024 — iPad landscape, an extremely common width — sat right at a cliff
 * where the desktop composition took over at 11.4 px body copy. A constant root
 * with a genuinely fluid stacked layout is the honest answer for a range this
 * wide, and it also makes both boundaries nearly continuous: 1279 → 1280 steps
 * 16 px → 14.2 px, where the old 1023 → 1024 step was 19.6 px → 11.4 px.
 *
 * The layout switches at the same widths: sections stack below `lg:`, and the
 * `tablet:` variant refines that stack for the wider range.
 *
 * Keep in sync with the `html` media queries in `globals.css` and the
 * `--breakpoint-*` values in `@theme` — they are not derived from each other.
 * ADR-0018 / ADR-0027 / ADR-0029 in obsidian/meta/decisions-log.md.
 */
export const GRID_BREAKPOINTS: readonly GridBreakpoint[] = [
  { maxWidth: 1440, baseWidth: 1440 },
  { maxWidth: 1279, baseWidth: null },
  { maxWidth: 539, baseWidth: 430 },
];

/** Largest breakpoint width — above it the root font-size scales up. */
export const GRID_BASE_WIDTH = Math.max(
  ...GRID_BREAKPOINTS.map((bp) => bp.maxWidth),
);

/** Width at which the Figma composition takes over from the stacked layout. */
export const DESKTOP_MIN_WIDTH = 1280;

/** Width at which the stacked layout takes over from the phone layout. */
export const TABLET_MIN_WIDTH = 540;
