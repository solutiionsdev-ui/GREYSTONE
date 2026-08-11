// 📖 Docs: obsidian/frontend/components/common.md

/**
 * Preloader timing, shared.
 *
 * The hero's entrance has to start *after* the curtain has opened, or it plays
 * out of sight and the first screen is already settled when it appears. That
 * means two components need the same numbers, so they live here rather than
 * being written twice — a plain module (no `"use client"`) so a Server
 * Component can read them too.
 */

/** Shortest time the curtain stays up, even on a warm cache. */
export const PRELOADER_MINIMUM_MS = 1500;

/** How long after the count finishes before the window starts opening. */
export const PRELOADER_HOLD_MS = 160;

/** Long enough for the window to reach the edges and the curtain to unmount. */
export const PRELOADER_EXIT_MS = 1200;

/**
 * When the reveal starts — the first moment anything behind the curtain is
 * visible, and so the earliest an entrance should begin.
 */
export const PRELOADER_REVEAL_AT_MS =
  PRELOADER_MINIMUM_MS + PRELOADER_HOLD_MS;

/**
 * Entrance delays for the first screen, measured from mount.
 *
 * They are offsets from the reveal rather than absolute numbers, so changing
 * the curtain's length moves the hero with it instead of silently desyncing.
 */
export const HERO_DELAY = {
  wordmark: PRELOADER_REVEAL_AT_MS + 120,
  heading: PRELOADER_REVEAL_AT_MS + 260,
  subtitle: PRELOADER_REVEAL_AT_MS + 420,
  cta: PRELOADER_REVEAL_AT_MS + 540,
  caption: PRELOADER_REVEAL_AT_MS + 660,
} as const;

/** Gap between consecutive wordmark letters as they arrive. */
export const WORDMARK_LETTER_STAGGER_MS = 90;
