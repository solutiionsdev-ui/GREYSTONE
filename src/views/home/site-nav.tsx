"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Spring } from "@/components/animation/springs/spring";
import { BrandMark } from "@/components/ui/icons/brand-mark";
import { revealConfig, revealConfigSnappy } from "@/lib/springs/reveal";
import type { NavLink } from "@/data/mocks/home";

/** Figma "Frame 2147225002" (1469:1380) — floats over the hero, centred. */
export interface SiteNavProps {
  links: readonly NavLink[];
  cta: { label: string; href: string };
}

const linkClass =
  "text-trim-body whitespace-nowrap text-body font-light leading-body text-foreground " +
  "transition-opacity duration-[var(--duration-fast)] ease-entrance hover:opacity-60 " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground";

export const SiteNav = ({ links, cta }: SiteNavProps) => {
  const [open, setOpen] = useState(false);

  // A hash link inside the panel should close it, and so should Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Spring
      tag="header"
      mode="once"
      from={{ opacity: 0, y: -16 }}
      to={{ opacity: 1, y: 0 }}
      config={revealConfig}
      delayIn={200}
      // Fixed, so it stays put through the whole page. Lenis drives native window
      // scroll (no transformed wrapper), so `fixed` behaves normally under it —
      // see obsidian/frontend/smooth-scroll.md.
      className="fixed left-1/2 top-3 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2 lg:w-auto"
    >
      <nav
        aria-label="Primary"
        className="flex items-center justify-between gap-4 rounded-button bg-surface-nav p-1 backdrop-blur-nav lg:justify-start lg:gap-10"
      >
        <Link
          href="/"
          aria-label="GREYSTONE — home"
          className="flex size-11 shrink-0 items-center justify-center rounded-control bg-action-secondary transition-transform duration-[var(--duration-fast)] ease-entrance hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <BrandMark className="w-5 text-foreground" />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href={cta.href}
          className="hidden h-11 items-center gap-2 rounded-control bg-action-secondary px-5 py-3 transition-transform duration-[var(--duration-fast)] ease-entrance hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:flex"
        >
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-foreground" />
          <span className="text-trim-body whitespace-nowrap text-body font-medium leading-body text-foreground">
            {cta.label}
          </span>
        </Link>

        {/* Burger — the only control below the breakpoint. */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-nav-panel"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-control bg-action-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:hidden"
        >
          <span
            className={`h-px w-5 bg-foreground transition-transform duration-[var(--duration-fast)] ease-entrance ${
              open ? "translate-y-[3.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-5 bg-foreground transition-transform duration-[var(--duration-fast)] ease-entrance ${
              open ? "-translate-y-[3.5px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      <Spring
        tag="div"
        id="site-nav-panel"
        enabled={open}
        mode="always"
        from={{ opacity: 0, y: -8 }}
        to={{ opacity: 1, y: 0 }}
        config={revealConfigSnappy}
        className={`mt-2 overflow-hidden rounded-button bg-surface-nav backdrop-blur-nav lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={open ? undefined : true}
      >
        <ul className="flex flex-col gap-5 p-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkClass} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="flex items-center gap-2"
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-foreground" />
              <span className="text-trim-body text-body font-medium leading-body text-foreground">
                {cta.label}
              </span>
            </Link>
          </li>
        </ul>
      </Spring>
    </Spring>
  );
};
