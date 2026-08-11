import TextEngine from "spring-text-engine";

import { Inview } from "@/components/animation/springs/in-view";
import { CounterValue } from "@/components/ui/counter-value";
import { Eyebrow } from "@/components/ui/eyebrow";
import { WORD_GAP_EM, fadeUp, fadeUpShort, revealConfig, revealConfigSnappy } from "@/lib/springs/reveal";
import type { HomeContent } from "@/data/mocks/home";

/** Figma 2849 → 3421 of frame "Concept 3" (1469:1302). */
export interface NumbersSectionProps {
  content: HomeContent["numbers"];
}

export const NumbersSection = ({ content }: NumbersSectionProps) => (
  <section id="numbers" aria-labelledby="numbers-heading" className="relative w-full px-5 py-20 lg:h-143 lg:px-0 lg:py-0">
    <Inview
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      className="flex justify-center lg:absolute lg:inset-x-0 lg:top-25"
    >
      <Eyebrow label={content.eyebrow} className="text-lead text-foreground" />
    </Inview>

    <div className="mt-6 lg:absolute lg:left-92.5 lg:top-39 lg:mt-0 lg:w-175.25">
      <TextEngine
        tag="h2"
        id="numbers-heading"
        mode="once"
        className="text-trim-body justify-center text-center text-lead font-light leading-body text-foreground lg:text-engine-nowrap lg:whitespace-nowrap lg:text-title"
        wordIn={{ opacity: 1, y: 0 }}
        wordOut={{ opacity: 0, y: 28 }}
        wordStagger={35}
        wordConfig={revealConfig}
        columnGap={WORD_GAP_EM}
      >
        {content.heading}
      </TextEngine>
    </div>

    <Inview
      tag="p"
      mode="once"
      from={fadeUpShort.from}
      to={fadeUpShort.to}
      config={revealConfigSnappy}
      delayIn={120}
      className="text-trim-body mt-5 text-center text-body font-light leading-body text-foreground lg:absolute lg:left-132.75 lg:top-57.5 lg:mt-0 lg:w-94.75"
    >
      {content.subtitle}
    </Inview>

    {/* Three stats side by side from tablet up — 834 px fits them comfortably,
        and stacked they read as three unrelated facts. */}
    <dl className="mt-12 flex flex-col items-center gap-10 tablet:flex-row tablet:items-start tablet:justify-center tablet:gap-6 lg:absolute lg:left-27.5 lg:top-81 lg:mt-0 lg:w-305 lg:flex-row lg:gap-2.5">
      {content.stats.map((stat, index) => (
        <Inview
          key={stat.id}
          mode="once"
          from={fadeUp.from}
          to={fadeUp.to}
          config={revealConfig}
          delayIn={index * 110}
          className="flex w-full shrink-0 flex-col items-center gap-4 text-center lg:w-100 lg:gap-6"
        >
          <CounterValue
            tag="dt"
            value={stat.value}
            className="text-trim-body w-full text-display font-light leading-body text-foreground"
          />
          <dd className="w-full text-lead leading-body text-foreground">{stat.label}</dd>
        </Inview>
      ))}
    </dl>
  </section>
);
