// 📖 Docs: obsidian/frontend/components/ui.md · obsidian/workflows/optimize-3d-scene.md

/**
 * One place that decides what "mobile" means for every WebGL surface.
 *
 * Ported from the `optimize-3d-scene` playbook (§2). Everything a scene tunes —
 * pixel ratio, frame budget, antialiasing, whether the pointer is listened to
 * at all — reads from here, so the values cannot drift apart between the two
 * canvases on this page.
 *
 * Read **once at construction**: a device does not change tier mid-session, and
 * rebuilding buffers on resize costs more than the mismatch is worth.
 */

export type DeviceTier = "mobile" | "tablet" | "desktop";

const MOBILE_MAX = 768;
const TABLET_MAX = 1024;

const query = (value: string): boolean =>
  typeof window !== "undefined" && window.matchMedia(value).matches;

/**
 * The coarse-pointer clause is what catches tablets and large phones that are
 * wider than the breakpoint.
 */
export const getDeviceTier = (): DeviceTier => {
  if (typeof window === "undefined") return "desktop";
  const coarse = query("(hover: none) and (pointer: coarse)");
  if (window.innerWidth < MOBILE_MAX || coarse) return "mobile";
  if (window.innerWidth < TABLET_MAX) return "tablet";
  return "desktop";
};

/** An accessibility promise — honoured on every tier. */
export const prefersReducedMotion = (): boolean =>
  query("(prefers-reduced-motion: reduce)");

interface ConnectionLike {
  saveData?: boolean;
}

/**
 * The nearest web-exposed proxy for iOS Low Power Mode, which has no API.
 */
export const isEnergySaver = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: ConnectionLike }).connection;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return Boolean(connection?.saveData) || (typeof memory === "number" && memory <= 2);
};

/**
 * Play the entrance, then stop drawing on a settled frame. WebGL keeps the last
 * frame on the canvas, so a frozen scene costs nothing at all.
 */
export const sceneShouldFreeze = (): boolean =>
  prefersReducedMotion() || (getDeviceTier() === "mobile" && isEnergySaver());

/**
 * Pixel-ratio clamp. A 3× phone renders **9×** the fragments of a 1× screen.
 *
 * `hardEdged` scenes stop at 1.0 rather than going below it: the mark is sharp
 * geometry and thin edges alias visibly. The pixel reveal is deliberately
 * blocky, so it can go lower.
 */
export const clampPixelRatio = (tier: DeviceTier, hardEdged = true): number => {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  if (tier === "mobile") return Math.min(dpr, hardEdged ? 1 : 0.85);
  // Soft content is capped on **every** tier, not just mobile. Capping only the
  // phone left a desktop retina buffer rasterising 1.5× the fragments for an
  // effect quantised to an 84 × 56 grid, which cannot show them.
  const ceiling = hardEdged ? (tier === "tablet" ? 1.25 : 1.5) : 1;
  return Math.min(Math.max(dpr, 0.75), ceiling);
};

/**
 * Minimum ms between draws, per tier.
 *
 * The epsilon matters: the shared ticker skips while `time - last <= framerate`,
 * so a bare `1000/30` lands on the first tick past 33.3 ms — about 26 fps, not
 * 30. Subtracting a millisecond makes the stated budget the measured one
 * without touching the ticker every other subscriber shares.
 */
export const frameBudgetMs = (tier: DeviceTier): number => {
  if (tier === "mobile") return 1000 / 30 - 1;
  if (tier === "tablet") return 1000 / 45 - 1;
  return 0;
};

/** Antialiasing is expensive on a phone and the DPR clamp hides its absence. */
export const shouldAntialias = (tier: DeviceTier): boolean => tier !== "mobile";
