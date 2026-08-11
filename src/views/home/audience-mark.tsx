"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { ProgressTrigger } from "@/components/animation/springs/progress-trigger";
import { useDynamicInView } from "@/hooks/animation/use-dynamic-in-view";

/**
 * three.js is ~150 KB and this sits well below the fold, so it is split out of
 * the first load. `ssr: false` because it needs a WebGL context.
 */
const ScrollModel = dynamic(
  () => import("@/components/ui/scroll-model").then((m) => m.ScrollModel),
  { ssr: false },
);

/**
 * The 3D mark, travelling the length of the audience section.
 *
 * Its canvas fills the section, which is `overflow-hidden` — so the model rises
 * into view from beneath the location block above and slides away under the
 * contact block below without either edge needing to know about it. It sits
 * below the card grid in the stack and the cards are translucent, so it reads
 * as passing *through* them.
 *
 * A client leaf, so the section itself stays a Server Component. Scroll
 * progress reaches the model through a ref rather than state: the value changes
 * every frame and React never needs to see it.
 */
export interface AudienceMarkProps {
  src: string;
  label: string;
}

/** Model height as a fraction of the section — the section is ~1694 px tall. */
const HEIGHT_RATIO = 0.127;
/**
 * Start loading three this far before the section reaches the viewport.
 *
 * Without this gate `next/dynamic` fires on mount, so ~456 KB of three plus the
 * Draco decoder are fetched and parsed while the visitor is still looking at the
 * hero — measured as a 125 ms main-thread block at load. Code-splitting alone
 * does not defer the *work*, only the bundle.
 */
const PRELOAD_MARGIN = "800px";
/**
 * The canvas is a centred 480 px column, not the full section width.
 *
 * The mark travels vertically down the middle and is only ~215 px across, so a
 * full-width canvas was rasterising roughly three times the pixels it needed —
 * every frame, with six backdrop-blurred cards sampling the result. Narrowing
 * it does not change the model's size: `heightRatio` and the camera's vertical
 * field of view both key off height.
 */

export const AudienceMark = ({ src, label }: AudienceMarkProps) => {
  const progress = useRef(0);
  const [setGateNode, near] = useDynamicInView({ rootMargin: PRELOAD_MARGIN });

  /**
   * Proximity decides when to **mount**, and nothing decides when to unmount.
   *
   * Rendering `near ? <ScrollModel/> : null` tore the whole three.js scene down
   * on the way out and rebuilt it — renderer, model, PMREM environment, every
   * material — on the way back, mid-scroll. Measured as a 50–83 ms long task on
   * each re-entry. The scene already stops its own loop when it is off screen,
   * which is the gate that matters (`optimize-3d-scene` §4).
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  return (
    <ProgressTrigger
      tag="div"
      start="top bottom"
      end="bottom top"
      onChange={({ progress: value }) => {
        progress.current = value;
      }}
      // Literal classes: Tailwind scans source text, so a class assembled from
      // a variable is never generated.
      className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-full -translate-x-1/2 lg:w-120"
    >
      <div ref={setGateNode} className="size-full">
        {mounted ? (
          <ScrollModel
            src={src}
            label={label}
            progress={progress}
            turns={2}
            heightRatio={HEIGHT_RATIO}
            travel
            className="size-full"
          />
        ) : null}
      </div>
    </ProgressTrigger>
  );
};
