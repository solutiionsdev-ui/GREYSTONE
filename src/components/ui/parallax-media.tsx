// 📖 Docs: obsidian/frontend/components/ui.md

import Image from "next/image";

import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import type { TriggerPos } from "@/components/animation/springs/progress-trigger";

/**
 * A photograph that drifts against the scroll.
 *
 * The outer element is the clip box and keeps the layout size the design asks
 * for; an inner layer holds the image and is what scrubs.
 * `SpringTrigger mode="scrub"` maps scroll progress onto the offset — see
 * obsidian/frontend/animation-system.md.
 */
export interface ParallaxMediaProps {
  src: string;
  alt: string;
  /** `next/image` responsive hint. */
  sizes: string;
  /** Set on the LCP image only. */
  priority?: boolean;
  /** Extra classes for the clip box; it already fills its parent. */
  className?: string;
  /** Defaults suit a section scrolled through from below. */
  start?: TriggerPos;
  end?: TriggerPos;
  /**
   * How the travel sits around the design's framing.
   *
   * - `"center"` (default) — the layer is 20 % taller than the box so it always
   *   covers, and drifts through the neutral framing mid-scroll. The cost is
   *   that `object-cover` scales the image up by that 20 %, so the crop is
   *   tighter than the Figma one. Right for anything you scroll *into*.
   * - `"start"` — the layer is exactly the box, so the crop is **identical to
   *   the design**, and it starts at rest and only drifts down. That leaves the
   *   top edge uncovered as it moves, so it is only safe where whatever sits
   *   behind is meant to show through (the hero's cut-out PNG over the sky
   *   ramp). Required above the fold, which is on screen before any scrolling
   *   and so must open on the exact composition.
   */
  anchor?: "center" | "start" | "start-raised";
}

/**
 * Travel as a percentage of the clip box — "medium-strong": clearly readable
 * without throwing the crop far off the Figma framing.
 */
const DRIFT = 10;

/**
 * `translateY` percentages resolve against the moving layer's own height, so
 * the centred variant — whose layer is `100 + 2 × DRIFT` tall — needs its
 * travel rescaled. The anchored variant's layer is exactly the box, so it does
 * not.
 */
const CENTERED_TRAVEL = `${(DRIFT / (100 + DRIFT * 2)) * 100}%`;

/**
 * Extra height given to the `start-raised` layer, as a percentage of the box.
 *
 * The hero photograph is a cut-out whose aspect matches its section exactly, so
 * `object-cover` has no slack and `object-position` cannot move it. Sliding it
 * up would lift the terrain off the bottom edge and show a band of bare sky.
 * Growing the layer **from the bottom** raises the subject instead, and the
 * overflow is clipped at the section's top where there is only sky anyway.
 */
const LIFT = 20;
const RAISED_TRAVEL = `${(DRIFT / (100 + LIFT)) * 100}%`;

const LAYER = {
  // -inset-y-[10%] makes the moving layer 120% of the clip box's height.
  center: "absolute -inset-y-[10%] left-0 w-full",
  start: "absolute inset-y-0 left-0 w-full",
  // Bottom-anchored and 120% tall — keep in step with LIFT.
  "start-raised": "absolute -top-[20%] bottom-0 left-0 w-full",
} as const;

const RANGE = {
  center: { from: `-${CENTERED_TRAVEL}`, to: CENTERED_TRAVEL },
  start: { from: "0%", to: `${DRIFT}%` },
  "start-raised": { from: "0%", to: RAISED_TRAVEL },
} as const;

/**
 * The drifting layer on its own, so anything stacked over a `ParallaxMedia`
 * can be given the *same* motion from the same constants rather than a
 * hand-copied second set that silently drifts out of step.
 */
export interface ParallaxLayerProps {
  children: React.ReactNode;
  className?: string;
  start?: TriggerPos;
  end?: TriggerPos;
  anchor?: "center" | "start" | "start-raised";
}

export const ParallaxLayer = ({
  children,
  className,
  start = "top bottom",
  end = "bottom top",
  anchor = "center",
}: ParallaxLayerProps) => (
  <SpringTrigger
    tag="div"
    mode="scrub"
    start={start}
    end={end}
    from={{ y: RANGE[anchor].from }}
    to={{ y: RANGE[anchor].to }}
    innerTag="div"
    innerClassName={LAYER[anchor]}
    // Fills its parent and establishes the containing block for the moving
    // layer — so a caller never has to remember to position it.
    className={`absolute inset-0 overflow-hidden ${className ?? ""}`}
  >
    {children}
  </SpringTrigger>
);

export const ParallaxMedia = ({
  src,
  alt,
  sizes,
  priority,
  className,
  start,
  end,
  anchor,
}: ParallaxMediaProps) => (
  <ParallaxLayer className={className} start={start} end={end} anchor={anchor}>
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
  </ParallaxLayer>
);
