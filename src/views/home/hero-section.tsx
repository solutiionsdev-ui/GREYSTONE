import TextEngine from "spring-text-engine";

import { Spring } from "@/components/animation/springs/spring";
import { CtaButton } from "@/components/ui/cta-button";
import { ParallaxMedia } from "@/components/ui/parallax-media";
import { SplitWordmark } from "@/components/ui/split-wordmark";
import { HERO_DELAY } from "@/lib/springs/preloader-timing";
import { WORD_GAP_EM, fade, revealConfig } from "@/lib/springs/reveal";
import type { HomeContent } from "@/data/mocks/home";

/**
 * Hero — Figma 0 → 1514 of frame "Concept 3" (1469:1302).
 *
 * Three stacked layers, bottom to top: the sky ramp ("image 643", 1469:1300),
 * the oversized wordmark, then the cut-out house PNG which the wordmark passes
 * behind. Copy sits above all three.
 */
export interface HeroSectionProps {
  content: HomeContent["hero"];
}

export const HeroSection = ({ content }: HeroSectionProps) => (
  <section
    id="hero"
    aria-labelledby="hero-heading"
    // Mobile-first: a stacked, self-sizing hero. Every desktop rule below is
    // the original one moved behind `lg:`, so the 1440 composition is untouched.
    className="relative flex w-full flex-col items-center overflow-hidden bg-[image:var(--backdrop-hero)] px-5 pb-16 lg:block lg:h-378.5 lg:min-h-[100svh] lg:px-0 lg:pb-0 lg:pt-0"
  >
    {/* A plain box, not a Spring: the entrance now lives on the letters, and
        animating the wrapper as well would compound the two into a double
        move. Hidden below the breakpoint — at phone width the wordmark is far
        wider than the viewport, so it reads as stray fragments, not a word. */}
    <div className="pointer-events-none absolute hidden text-center lg:block lg:-left-28.5 lg:top-111.75 lg:w-417.25">
      {/* Alternating letters climb at different rates on scroll. The gradient
          goes on each letter, not the wrapper — a transformed child composites
          separately and would fall straight out of a wrapper-level
          `background-clip: text` mask, rendering nothing. */}
      <SplitWordmark
        text={content.wordmark}
        // `font-display` is the variable cut: browsers apply
        // `font-optical-sizing: auto` by default, so at this size `opsz` lands
        // on the axis maximum and the strokes thin out to match Figma. The
        // static 24 pt Thin cannot do this — see obsidian/frontend/design-system.md.
        className="text-trim-flat block whitespace-nowrap font-display text-wordmark font-thin leading-flat"
        letterClassName="bg-[image:var(--wordmark-fill)] bg-clip-text text-transparent"
        entranceDelay={HERO_DELAY.wordmark}
      />
    </div>

    {/* The hero is on screen before any scrolling, so it must open on the exact
        Figma framing: `top top` puts progress at 0 on load, and anchor="start"
        makes that the neutral position rather than one end of the travel. */}
    {/* Mobile: a 16:9 landscape band, bled to the screen edges past the
        section's `px-5`. `lg:contents` removes this box above the breakpoint so
        the photograph goes back to filling the section, as the desktop
        composition expects. */}
    <div className="relative -mx-5 aspect-video self-stretch lg:contents">
      <ParallaxMedia
        src={content.image.src}
        alt={content.image.alt}
        sizes="100vw"
        priority
        start="top top"
        end="bottom top"
        anchor="start-raised"
      />
    </div>

    <h1
      id="hero-heading"
      className="relative z-20 mt-10 w-full text-center text-title font-light leading-flat text-foreground-muted lg:absolute lg:left-78.75 lg:top-38.5 lg:mt-0 lg:w-202.5 lg:text-display lg:text-on-media-muted"
    >
      {/* TextEngine positions its split children absolutely, so they never take
          part in flex wrapping — a heading that fits at 1440 simply runs off a
          narrow screen, and no CSS reaches it. Below the breakpoint the same
          words are rendered as ordinary text, which wraps; the animated version
          takes over from `lg:` up. One `<h1>`, two renderings. */}
      <span className="text-trim-flat lg:hidden">
        {content.headingLead}
        <span className="text-foreground lg:text-on-media">{content.headingRest}</span>
      </span>

      <span className="hidden lg:contents">
        <TextEngine
          tag="span"
          mode="once"
          className="text-trim-flat justify-center text-center leading-flat"
          wordIn={{ opacity: 1, y: 0 }}
          wordOut={{ opacity: 0, y: 40 }}
          wordStagger={45}
          wordConfig={revealConfig}
          columnGap={WORD_GAP_EM}
          delayIn={HERO_DELAY.heading}
        >
          {content.headingLead}
          <span className="text-on-media">{content.headingRest}</span>
        </TextEngine>
      </span>
    </h1>

    <Spring
      tag="p"
      mode="once"
      from={fade.from}
      to={fade.to}
      config={revealConfig}
      delayIn={HERO_DELAY.subtitle}
      className="relative z-20 mt-6 w-full max-w-152 text-center text-body leading-body text-foreground lg:max-w-none lg:absolute lg:left-113.75 lg:top-84.75 lg:mt-0 lg:w-132.5 lg:text-lead lg:text-on-media"
    >
      {content.subtitle}
    </Spring>

    <Spring
      mode="once"
      from={{ opacity: 0, y: 16 }}
      to={{ opacity: 1, y: 0 }}
      config={revealConfig}
      delayIn={HERO_DELAY.cta}
      className="relative z-20 mt-8 lg:absolute lg:left-154.25 lg:top-106.75 lg:mt-0 lg:w-51.5"
    >
      <CtaButton label={content.cta.label} href={content.cta.href} className="w-full" />
    </Spring>

    <Spring
      tag="p"
      mode="once"
      from={fade.from}
      to={fade.to}
      config={revealConfig}
      delayIn={HERO_DELAY.caption}
      className="relative z-20 mt-10 text-center text-body leading-body text-foreground lg:absolute lg:inset-x-auto lg:bottom-auto lg:left-126.5 lg:top-341.5 lg:mt-0 lg:w-107 lg:text-lead lg:text-on-media"
    >
      {content.caption[0]}
      <br />
      {content.caption[1]}
    </Spring>
  </section>
);
