---
tags: [frontend, stable]
updated: 2026-08-09
---

# Catalog — UI Primitives

Files in `src/components/ui/` — design-system primitives. Stateless, no provider
dependencies, Server Components unless a leaf needs otherwise. Conventions:
[[component-conventions]].

Everything here was extracted from the AERRA Figma frame "Concept 3"
(`1469:1302`) — each entry names the node it came from, so a design change can be
traced back.

## `<CtaButton>` — `cta-button.tsx`

The only call-to-action shape in the design: a black pill with a white arrow
tile. Figma `1469:1374` (hero), `1484:1623` (about), `1484:1654` (location),
`1484:1675` (contact submit) — they differ **only in width**, so the component
fixes the 48 px height and the caller sets the width.

| Prop | Type | Meaning |
|------|------|---------|
| `label` | `string` | Button text |
| `href` | `string?` | Renders a `next/link` `<a>`. Omit for `<button type="submit">` |
| `className` | `string?` | Width and layout from the caller (`w-full`, `w-83`, …) |

`justify-between gap-6` covers both cases: at content width the gap sets the
spacing (hero, 206 px), and at a fixed width the ends spread (332 / 224 / full).

**Hover** is three things at once: the pill lifts, a skewed sheen sweeps across
it (clipped by the shell, so it never escapes the rounded corners), and the
arrow tile swaps — the first arrow leaves right as a second arrives from the
left, so it reads as advancing rather than sliding back. All CSS `transition-*`
on token-backed timing, which is exactly the discrete-state exception in
ADR-0014; the sweep uses `--duration-slow`.

## `<Eyebrow>` — `eyebrow.tsx`

Section label — a 6 px dot plus a word or two. Figma reuses the pair above every
section (`1484:1630`, `1484:1633`, `1476:1545`, `1469:1440`, `1476:1563`).

| Prop | Type | Meaning |
|------|------|---------|
| `label` | `string` | Label text |
| `tag` | `"p" \| "h2" \| "h3"` | Defaults to `p`. Pass a heading when the label **is** the section's heading |
| `id` | `string?` | For `aria-labelledby` |
| `className` | `string?` | Size and colour — e.g. `text-lead text-foreground`, `text-body text-on-media` |

The dot is `bg-current`, so one `text-*` class recolours both parts — that is
what switches between the dark and on-photograph variants.

> [!note] `tag` exists for the heading outline, not for looks
> The audience section has no large statement, so its eyebrow carries the `h2`.
> Every other section's eyebrow stays a `<p>` because a `TextEngine` heading
> already holds the `h2`. See [[html-semantics]].

## `<ParallaxLayer>` / `<ParallaxMedia>` — `parallax-media.tsx`

`ParallaxLayer` is the drifting layer on its own; `ParallaxMedia` is it plus a
`next/image`. Anything stacked over a parallaxed photo — the location section's
reveal canvas, for instance — must go **inside a `ParallaxLayer`** rather than
get a hand-copied second set of constants, or the two slide against each other.

> [!note] A canvas in a `ParallaxLayer` is 120 % of its section
> The layer is oversized so it always covers while drifting. Anything that
> samples a texture across the canvas therefore needs **cover-fit** sampling, or
> it stretches out of step with the `object-cover` image beneath it. See
> `<PixelRevealImage>`'s `uCoverScale`.


A photograph that drifts against the scroll. The outer element is the clip box
(it fills its parent, so callers never position it); an inner layer holds the
`next/image` and is what `SpringTrigger mode="scrub"` moves.

| Prop | Type | Meaning |
|------|------|---------|
| `src` / `alt` / `sizes` | `string` | Passed to `next/image` (`fill`) |
| `priority` | `boolean?` | LCP image only |
| `className` | `string?` | Extra classes on the clip box |
| `start` / `end` | `TriggerPos?` | Scroll range; defaults `top bottom` → `bottom top` |
| `anchor` | `"center" \| "start"` | See below |

Travel is **10 % of the clip box** in each direction — "medium-strong".

> [!important] `anchor` is a fidelity decision, not a taste one
> - **`"center"`** (default) makes the layer 20 % taller so it always covers, and
>   drifts through the neutral framing mid-scroll. The cost: `object-cover`
>   scales the image up by that 20 %, so **the crop is tighter than Figma's**.
>   Correct for anything you scroll *into*.
> - **`"start"`** keeps the layer exactly the box — so the crop is *identical to
>   the design* — and only drifts one way from rest. That leaves the leading edge
>   uncovered as it moves, so it is only safe where what sits behind is meant to
>   show through. Its PNG is a cut-out over the sky ramp, and being above the
>   fold it must open on the exact composition (a centred parallax would start
>   151 px off it).
> - **`"start-raised"`** is `"start"` with the layer grown 20 % **from the
>   bottom**, which lifts the subject. Needed because the hero photograph's
>   aspect matches its section exactly: `object-cover` has no slack, so
>   `object-position` does nothing, and simply translating it up would lift the
>   terrain off the bottom edge and expose bare sky. This is what the hero uses.

## `<DragSequenceVideo>` — `drag-sequence-video.tsx`

A turntable. The clip is **never `play()`ed** — a phase value is advanced on the
shared ticker and mapped onto `currentTime`, so one compressed file behaves like
an image sequence. Used for the about section's 360° house.

| Prop | Type | Meaning |
|------|------|---------|
| `src` | `string` | Video URL |
| `label` | `string` | Accessible name of the control |
| `widthsPerTurn` | `number?` | Element-widths of drag per full turn (default `1`) |
| `scrubber` | `boolean?` | Render the pill scrubber along the bottom edge |
| `className` | `string?` | |

It plays itself through **once** at `PLAY_SPEED`, starting when it scrolls into
view, then rests on its final frame. It is draggable **throughout** — by the
surface or by the scrubber, which are two views of one phase value. Taking hold
of either *cancels* the playthrough rather than competing with it for that
value, which is what keeps the two inputs from arguing.

The play rate is a spring (`1 ⇄ 0`), so the clip eases up to speed rather than
cutting in. The scrubber is `aria-disabled` only until the clip is seekable.

> [!important] Two things that made the scrubber feel wrong, both non-obvious
> - **Don't throttle the whole ticker callback.** Budgeting it at the seek rate
>   also budgets the handle's style write, so at 30 Hz the handle steps visibly
>   behind a 60 Hz cursor. Subscribe at full rate; gate only the seek on its own
>   timestamp.
> - **Clamp the scrubber, don't wrap it.** Wrapping sends the handle the full
>   width of the track at either end. The surface drag still wraps — a turntable
>   should spin freely — but a timeline has walls.
>
> While held, the scrubber is authoritative and bypasses the spring entirely.
> On release `autoPhase` is rebased so `autoPhase + turn` already equals where
> the scrub landed; skip that and the frame jumps as the spring path resumes.

> [!note] The handle moves via `left`, not `translateX`
> A percentage translate resolves against the **handle's own width**, not the
> track it is supposed to travel — the handle would barely move. It is also
> written imperatively from the ticker: it changes every frame and React has no
> reason to see it.

> [!note] Why the playthrough ends at `0.9995`, not `1`
> The phase is wrapped before it becomes a timestamp, and `wrap(1)` is `0` —
> landing on exactly one turn would snap back to the *first* frame instead of
> resting on the last one.

The scrubber is the `role="slider"` and is keyboard-operable as soon as the clip
is seekable — ←/→ step 15°, `Home` returns to the first frame. `aria-valuenow`
is updated on release rather than per frame.

> [!warning] The asset must be encoded all-keyframe
> Scrubbing seeks on every frame. With sparse keyframes the browser snaps to the
> nearest one and the rotation goes steppy instead of continuous. Verify a new
> clip before shipping it — seek to a few arbitrary times and check
> `currentTime` reads back exactly:
> ```
> ffmpeg -i in.mp4 -g 1 -keyint_min 1 -sc_threshold 0 -c:v libx264 -an out.mp4
> ```
> The current `about-video.mp4` (960 × 960, 4.096 s) seeks frame-exact.

Two non-obvious things it has to handle, both verified in the browser:

- **The spring must be declarative.** `useSpring({ value })` diffed each render.
  The imperative `useSpring(fn).api.start()` form does not move values in this
  project's react-spring build — the same finding recorded in `in-view.tsx`.
- **The `<video>` can finish loading before hydration**, so React's
  `onLoadedMetadata` never fires for it. The component also adopts the element's
  `readyState` in an effect; without that it stays permanently un-draggable.

Per-frame work goes through `subscribeToTicker`, not its own `rAF` loop.

## `<CounterValue>` — `counter-value.tsx`

A statistic that counts up when it scrolls into view, resolving out of a blur as
it settles. Used by the numbers section.

| Prop | Type | Meaning |
|------|------|---------|
| `value` | `string` | The final value **as designed** — `"240"`, `"3.2"`. Decimal places are inferred from it |
| `tag` | `"p" \| "dt" \| "span"` | Semantic element; the stats list needs `dt` |
| `className` | `string?` | |

The blur is derived from the *same* spring that drives the number, so the digits
sharpen exactly as they stop moving — two separate animations would drift apart
and read as two stacked effects. The config is heavily damped
(`tension 60 / friction 34`) on purpose: any overshoot would make the digits
count *backwards* for a moment, which is the "jerky" failure this is avoiding.
A non-numeric `value` renders as plain text.

## `<SplitWordmark>` — `split-wordmark.tsx`

The oversized hero lettering, split so **alternating letters climb at different
rates** as the page scrolls. Each letter is its own `SpringTrigger mode="scrub"`.

| Prop | Type | Meaning |
|------|------|---------|
| `text` | `string` | Word to split; letters keep source order |
| `leadRem` / `trailRem` | `number?` | Travel for odd / even letters (default `14` / `5`) |
| `start` / `end` | `TriggerPos?` | Scroll range |
| `entranceDelay` | `number?` | When the first letter arrives, ms from mount |
| `className` | `string?` | Type and layout — inherited by the letters |
| `letterClassName` | `string?` | Paint applied to **each letter** |

The letters also **write themselves in** on load — they rise from below through
a `blur` that clears, one `WORDMARK_LETTER_STAGGER_MS` apart from
`entranceDelay`, so the word lifts into place after the curtain opens.
That is a *second* `Spring mode="once"` **wrapping** each letter's scrub trigger:
the trigger is driven by scroll position and has no way to also play a one-shot,
and the two stay independent, so a letter can be arriving and drifting at once.
Do not move the entrance onto the outer `<span role="img">` either — it would
compound with the letters into a double move.

Values are in `em` so the entrance keeps its proportions at every grid width, and
they need reading at that scale: at 801 px type `0.22em` is a **176 px** rise —
about a third of the cap height, which is what makes the lift legible rather
than a fade with a nudge — and `0.03em` a **24 px** blur. The travel is paired
with `revealConfigSoft`; on the default config the letters arrive faster than
the eye reads the movement.

> [!warning] The entrance must sit **above** the scroll trigger, never inside it
> `letterClassName` — the `background-clip: text` gradient — is on the trigger's
> *inner* span. A `filter` on a descendant of that composites the glyphs out of
> its mask and the letter renders as nothing at all, the same failure as putting
> the gradient on the wrapper (above). Above the trigger, the mask is untouched.

> [!warning] Nothing is shown until `document.fonts.ready`
> At this size the metric-adjusted fallback is nowhere near the real face —
> measured, `aerra` sets **1909 px** in the fallback against **1627 px** in
> Google Sans Flex. Fading in over the swap made the letters appear bunched and
> then jump into place. The component holds them at `opacity: 0` until the font
> resolves, then computes the remaining delay against `performance.now()` — both
> that and `entranceDelay` are measured from navigation, so the entrance still
> lands on schedule when the font is early and starts at once when it is late.
> This is why `SplitWordmark` carries `"use client"`.

The hero sets `entranceDelay` from `HERO_DELAY.wordmark` so the word arrives
*after* the preloader window opens — see [[components/common|Preloader]].

> [!warning] A `background-clip: text` gradient must go on `letterClassName`
> On the wrapper it renders **nothing at all**. The mask only catches glyphs the
> wrapper paints in its own layer, and every letter here carries a `transform`,
> which composites separately. `will-change: transform` does the same thing even
> more aggressively — it is deliberately absent for this reason, and five 800 px
> promoted layers would be real memory for no measured gain.

Travel is kept modest on purpose: at a 50 rem type size a large gap stops
reading as "some letters lead" and starts reading as the word coming apart.

> [!note] Why this is not `TextEngine`
> [[text-engine]] is the tool for *revealing* text, and its staggers run
> sequentially through the string. An alternating fast/slow split is not a
> stagger and it cannot express one. Nothing custom is being typeset here — the
> letters lay out normally and each is handed its own scroll offset by the
> standard spring primitive.

The gradient stays on the wrapper and is clipped to all glyphs at once, so
letters slide *through* a fixed fade rather than each carrying its own. The
wrapper holds the accessible name; the letters are `aria-hidden` so a screen
reader is not read the word one character at a time.

## `<ScrollModel>` — `scroll-model.tsx`

A glTF model that turns — and optionally travels — with the scroll. See
[[decisions-log]] ADR-0021 and ADR-0023.

| Prop | Type | Meaning |
|------|------|---------|
| `src` | `string` | `.glb` URL |
| `progress` | `RefObject<number>` | 0–1, written by the caller each frame |
| `label` | `string` | Accessible name — a canvas is opaque to assistive tech |
| `turns` | `number?` | Full turns across the scroll range (default `1`) |
| `heightRatio` | `number?` | Model height as a fraction of the **canvas** height |
| `travel` | `boolean?` | Move down the canvas as progress runs 0 → 1 |
| `className` | `string?` | |

> [!important] Size is a fraction, not world units
> `heightRatio` exists because the canvas is not a fixed size: it spans a whole
> section, and the adaptive grid rescales it with the viewport. A world-unit
> scale silently changes apparent size whenever the container changes — moving
> this model from a 450 px cell to a 1694 px section would have made it ~4×
> bigger for free. The world scale is derived from the camera frustum instead.

Rotation and travel both chase the scroll value with `1 - exp(-dt / tau)`, which
settles at the same rate on any refresh rate. A fixed per-frame lerp — the
obvious version — spins at different speeds on 60 Hz and 120 Hz displays and
stutters on any long frame.

> [!warning] Snap on the first drawn frame, ease only while tracking
> `offsetY` starts at 0, which is the **middle** of the travel rather than the
> start of it. Chasing from there made the model rise to its entry point on
> arrival and only then descend — read as "it flies up, then moves down". The
> loop snaps both angle and offset to their targets on the first frame it
> actually draws, and re-primes whenever it is gated off: scroll keeps moving
> while the loop is idle, so the value it would resume chasing toward is stale.
> Same reasoning as `optimize-3d-scene` §10 — snap on a jump, ease on a track.
> Verified by leaving the section and returning to the same offset: first frame
> `-1.088` against a settled `-1.088`.

`progress` is a **ref, not a prop value**: it changes every frame and React
never needs to see it. The caller (`views/home/audience-mark.tsx`) writes it from
a `<ProgressTrigger>` and the render loop reads it.

> [!warning] Three things that will bite
> - **`next/dynamic` + `ssr: false` is necessary but not sufficient.** It defers
>   the *bundle*, not the *work* — the component mounting is what fetches three,
>   builds a GL context and generates the PMREM environment. The mount must also
>   be gated on viewport proximity or all of that lands during page load. See
>   ADR-0024 and `views/home/audience-mark.tsx`. **Latch that gate** — rendering
>   `near ? <ScrollModel/> : null` rebuilt the renderer, model, PMREM environment
>   and every material on each re-entry, mid-scroll. ADR-0031, and the danger
>   note in [[hooks]].
> - **`renderer.setSize(w, h)` — never pass `updateStyle: false`.** With a pixel
>   ratio above 1 that leaves the CSS size unset, so the canvas lays out at its
>   backing-store size and overflows its box by exactly the DPR.
> - **A Draco-compressed `.glb` needs the decoder** in `public/draco/`, copied
>   from `three/examples/jsm/libs/draco/gltf/` and re-copied on a three upgrade.

## `<PixelRevealImage>` — `pixel-reveal-image.tsx`

An image painted in by a pixel wave wherever the cursor moves — the location
section's overlay.

| Prop | Type | Meaning |
|------|------|---------|
| `src` | `string` | Image to reveal |
| `label` | `string` | Accessible name |
| `className` | `string?` | |

A coarse heat grid (84 × 56) is kept on the CPU, decayed each frame, splatted at
the cursor, and uploaded as a tiny texture. The shader reads it with `NEAREST`,
so **the grid's cells are the pixels** — no separate pixelation pass. Raw WebGL,
not three.js: it is one full-screen quad.

The image is sampled **straight**: heat drives the alpha only. An earlier version
also displaced the lookup to give the wave a swell, which smeared the artwork
into streaks rather than revealing it — the reveal has to show the picture, not
distort it.

The GL context is only created once the section is within `PRELOAD_MARGIN`
(600 px) — see ADR-0024 — and once created it is **never torn down**. Proximity
is latched into a `useState` that only goes false → true; keying the effect on
`near` itself recompiled the shader on every re-entry and cost a 57–81 ms long
task each time. Drawing is gated separately, by the component's own
`IntersectionObserver` plus `document.hidden`. ADR-0031.

> [!warning] Scrolling synthesises pointer events at unchanged coordinates
> The browser re-dispatches `pointermove` when the page moves under a stationary
> cursor, with the **same** `clientX`/`clientY`. Treated as hovering, that
> painted the reveal in wherever the cursor happened to be parked, so the mask
> was visible on arrival without anyone hovering. Events whose coordinates did
> not change are ignored, and the grid is cleared when the section leaves.

The canvas rect is resolved **once per frame inside the ticker**, not in the
pointer handler: `getBoundingClientRect` in a listener that fires during scroll
is a forced layout on every event (`optimize-3d-scene` §9).

> [!warning] `UNPACK_FLIP_Y_WEBGL` is global GL state
> The image upload turns it on so the photo is upright. Left set, it flips the
> **heat grid** too and the whole reveal appears mirrored vertically. Set it
> explicitly before each upload.

## `<TextField>` — `text-field.tsx`

Underlined contact-form input — Figma `1484:1684`. The design shows only a field
name on a rule, so the name doubles as the placeholder while a real `<label>`
stays in the accessibility tree (`sr-only`).

| Prop | Type | Meaning |
|------|------|---------|
| `name` | `string` | Field name and `id` |
| `label` | `string` | Accessible label; also the placeholder |
| `type` | `"text" \| "tel" \| "email"` | Input type |
| `autoComplete` | `string` | Autofill hint |
| `required` | `boolean` | Defaults to `true` |

## Icons — `icons/`

Inline SVG components, `currentColor` throughout so colour comes from a `text-*`
token. No icon library, no `<img>` requests.

| Component | File | Figma node |
|-----------|------|-----------|
| `<ArrowRightIcon>` | `arrow-right-icon.tsx` | `1469:1378` — the CTA arrow |
| `<BrandMark>` | `brand-mark.tsx` | `1484:1660` — chevron over an arc. One path serves both the 20 px nav logo and the 120 px grid mark |
| `<HighlightGlyph>` | `highlight-glyph.tsx` | `1484:1761` / `1484:1760` — the `circle` and `triangle` outlines on the about tiles |
| `<QuoteGlyph>` | `quote-glyph.tsx` | `1505:1834` — the mark on the about section's quote card |

> [!warning] Always set **both** axes on an inline SVG
> Given only a width, it falls back to the default 150 px height instead of
> honouring its `viewBox` ratio — the quote glyph rendered 25× oversized and
> burst out of its card. And both values must land on whole pixels, or the
> classes do not compile at all (see [[design-system]]).

`<BrandMark>` takes an optional `title`: pass it where the mark is meaningful
(it becomes `role="img"` + `<title>`), omit it where a text label is adjacent and
it should stay `aria-hidden`.

## Related

[[component-conventions]] · [[design-system]] · [[html-semantics]] ·
[[components/common]] · [[components/animation-springs]]
