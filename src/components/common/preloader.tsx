"use client";

// 📖 Docs: obsidian/frontend/components/common.md

import { animated, to, useSpring } from "@react-spring/web";
import { useEffect, useRef, useState } from "react";

import { subscribeToTicker } from "@/lib/animation/ticker";
import {
  PRELOADER_EXIT_MS,
  PRELOADER_HOLD_MS,
  PRELOADER_MINIMUM_MS,
} from "@/lib/springs/preloader-timing";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";

/**
 * Opening curtain: a counter runs 0 → 100 across the bottom of a white screen,
 * then the page is revealed through a rounded rectangle that grows to fill the
 * viewport.
 *
 * The reveal is a **rounded hole cut out of the curtain**, not a fade. Fading
 * dissolves the whole screen at once; this opens a shape, which is what the
 * design asks for and what reads as a curtain lifting.
 */
export interface PreloaderProps {
  /** Shortest time the curtain stays up, even on a warm cache. */
  minimumMs?: number;
}

/** Corner radius of the growing window, in rem, before it is clamped. */
const WINDOW_RADIUS = 6;

export const Preloader = ({ minimumMs = PRELOADER_MINIMUM_MS }: PreloaderProps) => {
  const [progress, setProgress] = useState(0);
  const [opening, setOpening] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  // Selected individually: returning a tuple builds a new array every render,
  // which zustand reads as a changed slice.
  const stopScroll = useScroll((state) => state.stop);
  const startScroll = useScroll((state) => state.start);

  // Drive the count from real readiness where possible, so the number means
  // something rather than being a fixed animation pretending to measure.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const openedAt = performance.now();
    let raf = 0;

    const tick = () => {
      const elapsed = performance.now() - openedAt;
      const byTime = Math.min(1, elapsed / minimumMs);
      const loaded = document.readyState === "complete" ? 1 : 0.85;
      const next = Math.min(byTime, loaded);
      setProgress(next);

      if (next >= 1) {
        window.setTimeout(() => setOpening(true), PRELOADER_HOLD_MS);
        window.setTimeout(
          () => setDone(true),
          PRELOADER_HOLD_MS + PRELOADER_EXIT_MS,
        );
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [minimumMs]);

  useEffect(() => {
    stopScroll();
    window.scrollTo(0, 0);
    return () => startScroll();
  }, [stopScroll, startScroll]);

  useEffect(() => {
    if (opening) startScroll();
  }, [opening, startScroll]);

  // Declarative form — the imperative `api.start` does not move values in this
  // project's react-spring build (see obsidian/frontend/animation-system.md).
  const counter = useSpring({
    value: progress,
    config: { tension: 90, friction: 26, mass: 1 },
  });

  const reveal = useSpring({
    open: opening ? 1 : 0,
    config: { tension: 70, friction: 26, mass: 1.1 },
  });

  /**
   * The reveal is a rounded hole cut out of the curtain, grown until it clears
   * the viewport — so the page is never touched.
   *
   * Clipping the page itself was tried first and is wrong twice over:
   * `clip-path` percentages resolve against the **element**, and the scroll
   * wrapper is the height of the whole document, so `inset(19%)` removed the
   * entire first screen; and any clip-path on an ancestor establishes a
   * containing block that re-anchors the fixed header.
   */
  const revealRef = useRef(reveal);
  useEffect(() => {
    revealRef.current = reveal;
  });

  const curtainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) return;

    // The radius is a rem value and the root font-size is viewport-derived, so
    // it has to be read rather than assumed to be 16.
    const remPx = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );

    /** Outer viewport rect plus an inner rounded rect; `evenodd` makes it a hole. */
    const holePath = (open: number): string => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Overshoot: a spring settles asymptotically, so at `open = 0.99` a
      // hairline of curtain would still frame the viewport for the last few
      // hundred ms.
      const t = Math.min(1, open * 1.06);
      // Scales from nothing to the full viewport, so the curtain is solid
      // while the counter runs and there is no window sitting on screen
      // waiting to grow.
      const w = vw * t;
      const h = vh * t;
      const x = (vw - w) / 2;
      const y = (vh - h) / 2;
      // Clamped by the half-extents, so a small window is a pill and the
      // corners square off exactly as they reach the viewport edge.
      const r = Math.min(WINDOW_RADIUS * remPx * (1 - t), w / 2, h / 2);
      return (
        `M0,0 H${vw} V${vh} H0 Z ` +
        `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} ` +
        `V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} ` +
        `H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} ` +
        `V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`
      );
    };

    const write = (open: number) => {
      const node = curtainRef.current;
      if (!node) return;
      node.style.clipPath = `path(evenodd, "${holePath(open)}")`;
    };

    // Fully closed until the reveal starts, so the curtain is solid while the
    // counter runs.
    write(0);

    return subscribeToTicker(() => write(revealRef.current.open.get()), () => 0);
  }, [done]);

  if (done) return null;

  return (
    <>
      {/* No transform on the curtain: scaling it dragged the counter off the
          bottom edge as it left. It stays put and a hole opens through it. */}
      <div
        ref={curtainRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100] bg-background"
      >
        {/* Equal inset on every edge it touches, so the counter sits in the
            corner of the same margin the layout uses.

            `overflow-hidden` with a height of exactly one line box makes this
            the mask the counter leaves through: it drops straight down past
            the bottom edge and is cut off by the box rather than fading. A
            fade would have it dissolve in place, which reads as the screen
            giving up rather than the counter leaving. */}
        <div className="absolute inset-x-10 bottom-10 h-20 overflow-hidden">
          <animated.span
            className="absolute bottom-0 whitespace-nowrap text-display font-light leading-flat text-foreground"
            style={{
              left: counter.value.to((v) => `${(v * 100).toFixed(2)}%`),
              // One transform from **both** springs: the horizontal travel is
              // the counter's own progress, the vertical exit is the reveal's.
              // It has to be a combined `to` — chaining off one spring alone
              // would leave the other's value frozen at whatever it held when
              // that spring last moved.
              transform: to(
                [counter.value, reveal.open],
                (v, open) =>
                  `translate(${(-v * 100).toFixed(2)}%, ${(
                    Math.min(1, open * 1.6) * 100
                  ).toFixed(2)}%)`,
              ),
            }}
          >
            {counter.value.to((v) => `${Math.round(v * 100)}%`)}
          </animated.span>
        </div>
      </div>
    </>
  );
};
