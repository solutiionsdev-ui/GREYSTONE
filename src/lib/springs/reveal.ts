// 📖 Docs: obsidian/frontend/animation-system.md

/**
 * Shared reveal presets for the home page.
 *
 * Values are plain numbers on purpose: sections stay Server Components, and a
 * `SpringConfig` carrying an `easing` **function** cannot cross the server →
 * client boundary. Physical tension/friction springs serialise cleanly and are
 * what the animation system wants anyway.
 */

/** Soft, slightly overshoot-free entrance used for blocks and media. */
export const revealConfig = { tension: 120, friction: 26, mass: 1 };

/** Quicker settle for small items (labels, buttons, list cells). */
export const revealConfigSnappy = { tension: 170, friction: 24, mass: 1 };

/** Fade up — the default block reveal. */
export const fadeUp = {
  from: { opacity: 0, y: 32 },
  to: { opacity: 1, y: 0 },
} as const;

/** Shorter fade up for items already close to their resting place. */
export const fadeUpShort = {
  from: { opacity: 0, y: 16 },
  to: { opacity: 1, y: 0 },
} as const;

/**
 * Word gap for `TextEngine`, in `em`.
 *
 * The engine lays words out as flex items and defaults to `0.3em`, which is
 * wider than Google Sans Flex's own space (measured at `0.2245em`) and pushed
 * two headings onto an extra line. Matching the real space width restores the
 * line breaks the Figma frame has.
 */
export const WORD_GAP_EM = 0.2245;

/** Plain fade — for media that should not shift the composition. */
export const fade = {
  from: { opacity: 0 },
  to: { opacity: 1 },
} as const;

/** Slow, fully damped — staged reveals that must not overshoot or jitter. */
export const revealConfigSoft = { tension: 72, friction: 30, mass: 1.1 };

/**
 * Fade up out of a blur. react-spring interpolates the number inside the
 * `blur()` string, so both ends must be written the same way — `blur(0rem)`,
 * never a bare `none`, or the value type changes mid-flight and it throws.
 * `rem` keeps the blur proportional under the adaptive grid.
 */
export const fadeUpBlur = {
  from: { opacity: 0, y: 36, filter: "blur(0.75rem)" },
  to: { opacity: 1, y: 0, filter: "blur(0rem)" },
} as const;
