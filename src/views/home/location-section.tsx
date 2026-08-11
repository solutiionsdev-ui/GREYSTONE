import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { CtaButton } from "@/components/ui/cta-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ParallaxLayer, ParallaxMedia } from "@/components/ui/parallax-media";
import { PixelRevealImage } from "@/components/ui/pixel-reveal-image";
import { WORD_GAP_EM, fadeUpShort, revealConfig, revealConfigSnappy } from "@/lib/springs/reveal";
import type { HomeContent } from "@/data/mocks/home";

/** Figma 3421 → 4379 of frame "Concept 3" (1469:1302). */
export interface LocationSectionProps {
  content: HomeContent["location"];
}

export const LocationSection = ({ content }: LocationSectionProps) => (
  <section
    id="location"
    aria-labelledby="location-heading"
    className="relative flex w-full flex-col items-center overflow-hidden px-5 py-24 lg:block lg:h-239.5 lg:px-0 lg:py-0"
  >
    <ParallaxMedia src={content.image.src} alt={content.image.alt} sizes="100vw" />

    {/* Painted in by the cursor, over the photograph but under the copy. Wrapped
        in the same `ParallaxLayer` the photograph uses, so the two drift as one
        rather than sliding against each other. */}
    <ParallaxLayer className="pointer-events-none">
      <PixelRevealImage
        src={content.reveal.src}
        label={content.reveal.label}
        className="absolute inset-0 size-full"
      />
    </ParallaxLayer>

    <Inview
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      className="z-10 flex justify-center lg:absolute lg:inset-x-0 lg:top-25"
    >
      <Eyebrow label={content.eyebrow} className="text-lead text-on-media" />
    </Inview>

    <div className="z-10 mt-6 w-full lg:absolute lg:left-20.5 lg:top-39 lg:mt-0 lg:w-319.25">
      <TextEngine
        tag="h2"
        id="location-heading"
        mode="once"
        className="text-trim-body mx-auto max-w-160 justify-center text-center text-body font-light leading-body text-on-media lg:max-w-none lg:text-title"
        wordIn={{ opacity: 1, y: 0 }}
        wordOut={{ opacity: 0, y: 28 }}
        wordStagger={18}
        wordConfig={revealConfig}
        columnGap={WORD_GAP_EM}
      >
        {content.body}
      </TextEngine>
    </div>

    <Inview
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      className="z-10 mt-10 lg:absolute lg:left-152 lg:top-202.5 lg:mt-0 lg:w-56"
    >
      <CtaButton label={content.cta.label} href={content.cta.href} className="w-full" />
    </Inview>
  </section>
);
