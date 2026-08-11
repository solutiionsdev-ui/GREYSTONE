---
tags: [frontend, stable]
updated: 2026-08-09
---

# Catalog — Common Components

Files in `src/components/common/` — shared infrastructure that may depend on
providers. Conventions: [[component-conventions]].

## Cookie — `Cookie/`

Self-contained cookie consent system — a bottom-right **banner** plus a full
category **preferences modal**. No third-party library (the old
`react-cookie-consent` dependency was removed). Lives in `src/components/common/Cookie/`.

| File | Role |
|------|------|
| `Cookie.tsx` | Mount component — hydrates the store, renders banner + modal |
| `LazyCookie.tsx` | `next/dynamic` `ssr:false` wrapper — keeps cookie JS out of first-load |
| `CookieBanner.tsx` | Bottom-right consent banner |
| `CookiePreferencesModal.tsx` | Category preferences dialog with per-category toggles |
| `CookieButton.tsx` | Local button primitive — `primary` / `secondary` variants |
| `cookieStore.ts` | Zustand store + `localStorage` persistence |
| `index.ts` | Barrel exports — `Cookie`, `LazyCookie`, `useCookieStore`, `CookieConsent` |

**Mounting** — the root layout renders `<LazyCookie />` inside `ScrollLayout`:
```tsx
import { LazyCookie } from "@/components/common/Cookie";
```

**State** — `useCookieStore` (Zustand). `consent` is `null` until the user decides;
the banner shows only after hydration confirms `consent === null`. Persisted to
`localStorage` under key `cookie-consent-v1`. Three categories: `necessary`
(always on), `analytics`, `marketing`.

**Styling & motion** — ported to the project stack: Tailwind v4 with the
`background` / `foreground` design tokens (dark-mode adaptive, no hardcoded hex),
and `@react-spring/web` for all motion — `useTransition` drives the banner and
modal mount/unmount, `useSpring` drives the toggle knob. No CSS transitions.
The modal locks scroll through the Lenis [[smooth-scroll|scroll store]]
(`useScroll.stop()`), not `body` overflow.

> [!note] `#todo`
> The privacy-policy link points to `/privacy-policy` — that route does not exist
> yet. Placeholder consent copy should be reviewed before launch.

## Grid — adaptive scaling (`grid/`)

The **adaptive scaling grid** keeps a rem-based layout proportional across every
viewport by scaling the root (`<html>`) font-size. Design in `rem` once, and the
whole UI scales as one unit. Lives in `src/components/common/grid/`.

| File | Role |
|------|------|
| `grid.config.ts` | Breakpoints + `FONT_BASE` — the single source of truth for the grid |
| `adaptive-grid.tsx` | `<AdaptiveGrid>` client component — drives the scale-up, renders `null` |
| `index.ts` | Barrel exports — `AdaptiveGrid`, `GRID_BREAKPOINTS`, … |

**How it works** — two halves cover the whole viewport range:

- **Scale down** (viewport ≤ the largest breakpoint) — `vw`-based
  `html { font-size }` media queries in `globals.css`. At each breakpoint's
  design base width the root font-size resolves to 16px; between breakpoints it
  tracks the viewport.
- **Scale up** (viewport > the largest breakpoint) — the `<AdaptiveGrid>`
  component sets an inline `html` font-size at runtime via
  [[hooks|`useAdaptiveGrid`]], so the design keeps growing (damped by `coef`) on
  large displays.

The `globals.css` media queries and `grid.config.ts` describe the same
breakpoints — **keep them in sync** (formula: `font-size = 16 * 100 / baseWidth vw`).
They are not derived from each other, so updating one and not the other is a
silent layout break.

> [!important] This project: three ranges, and the middle one does not scale
> | Range | Root | Layout |
> |---|---|---|
> | < 540 | `3.72093vw` (base 430) | phone stack |
> | 540 – 1279 | **16 px, constant** | tablet stack, fluid |
> | ≥ 1280 | `1.111111vw` (base 1440), then `<AdaptiveGrid>` above 1440 | Figma composition |
>
> `baseWidth: null` in `GRID_BREAKPOINTS` marks the range that does not scale.
> A tablet range spans a 2.4× width ratio, so **no** single base width suits it —
> based at 834 the root ran 10.7 → 24.5 px, and iPad landscape (1024) landed on
> the cliff where the desktop composition took over at 11.4 px body copy. See
> [[decisions-log]] ADR-0030.
>
> The root layout mounts `<AdaptiveGrid coef={1} />`; the default `0.6666`
> deliberately damps the scale-up and would drift the page off its Figma
> proportions above 1440.
>
> Re-basing is only half the change: sections must also *lay out* differently at
> each width, or they stop being small and start being clipped. See
> [[decisions-log]] ADR-0018, ADR-0027 and ADR-0030.

**Mounting** — the root layout renders `<AdaptiveGrid coef={1} />` inside
`ScrollLayout`:
```tsx
import { AdaptiveGrid } from "@/components/common/grid";
```
Mount it once. Props: `baseWidth` (defaults to the largest breakpoint) and
`coef` (0–1 scale-up damping, default `0.6666`).

> [!note]
> This replaced a `styled-components`-based scaling system that was dropped into
> `common/` — see [[decisions-log]] ADR-0008. `styled-components` is **not** a
> project dependency; the scale-down CSS lives in `globals.css` per [[design-system]].

> [!note] `CursorPixelWave` was removed
> A cursor-following `backdrop-filter` that warped the page under it existed
> briefly and was cut on request. The technique is still worth knowing — see
> [[decisions-log]] ADR-0022, kept as a record of why a canvas overlay cannot do
> this. The cursor-driven pixel effect that *remains* is
> [[components/ui|`<PixelRevealImage>`]] in the location section.

## Preloader — `preloader.tsx`

The opening curtain: a counter runs 0 → 100 **across** the bottom of a white
screen, then a rounded rectangle grows out of the middle and the page is
revealed through it. Mounted once, first child of `HomeView`.

| Prop | Type | Meaning |
|------|------|---------|
| `minimumMs` | `number?` | Shortest time the curtain stays up (default `1500`) |

- The counter's **position and value are one spring**, so the number physically
  travels as it counts rather than two effects being kept in sync by hand.
- Its inset is `inset-x-10 bottom-10` — the **same margin on all three edges it
  touches**. The curtain carries no transform: an earlier version scaled the
  curtain away and dragged the counter down off the bottom edge with it.
- It leaves **through a mask**, not a fade. The counter sits in a well exactly
  one line box tall (`h-20 overflow-hidden`) and slides straight down out of it,
  so the bottom edge cuts it off. A fade dissolves it in place, which reads as
  the screen giving up rather than the counter leaving.
- Its transform comes from a combined `to([counter.value, reveal.open], …)`.
  Chaining off one spring alone freezes the other at whatever it held when that
  spring last moved — the horizontal travel would stop the moment the counter
  settled.
- **Timing is shared**, not duplicated: `lib/springs/preloader-timing.ts` holds
  the durations and derives `HERO_DELAY` from them, so the hero's entrance is
  expressed as an offset from the reveal. Change the curtain's length and the
  first screen follows instead of silently desyncing.
- Holds Lenis still (`useScroll().stop`) while it is up and hands scrolling back
  as the window opens — otherwise the page scrolls behind a curtain nobody can
  see past.
- Select store actions **individually**. `useScroll((s) => [s.stop, s.start])`
  builds a new array every render, which zustand reads as a changed slice.
- It server-renders, so the curtain is present in the first paint rather than
  appearing after hydration.

### The reveal is a hole in the curtain, not a clip on the page

`clip-path: path(evenodd, "<viewport rect> <rounded rect>")` on the **fixed,
viewport-sized curtain**. `evenodd` turns the inner rect into a hole; the rect
scales from zero to the full viewport, so the curtain is solid while the counter
runs. Written each frame from `subscribeToTicker`, off a `reveal` spring.

Two things force that shape, and both were shipped wrong first:

1. **`clip-path` percentages resolve against the element, not the viewport.**
   Clipping the page wrapper with `inset(19%)` sounds equivalent and is not —
   `.scroll-layout-content` is the height of the whole document (~6000 px), so
   19 % removed the entire first screen and the page rendered white.
2. **Any `clip-path` establishes a containing block for fixed descendants.** A
   clip left on an ancestor — even a fully open one — permanently re-anchors the
   fixed header. On the curtain this cannot happen; the curtain unmounts.

The path is built from `window.innerWidth/innerHeight` and the **measured** root
font-size (`getComputedStyle(documentElement).fontSize`) — the radius is a rem
value and the root font-size is viewport-derived under the adaptive grid, so
assuming 16 would make the corners the wrong size everywhere but 1440.

The window overshoots (`open * 1.06`): a spring settles asymptotically, so
without it a hairline of curtain frames the viewport for the last few hundred ms.

> [!note] Verifying it needs a fronted tab and a stretched `minimumMs`
> The counter is driven by `requestAnimationFrame`, which does not fire in a
> background tab — a preloader measured from an unfronted tab sits at `0 %`
> forever and reads as broken. And at the default 1500 ms the whole curtain is
> gone before a tool round-trip lands; pass `minimumMs={9000}` temporarily to
> sample it.

## ReducedMotion — `reduced-motion.tsx`

`<ReducedMotion>` — a client leaf that calls react-spring's `useReducedMotion()`.
It watches the `prefers-reduced-motion` media query and toggles react-spring's
global `skipAnimation`, so every spring — and `spring-text-engine` — jumps to its
end state instead of animating. Renders `null`; mounted once in the root layout.
See [[animation-system]] and [[seo-metadata]].

## Skeleton loaders

Three skeleton components for `loading` states of async-data components — every
async component must mirror its final layout with one of these
(see [[component-conventions]]).

| Component | File | For |
|-----------|------|-----|
| `<SkeletonImage>` | `skeleton-image.tsx` | image placeholders |
| `<SkeletonLoader>` | `skeleton-loader.tsx` | generic block placeholders |
| `<SkeletonVideo>` | `skeleton-video.tsx` | video placeholders |

> [!note]
> `components/ui/` (design-system primitives) does not exist yet — create it when
> the first primitive is added. See [[folder-structure]].

## Related

[[component-conventions]] · [[components/animation-springs]]
