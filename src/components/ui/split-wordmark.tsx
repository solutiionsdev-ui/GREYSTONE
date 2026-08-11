"use client";

// 📖 Docs: obsidian/frontend/components/ui.md

import { useEffect, useState } from "react";

import { Spring } from "@/components/animation/springs/spring";
import { SpringTrigger } from "@/components/animation/springs/spring-trigger";
import type { TriggerPos } from "@/components/animation/springs/progress-trigger";
import { WORDMARK_LETTER_STAGGER_MS } from "@/lib/springs/preloader-timing";
import { revealConfigSoft } from "@/lib/springs/reveal";

/**
 * The oversized hero lettering, split so alternating letters climb at
 * different rates as the page scrolls.
 *
 * Each letter is its own `SpringTrigger mode="scrub"`, which is the animation
 * system's scroll primitive — the letters are not being *typeset* by anything
 * custom, they are laid out normally and each one is given its own scroll
 * offset. `TextEngine` is the tool for revealing text, but its staggers run
 * sequentially through the string; an alternating fast/slow split is not
 * something it expresses, which is why this uses the spring primitives
 * directly. See obsidian/frontend/text-engine.md.
 */
export interface SplitWordmarkProps {
  /** The word to split. Letters keep source order, so it stays readable. */
  text: string;
  /** Type and layout — inherited by the letters. */
  className?: string;
  /**
   * Paint applied to **each letter**, not the wrapper.
   *
   * A `background-clip: text` gradient has to live here. On the wrapper it
   * masks to the glyphs the wrapper itself paints, and a transformed child is
   * composited separately — so the letters fall out of the mask and render as
   * nothing at all. Per-letter is also the honest model: each one carries its
   * own fade as it moves.
   */
  letterClassName?: string;
  /**
   * Travel for the faster (odd-indexed) letters, in rem.
   *
   * Kept modest on purpose: at a 50 rem type size a large gap stops reading as
   * "some letters lead" and starts reading as the word coming apart. The word
   * has to stay a word.
   */
  leadRem?: number;
  /** Travel for the slower (even-indexed) letters, in rem. */
  trailRem?: number;
  start?: TriggerPos;
  end?: TriggerPos;
  /**
   * When the first letter arrives, in ms from mount. The rest follow one
   * `WORDMARK_LETTER_STAGGER_MS` apart, so the word writes itself in.
   */
  entranceDelay?: number;
}

export const SplitWordmark = ({
  text,
  className,
  letterClassName,
  leadRem = 14,
  trailRem = 5,
  start = "top top",
  end = "bottom top",
  entranceDelay = 0,
}: SplitWordmarkProps) => {
  /**
   * Nothing is shown until the webfont is in place.
   *
   * At this size the metric-adjusted fallback is nowhere near the real face —
   * measured, `aerra` sets 1909 px in the fallback against 1627 px in Google
   * Sans Flex, a 282 px difference. Fading in over the swap meant the letters
   * appeared bunched and then jumped to their real positions the moment the
   * font landed. `null` means "not ready"; the number is the remaining delay.
   */
  const [startDelay, setStartDelay] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      // `entranceDelay` is measured from navigation, and so is `performance.now()`,
      // so the entrance still lands on schedule when the font resolves early —
      // and starts immediately rather than late when it resolves after.
      setStartDelay(Math.max(0, entranceDelay - performance.now()));
    });
    return () => {
      cancelled = true;
    };
  }, [entranceDelay]);

  return (
    // The accessible name lives here; the letters themselves are decorative
    // fragments and must not be read out one at a time.
    <span role="img" aria-label={text} className={className}>
      {text.split("").map((letter, index) => {
        const travel = index % 2 === 1 ? leadRem : trailRem;
        const scrubbed = (
          <SpringTrigger
            tag="span"
            innerTag="span"
            mode="scrub"
            start={start}
            end={end}
            from={{ y: "0rem" }}
            to={{ y: `-${travel}rem` }}
            aria-hidden="true"
            className="inline-block"
            // No `will-change` here: promoting each letter to its own layer is
            // what drops it out of a `background-clip: text` mask, and five
            // 800 px layers is real memory for no measured gain.
            innerClassName={`inline-block ${letterClassName ?? ""}`}
          >
            {letter}
          </SpringTrigger>
        );

        // Before the font resolves: the same box, same layout, invisible. The
        // placeholder must keep the identical structure or swapping it in would
        // itself be a reflow.
        if (startDelay === null) {
          return (
            <span
              key={`${letter}-${index}`}
              aria-hidden="true"
              className="inline-block opacity-0"
            >
              {scrubbed}
            </span>
          );
        }

        return (
          /* The entrance wraps the scroll trigger rather than nesting inside
             it. Two reasons: the trigger is driven by scroll position and has
             no way to also play a one-shot, and — decisively — the gradient
             lives on the trigger's inner span, so putting a `filter` *below*
             that would composite the glyphs out of its `background-clip: text`
             mask and render nothing. Above it, the mask is untouched. */
          <Spring
            key={`${letter}-${index}`}
            tag="span"
            mode="once"
            // In `em`, so the entrance keeps its proportions at every grid
            // width. At 801 px type `0.22em` is a 176 px rise — about a third
            // of the cap height, enough to read as the word lifting into place
            // rather than simply fading — and `0.03em` a 24 px blur.
            from={{ opacity: 0, y: "0.22em", filter: "blur(0.03em)" }}
            to={{ opacity: 1, y: "0em", filter: "blur(0em)" }}
            // Softer than the default: a longer travel needs a slower settle,
            // or the letters arrive faster than the eye reads the movement.
            config={revealConfigSoft}
            delayIn={startDelay + index * WORDMARK_LETTER_STAGGER_MS}
            className="inline-block"
          >
            {scrubbed}
          </Spring>
        );
      })}
    </span>
  );
};
