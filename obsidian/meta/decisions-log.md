---
tags: [meta, decision]
updated: 2026-08-09
---

# Decisions Log (ADRs)

Architecture Decision Records. Each entry captures a choice, its context, and its
consequences. Use [[templates/adr-note]] for new entries. Newest first.

---

## ADR-0031 — Proximity decides when to build, never when to tear down

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** Both WebGL consumers were gated on `useDynamicInView`: the pixel
reveal keyed its effect on `[src, near]`, and `AudienceMark` rendered
`near ? <ScrollModel/> : null`. Leaving the section therefore disposed
everything, and returning rebuilt it — **mid-scroll**.

Measured on a production build, scrolling in and out of the location section
three times: `linkProgram` fired on **every** entry (1 → 2 → 3), each one
accompanied by a long task of **81 / 59 / 57 ms**, timestamps matching to within
5 ms. Worst frame across the pass: **92.8 ms**.

**Decision.** Latch the gate. Proximity flips a `useState` that only ever goes
false → true, so the resources are built once, the first time the section comes
near, and never torn down. Drawing is gated separately — the pixel reveal
already has its own `IntersectionObserver` and `document.hidden` check, and the
scene stops its loop off screen. That is the gate `optimize-3d-scene` §4 asks
for; unmounting is not.

**Consequences.** Repeat entries: **zero long tasks**, frame times p50 16.7 /
p95 17.0 / max **17.4 ms**. One 83 ms long task remains on the very first mount
(context creation, compile, and a 1.5 MB PNG decode + upload) — unavoidable
without moving the decode to `createImageBitmap`, which is left alone because
`UNPACK_FLIP_Y_WEBGL` behaves differently for `ImageBitmap` and would risk
mirroring the reveal. The cost is that the GL context and its textures stay
resident for the life of the page, which is the trade being made deliberately:
a few MB of VRAM against a 60 ms hitch every time the user scrolls past.

**Not fixed here, measured and noted:** `public/assets/Location/mask.png` is
1.5 MB and `location.png` 3.8 MB. The mask is loaded by hand for WebGL, so
`next/image` never touches it and the full 1.5 MB goes over the wire
(`optimize-3d-scene` §12).

---

## ADR-0030 — The tablet range does not scale

- **Status:** Accepted — amends ADR-0018 and ADR-0027
- **Date:** 2026-08-09

**Context.** The adaptive grid had two ranges: the 1440 composition scaling down
to 768, and a phone range re-based at 430. Everything between was the desktop
layout shrunk — at 834 px the root font-size measured **9.27 px**, the hero
subtitle **11.6 px**, body copy ~9 px. Proportional and unreadable, the same
failure ADR-0027 fixed for phones.

The obvious repair — a third vw-scaled range based at 834 — was tried and is
wrong. A tablet range spans roughly 540–1279, a **2.4× width ratio**, so any
single base puts one end badly out: based at 834 the root ran 10.7 px → 24.5 px
across the range. Worse, putting the desktop switch at 1024 meant iPad
landscape, an extremely common width, landed exactly on the cliff and rendered
the Figma composition at **11.4 px** body copy.

**Decision.** Three ranges, and the middle one is **fixed**:

| Range | Root | Layout |
|---|---|---|
| < 540 | `3.72093vw` (base 430) | phone stack |
| 540 – 1279 | **16 px, constant** | tablet stack, fluid |
| ≥ 1280 | `1.111111vw` (base 1440), scaling up via `AdaptiveGrid` | Figma composition |

The desktop composition moved from `md:` to `lg:`, with `--breakpoint-lg`
overridden to 1280 and a new `--breakpoint-tablet` at 540. `md:` is left at
Tailwind's 768 and deliberately unused for layout, so a stray `md:` cannot
half-apply the desktop composition to a tablet.

**Consequences.** Type is constant and readable across the whole tablet range
(16 px at 834, at 1024, at 1180), and both boundaries are nearly continuous:
1279 → 1280 steps 16 → 14.2 px, where 1023 → 1024 had stepped 19.6 → 11.4 px.
The phone range now ends at 539 rather than 768, so its top end is 20.1 px
instead of 28.6 px.

The cost: within the tablet range the layout is genuinely fluid rather than
proportional, so it is **not** a scaled copy of a Figma frame — it is the
stacked layout with `tablet:` refinements (stats in a row, cards two-up, form
fields side by side, a capped reading measure). Anything added there has to be
designed to work fluidly rather than measured off a frame.

---

## ADR-0029 — The wordmark needs the variable font, not a static cut

- **Status:** Accepted — supersedes the 9 pt experiment in the eighth pass
- **Date:** 2026-08-09

**Context.** The hero wordmark rendered visibly heavier than the Figma frame.
An earlier pass tried the 9 pt Thin cut and measured it **66 % heavier** than
the 24 pt; the conclusion drawn then — that a *larger* optical size was what
was needed — was right, and this is the follow-through.

Figma's own text properties for the node confirm it: `Google Sans Flex:Thin`
with `"wdth" 100, "GRAD" 0, "ROND" 0` and **no `opsz`**, which means Figma is
letting optical size follow the type size. At 801 px that pins `opsz` to the
axis maximum, where the strokes are a hairline. The project shipped only static
**24 pt** instances, which have no `opsz` axis at all (verified: their table
directory contains `STAT` but no `fvar`), and a 24 pt cut carries deliberately
thicker strokes so it holds up at 24 pt.

**Decision.** Ship the official Google Fonts **variable** build alongside the
static cuts, latin subset (the wordmark is three distinct letters), as a second
`next/font/local` family bound to `--font-display`. Browsers apply
`font-optical-sizing: auto` by default, so the wordmark needs no explicit
variation settings — at 801 px `opsz` lands on the axis maximum on its own, and
it stays there at every grid width because the type is far above the axis range.

**Consequences.** Two families are loaded. That is the correct model rather than
a workaround: 24 pt static is *right* for body copy, and display type wants the
large optical cut. Body text keeps the static family. Anything new set above
roughly 100 px should use `font-display`; anything at reading size should not.

---

## ADR-0028 — The preloader reveal is a hole in the curtain

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The design ends the preloader by revealing the page through a
rounded rectangle that grows to fill the screen. The shipped version faded the
curtain out on opacity instead, which dissolves the whole screen at once and
reads as nothing in particular. Two attempts at the real thing failed:

1. **Scale the curtain away.** The counter sits inside the curtain, so scaling
   the curtain dragged the counter off the bottom edge as it left.
2. **Clip the page.** `clip-path: inset(38% round 6rem)` on the scroll wrapper,
   opened to `inset(0%)`. `clip-path` percentages resolve against the
   **element's border box**, and `.scroll-layout-content` is the height of the
   whole document — `inset(19%)` cut ~1140 px off the top and the first screen
   rendered white. Separately, any `clip-path` establishes a containing block
   for fixed descendants, so a clip left behind at `inset(0%)` permanently
   re-anchors the fixed header. (`if (done) return null` does **not** unmount a
   component, so the effect cleanup that would have removed it never ran — the
   effect has to depend on `done`.)

**Decision.** Cut the window **out of the curtain**:
`clip-path: path(evenodd, "<viewport rect> <rounded rect>")` on the fixed,
viewport-sized curtain element, with the inner rect scaled from zero to the full
viewport by a spring and written each frame from the shared ticker. The curtain
carries no transform at all, so the counter stays where the layout put it.

**Consequences.** The page is never clipped, so neither failure mode is
reachable: no percentage basis to get wrong, and the containing block goes away
with the curtain. The path is built in pixels from `window.innerWidth/Height`
and the **measured** root font-size — under the adaptive grid a rem is not 16 px
except at 1440, so a hard-coded `16` would size the corners wrong everywhere
else. See [[frontend/components/common]].

---

## ADR-0027 — The grid re-bases for mobile, and TextEngine cannot come with it

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** ADR-0018 gave the site one breakpoint: the 1440 design scaled
proportionally at every width. Its stated consequence finally came due — at
390 px the root font-size was 4.33 px, so 16 px body copy rendered at ~4 px.
Proportional, and unreadable.

**Decision.** Add a second breakpoint that **re-bases to 430** below 768 px, and
give every section a stacked mobile layout with the 1440 composition preserved
verbatim behind `md:`. Root font-size at 390 px goes 4.33 px → **14.51 px**.

**Consequences.**

- **Re-basing without laying out is worse than not re-basing.** The moment the
  grid re-based, the still-1440-based sections stopped being *small* and started
  being *clipped* — children running to 1270 px inside a 390 px viewport, hidden
  by `overflow-x-clip`. The two changes are a single unit of work; shipping the
  breakpoint alone would have been a regression.
- **A mechanical conversion does not work.** Rewriting `absolute …` to
  `md:absolute …` by regex left the matching `top-*` / `w-*` unprefixed (so they
  applied on mobile too) and caught two component-internal `absolute` rules that
  are not layout at all. It was reverted and redone as exact per-section
  replacements.
- **`TextEngine` positions its split children absolutely**, so they never
  participate in flex wrapping. A heading that fits at 1440 simply runs off a
  narrow screen and **no CSS reaches it** — not `white-space: normal`, not the
  `!` modifier, not splitting the phrase into per-word spans (all three were
  measured and all three failed). The fix is structural: one `<h1>`, plain text
  below the breakpoint, the animated version from `md:` up. Any future
  responsive `TextEngine` heading needs the same treatment.
- The hero photograph's aspect matches its section exactly, so `object-cover`
  has no slack and `object-position` cannot move it. Raising it needed a
  bottom-anchored, slightly taller layer (`anchor="start-raised"`) — sliding it
  up would have lifted the terrain off the bottom edge.

---

## ADR-0026 — Device tiering, and what the `optimize-3d-scene` pass actually changed

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** Two freeze reports — the location section, and the boundary where
the mark emerges into the audience grid. The page now carries **two** live WebGL
consumers plus six backdrop-blurred cards, so this went through the
`optimize-3d-scene` skill (hard rule #11) rather than being improvised.

**§0 first, and it changed the diagnosis.** Measured on a *production* build,
not the dev server, because the skill is right that dev numbers are worthless
here (Strict Mode double-mounts, chunks serve eagerly). rAF held a flat 16.7 ms
in every zone both before and after — and it always will, because this
environment renders through SwiftShader. **Only counted quantities transfer**, so
the metric that mattered was live drawing-buffer pixels.

**Decision.** Port the playbook's `device.ts` (§2) as the single place that
decides tier, DPR, frame budget and antialiasing, and apply §4–§8 to both
canvases.

| | before | after |
|---|---|---|
| live drawing-buffer pixels (both canvases) | 3,963,158 | **3,468,270** |
| reveal canvas | 1781 × 1198 @ DPR 1.5 | 1425 × 1150 @ DPR 1.0 |
| real-time lights in the scene | 3 | **1** + IBL |
| three/Draco fetched before any scroll | — | **0 bytes**, total JS 195 KB |

The reveal canvas *grew* 20 % taller in the same pass (it now rides the
photograph's parallax layer, ADR below), so the like-for-like saving on it is
larger than the table suggests: 3.69 M → 1.64 M pixels.

**Consequences and trade-offs.**

- **`hardEdged` had a bug worth remembering.** The first cut only lowered the
  DPR ceiling on *mobile*, so a desktop retina buffer kept rasterising 1.5× the
  fragments for an effect quantised to an 84 × 56 grid. Soft content is now
  capped on every tier. Measured: the "after" got *worse* than baseline until
  this was fixed — which is the whole argument for §0.
- **§1 is satisfied without making the route dynamic.** The skill's `isBot()` +
  `headers()` route would opt `/` out of static prerendering — a real cost it
  tells you to state. Not needed: the §4 proximity gate already means a client
  that never scrolls never mounts the scene, so a crawler fetches **zero**
  three/Draco bytes and `/` stays `○`. Strictly better than the prescribed fix
  for this page.
- **§5 desktop budget stays 0** (every tick), per the playbook. The saving comes
  from §4 gating instead: neither canvas now runs while the tab is hidden or the
  section is off screen — the reveal was previously sweeping its 4 704-cell grid
  every frame for the life of the page.
- **Two lights were dropped.** The PMREM'd room already supplies the fill and
  rim they were doing; on a single dark metal object the difference is not
  visible, and every real-time light multiplies the fragment cost of every lit
  material.
- **Not measurable here:** the user's actual GPU-side stutter. SwiftShader makes
  absolute fps meaningless, so the fill-rate wins are argued from counted
  pixels, not observed frames. Confirm on the real machine.
- The six backdrop-blurred cards over a live canvas remain the most expensive
  thing in the section. They are a deliberate design requirement (ADR-0023/0025),
  so they stay — but if stutter persists, that is the next thing to trade.

---

## ADR-0025 — Nothing above a glass surface may carry a filter or fade

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The audience cards were given `backdrop-filter` (ADR-0023) and the
frosted effect never appeared — while that section also became the worst part of
the page for stutter. Inspecting the ancestor chain explained both at once: the
card's parent, the `<Inview>` wrapper doing the blur-in reveal, was sitting at
`filter: blur(0.024px)` and `opacity: 0.998`.

Either of those establishes a **backdrop root**. The glass was therefore
sampling an empty backdrop: it did the full GPU work of a blur every frame and
painted nothing. Worse, springs settle *asymptotically* — they never reach
exactly `blur(0)` or `opacity: 1` — so a blur reveal leaves a backdrop root on
the element **permanently**. The effect could not have come back on its own.

**Decision.** A glass surface owns its own box, and its reveal is applied to its
**contents**. `Card` is now a plain glass `<article>` with the staged
`<Inview>` inside it, so nothing above the `backdrop-filter` element is
filtered or faded.

**Consequences.**

- The glass panels no longer animate in — only their contents do. That is the
  cost of the effect working at all, and it is the right trade: the panels are
  the layout, the content is the reveal.
- **This is a general rule, not a card detail.** Any `backdrop-filter` anywhere
  is one animated ancestor away from silently doing nothing. When adding one,
  check the chain — `filter`, `opacity < 1`, `mask` and `mix-blend-mode` all
  break it.
- It was also pure waste: six large permanently-filtered layers, each forcing
  its own composited surface over a live WebGL canvas, for zero visual result.
- The mark's canvas was narrowed to a centred 480 px column at the same time
  (5.4 M → 1.8 M pixels), since the mark travels down the middle and never
  needed the full section width.

---

## ADR-0024 — Heavy WebGL mounts are gated on proximity, not just code-split

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The site froze intermittently. Measuring rather than guessing:
`rAF` held a steady **16.7 ms through every section while scrolling** — the jank
was not during scroll at all. The only long tasks were **67 ms and 125 ms, both
at scroll 0**. The resource timeline explained it: three core (283 KB), three
module (129 KB), three examples (44 KB) and the Draco decoder all fetched from
~757 ms — while the visitor was still looking at the hero.

Both WebGL consumers were already behind `next/dynamic` / below the fold, and
that was the trap: **code-splitting defers the bundle, not the work.** The
component mounts immediately, so the chunk downloads, parses, creates a GL
context, generates a PMREM environment (which renders a scene) and decodes a
1.4 MB PNG — all on the main thread, at load.

**Decision.** Gate the *mount* on proximity to the viewport with
`useDynamicInView({ rootMargin })` — 800 px for the 3D mark, 600 px for the
pixel reveal. The heavy work now starts shortly before the section is needed and
never during the hero.

**Consequences.**

- Nothing heavy touches page load: verified `[]` heavy resources at scroll 0,
  and all six still present once scrolled.
- **`next/dynamic` is not a performance measure on its own.** Anything that
  costs main-thread time on mount — a GL context, a WASM decoder, a large
  decode — needs a visibility gate as well. Treat the two as separate concerns.
- The margins are a latency trade: too small and the section arrives before the
  model does. 800/600 px was comfortable at normal scroll speeds; a flick to the
  bottom can still outrun it.
- Canvas pixel ratios are capped too (1.5 for the model, 1.25 for the reveal) —
  both canvases span whole sections, and neither effect gains from a retina
  buffer.
- Measure before optimising here. The intuitive culprits — parallax springs,
  backdrop-blur over a live canvas — were not producing dropped frames; the cost
  was entirely at startup.

---

## ADR-0023 — The mark travels the section; the cards become glass

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The 3D mark started life inside one grid cell. The brief moved it:
it should rise from beneath the location block, pass *through* the audience
cards, and slide away under the contact block.

**Decision.** Its canvas fills the whole audience section, which is
`overflow-hidden`. The model's vertical position is driven by the section's own
scroll progress, so it enters from above the top edge and leaves past the
bottom — **the clipping is the effect**. Neither neighbouring section needs to
know anything about it, and no `z-index` juggling across sections is required.

The card grid sits at `z-10` above the canvas, and the cards changed from opaque
`--surface-muted` to a translucent `--surface-glass` with `backdrop-blur-glass`,
so the mark stays readable as it passes behind them.

**Consequences.**

- **Model size had to become resolution-independent.** The canvas grew from one
  448 × 450 cell to the full 1440 × 1694 section, and a world-unit scale would
  have made the model ~4× bigger for free. `ScrollModel` now takes
  `heightRatio` — height as a fraction of the canvas — and derives the world
  scale from the camera frustum, so apparent size no longer tracks the
  container.
- **The canvas is now section-sized**, so it is gated: `MAX_DPR` dropped to 1.5
  and an `IntersectionObserver` skips rendering entirely while the section is
  off screen.
- **Rotation is frame-rate independent.** The old fixed per-frame lerp settled
  at different speeds on 60 Hz and 120 Hz displays and stuttered on any long
  frame; it is now `1 - exp(-dt / tau)`, which settles at the same rate on any
  refresh rate. This is what "rotates smoothly" actually requires.
- Glass cards mean the grid no longer hides what is behind it — anything else
  placed in the audience section will now show through.

---

## ADR-0022 — The cursor warp is a `backdrop-filter`, not a canvas

- **Status:** **Reverted** (2026-08-09) — the effect was cut on request and
  `cursor-pixel-wave.tsx` deleted. Kept because the finding outlives the
  feature: if a cursor-following *content warp* is ever wanted again, this is
  the technique and these are the options that do not work.
- **Date:** 2026-08-09

**Context.** The brief for the site-wide cursor effect was a soft pixel wave
that **warps the content** under it. That word rules out the obvious build: a
fixed WebGL or 2D canvas can draw *over* the page, but it cannot read what is
beneath it, so it can never distort real content.

Three options were considered. Rendering the DOM to a texture (html2canvas) is
slow, breaks on live content, and would fight the parallax springs. Applying an
SVG filter to `<main>` does warp real content, but re-rasterises the entire
scrolling subtree every frame — and the springs mutate that subtree constantly.

**Decision.** A small fixed element that follows the cursor and carries
`backdrop-filter: url(#cursor-pixel-wave)`. The backdrop *is* the real page, so
the warp is genuine, and the cost is bounded by the element's size rather than
the page's. The filter is `feTurbulence` → `feComponentTransfer` (with
`discrete` tables, which quantise the smooth noise into steps and is what makes
it read as **pixels** rather than a ripple) → `feDisplacementMap`.

**Consequences.**

- **Chromium-first.** `backdrop-filter` with an SVG `url()` reference is not
  universally supported; where it is not, the disc simply has no effect and
  nothing else breaks. Verify in Safari/Firefox before treating it as shipped.
- Bounded cost, and **zero cost at rest**: strength springs to 0 shortly after
  the pointer stops and the element then unmounts, so an idle page is not
  compositing a backdrop filter that is doing nothing.
- Pointer-only: gated behind `(hover: hover) and (pointer: fine)` plus the
  mobile width, since there is no cursor to follow on touch.
- The filter `<defs>` render whenever the effect is enabled, not only while the
  disc is up — otherwise the first pointer move pops as the filter is defined.

---

## ADR-0021 — three.js enters the stack, and the model is Draco-compressed

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The centre cell of the audience grid moved from a flat SVG mark to
a real 3D model that turns with the scroll. Nothing in the stack could render
glTF, so this is the project's first 3D dependency.

**Decision.** Add `three` (0.185.1) and render the model in a small purpose-built
component rather than adopting a React renderer — the scene is one model, three
lights and an environment, and `@react-three/fiber` would add a second reconciler
for no benefit.

**Consequences.**

- **It is code-split.** `three` is ~150 KB and the mark sits well below the
  fold, so `ScrollModel` is loaded through `next/dynamic` with `ssr: false`
  (it needs a WebGL context). It must not be imported statically.
- **The `.glb` is Draco-compressed** — that is why it is 3 KB — so `GLTFLoader`
  alone fails with *"No DRACOLoader instance provided"*. The decoder is served
  from `public/draco/`, copied out of
  `three/examples/jsm/libs/draco/gltf/`. **Re-copy it when three is upgraded**;
  a decoder mismatched to the runtime is a silent load failure.
- `public/**` is now ESLint-ignored. The vendored decoder is minified
  third-party code and produced nine lint errors that are not ours to fix.
- **A metal needs an environment.** With none, `metalness: 1` renders as a flat
  black silhouette — the material is almost entirely reflection. A PMREM-filtered
  `RoomEnvironment` supplies it; "matte" is then high `roughness` (0.62), which
  keeps the reflection broad instead of mirror-sharp.
- Scroll progress reaches the scene through a **ref**, not a prop, so a value
  that changes every frame never re-renders React.
- This project now renders a WebGL scene, so hard rule #11 applies: a future
  performance or jank request goes through the `optimize-3d-scene` skill first.

---

## ADR-0020 — A scrubbed video stands in for an image sequence

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The about section needed a 360° turntable the visitor can rotate by
dragging. The classic implementation is an image sequence — 100+ stills
preloaded and swapped by index — which is simple but costs a request per frame
and megabytes of transfer.

**Decision.** Ship one `<video>` and never `play()` it. Drag drives a spring;
the spring's value is mapped onto `currentTime` every frame through the shared
ticker. `about-video.mp4` is 960 × 960 / 4.096 s in **3.2 MB** — the equivalent
sequence would be an order of magnitude more.

**Consequences.**

- **The encode is now a hard requirement, not a detail.** Scrubbing seeks
  constantly, so the file must be **all-keyframe**; with sparse keyframes the
  browser snaps to the nearest one and the rotation reads as steppy. Any
  replacement asset must be re-checked (`-g 1 -keyint_min 1 -sc_threshold 0`).
  This is the kind of thing that silently regresses when someone swaps the file.
- Interaction is spring-driven per hard rule #1, so a flick keeps spinning and
  decelerates naturally — and the same spring smooths the frame-to-frame seeks.
- It is a real control, so it is a `role="slider"`: focusable, ←/→ step 15°,
  `Home` resets, angle exposed via `aria-valuenow`. `touch-action: pan-y` keeps
  vertical page scrolling working on touch.
- Two failure modes were hit while building it and are recorded in
  [[components/ui]] because both are invisible until exercised: the imperative
  `useSpring(fn).api.start` form does not move values in this react-spring build
  (matching the note in `in-view.tsx`), and a server-rendered `<video>` can
  finish loading **before** hydration, so `onLoadedMetadata` never fires and the
  control stays dead unless `readyState` is also adopted in an effect.

---

## ADR-0019 — Figma's text-box trim is reproduced with margins, not `text-box`

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** Nearly every text node in the AERRA Figma frame carries
`text-box-trim: trim-both` / `text-box-edge: cap alphabetic`. That is not a
cosmetic setting: it means the `y` Figma reports is the **cap-height top of the
ink**, not the top of the line box. Porting coordinates 1:1 without reproducing
the trim puts every heading 8–12 px low and inflates its measured height (the
hero `h1` measured 160 px against Figma's 137).

CSS has the exact equivalent — `text-box: trim-both cap alphabetic` — and it was
tried first. Two problems killed it:

1. It is Chromium-only (133+). Safari and Firefox would silently fall back to
   half-leading and the whole page would sit low there.
2. Decisively, it has **no effect on a flex container** — which is precisely
   what `TextEngine` renders. The five display headings, the ones where the
   offset is most visible, are exactly the elements it cannot reach.

**Decision.** Reproduce the trim geometrically with negative block margins, as
two `@utility` rules in `globals.css` — `text-trim-flat` (pairs with
`leading-flat`) and `text-trim-body` (pairs with `leading-body`). Derived from
Google Sans Flex's metrics (ascent .9625em, descent .2875em, cap .725em):

```
block-start = (line-height − 1.25em) / 2 + .2375em
block-end   = (line-height − 1.25em) / 2 + .2875em
```

A negative top margin lifts the border box by exactly the internal ink offset,
so the ink lands where the box top would have been — the same result the trim
produces, in every browser, on any element.

**Consequences.**

- Pick the utility that matches the element's `leading-*` class. A new leading
  needs a new utility, not a tweak to an existing one.
- The values are **font-specific**. Changing the typeface invalidates them;
  re-measure with `canvas.measureText` (`actualBoundingBoxAscent` for cap
  height, `fontBoundingBoxAscent/Descent` for the content area).
- `getBoundingClientRect().height` still reports the untrimmed line box. Verify
  ports against the **ink** position, not the box height.
- Related: `TextEngine`'s word gap defaults to `0.3em`, wider than Google Sans
  Flex's real space (`0.2245em`), which pushed two headings onto an extra line.
  `WORD_GAP_EM` in `src/lib/springs/reveal.ts` restores the design's line
  breaks. Its inline `flex-wrap: wrap` needs `.text-engine-nowrap` in
  `@layer components` to override.

---

## ADR-0018 — One design width, one grid breakpoint, fully proportional

- **Status:** Accepted
- **Date:** 2026-08-09

**Context.** The starter ships four grid breakpoints (1920 / 1440 / 1024 / 360),
each re-basing the root font-size to the design width its range was laid out at.
That is right when you have a design per range. AERRA has **one** — the 1440
Figma frame — and the brief was that it hold its Figma proportions at every
viewport.

Left as shipped, the `≤1024` and `≤640` rules would re-base to 1024 and 360
while the markup still measures 1440 design px in rem, so a 1360 px grid row
would overflow a 1024 px viewport. The scale-**up** path had the mirror problem:
`useAdaptiveGrid`'s default `coef` of 0.6666 damps the growth deliberately, so
above the base width the layout drifts off its proportions by design.

**Decision.** Collapse `GRID_BREAKPOINTS` to a single `{ maxWidth: 1440,
baseWidth: 1440 }`, leave one matching `html` media query (`1.111111vw`), and
mount `<AdaptiveGrid coef={1} />` so the scale-up is fully proportional too. The
page then behaves as a fixed-aspect composition: page-height ÷ viewport-width
holds at 4.9993 (Figma's 7199 ÷ 1440) from 390 px to 1920 px, with no horizontal
overflow at any width.

**Consequences.**

- **A desktop-only design scaled to a phone is unreadable** — at 390 px the root
  font-size is 4.33 px, so 16 px body copy renders at ~4 px. This is the correct
  behaviour for the brief, not a bug, but it is the reason to add mobile frames.
- **Adding a mobile design is the fix, and it is a two-file change:** add the
  breakpoint to `grid.config.ts` *and* the matching `html` media query to
  `globals.css`. They are not derived from each other — leaving one behind is a
  silent, hard-to-spot layout break.
- `coef={1}` is a prop, not a new default; `useAdaptiveGrid` is untouched.
- One nuance the grid cannot see: `vw` includes the classic scrollbar while the
  content box excludes it, so on platforms with non-overlay scrollbars the
  content is ~15 px narrower than `90rem`. Left-anchored positions stay exact;
  the right margin runs short by that much.

---

## ADR-0017 — A skill states its preconditions and its own internal conflicts

- **Status:** Accepted
- **Date:** 2026-07-24

**Context.** `optimize-3d-scene` (ADR-0016) was run for the first time on a real
scene outside this repo — a raw WebGL project, no three.js, no scroll. The fix
order held up; what cost hours was everything the skill left implicit. Ranked by
time burned:

1. **§0 could not be executed at all.** `renderer.info.render` /
   `.programs.length` exist only on `THREE.WebGLRenderer`, yet the skill's own
   title says "three.js / WebGL". The agent had to invent instrumentation before
   it could take a baseline.
2. **The measurement environment was never stated**, and all three failure modes
   fired: dev-mode numbers are invalid (eager chunk serving faked a §1 failure;
   Strict Mode's double-mount faked 2 listeners and a halved frame rate), a
   stale `next start` on the port served 500s that read as a code bug, and
   `waitUntil: "networkidle0"` never fires against `next start`.
3. **§1 actively breaks §3.** `dynamic(ssr: false)` means the scene cannot
   compile until after hydration; on Regular 3G + 4× CPU programs linked at
   5.0 s against a loader that lifted at 2.36 s. Two correct steps, silently
   contradicting each other.
4. **§3's stall list was GPU-only** — all four causes shader/texture/target —
   but the worst stall measured was a 3.9 s main-thread CPU decode. Workers
   appeared nowhere in the skill.

Plus four smaller ones: the `as="fetch"` preload credentials trap (only
`use-credentials` + `include` dedupes; the other pairings silently
double-download), §5's `1000/30` actually measuring ~26 fps because of how the
ticker throttles, §7's "cut the sparse end" having no lever on a *baked* point
buffer, and §13's `lvh` being read as applying to the layout when it is for the
canvas only.

**Decision.** Fold all of it back into the skill, and adopt two rules for how
this and every future skill is written:

- **A step states its preconditions.** §0 now ships a `getContext` hook that
  gives a raw WebGL scene the counted equivalents of `renderer.info`
  (`draws` / `verts` / `links[]` timestamps / captured `attrs`), and a
  *measurement environment* block: production build, kill the old server first,
  `waitUntil: "load"`, and — because SwiftShader is not a GPU — only counted
  quantities transfer, never absolute fps.
- **A step names where it fights another step.** §3 now carries the §1 conflict
  explicitly, with the measurement that exposes it (link timestamps vs handoff
  time) and the fix (preload the data from the HTML; gate the loader on
  scene-ready, not on a duration).

Also added: §3 gains a fifth stall cause (CPU decode → Worker, with
transfer-in-both-directions) and the preload-credentials warning; §5 states the
~26 fps reality; §7 requires a decile ordering check before truncating a baked
buffer; §13 splits canvas `lvh` from content `dvh`; §1's poster is rejustified
(crawler screenshots and the no-WebGL fallback — *not* layout stability) with
two crops for tighter-axis framing and the `headers()` → `○`→`ƒ` prerender
trade-off named.

**Consequences.** The skill now works on a scene with no three.js in it, and its
first section can be executed instead of merely read. The cost is a longer §0 —
an agent must build instrumentation and a production build before touching
anything — which is the correct tax: every number the skill asks for later is
worthless without it. Deliberately kept unchanged, because the field run
confirmed them: the cheapest-first ordering, the canonical-file table, and
"don't invent new shapes; port these" — the `device.ts` port dropped in clean
and is most of why that run went as fast as it did.

---

## ADR-0016 — Skills are registered in the vault, not just dropped in `.claude/`

- **Status:** Accepted
- **Date:** 2026-07-24

**Context.** The first Claude Code skill for this starter —
`optimize-3d-scene` — arrived as a folder under `.claude/skills/`. A skill there
is discoverable to Claude Code *at runtime*, but it is invisible to the vault:
nothing in `obsidian/` said it existed, when to reach for it, or how it relates
to the hard rules. That contradicts ADR-0006 (the vault is the single source of
truth) and leaves the invocation decision to model judgement — exactly the kind
of thing this project pins down in writing. A performance request on a
scene-carrying project would otherwise get whatever fix order the agent invented
that day, when the skill exists precisely because the order matters (audit →
bot path → tiering → prewarm → visibility gate → budgets → fill).

**Decision.** A skill is only "installed" once it is registered:

1. The skill lives at `.claude/skills/<name>/`.
2. A vault note under `workflows/` documents what it does, its trigger
   conditions, and how it maps onto this project's primitives.
3. It is linked from [[README]]'s Map of Content and from the skills table in
   [[ai-agent-guide]].
4. If invocation should be non-optional, the routing rule goes into AGENTS.md's
   hard rules — the shim every agent reads first.
5. It is logged in [[changelog]].

For `optimize-3d-scene` this became **hard rule #11**: a performance / jank /
pre-ship request **and** a three.js or WebGL scene in the project → invoke the
skill and follow its order. The vault note [[optimize-3d-scene]] additionally
maps the skill's canonical patterns (which reference an external workspace) onto
what the starter already ships — the shared ticker (ADR-0009) for its one-rAF
rule, `isBot()` (ADR-0010) for its bot path, the Lenis store for scroll, the
in-view hooks for its render gate — so following the skill does not produce a
second copy of infrastructure that exists.

**Consequences.** Skill invocation becomes a documented rule rather than a guess,
and the routing survives model, tool and session changes because it lives in
AGENTS.md and the vault, not only in the skill's own `description`. The cost is
one extra note plus two index edits per skill — the same tax every component and
hook already pays. The starter still ships **no `three` dependency**
([[tech-stack]] unchanged); rule #11 is dormant until a project adds one. A
wrong vault path inside the skill (`obsidian/Meta/…`, plus an `open-questions.md`
this vault does not have) was corrected as part of registering it — registration
is also the moment a skill gets checked against reality.

---

## ADR-0015 — Strict three-tier design-token naming convention

- **Status:** Accepted
- **Date:** 2026-07-17

**Context.** ADR-0004 made tokens the styling currency but never said what a token
should be *called*. The starter shipped two tokens (`--background`,
`--foreground`) and no grammar, so every project built from it would invent its
own — defeating the point of a shared starter, since an agent moving between
projects could not predict a token name without reading `globals.css`. Reference
taken from [Mavik Labs — *Design Tokens in Tailwind v4*](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/)
(three tiers: primitive → semantic → component).

**Decision.** Adopt the three-tier model with an explicit grammar, documented in
[[design-system]] and codified as AGENTS.md hard rule #4:

| Tier | Grammar | Lives in |
|------|---------|----------|
| Primitive | `--raw-<category>-<name>[-<shade>]` | `:root` |
| Semantic | `--<role>[-<variant>][-<state>]` | `:root` |
| Component | `--<tw-namespace>-<component>[-<property>]` | `@theme inline` |

- Only Tier 1 holds literals; Tier 2 names purpose, never appearance; Tier 2 is
  the themeable layer (dark mode overrides there). No tier may be skipped.
- Every `@theme inline` entry is exactly `--<namespace>-<role>: var(--<role>)`.
  `inline` is load-bearing — it inlines the `var()` into each utility so Tier 2
  overrides cascade; binding a literal freezes the value and breaks theming.
- Tier 3 stays rare by design (ADR-0012 prefers a React component).

**Two deliberate deviations from the reference article**, both verified against
`tailwindcss` v4.3.3 by compiling a probe stylesheet:
1. The article names primitives `--color-blue-500`. We prefix them `--raw-*` and
   keep them out of `@theme` — under Tailwind v4 a `--color-*` entry *generates
   utilities*, so naming primitives that way would emit a `bg-blue-500` for every
   raw value and let markup bypass the semantic tier.
2. The article lists `--duration-fast` / `--duration-normal` next to `--ease-*`.
   **There is no `--duration-*` namespace in Tailwind v4** — the probe confirmed
   `duration-fast` compiles to nothing and the variable is not even emitted from
   `@theme inline`. Durations therefore stay Tier 2 only, consumed as
   `duration-[var(--duration-fast)]`. (`--ease-*` *is* a real namespace and is used.)

Retrofit is **minimal and unopinionated**: the existing background/foreground
tokens were restructured into the tiers, and the primitives/durations/`--ease-entrance`
/`--leading-display` they imply were added. **No brand palette was invented** —
the convention is the deliverable; projects add `--raw-color-brand-*` themselves.

**Consequences.** Token names are now predictable across every project from this
starter. This **amends ADR-0004**, which said only that new values go in
`globals.css` first — they must now also follow the tier grammar. `globals.css`
grew a documented tier structure but stays bounded (ADR-0012). Existing markup is
unaffected: `bg-background` / `text-foreground` still resolve, since the Tier 2
names and `@theme` bindings kept their public names.

---

## ADR-0014 — Narrow CSS-transition exception for trivial state changes

- **Status:** Accepted
- **Date:** 2026-07-17

**Context.** ADR-0002 banned CSS transitions outright to force every motion
through the spring layer. In practice the ban's cost lands hardest where its
benefit is lowest: a nav link fading its colour on hover had to become a client
component wrapping `<Hover>` with a spring config, to animate one property that
no user will ever interrupt or perceive as physical. The rule pushed teams toward
either boilerplate or quiet rule-breaking.

**Decision.** Keep hard rule #1 for all real motion; carve out one narrow,
condition-bound exception. CSS `transition-*` is allowed **only** for simple,
discrete state changes — `hover:` / `focus-visible:` / `active:` colour, opacity,
border-colour, underline, and small decorative nudges — subject to three
conditions, all required:

1. **Token-backed timing** — `duration-[var(--duration-fast)] ease-entrance`; raw
   ms/cubic-bezier values remain banned by hard rule #4.
2. **`transition-*` only** — `@keyframes` stay banned outright. Anything long
   enough to need keyframes is long enough to deserve a spring.
3. **Utilities only** — the transition lives in `className`, never in a CSS file
   (ADR-0012).

Everything scroll-driven, revealing, layout-affecting, staggered, orchestrated,
or interruptible remains spring-based; text remains [[text-engine]]. Anything
past the allowed list is `<Hover>`.

**Consequences.** A hover colour change no longer needs a client component — the
common case gets cheaper and the spring layer keeps the cases it is actually good
at. This **amends ADR-0002**, whose "CSS transitions are banned" is now "CSS
keyframes are banned; transitions are limited to the list above". The exception is
deliberately narrow and enumerated rather than a judgement call ("simple
animations") so it cannot erode into general CSS animation. `--raw-duration-*` /
`--duration-*` / `--ease-entrance` tokens exist to serve it (ADR-0015).
[[animation-system]], [[design-system]], and [[ai-agent-guide]] updated to match.

---

## ADR-0013 — `<Inview>` self-observe fix; spring components honour resize

- **Status:** Accepted
- **Date:** 2026-06-07

**Context.** `<Inview>` only animated when an external `trigger` ref was passed.
Without one it never revealed. Root cause: `useDynamicInView` returns its target
attachment as a **callback ref** (`setNode`) in the first tuple slot, but
`in-view.tsx` destructured it as `inViewRef` and wrote `inViewRef.current = node`
in the JSX `ref` callback — assigning `.current` to a function instead of calling
it. `setNode` never ran, the observed `node` stayed `null`, and with no `trigger`
the observer had nothing to watch (`trigger?.current ?? node` → `null`). With a
`trigger` it worked only because `trigger.current` bypassed the dead `node` path.
TypeScript flagged this at build time (`Property 'current' does not exist on type
'TargetRefCallback'`), so the build was already failing.

Separately, `<Inview>`, `<Spring>`, and `<Hover>` tracked `width`
(`useWindowWidth()`) as a `useMemo`/`useEffect` dependency to re-evaluate mobile
gating on resize, but never passed it to `isMobileDisabled()` — so the value was
genuinely unused (ESLint `react-hooks/exhaustive-deps` warning) **and** resize
re-evaluation silently did nothing; the check always read `window.innerWidth` at
call time.

**Decision.** This is the second authorized edit to the `#do-not-modify` engine
(after ADR-0009). Two corrections:
1. In `in-view.tsx`, call the callback ref — `setInViewNode(node)` — instead of
   assigning `.current`, so the component observes itself when no `trigger` is
   given.
2. Pass the React-tracked `width` into every `isMobileDisabled(value, width)`
   call across `in-view.tsx`, `spring.tsx`, and `hover.tsx`. This is the
   documented second parameter of `isMobileDisabled` and makes the `width`
   dependency meaningful, fixing resize re-evaluation and clearing the lint
   warnings.

**Consequences.** `<Inview>` now works standalone (the common case). `yarn build`
and `yarn lint` are both clean (0 errors, 0 warnings). The springs folder remains
`#do-not-modify` by default — these were explicitly signed-off bug fixes.

---

## ADR-0012 — Styling lives in utilities and components, not `globals.css`

- **Status:** Accepted
- **Date:** 2026-05-22

**Context.** ADR-0004 made design tokens the styling currency and ruled that
"new values must be added to `globals.css` first." Combined with the
design-system guidance to *"extract repeated multi-class patterns to
`@layer components`"*, the path of least resistance for any repeated visual
pattern became a named class in `globals.css`. On an animation-heavy,
multi-section marketing site that grows the file without bound — a single
global stylesheet accumulating hundreds of component-specific classes that are
never deleted when their component is. The fix is a placement rule, not a
file-splitting trick: splitting `globals.css` into many files only spreads the
same bloat.

**Decision.** Styling follows a strict placement order; `globals.css` stays
bounded by design.

- One-off styling → **Tailwind utilities** in `className`. Nothing enters CSS.
- A repeated pattern with markup/structure/props → a **React component**
  (`components/ui/`), *not* a CSS class. This is the default answer to "this
  looks repeated" — e.g. an eyebrow label with a `::before` dot is an
  `<Eyebrow>` component, not a `.label-eyebrow` class.
- A repeated pure-utility combo with no structure → a Tailwind v4 `@utility`.
- `@layer components` is reserved **strictly** for what utilities and
  components genuinely cannot express: pseudo-elements (`::before`/`::after`),
  third-party DOM overrides (`!important` on library markup), complex
  descendant/state selectors.
- `globals.css` only ever holds: `@import`, tokens (`:root` + `@theme`), base
  element resets (`@layer base`), and the narrow `@layer components`
  exceptions above. If it grows past that, something was misplaced.
- CSS Modules were considered and **rejected** — a second styling mechanism
  for the rare bespoke-CSS case is not worth the extra mental model when
  motion is spring-based (no keyframes — ADR-0002) and utilities + components
  cover everything else.

**Consequences.** `globals.css` stays a few-hundred-line file indefinitely.
"Repeated thing" pressure now pushes toward React components — which the
project wants anyway. This **amends ADR-0004**: design *tokens* still go in
`globals.css` first, but component-specific *classes* no longer do.
[[design-system]] and [[component-conventions]] updated to match.

---

## ADR-0011 — API layer: `app/api` route handlers, secrets server-side

- **Status:** Accepted
- **Date:** 2026-05-22

**Context.** The starter had no API layer. It needs a convention for reaching
external services that keeps secret keys off the client and gives endpoints a
consistent shape.

**Decision.** External calls go through Next.js Route Handlers —
`src/app/api/<resource>/route.ts`:
- **The handler owns the work** — business logic, multiple upstream calls,
  filtering, and reading secret env vars all live in `route.ts`. No mandatory
  passthrough service layer; extract shared code only when genuinely reused.
- Secrets are safe in handlers because `route.ts` is never bundled to the
  browser. Secret env vars are **unprefixed**; `NEXT_PUBLIC_` only for
  browser-safe values.
- Every endpoint: validates input with `zod`, returns the `{ data }` /
  `{ error }` envelope via the shared `handle()` wrapper (`src/lib/api/`), runs
  on the Node runtime (not Edge).
- `src/env.ts` validates env with zod — `publicEnv` vs `getServerEnv()`.
- Client Components fetch via `apiFetch` (`src/lib/api-client.ts`), same-origin
  only. Render-time data is read in Server Components.
- Added `zod`. The example endpoint is `app/api/contact/route.ts`.
- Codified as **AGENTS.md hard rule #9**.

**Consequences.** A clear, secret-safe API convention (full note:
[[api-architecture]]). Server Actions were considered for mutations but
deferred — for now everything goes through `app/api`. The choice can be
revisited if forms need progressive enhancement. First server dependency
(`zod`) and first server-only env var (`CONTACT_ENDPOINT`) now exist.

---

## ADR-0010 — SEO & performance hardening

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** A review found gaps that would hurt a production marketing site:
`metadataBase` defaulted to `null` (relative OG/canonical URLs never resolved to
absolute — broken social previews); `themeColor` sat on the deprecated metadata
field; there was no `robots.txt`, `sitemap.xml`, or structured data; the
`next.config.ts` was empty; `ScrollLayout` leaked a `requestAnimationFrame`
loop; the home view was a top-level `"use client"` (violating hard rule #6);
and the animation-heavy starter ignored `prefers-reduced-motion`.

**Decision.**
- **Site config.** `src/lib/site.ts` (`siteConfig`) is the single source of
  truth for SEO, fed by `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`).
- **Metadata.** `metadataBase` is always set; `themeColor` moved to a
  `generateViewport()` / `viewport` export; dead `keywords` / `other` tags
  dropped; OG dimensions corrected to match the asset.
- **Crawlability.** Added `app/robots.ts`, `app/sitemap.ts`, and a JSON-LD
  `Organization`+`WebSite` helper rendered once in the root layout.
- **App Router files.** Added `loading.tsx` (enables streaming), `error.tsx`,
  `not-found.tsx`.
- **Rendering.** `HomeView` is a Server Component; client-only animation moved
  to the `HomeShowcase` leaf — models hard rule #6 instead of breaking it.
- **Reduced motion.** `<ReducedMotion>` calls react-spring's `useReducedMotion`,
  toggling the global `skipAnimation` — one app-root mount covers every spring
  and `spring-text-engine`. Chosen over per-component handling for its reach.
- **Build config.** `next.config.ts` now sets `removeConsole` (prod),
  AVIF/WebP, `next/image` breakpoints aligned to the adaptive-grid widths, and
  `poweredByHeader: false`. React Compiler is left as a documented opt-in (needs
  `babel-plugin-react-compiler`).
- Fixed the `ScrollLayout` Lenis rAF leak (cancel on unmount).

**Consequences.** Social/SEO metadata is correct in production once
`NEXT_PUBLIC_SITE_URL` is set. The first project env var now exists (see
[[environment-variables]]). `isBot()` stays available but is discouraged — it
opts routes out of static rendering; reduced-motion is the preferred lever (see
[[seo-metadata]]). React Compiler remains opt-in pending a dependency install.

---

## ADR-0009 — Shared animation ticker; authorized engine performance refactor

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** A performance review of the animation engine found load issues that
scale with the number of animated components on a page:
- `useLoop` started a **private `requestAnimationFrame` loop per hook instance** —
  N scroll-driven components meant N rAF loops, none of which ever stopped.
- `useWindowWidth` attached a **separate debounced `resize` listener per call** —
  one per spring component.
- `useDynamicInView` re-created its `IntersectionObserver` **on every render**
  (effect keyed on an unstable `options` object), and a dead `Proxy` branch
  created observers that were never disconnected.
- `useLoop`'s mount-only effect captured a **stale `onRender`**, so prop changes
  after mount were ignored.
All of this lives under `src/hooks/animation/` and `src/components/animation/springs/`
— `#do-not-modify` (ADR-0002).

**Decision.** With explicit user sign-off, apply a one-time performance refactor
to the protected engine, and introduce a shared, unprotected loop primitive:
- New `src/lib/animation/ticker.ts` — a single app-wide, reference-counted rAF
  loop (`subscribeToTicker`). It starts on the first subscriber, stops on the
  last, and throttles each subscriber independently. **Not** `#do-not-modify` —
  it is the supported extension point.
- `useLoop` now subscribes to the ticker and reads `onRender` / `framerate`
  through refs (fixes the stale-closure bug). Public signature unchanged.
- `useDynamicInView` rewritten without the `Proxy`: one observer, re-created only
  when the observed element or options actually change; exposes a callback ref.
- `use-window-size.ts` (not protected) now serves all three hooks from one
  debounced `resize` listener via `useSyncExternalStore`. The unused
  `debounceDelay` parameter was dropped.
- `mode="forward"` `scroll` listeners in `<Spring>` / `<Inview>` made `passive`.
- Hard rule #2 amended: the engine stays protected by default; changes require
  explicit sign-off.

**Consequences.** A page with N animated components now runs **one** rAF loop and
**one** resize listener instead of N of each, with no observer churn. Public
hook/component APIs are unchanged except `useWindowWidth`/`Height`/`Size`, which
no longer take a `debounceDelay` argument (no caller passed one). This **amends
ADR-0002's** do-not-modify scope.

A follow-up pass then cleared all 13 pre-existing ESLint problems in the engine
(also authorized): `isMobileDisabled` gained an optional `viewportWidth`
argument, missing `disableOnMobile` effect deps were added, a
`trigger.current`-in-cleanup hazard in `<Hover>` was fixed, `<Handle>`'s
transition effects were ref-stabilised, and `useProgressTrigger` now returns
`progress` as a `RefObject<number>` (no consumer affected).

---

## ADR-0008 — Adaptive scaling grid via root font-size

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** An adaptive scaling system was dropped into `src/components/common/`
to keep a rem-based design proportional across viewports. It shipped as a
`styled-components` implementation (`createGlobalStyle`, a `css` `media` helper,
`rm`/`em` helpers, plus `colors.ts` / `fonts.ts` / `utils.ts`). `styled-components`
is not a project dependency, and global CSS belongs in `globals.css` per ADR-0004.

**Decision.** Keep only the scaling behaviour; rebuild it to the project stack.
- **Scale down** (viewport ≤ largest breakpoint) — `vw`-based `html { font-size }`
  media queries in `globals.css`, inside `@layer base`.
- **Scale up** (viewport > largest breakpoint) — a `<AdaptiveGrid>` client
  component (`useAdaptiveGrid` hook) sets an inline `html` font-size at runtime,
  reusing the existing `useResizeLoop` render loop.
- Breakpoints live in `grid.config.ts` as typed config; the `globals.css` media
  queries mirror them and must be kept in sync (formula in both files).
- The dropped `styled-components` files were deleted, not committed.

**Consequences.** A rem-based layout now scales as one unit on every viewport.
`styled-components` stays out of the dependency tree. The breakpoint set is
duplicated across `grid.config.ts` and `globals.css` by design — the CSS-only
config rule (ADR-0004) forbids generating the media queries from JS.

---

## ADR-0007 — Automate the vault workflow with Claude Code hooks

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** The "read the vault first, follow the relevant guide, update the docs
after every change" workflow depended on the user reminding the agent each time.
Documentation drifts the moment it relies on memory.

**Decision.** Encode the workflow as Claude Code hooks in `.claude/settings.json`
(committed, team-wide):
- `SessionStart` — injects a pointer to read the vault first.
- `UserPromptSubmit` — on every request, reminds the agent to consult the relevant
  guide and to update docs for any change made.
- `Stop` — at the end of every turn, blocks **once** to confirm the vault was
  updated. A `${TMPDIR}` marker keyed by session id guarantees it blocks at most
  once per turn (no infinite loop).

**Consequences.** The documentation workflow is enforced without user prompting.
`.claude/settings.json` is now a tracked project file. Hooks are reviewable and
disableable via `/hooks`. New hooks take effect on the next session start (or after
opening `/hooks`). See [[ai-agent-guide]].

---

## ADR-0006 — The vault is the single source of truth

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** ADR-0001 left dense spec files (`project-specs.md`, `text-engine-docs.md`)
at the repo root alongside the vault, creating duplication — the same conventions
existed both as terse specs and as expanded vault notes, which would drift.

**Decision.** The vault is the **only** documentation source.
- `project-specs.md` — deleted; its content was already decomposed into the
  `architecture/` and `frontend/` notes (and `environment-variables.md`).
- `text-engine-docs.md` — moved into the vault as [[text-engine-reference]].
- `generic-layout-prompt.md` — moved into the vault (see ADR via [[changelog]]).
- Root keeps only thin shims: `AGENTS.md` carries the breaking-change warning and
  hard rules and points into the vault; `CLAUDE.md` and `.cursorrules` both
  `@`-import `AGENTS.md`.

**Consequences.** No documentation duplication. Agents bootstrap from `AGENTS.md`
and read vault notes on demand. This **amends ADR-0001** — root files no longer
hold canonical spec content.

---

## ADR-0005 — Use standard `next/link` for navigation

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** Two conflicting conventions existed: `project-specs.md` specified
standard `next/link` / `useRouter`, while `generic-layout-prompt.md` specified
custom `<AnimLink>` / `useAnimRouter()` wrappers. The custom wrappers were never
built.

**Decision.** Use standard Next.js navigation — `<Link>` from `next/link` and
`useRouter` from `next/navigation`. The `AnimLink` / `useAnimRouter` convention is
dropped. See [[routing]].

**Consequences.** `generic-layout-prompt.md` §5 updated to match. No animated-route-
transition layer exists; if one is needed later, revisit with a new ADR.

---

## ADR-0001 — Adopt an Obsidian vault as the project brain

- **Status:** Accepted — amended by ADR-0006
- **Date:** 2026-05-21

**Context.** Project knowledge was scattered across root markdown files
(`project-specs.md`, `text-engine-docs.md`, `AGENTS.md`). New contributors and AI
agents had no structured map of the system.

**Decision.** Introduce `obsidian/` as an Obsidian vault — a linked, navigable
second brain. Root spec files remain as machine-read sources; the vault expands on
them. See [[ai-agent-guide]].

**Consequences.** Docs must now be maintained alongside code. The vault is the
canonical place to *understand* the project; root files stay canonical for *tooling*.

---

## ADR-0002 — All motion is spring-based (`@react-spring/web`)

- **Status:** Accepted (inherited from starter) — amended by ADR-0014
- **Date:** Project baseline

**Context.** Marketing sites need rich, interruptible, physically natural motion.
CSS transitions and keyframes are rigid; competing libraries add weight.

**Decision.** Use `@react-spring/web` for every animation. A custom component layer
(`src/components/animation/springs/`) wraps it. CSS keyframes and `framer-motion`
are **banned**. CSS transitions were banned outright here; **ADR-0014 narrows that
to allow `transition-*` for trivial hover/focus state changes only.**

**Consequences.** All animation goes through the [[animation-system]]. The springs
folder is `#do-not-modify`. Text animation is delegated to [[text-engine]].

---

## ADR-0003 — Routes delegate to Views

- **Status:** Accepted (inherited from starter)
- **Date:** Project baseline

**Context.** Mixing routing concerns with page UI makes `app/` files heavy and hard
to test.

**Decision.** `app/**/page.tsx` files only import and render a component from
`src/views/`. All layout/UI logic lives in the view. See [[routing]].

**Consequences.** Every route is a 3-line file. Views are the real page components.

---

## ADR-0004 — Tailwind v4 with CSS-based config

- **Status:** Accepted (inherited from starter) — amended by ADR-0012 and ADR-0015
- **Date:** Project baseline

**Context.** Tailwind v4 removes `tailwind.config.js` in favour of CSS-native config.

**Decision.** All theme tokens live in `globals.css` under `:root` and `@theme inline`.
No JS config file. Raw values in class names are banned. See [[design-system]].

**Consequences.** Design tokens are the only styling currency. New values must be
added to `globals.css` first — and, per ADR-0015, must follow the three-tier
naming convention.
