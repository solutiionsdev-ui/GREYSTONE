---
tags: [frontend, animation, stable, do-not-modify]
updated: 2026-07-17
---

# Animation System

The core of this starter. **Every motion is spring-based** via `@react-spring/web`.
CSS keyframes and `framer-motion` are **banned**. ADR: [[decisions-log]] ADR-0002.

> [!note] One narrow CSS exception (ADR-0014)
> CSS `transition-*` is allowed for **simple, discrete state changes only** —
> hover/focus colour, opacity, border, underline, small decorative nudges — with
> token-backed timing (`duration-[var(--duration-fast)] ease-entrance`). Anything
> scroll-driven, revealing, layout-affecting, staggered, or interruptible is a
> spring. `@keyframes` stay banned. Rules and examples: [[design-system#Motion: springs first, CSS for trivial state]].

> [!warning] #do-not-modify
> `src/components/animation/springs/` and `src/hooks/animation/` are the animation
> engine. Treat them as a vendored library — **consume them, don't edit them
> without explicit sign-off**. One authorized performance refactor has been made;
> see [[decisions-log]] ADR-0009.

## Shared render loop (ticker)

Every per-frame animation hook subscribes to **one** app-wide
`requestAnimationFrame` loop — `src/lib/animation/ticker.ts` (`subscribeToTicker`).
A page with N scroll-driven components runs **one** rAF, not N. The loop is
reference-counted: it starts on the first subscriber and stops when the last one
unmounts, so an idle page costs nothing.

- `useLoop` (and everything built on it — `useLoopInView`, `useResizeLoop`,
  `useSpringTrigger`, `useProgressTrigger`, `<AdaptiveGrid>`) goes through the
  ticker. Each subscriber keeps its own `framerate` throttle.
- Window dimensions (`useWindowWidth` / `useWindowHeight` / `useWindowSize`)
  share **one** debounced `resize` listener via a `useSyncExternalStore` store.

`src/lib/animation/ticker.ts` is **not** `#do-not-modify` — it is the supported
extension point for loop-based animation.

> [!warning] A ticker subscription must not depend on a per-render value
> Each subscriber's throttle timer is stored **on the subscription**, and
> `subscribeToTicker` stamps it with `performance.now()` at subscribe time. So an
> effect like `useEffect(() => subscribeToTicker(cb, () => 33), [springs])`
> tears the subscription down and rebuilds it on every render — and since
> `useSpring` returns a new object each render, a component that re-renders per
> frame resets the timer before it can ever elapse. **The callback then never
> runs.**
>
> This is silent: no error, no warning, the animation simply does nothing. It
> cost a debugging pass on `<DragSequenceVideo>`, where it looked exactly like a
> broken seek. It only stayed hidden because a `framerate` of `0` masks it.
>
> Subscribe with **stable deps** and read moving values through a ref:
> ```tsx
> const springsRef = useRef(springs);
> useEffect(() => { springsRef.current = springs; });   // no dep array
> useEffect(() => subscribeToTicker(
>   () => { const v = springsRef.current.turn.get(); … },
>   () => INTERVAL_MS,
> ), []);
> ```
> Assign the ref **in an effect, not during render** — `react-hooks/refs` fails
> the build otherwise.

## The components

All live in `src/components/animation/springs/` and accept a `tag` prop so they
render the semantically correct HTML element. Full catalog:
[[components/animation-springs]].

| Component | Trigger | Use for |
|-----------|---------|---------|
| `<Inview>` | element enters viewport | fade/slide-in reveals |
| `<Spring>` | mount / enabled flag | unconditional spring animation |
| `<SpringTrigger>` | scroll progress | parallax, scrub, scroll-toggled motion |
| `<ProgressTrigger>` | scroll progress | raw 0–1 progress callback (no animation) |
| `<Hover>` | mouse enter/leave | hover effects (off on mobile) |
| `<Handle>` | content change | smooth enter/exit on children swap |
| `<AnimatedVarTextTag>` | — | low-level `animated[tag]` primitive |

For **text**, do not use these — use [[text-engine]].

## Choosing the right primitive

| Need | Component |
|------|-----------|
| Element fades/slides in when scrolled into view | `<Inview from={} to={} mode="once">` |
| Element moves continuously with scroll (parallax) | `<SpringTrigger mode="scrub">` |
| Element snaps to a state at a scroll point | `<SpringTrigger mode="toggle">` |
| Mouse hover animation — physical, or animating transforms | `<Hover from={} to={}>` |
| Hover/focus **colour, opacity or border** change only | plain CSS `transition-*` (ADR-0014) — no component |
| Just a 0–1 scroll progress value | `<ProgressTrigger onChange={}>` |
| Heading / copy reveal | `<TextEngine>` → [[text-engine]] |

## Common props

| Prop | Meaning |
|------|---------|
| `tag` | HTML element to render (`section`, `h1`, `div`…) — use the semantic one |
| `from` / `to` | spring start / end states — animatable CSS values only |
| `config` | `@react-spring/web` `SpringConfig` (`tension`, `friction`, …) |
| `mode` | trigger behaviour — varies per component (see below) |
| `delayIn` / `delayOut` | ms delay before enter / exit |
| `disableOnMobile` | respect the global mobile-disable config |
| `className` / `innerClassName` | Tailwind classes (kept separate from spring `style`) |

> Never pass Tailwind class names into `from`/`to`. Spring values are numbers or
> unit strings; classes go on `className`.

## Modes

- **`<Inview>` / `<Spring>`:** `"once"` (play once, stay), `"always"` (reverse on
  leave), `"forward"` (only on downward scroll).
- **`<SpringTrigger>`:** `"scrub"` (interpolate with scroll), `"toggle"` (snap at
  trigger point).

## Trigger positions (`start` / `end`)

Scroll components use a GSAP-style `TriggerPos` string:
`"<element-edge> <viewport-edge>"`, e.g. `"top bottom"`, `"center center"`,
`"bottom top-=100"`. Full grammar in [[text-engine]] (shared format).

## WebGL surfaces read their budget from `device.ts`

`src/lib/scene/device.ts` is the single place that decides tier, pixel-ratio
clamp, per-tier frame budget and antialiasing — ported from the
[[optimize-3d-scene]] playbook so the page's two canvases can never drift apart.
Anything that opens a WebGL context reads from it rather than hard-coding a
`MAX_DPR`. Numbers and trade-offs: [[decisions-log]] ADR-0026.

Two rules that come with it:

- **Gate the loop on `document.hidden` *and* an `IntersectionObserver`.** A
  background tab paints nothing and an off-screen section needs nothing.
- **Budget the expensive work, not the cheap work.** Throttling a whole ticker
  callback to the seek/draw rate also throttles the style writes inside it —
  which is what made the video scrubber step visibly behind the cursor. Subscribe
  at full rate and gate the costly part on its own timestamp.

## Spring configs must be serialisable

The spring components and `TextEngine` are client leaves, so a section that
stays a **Server Component** passes its `config` / `from` / `to` across the
RSC boundary. Those props must be plain data.

`easing` is the trap: `{ duration: 900, easing: easings.easeOutCubic }` carries a
**function** and throws at the boundary. Use physical springs instead —
`{ tension, friction, mass }` — which serialise cleanly and are what the system
wants anyway.

Shared presets live in `src/lib/springs/reveal.ts`:

| Export | Use |
|--------|-----|
| `revealConfig` | Default block/media entrance |
| `revealConfigSnappy` | Small items — labels, buttons |
| `revealConfigSoft` | Slow and fully damped; staged reveals that must not jitter |
| `fadeUp` / `fadeUpShort` | Fade up, long / short travel |
| `fadeUpBlur` | Fade up out of a blur — the audience cards |
| `fade` | Plain fade, for media that must not shift |
| `WORD_GAP_EM` | `TextEngine` word gap matching the font's real space |

> [!note] Animating `filter`
> react-spring interpolates the number inside a `blur()` string, so both ends
> must be written the same way — `blur(0rem)`, never a bare `none`, or the value
> type changes mid-flight and it throws. `rem` keeps the blur proportional under
> the adaptive grid.

A duration/easing config is still fine inside a component already marked
`"use client"`.

> [!warning] Use the **declarative** `useSpring`, not the imperative form
> `useSpring({ value })` — diffed on each render — works. The imperative
> `useSpring(fn)` + `api.start()` form **does not move the values** in this
> project's react-spring build. It fails silently: no error, the spring's
> `.get()` just never leaves its initial value. Recorded in `in-view.tsx` and hit
> again building `<DragSequenceVideo>`; drive the spring from React state
> instead.

## Global config

`src/lib/springs/config.ts`:

```ts
export const springsConfig = {
  mobileWidth: 768,
  disableOnMobile: {
    hover: true,        // always — no hover on mobile
    inview: false,
    spring: false,
    springtrigger: false,
  },
};
```

`isMobileDisabled(value, viewportWidth?)` checks the viewport against `mobileWidth`.
Pass a React-tracked width (e.g. from `useWindowWidth()`) as the second argument so
the check re-evaluates on resize; it falls back to `window.innerWidth` when omitted.
Components opt in per-instance via `disableOnMobile`. **Never disable animation
globally** — toggle per component when an animation hurts mobile UX.

## Underlying hooks

The components are built on `src/hooks/animation/` — also `#do-not-modify`. See
[[hooks]] for the catalog.

## Related

[[text-engine]] · [[components/animation-springs]] · [[data-flow]] · [[new-page]]
