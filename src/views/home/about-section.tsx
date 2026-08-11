import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { CtaButton } from "@/components/ui/cta-button";
import { DragSequenceVideo } from "@/components/ui/drag-sequence-video";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HighlightGlyph } from "@/components/ui/icons/highlight-glyph";
import { ParallaxMedia } from "@/components/ui/parallax-media";
import { QuoteGlyph } from "@/components/ui/icons/quote-glyph";
import { WORD_GAP_EM, fade, fadeUp, fadeUpShort, revealConfig, revealConfigSnappy } from "@/lib/springs/reveal";
import type { HighlightItem, HomeContent } from "@/data/mocks/home";

/** Figma 1514 → 2849 of frame "Concept 3" (1469:1302). */
export interface AboutSectionProps {
  content: HomeContent["about"];
}

/**
 * Figma draws the two tiles at slightly different sizes — 72 px with the ring
 * (1484:1761) and 67 px with the triangle (1484:1762) — and pads them so both
 * captions still start on the same line. Kept as-is.
 */
const Highlight = ({ item, className }: { item: HighlightItem; className?: string }) => (
  <div className={`flex flex-col items-start ${className ?? ""}`}>
    {item.glyph === "circle" ? (
      <span className="relative size-18 shrink-0 rounded-card bg-surface-muted">
        <HighlightGlyph name="circle" className="absolute inset-0 size-full text-foreground" />
      </span>
    ) : (
      <span className="relative size-16.75 shrink-0 rounded-card bg-surface-muted">
        <HighlightGlyph name="triangle" className="absolute left-3 top-3 w-10.75 text-foreground" />
      </span>
    )}

    <p
      className={`w-full text-lead leading-body text-foreground ${
        item.glyph === "circle" ? "mt-8" : "mt-9.25"
      }`}
    >
      {item.title}
    </p>
    <p className="text-trim-body mt-4 w-full text-body font-light leading-body text-foreground">
      {item.description}
    </p>
  </div>
);

export const AboutSection = ({ content }: AboutSectionProps) => (
  <section id="about" aria-labelledby="about-heading" className="relative w-full px-5 py-20 lg:h-333.75 lg:px-0 lg:py-0">
    <Inview
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      className="lg:absolute lg:left-10 lg:top-25 lg:w-41.5"
    >
      <Eyebrow label={content.eyebrow} className="text-lead text-foreground" />
    </Inview>

    <div className="mt-6 lg:absolute lg:left-152.75 lg:top-25 lg:mt-0 lg:w-197.25">
      <TextEngine
        tag="h2"
        id="about-heading"
        mode="once"
        className="text-trim-body text-title font-light leading-body text-foreground"
        wordIn={{ opacity: 1, y: 0 }}
        wordOut={{ opacity: 0, y: 28 }}
        wordStagger={22}
        wordConfig={revealConfig}
        columnGap={WORD_GAP_EM}
      >
        {content.body}
      </TextEngine>
    </div>

    <Inview
      mode="once"
      from={fade.from}
      to={fade.to}
      config={revealConfig}
      className="mt-10 h-px w-full bg-border-subtle lg:absolute lg:left-10 lg:top-89.5 lg:mt-0 lg:w-340"
    />

    <Inview
      mode="once"
      from={fadeUp.from}
      to={fadeUp.to}
      config={revealConfig}
      className="mt-10 lg:absolute lg:left-10 lg:top-104.5 lg:mt-0 lg:w-70.5"
    >
      <Highlight item={content.highlights[0]} />
    </Inview>

    <Inview
      mode="once"
      from={fadeUp.from}
      to={fadeUp.to}
      config={revealConfig}
      delayIn={90}
      className="mt-10 lg:absolute lg:left-152.75 lg:top-104.5 lg:mt-0 lg:w-58.75"
    >
      <Highlight item={content.highlights[1]} />
    </Inview>

    <Inview
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      className="mt-10 lg:absolute lg:left-267 lg:top-135.5 lg:mt-0 lg:w-83"
    >
      <CtaButton label={content.cta.label} href={content.cta.href} className="w-full" />
    </Inview>

    <Inview
      tag="figure"
      mode="once"
      from={fade.from}
      to={fade.to}
      config={revealConfig}
      className="relative mt-10 aspect-[561/683] w-full lg:absolute lg:left-10 lg:top-163 lg:mt-0 lg:aspect-auto lg:h-170.75 lg:w-140.25"
    >
      <ParallaxMedia
        src={content.image.src}
        alt={content.image.alt}
        sizes="39vw"
        className="rounded-card"
      />

      {/* Figma "Rectangle 1991424012" (1505:1816) — inset 30 px from the
          photograph's left and bottom edges. */}
      <figcaption className="absolute inset-x-4 bottom-4 rounded-button bg-action-secondary p-5 lg:inset-x-auto lg:bottom-7.5 lg:left-7.5 lg:h-32.5 lg:w-125.5 lg:p-7.5">
        {/* Figma draws this block at 282 px, which only fits its old two-word
            placeholder. Widened to clear the glyph instead, so a real sentence
            still sits on one line. */}
        <blockquote className="w-full lg:w-90">
          <p className="text-lead leading-body text-foreground">{content.quote.text}</p>
          <p className="text-trim-body mt-4 text-body font-light leading-body text-foreground">
            {content.quote.attribution}
          </p>
        </blockquote>
        {/* 18.656 × 14.272 px in Figma, rounded to whole pixels (19 × 14):
            the spacing scale only emits multiples of 0.25, and anything else
            silently compiles to nothing (see design-system.md). Both axes must
            be set — an inline SVG given only a width falls back to the default
            150 px height instead of honouring its viewBox ratio. */}
        <QuoteGlyph className="absolute right-7.5 top-7.5 h-3.5 w-4.75 text-foreground" />
      </figcaption>
    </Inview>

    {/* Figma "Rectangle 1991424011" (1476:1513) was an empty grey plate; it now
        holds the drag-to-rotate turntable. */}
    <Inview
      mode="once"
      from={fade.from}
      to={fade.to}
      config={revealConfig}
      delayIn={90}
      className="relative mt-4 aspect-[789/683] w-full lg:absolute lg:left-152.75 lg:top-163 lg:mt-0 lg:aspect-auto lg:h-170.75 lg:w-197.25"
    >
      <DragSequenceVideo
        src={content.video.src}
        label={content.video.label}
        scrubber
        className="size-full rounded-card"
      />
    </Inview>
  </section>
);
