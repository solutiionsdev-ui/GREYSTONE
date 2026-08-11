"use client";

// 📖 Docs: obsidian/frontend/components/ui.md

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useRef, useState } from "react";

import { useDynamicInView } from "@/hooks/animation/use-dynamic-in-view";

/**
 * A statistic that counts up when it scrolls into view, resolving out of a
 * blur as it settles.
 *
 * The blur is derived from the *same* spring that drives the number, so the two
 * can never disagree — the digits sharpen exactly as they stop moving, which is
 * what keeps it from reading as two stacked effects.
 */
export interface CounterValueProps {
  /** The final value, exactly as designed — e.g. `"240"`, `"3.2"`. */
  value: string;
  /** Semantic element to render; the stats list needs a `dt`. */
  tag?: "p" | "dt" | "span";
  className?: string;
}

/** Peak blur, in rem so it scales with the adaptive grid. */
const MAX_BLUR_REM = 0.75;
/** Below this much remaining travel the value is treated as settled. */
const SETTLE_EPSILON = 0.01;

export const CounterValue = ({ value, tag = "p", className }: CounterValueProps) => {
  const Tag = animated[tag];
  const target = Number(value);
  const decimals = value.includes(".") ? value.split(".")[1].length : 0;

  const [setNode, inView] = useDynamicInView({});
  const hasRun = useRef(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (inView && !hasRun.current) {
      hasRun.current = true;
      setActive(true);
    }
  }, [inView]);

  // Declarative form — the imperative `api.start` does not move values in this
  // project's react-spring build (see obsidian/frontend/animation-system.md).
  const { progress } = useSpring({
    progress: active ? 1 : 0,
    // Heavily damped on purpose: no overshoot, so the digits never jitter back.
    config: { tension: 60, friction: 34, mass: 1.1 },
  });

  // A non-numeric value (or a user who prefers reduced motion, which makes
  // react-spring resolve instantly) still renders correctly — it just arrives
  // already settled.
  if (Number.isNaN(target)) {
    const Plain = tag;
    return <Plain className={className}>{value}</Plain>;
  }

  return (
    <Tag
      ref={setNode}
      className={className}
      style={{
        filter: progress.to((p) => {
          const remaining = 1 - p;
          return remaining < SETTLE_EPSILON
            ? "none"
            : `blur(${(remaining * MAX_BLUR_REM).toFixed(4)}rem)`;
        }),
        opacity: progress.to((p) => Math.min(1, 0.15 + p * 1.6)),
      }}
    >
      {progress.to((p) => (target * p).toFixed(decimals))}
    </Tag>
  );
};
