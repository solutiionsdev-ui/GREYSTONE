import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { CtaButton } from "@/components/ui/cta-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ParallaxMedia } from "@/components/ui/parallax-media";
import { TextField } from "@/components/ui/text-field";
import { WORD_GAP_EM, fadeUp, fadeUpShort, revealConfig, revealConfigSnappy } from "@/lib/springs/reveal";
import type { HomeContent } from "@/data/mocks/home";

/** Figma 6073 → 7199 of frame "Concept 3" (1469:1302). */
export interface ContactSectionProps {
  content: HomeContent["contact"];
}

export const ContactSection = ({ content }: ContactSectionProps) => (
  <section
    id="contact"
    aria-labelledby="contact-heading"
    className="relative flex w-full flex-col items-center overflow-hidden px-5 py-24 lg:block lg:h-281.5 lg:px-0 lg:py-0"
  >
    <ParallaxMedia src={content.image.src} alt={content.image.alt} sizes="100vw" />

    <Inview
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      className="z-10 flex justify-center lg:absolute lg:inset-x-0 lg:top-22.5"
    >
      <Eyebrow label={content.eyebrow} className="text-body text-on-media" />
    </Inview>

    <h2
      id="contact-heading"
      className="z-10 mt-6 w-full text-center text-title font-light leading-flat text-on-media-muted lg:absolute lg:left-64.5 lg:top-34.5 lg:mt-0 lg:w-231 lg:text-display"
    >
      {/* Plain below the breakpoint so it can wrap; animated from `lg:` up —
          see the note in hero-section.tsx. */}
      <span className="text-trim-flat lg:hidden">
        {content.headingLead}
        <span className="text-on-media">{content.headingRest}</span>
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
        >
          {content.headingLead}
          <span className="text-on-media">{content.headingRest}</span>
        </TextEngine>
      </span>
    </h2>

    <Inview
      mode="once"
      from={fadeUp.from}
      to={fadeUp.to}
      config={revealConfig}
      className="z-10 mt-12 w-full rounded-card bg-surface-panel p-6 backdrop-blur-panel lg:absolute lg:left-10 lg:top-187.5 lg:mt-0 lg:h-86 lg:w-340 lg:p-7.5"
    >
      <div className="flex h-full flex-col items-start gap-10 lg:gap-25">
        <p className="text-trim-body w-full text-body font-light leading-body text-foreground lg:w-254.25 lg:text-title">
          {content.body}
        </p>

        <form action="/api/contact" method="post" className="flex w-full flex-col gap-7.5 lg:w-325">
          <div className="flex w-full flex-col items-stretch gap-6 tablet:flex-row tablet:items-center lg:flex-row lg:items-center lg:gap-7.5">
            {content.fields.map((field) => (
              <TextField
                key={field.name}
                name={field.name}
                label={field.label}
                type={field.type}
                autoComplete={field.autoComplete}
              />
            ))}
          </div>

          <CtaButton label={content.submitLabel} className="w-full" />
        </form>
      </div>
    </Inview>
  </section>
);
