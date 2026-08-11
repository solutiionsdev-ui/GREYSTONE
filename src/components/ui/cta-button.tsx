// 📖 Docs: obsidian/frontend/components/common.md

import Link from "next/link";

import { ArrowRightIcon } from "@/components/ui/icons/arrow-right-icon";

/**
 * The single call-to-action shape in the design — a black pill with a white
 * arrow tile. Figma 1469:1374 (hero), 1484:1623 (about), 1484:1654 (location)
 * and 1484:1675 (contact submit). They differ only in width, which the caller
 * sets; the pill is 48 px tall everywhere.
 */
export interface CtaButtonProps {
  label: string;
  /** Renders an anchor. Omit to render a submit button instead. */
  href?: string;
  className?: string;
}

/**
 * The hover is CSS `transition-*`, not a spring: it is a discrete state change
 * on colour, opacity and a small nudge, which ADR-0014 puts squarely in the CSS
 * exception. Timing and easing come from tokens, never raw values.
 */
const shell =
  "group relative flex h-12 items-center justify-between gap-6 overflow-hidden rounded-button " +
  "bg-action-primary py-1 pl-6 pr-1 transition-transform duration-[var(--duration-normal)] " +
  "ease-entrance hover:-translate-y-0.25 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary";

const label =
  "text-trim-body relative whitespace-nowrap text-body font-medium leading-body text-action-primary-foreground";

/**
 * A sheen that sweeps across the pill on hover. `-translate-x-full` → `+full`
 * on a skewed gradient reads as light moving over the surface; the shell clips
 * it, so nothing escapes the rounded corners.
 */
const Sheen = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-action-secondary/20 blur-sm transition-transform duration-[var(--duration-slow)] ease-entrance group-hover:translate-x-[400%]"
  />
);

const Tile = () => (
  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control bg-action-secondary">
    {/* Two arrows: the first leaves to the right as the second arrives from the
        left, so the icon reads as advancing rather than sliding back. */}
    <ArrowRightIcon className="w-4.5 text-action-primary transition-transform duration-[var(--duration-normal)] ease-entrance group-hover:translate-x-[220%]" />
    <ArrowRightIcon className="absolute w-4.5 -translate-x-[220%] text-action-primary transition-transform duration-[var(--duration-normal)] ease-entrance group-hover:translate-x-0" />
  </span>
);

export const CtaButton = ({ label: text, href, className }: CtaButtonProps) => {
  if (href) {
    return (
      <Link href={href} className={`${shell} ${className ?? ""}`}>
        <Sheen />
        <span className={label}>{text}</span>
        <Tile />
      </Link>
    );
  }

  return (
    <button type="submit" className={`${shell} ${className ?? ""}`}>
      <Sheen />
      <span className={label}>{text}</span>
      <Tile />
    </button>
  );
};
