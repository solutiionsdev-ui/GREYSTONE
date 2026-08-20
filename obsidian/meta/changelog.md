---
tags: [meta, changelog]
updated: 2026-08-09
---

# Changelog

Chronological log of notable changes to the project. Newest first.
This is a human-curated log — not a mirror of `git log`.

## 2026-08-09 (eleventh pass)

- **The wordmark no longer reflows on arrival.** The letters appeared bunched and
  then jumped into place: the entrance was fading them in *through the webfont
  swap*, and at 801 px the metric-adjusted fallback is nowhere near the real
  face — measured, `aerra` sets **1909 px** in the fallback against **1627 px**
  in Google Sans Flex. `SplitWordmark` now waits on `document.fonts.ready` and
  holds the letters at `opacity: 0` until then, with the remaining delay
  computed against `performance.now()` so the entrance still lands on schedule.
  Verified across the whole entrance: **one** distinct letter layout, start to
  finish.
- **The entrance is opacity + blur + a rise from below**, per request — letters
  arrive already in their final horizontal position, lifting `0.22em` (**176 px**
  at this type size, about a third of the cap height) through a `blur(0.03em)`
  that clears, staggered per letter and eased with `revealConfigSoft` so the
  travel reads. Measured across the entrance: y 176 → 114/143/175 → 37/46/61 → 0,
  blur 24 → 0 px, and one single letter layout throughout.
  It wraps the scroll trigger rather than nesting inside it: the gradient lives
  on the trigger's inner span, and a `filter` below that would composite the
  glyphs out of its `background-clip: text` mask and render nothing.
- **The 3D mark no longer flies up before settling.** Its travel offset started
  at 0 — the *middle* of the range, not the start — and chased the target, so on
  arrival the model rose to its entry point and only then descended. It now
  snaps on the first drawn frame and eases only while tracking, re-priming
  whenever the loop is gated off (scroll moves on regardless, so the resumed
  target would be stale). Verified: leaving the section and returning to the
  same offset gives a first frame of `-1.088` against a settled `-1.088`.

## 2026-08-09 (tenth pass)

- **The location section no longer stutters.** Both WebGL consumers were
  rebuilding themselves every time the section came back on screen — measured as
  a `linkProgram` on each entry plus a long task of **81 / 59 / 57 ms**, worst
  frame **92.8 ms**. Latching the proximity gate so it decides when to *build*
  and never when to tear down: repeat entries now log **zero** long tasks, p50
  16.7 / p95 17.0 / max **17.4 ms**. ADR-0031 in [[decisions-log]], including
  the one 83 ms first-mount task that remains and why the PNG decode was left
  alone. Also noted there: `mask.png` is 1.5 MB and bypasses `next/image`.
- **The reveal mask no longer appears unprompted.** Scrolling the page under a
  stationary cursor makes the browser synthesise pointer events at unchanged
  coordinates; those were being treated as hovering, so the mask was already
  painted in on arrival. Events whose coordinates did not move are ignored, the
  grid is cleared when the section leaves, and the canvas rect is now resolved
  once per frame inside the ticker instead of on every event — a forced layout
  during scroll (`optimize-3d-scene` §9). Measured after: **0 draws** while
  scrolling with a parked cursor.
- **Tablets have their own range.** 540–1279 px now holds the root font-size at
  a constant 16 px with a fluid stacked layout, instead of shrinking the 1440
  composition to 9.3 px body copy. The Figma composition moved from `md:` to
  `lg:` at 1280. ADR-0030 in [[decisions-log]] explains why the middle range is
  the one that does *not* scale, and what that costs.
- **The wordmark is set in the variable font.** Figma lets `opsz` follow the type
  size; the project only had static 24 pt cuts, which carry thicker strokes by
  design. The official Google Fonts variable build (latin subset) is loaded as a
  second family on `--font-display`, and `font-optical-sizing: auto` does the
  rest. ADR-0029 — this is the follow-through on the 9 pt measurement from the
  eighth pass, which pointed the right way.
- **Preloader counter leaves through a mask**, not a fade: it sits in a
  one-line-box `overflow-hidden` well and slides down out of it. Verified with
  opacity pinned at 1 while the span travelled 0 → 100 % and 0 → 80 px of it
  passed behind the mask edge.
- **The hero waits for the curtain.** Entrance delays are no longer loose
  numbers in the hero — they come from `lib/springs/preloader-timing.ts` as
  offsets from the reveal, so changing the curtain's length moves the hero with
  it. The wordmark now writes itself in letter by letter (a second, inner spring
  per letter; the outer one still owns the scroll travel).

## 2026-08-09 (ninth pass)

- **The preloader actually reveals.** The rounded rectangle is now a hole cut in
  the curtain (`clip-path: path(evenodd, …)`) that scales from nothing to the
  full viewport, instead of the curtain fading out on opacity. The counter's
  bottom inset matches its side insets (`inset-x-10 bottom-10` — measured 69 px
  on all three edges) and it no longer drifts downwards, because the curtain
  carries no transform. ADR-0028 in [[decisions-log]] covers the two approaches
  that failed first — scaling the curtain, and clipping the page.
- **`text-engine-nowrap` moved from `@layer components` to `@utility`.**
  Tailwind only generates variants for utilities, so `md:text-engine-nowrap`
  compiled to nothing and the numbers heading wrapped at desktop. Now one line
  at 1440 (measured height 43 px at a 36 px/1.2 heading). See [[design-system]].
- **Hero wordmark removed below `md:`** — at 390 px it was fragments of a word
  wider than the screen. `display: none` there; the desktop composition is
  untouched.
- **Hero photograph raised further** — `start-raised` lift 8 % → 20 %.

## 2026-08-09 (eighth pass)

- **The site is responsive.** Second grid breakpoint re-bases to 430 below
  768 px (root font-size at 390 px: 4.33 px → **14.51 px**), every section gained
  a stacked mobile layout with the 1440 composition preserved verbatim behind
  `md:`, and the nav collapses to a **burger** with a spring-driven panel.
  Verified at 390 px: no horizontal overflow, one `<h1>`, and the only element
  extending past the viewport is the deliberately oversized decorative wordmark.
  ADR-0027 in [[decisions-log]] — including why re-basing *without* laying out
  is worse than leaving it alone, and why a regex conversion had to be reverted.
- **Preloader** — `<Preloader>` counts 0 → 100 while travelling left to right,
  then the white curtain scales away as a rounded rectangle. Holds Lenis still
  behind it and hands scrolling back as it opens.
- **Favicon, apple icon and OG card are generated from the brand mark** via
  `src/app/icon.tsx`, `apple-icon.tsx` and `opengraph-image.tsx` — the logo lives
  in one place, so no stale binary can survive a change to it. The starter's
  icon set, `favicon.ico`, `open-graph.png` and `browserconfig.xml` were deleted,
  `manifest.json` rewritten, and the hard-coded `icons` block removed from the
  metadata generator (it was shadowing the generated routes). `themeColor` is now
  the hero sky rather than black.
- **CTA hover** — the pill lifts, a sheen sweeps across it, and the arrow tile
  swaps one arrow out for another arriving behind it. All CSS `transition-*` on
  token-backed timing, per ADR-0014; new `--duration-slow` token for the sweep.
- **Hero photograph raised** — new `anchor="start-raised"` on `ParallaxMedia`.
- **Tried the new 9 pt Thin cut on the wordmark and reverted it.** Measured by
  ink coverage at matched size: **30,610 dark px vs 18,426** for the 24 pt cut —
  66 % *heavier*, and wider. Small optical sizes carry thicker strokes by design,
  so this is the wrong direction; a **larger** optical cut (36/72 pt) or the
  variable font is what would thin the wordmark. Font removed rather than shipped
  unused. See [[design-system]] → Typography.

## 2026-08-09 (seventh pass)

- **Ran the `optimize-3d-scene` pass** (hard rule #11 — two reported freezes on a
  page with two live WebGL consumers). New `src/lib/scene/device.ts` is now the
  single source for tier, DPR, frame budget and antialiasing. Live drawing-buffer
  pixels **3,963,158 → 3,468,270**; scene lights **3 → 1** + IBL; both canvases
  now stop entirely when the tab is hidden or the section is off screen; renderer
  flags trimmed (`stencil: false`, `depth: false` on the flat quad, antialias off
  on mobile); the model prewarms its program and environment before it scrolls
  in. Full numbers, trade-offs and the one thing that got *worse* before it got
  better: ADR-0026 in [[decisions-log]].
- **Measured on a production build**, not the dev server. Every earlier
  performance number in this log was taken in dev and is not comparable.
- **The location mask now shares the photograph's parallax** — `ParallaxLayer`
  was extracted from `ParallaxMedia` so both read one set of constants instead of
  a hand-copied second set. The reveal shader gained cover-fit sampling, since
  the canvas is now 120 % of the section tall and would otherwise stretch the
  artwork out of step with the photo underneath.
- **Turntable: 2.2× faster, draggable immediately, and the scrubber is smooth.**
  Taking hold now *cancels* the playthrough rather than fighting it for the same
  value. Two fixes behind "the seams are ugly": the handle was inheriting the
  **seek** throttle (30 Hz) so it stepped behind a 60 Hz cursor — painting is now
  uncapped and only decoding is budgeted — and scrubbing wrapped at the ends
  instead of clamping, so it jumped the full width. Measured after: handle tracks
  the pointer with **0 % error** and does not move on release.
- About photograph swapped (new file, same slot — no code change needed).

## 2026-08-09 (sixth pass)

- **The glass finally works, and that was also the lag.** The cards' reveal
  wrapper sat at `filter: blur(0.02px)` / `opacity: 0.998` forever — springs
  settle asymptotically — and either establishes a **backdrop root**, so
  `backdrop-filter` sampled an empty backdrop: full GPU cost, nothing drawn.
  The reveal moved inside the card. ADR-0025 in [[decisions-log]].
- **Mark canvas narrowed** to a centred 480 px column — 5.4 M → 1.8 M pixels,
  since the mark only ever travels down the middle.
- **About cards rebuilt from Figma** — a quote card over the photograph
  (1505:1816, white, inset 30 px) and a glass scrubber pill along the bottom of
  the video (1505:1835). The video plays itself through once on entering view,
  and **only then** does dragging unlock — by the surface or the scrubber, which
  are two views of one phase. Hover-to-stop was dropped: it existed to let you
  grab a looping clip, which no longer applies.
- **Corrected a rule I had documented wrongly.** Spacing utilities do not fail
  at "three decimals" — they must resolve to a **whole pixel**, i.e. a multiple
  of `0.25`. `w-4.66` (18.64 px) silently compiles to nothing exactly like
  `left-170.375` did. [[design-system]] now carries the real rule and an audit
  command; all 68 fractional utilities in `src/` currently pass.

> [!note] Still outstanding: the hero wordmark cannot be made thinner
> The four supplied `.ttf`s have **no `fvar` table** — they are static optical
> cuts, so Thin (100) is the lightest weight available and
> `font-variation-settings` has nothing to act on. Supplying the variable
> Google Sans Flex would fix both this and the optical-size mismatch already
> noted in [[design-system]] → Typography.

## 2026-08-09 (fifth pass)

- **Fixed the intermittent freezing** — it was at *load*, not during scroll.
  ~456 KB of three plus the Draco decoder were being fetched and parsed while
  the hero was on screen (125 ms main-thread block). Both WebGL mounts are now
  gated on viewport proximity; nothing heavy touches page load. ADR-0024 in
  [[decisions-log]] — including why `next/dynamic` alone did not prevent this.
- **The turntable plays once**, starting when it scrolls into view, then rests
  on its final frame. Hover still stops it early for dragging.
- **Cards use the same glass as the header** — `--surface-glass` and
  `--backdrop-glass` now resolve to the nav's own primitives, so the two
  surfaces are provably identical while staying separately re-themable.
- **Pixel reveal: warp removed, wave enlarged.** Displacing the lookup smeared
  the artwork into streaks; the image is now sampled straight and only the
  alpha is quantised. Splat radius 5.5 → 11 cells.
- **Hero wordmark fixed and softened.** It had stopped rendering entirely:
  `will-change: transform` promotes each letter to its own layer, which drops it
  out of a wrapper-level `background-clip: text` mask, so the glyphs had nothing
  painted into them. The gradient moved onto each letter and `will-change` is
  gone. Letter travel cut from 34/14 rem to 14/5 rem — separation at a full
  hero scroll is now 98 px rather than 217 px, so the word stays a word.

## 2026-08-09 (fourth pass)

- **The hero wordmark splits on scroll** — new `<SplitWordmark>` gives every
  letter its own `SpringTrigger`, so odd-indexed letters climb roughly 2.4× as
  far as even ones. Not `TextEngine`: its staggers are sequential and cannot
  express an alternating split ([[components/ui]]).
- **The 3D mark now travels the whole audience section** — up from beneath the
  location block, through the cards, and away under the contact block. The cards
  became **glass** (`--surface-glass` + `backdrop-blur-glass`) so it stays
  visible behind them. ADR-0023 in [[decisions-log]].
- **`<ScrollModel>` sizing is now resolution-independent** (`heightRatio`, a
  fraction of the canvas rather than world units) and rotation is **frame-rate
  independent** (`1 - exp(-dt/tau)` instead of a fixed per-frame lerp, which
  settled at different speeds on 60 Hz and 120 Hz). Canvas DPR capped at 1.5 and
  rendering skipped while the section is off screen — it now spans a section
  rather than one cell.
- **The turntable plays itself** — it advances at the clip's authored speed,
  glides to a stop on hover so it can be dragged, and spins back up after a
  delay when the cursor leaves. The play rate is a spring, so neither transition
  cuts.
- **Removed the cursor-following pixel warp** (`CursorPixelWave`). ADR-0022 is
  kept but marked reverted — the technique is worth retaining even though the
  feature is gone. The cursor-driven pixel effect on the location photo stays.
- About photo corners rounded.

> [!note] Typeface caveat surfaced this pass
> The wordmark renders in the correct family and weight (Google Sans Flex Thin,
> verified loaded, no fallback), but the project ships the **`_24pt` static
> optical cuts**. Figma renders the variable font, which at 801 px applies a
> display optical size — thinner strokes, tighter terminals. Matching it exactly
> needs the variable `.ttf`. See [[design-system]] → Typography.

## 2026-08-09 (third pass)

- **3D mark replaces the flat one** — the audience grid's centre cell now renders
  `model.glb` through the new `<ScrollModel>`, turning with scroll progress, in a
  black matte metal material. Adds **three.js** to the stack and the Draco
  decoder to `public/draco/`; both carry upgrade obligations — see
  [[decisions-log]] ADR-0021 and [[tech-stack]].
- **Site-wide cursor pixel wave** — `<CursorPixelWave>` warps the real content
  under the cursor via a `backdrop-filter` + SVG displacement. ADR-0022 records
  why a canvas cannot do this.
- **Location photo gains a cursor-painted reveal** — `<PixelRevealImage>` paints
  `mask.png` in as blocky pixels wherever the cursor moves, on a CPU heat grid
  sampled with `NEAREST`.
- **Counters animate** — `<CounterValue>` counts up out of a blur, both driven by
  one heavily damped spring so the digits sharpen exactly as they stop.
- **Audience cards stage in with blur** — `fadeUpBlur` + `revealConfigSoft`,
  ordered across the occupied cells so the diagonal gaps don't break the rhythm.
- **About photo rounded**; **video drag no longer stutters** (seek throttled to
  the clip's frame rate and skipped while a seek is in flight).
- **Fixed: the contact eyebrow sat hard left.** `left-170.375` has three decimal
  places, which Tailwind silently does not generate — see the warning in
  [[design-system]]. All three centred eyebrows now centre with flexbox rather
  than a converted offset, which no longer depends on the text measuring exactly
  what Figma measured.
- **Fixed: a ticker subscription that re-subscribed every render** never fired,
  because the throttle timer is stamped at subscribe time. Documented in
  [[animation-system]] — it is silent and looks like a broken animation.
- `public/**` is now ESLint-ignored (vendored, minified Draco decoder).

## 2026-08-09 (later)

- **Drag-to-rotate turntable replaces the about section's grey plate** — the
  empty `#f4f4f4` slot from the Figma frame now holds `<DragSequenceVideo>`,
  which scrubs `public/assets/About/about-video.mp4` by pointer drag instead of
  playing it. See ADR-0020 in [[decisions-log]]; the **all-keyframe encoding
  requirement** for any replacement clip is documented in [[components/ui]].
- **Parallax on every photograph** — new `<ParallaxMedia>` wraps `next/image` in
  a `SpringTrigger mode="scrub"`, 10 % of the clip box in each direction. Applied
  to the hero, about, location and contact images. Its `anchor` prop is a
  fidelity control, not a style one: `"center"` overscales the layer 20 % (so the
  crop is tighter than Figma's) while `"start"` keeps the design's exact crop and
  drifts one way — the hero needs `"start"` because it is on screen before any
  scrolling and must open on the exact composition.
- **The header is fixed** — `<SiteNav>` moved out of `HeroSection` up to
  `HomeView`, where it renders as a sibling of `<main>` rather than nested inside
  a `<section>`, and is now `position: fixed`. Safe under Lenis, which drives
  native window scroll rather than a transformed wrapper. A **skip link** was
  added with it, since navigation now precedes `<main>` ([[html-semantics]]).

## 2026-08-09

- **AERRA home page ported from Figma** — the frame "Concept 3" (`1469:1302`,
  1440 × 7199) is implemented end to end in [[routing|route `/`]] via
  `src/views/home.tsx`, with one section component per band under
  `src/views/home/` (hero, about, numbers, location, audience, contact) and the
  copy in `src/data/mocks/home.ts`. Section boundaries and element positions
  match the frame exactly — the document measures 7199 px tall at a 1440 px
  viewport. Sections stay Server Components; the spring primitives and
  `TextEngine` are the client leaves. Because reveal configs cross the
  server → client boundary, the shared presets in `src/lib/springs/reveal.ts`
  use numeric tension/friction springs — a `SpringConfig` carrying an `easing`
  **function** is not serialisable and would throw.
- **Design tokens filled in** — [[design-system]] gains the project's real
  palette (`--raw-color-*` neutrals plus the hero sky and wordmark gradients),
  a five-step type scale (16 / 20 / 36 / 80 / 801.395 px), three radii, two
  backdrop blurs and the leading set, all following the three-tier convention.
  The starter's placeholder neutral ramp and its `prefers-color-scheme` override
  are gone: the design is light-only, and a dark-mode override would invert a
  page whose type colours are chosen against photographs.
- **Typeface switched to Google Sans Flex** — `next/font/local` loading the four
  static 24 pt instances the design uses (Thin / Light / Regular / Medium) from
  `src/app/fonts/`, bound to `--font-google-sans-flex` → `--font-sans`. Replaces
  Onest (`next/font/google`). No dependency change.
- **New UI primitives** — `CtaButton`, `Eyebrow`, `TextField` and three inline
  icon components in `components/ui/`; catalogued in [[components/common]].
- **Grid collapsed to a single 1440 breakpoint, fully proportional** — see
  ADR-0018 in [[decisions-log]]. `<AdaptiveGrid coef={1} />` in the root layout.
- **Figma's text-box trim reproduced with margin utilities** — `text-trim-flat`
  and `text-trim-body` in `globals.css`; see ADR-0019 in [[decisions-log]].

## 2026-07-25

- **Released into the public domain (Unlicense)** — the starter now ships a root
  `LICENSE.md` carrying the [Unlicense](https://unlicense.org) and declares
  `"license": "Unlicense"` in `package.json`. Anyone may copy, modify, sell, or
  redistribute it with **no attribution requirement and no copyright retained** —
  the intent being that projects built from this starter can absorb it wholesale
  without carrying a notice. Briefly authored as MIT in the same session and
  changed before any release; the MIT attribution clause was the specific thing
  being dropped, so a recognized no-attribution licence was chosen over an
  edited MIT text. `"private": true` is unchanged, so npm publishing stays
  blocked regardless — the licence governs redistribution of the source, not
  registry availability.

## 2026-07-24

- **`optimize-3d-scene` hardened from its first field run** — the skill was run
  on a real raw-WebGL scene (no three.js, no scroll) and eight gaps came back,
  ranked by the time each cost. Fixed in `SKILL.md` and `references/patterns.md`:
  **§0** now ships a `getContext` hook so a non-three.js scene has counted
  equivalents of `renderer.info` (`draws` / `verts` / `links[]` timestamps /
  captured `attrs`) — previously §0 was unexecutable there — plus the
  *measurement environment* rules that invalidate everything if missed
  (production build only: dev's eager chunks fake a §1 failure and Strict Mode's
  double-mount fakes 2 listeners and a halved fps; kill the stale server;
  `waitUntil: "load"`, since `networkidle0` never fires against `next start`;
  SwiftShader is not a GPU, so only counted quantities transfer). **§3** now
  states that **§1 breaks it** — `dynamic(ssr: false)` pushes compilation past
  hydration, measured at 5.0 s against a loader lifting at 2.36 s — and gains a
  fifth stall cause (CPU decode/parse → **Worker**, 3.9 s measured) and the
  `as="fetch"` preload credentials trap (only `use-credentials` + `include`
  dedupes; the others silently download twice). **§5** admits `1000/30` measures
  ~26 fps given the ticker's `<=` throttle. **§7** requires a decile ordering
  check before truncating a baked point buffer (one was spatially sorted —
  truncating would have deleted half the subject). **§13** splits canvas `lvh`
  from content `dvh`. **§1**'s poster is rejustified — crawler screenshots and
  the no-WebGL fallback, not layout stability — with two crops and the
  `headers()` → static-prerender (`○`→`ƒ`) trade-off named. Unchanged on
  purpose: the cheapest-first order, the canonical-file table, and "port, don't
  invent". ADR: [[decisions-log]] ADR-0017.
- **`optimize-3d-scene` skill registered in the vault** — the new skill at
  `.claude/skills/optimize-3d-scene/` is now a first-class part of the workflow
  set, documented in [[optimize-3d-scene]] and linked from the
  [[README|Map of Content]] and [[ai-agent-guide]].
  **Routing rule (AGENTS.md hard rule #11):**
  a performance / jank / pre-ship request on a project that renders a three.js
  or WebGL scene must invoke the skill and follow its fourteen-step order — no
  improvised fix list. The vault note also maps the skill's canonical patterns
  onto primitives the starter *already* ships, so nothing gets duplicated:
  `subscribeToTicker` (`src/lib/animation/ticker.ts`, ADR-0009) is the one
  app-wide rAF loop the skill's §4/§5 ask for, `isBot()` (`src/utils/is-bot.ts`,
  ADR-0010) is the §1 bot path, the Lenis scroll store is the §9/§10 scroll
  source, `useDynamicInView` is the §4 visibility gate, and `lvh.ts` covers §13
  sizing. Only device tiering (§2) has no local equivalent. The starter itself
  carries **no `three` dependency** ([[tech-stack]] unchanged) — this applies to
  projects built from it. ADR: [[decisions-log]] ADR-0016.
- **Fixed a broken path inside the skill** — its closing "write it down" step
  pointed at `obsidian/Meta/changelog.md` / `decisions-log.md` (capital `M`, and
  an `open-questions.md` that does not exist here), so an agent following it
  would have written to a non-existent folder. Rewritten against this vault's
  actual `obsidian/meta/` layout.
- **`ai-agent-guide` gained a Skills section** — how skills are registered
  (drop in `.claude/skills/<name>/`, add a `workflows/` note, link from the MoC
  and the skills table, log in the changelog), so the next skill follows the
  same path.

## 2026-07-17

- **README — one-prompt quick start** — added a copy-paste **⚡ Start in one
  prompt** block at the top of the README: a single prompt that has Claude Code
  (or Cursor) clone the starter, detach it from this repo's git history, read the
  vault first, and run the default install. The manual [Getting started](../../README.md#getting-started)
  path stays below for anyone who prefers it.
- **Fixed: `cp .env.example .env` broke `/api/contact`** — surfaced by writing
  that step into the quick-start prompt. Copying the example leaves
  `CONTACT_ENDPOINT=` (blank), which reaches zod as `""`, and `""` is not
  `undefined` — so `z.url().optional()` rejected it. The route returned **HTTP
  400 `{"path":"CONTACT_ENDPOINT","message":"Invalid URL"}`**, misreporting a
  *server misconfiguration* as the caller's bad input. `src/env.ts` now routes
  optional URLs through an `optionalUrl()` helper that preprocesses `""` →
  `undefined`. Verified end-to-end: a valid POST now returns 200, and genuinely
  invalid payloads still return 400. Any new **optional** variable must use the
  same helper — see [[environment-variables]].
- **README — corrected clone URL & Node requirement** — step 1 pointed at
  `github.com/textura/next16-claude-starter` (wrong org — the repo is
  `textura-agency/…`), so the documented clone would 404. Also added the Node
  floor (**22.13+**; 20.19+ works, 24 LTS recommended) — below it `yarn install`
  fails outright on `eslint-visitor-keys` — and the missing
  `cp .env.example .env` step.
- **TextEngine alignment & clipping rules documented** — two failure modes that
  bite every TextEngine block, now written into [[text-engine]] (new *Alignment &
  line-height* section), [[text-engine-reference]], and AGENTS.md hard rule #3.
  **(1)** The container renders `display: flex; flex-wrap: wrap`, so words are
  flex items and `text-align` cannot position them — a lone `text-center`
  silently does nothing. Always pair `text-*` with `justify-*` on the tag
  (`justify-between` is a trap: it spreads *words*, not lines). **(2)** `overflow`
  sets `overflow: hidden` on `inline-block` wrap layers whose height comes from
  `line-height`, so tight leading shaves descenders and accented caps — keep
  leading ≥ 1.1 via the new `leading-display` token, never `leading-none` with
  `overflow`, and watch for `text-5xl`+ which ship `line-height: 1`. Both fixes
  are **classes on the `TextEngine` tag** — no wrapper component, no helper to
  import. Verified against the `spring-text-engine@0.1.5` dist source.
- **Strict three-tier token naming convention** — tokens now follow a fixed,
  portable grammar so names are predictable across every project built from this
  starter: `--raw-<category>-<name>` primitives → `--<role>` semantic →
  `--<tw-namespace>-<role>: var(--<role>)` bindings in `@theme inline`. Only
  Tier 1 holds literals; Tier 2 names purpose and is the themeable layer.
  `globals.css` restructured accordingly — **no brand palette invented**, the
  convention is the deliverable. Two deviations from the reference article,
  verified by compiling a probe against `tailwindcss` v4.3.3: primitives are
  `--raw-*` and stay out of `@theme` (a `--color-*` entry would generate
  utilities and let markup skip the semantic tier), and **`--duration-*` is not a
  Tailwind v4 namespace** — `duration-fast` compiles to nothing, so durations
  stay Tier 2 and are used as `duration-[var(--duration-fast)]`. See
  [[decisions-log]] ADR-0015 and [[design-system]].
- **Narrow CSS-transition exception** — hard rule #1 no longer bans CSS
  transitions outright. CSS `transition-*` is allowed for simple discrete state
  changes only (hover/focus colour, opacity, border, small nudges), requiring
  token-backed timing (`duration-[var(--duration-fast)] ease-entrance`),
  `transition-*` only (`@keyframes` still banned), and utilities only. Everything
  scroll-driven, revealing, staggered, or layout-affecting stays spring-based.
  A hover colour fade no longer needs a client component wrapping `<Hover>`. See
  [[decisions-log]] ADR-0014, [[animation-system]], [[design-system]].
- **New tokens** — `--raw-color-white` / `--raw-color-neutral-100/900/950`,
  `--raw-duration-fast/normal`, `--duration-fast/normal`, `--leading-display`
  (1.1 — the TextEngine clip floor), `--ease-entrance`.
- **Build & lint verified clean** — `yarn lint` and `yarn build` both pass with 0
  errors and 0 warnings; no lint fixes were needed. Note: `yarn install` **fails
  on Node 20.17** (`eslint-visitor-keys` requires `^20.19 || ^22.13 || >=24`) —
  use Node ≥ 20.19; this repo was verified on 24.16.

## 2026-06-07

- **Fixed `<Inview>` standalone reveal + spring resize gating** — `<Inview>`
  never animated unless an external `trigger` ref was passed. The JSX `ref`
  callback wrote `inViewRef.current = node`, but that tuple slot is a *callback
  ref* (`setNode`), so the element was never observed and the `node` stayed
  `null`. Now calls `setInViewNode(node)`. This was also a build-breaking type
  error. Additionally, `<Inview>`, `<Spring>`, and `<Hover>` tracked `width` as a
  hook dependency but never passed it to `isMobileDisabled` — fixed by passing the
  tracked `width`, restoring resize re-evaluation and clearing the
  `react-hooks/exhaustive-deps` warnings. `yarn build` and `yarn lint` are now
  clean. See [[decisions-log]] ADR-0013 and [[components/animation-springs]].

## 2026-06-05

- **Home view emptied** — removed the animation showcase (`src/views/home-showcase.tsx`
  deleted) and reduced `HomeView` to an empty `<main>`. The home view is now the
  blank starting point for new work. Documented the convention — *if the project
  is empty and no other instructions are provided, start developing in the home
  view on route `/`* — in [[ai-agent-guide]] and [[new-page]].

## 2026-05-23

- **README — setup + Vercel deploy steps added** — *Getting started* expanded
  into a four-step flow (clone the template → delete bundled `.git` →
  initialise your own GitHub repo → install & run), with a macOS hint for
  revealing the hidden `.git` folder (`⇧ + ⌘ + .`). Added a *🚀 Deploy to
  Vercel* section covering the CLI flow (`vercel` / `vercel --prod`) and the
  dashboard import path, plus an `env pull` pointer to
  [[environment-variables]].
- **README rewritten to lead with the AI workflow** — root `README.md`
  reorganised so the AI usage guide is the first section: how the three
  `.claude/settings.json` hooks (`SessionStart`, `UserPromptSubmit`, `Stop`)
  enforce the vault workflow automatically, how to write a good request
  against this convention layer, and a cost-expectations note recommending
  **Claude Max (5×)** as the minimum plan (the vault-fan-out + hook
  re-injection on every turn is token-intensive by design). Technical
  *Getting started* and the existing AI-agents entry-point pointer stay
  below.

## 2026-05-22

- **Styling-placement convention added** — to stop `globals.css` accumulating
  hundreds of component-specific classes, styling now follows a strict
  placement order: one-offs are Tailwind utilities, repeated patterns become
  **React components** (not `@layer components` classes), and `@layer
  components` is reserved strictly for pseudo-elements and third-party
  overrides. `globals.css` stays bounded — `@import`, tokens, base resets only.
  No CSS Modules. Codified in [[decisions-log]] ADR-0012; [[design-system]]
  (new *Where a style goes* section) and [[component-conventions]] updated.
- **Semantic-HTML / SEO-markup convention added** — new [[html-semantics]]
  rulebook: landmarks, one `<h1>` + heading outline, native elements over
  `div`s, forms/images/ARIA, JSON-LD over microdata, a `data-*` convention, and
  passing a semantic `tag` to animation components. Codified as AGENTS.md hard
  rule #10; cross-linked from [[component-conventions]] and [[new-page]]. Fixed
  the demo (`home-showcase.tsx`) to a single `<h1>` to follow it.
- **API layer added** — a convention for reaching external services.
  `app/api/<resource>/route.ts` Route Handlers own their logic and read secret
  env vars directly (safe — route files never reach the browser). New: `zod`
  dependency; `src/env.ts` (validated env, public/server split); `src/lib/api/`
  (`handle` wrapper + `ApiError` + `{ data }`/`{ error }` envelope);
  `src/lib/api-client.ts` (typed same-origin fetch); example
  `app/api/contact/route.ts`. Codified as AGENTS.md hard rule #9. See
  [[decisions-log]] ADR-0011 and [[api-architecture]].

## 2026-05-21

- **Asset convention added** — site content assets (images, videos) now live
  under `public/assets/<section>/`, one folder per section; meta/PWA/SEO assets
  stay at the `public/` root. Documented in [[folder-structure]],
  [[component-conventions]], and the [[new-page]] playbook; `public/assets/`
  created with a `.gitkeep`.
- **SEO & performance hardening** — a broad pass on the starter. **SEO:** new
  `src/lib/site.ts` config (single source of truth, fed by `NEXT_PUBLIC_SITE_URL`);
  `metadataBase` is now always set (relative OG/canonical URLs resolve);
  `themeColor` moved to a `viewport` export; added `app/robots.ts`,
  `app/sitemap.ts`, and an `Organization`+`WebSite` JSON-LD helper; OG image
  dimensions corrected to match the asset; dead `keywords`/`other` tags dropped.
  **Performance:** populated `next.config.ts` (`removeConsole` in prod,
  AVIF/WebP, `next/image` breakpoints aligned to the grid, `poweredByHeader:
  false`); fixed a `requestAnimationFrame` leak in `ScrollLayout` (Lenis loop
  never cancelled on unmount); `HomeView` is now a Server Component with the
  animation demo split into the `HomeShowcase` client leaf; added
  `<ReducedMotion>` (honours `prefers-reduced-motion` via react-spring's global
  `skipAnimation`); removed a per-frame `console.log` from the demo; added
  `app/loading.tsx` / `error.tsx` / `not-found.tsx`. See [[decisions-log]]
  ADR-0010, [[seo-metadata]], and [[environment-variables]].
- **Animation engine — lint pass** — cleared all 13 pre-existing ESLint problems
  in the engine (2 errors + 11 warnings), an authorized engine edit (ADR-0009).
  `isMobileDisabled` now takes an optional `viewportWidth` argument, so the
  `active` memos in `<Spring>` / `<Hover>` / `<Inview>` / the trigger hooks
  depend on it genuinely. Added missing `disableOnMobile` effect deps; fixed a
  `trigger.current`-in-cleanup hazard in `<Hover>`; ref-stabilised `<Handle>`'s
  transition effects. **API change:** `useProgressTrigger` now returns `progress`
  as a `RefObject<number>` (read `.current`) instead of a render-time ref read —
  no consumer was affected (`<ProgressTrigger>` discards the return).
- **Animation engine — performance refactor** — fixed load issues that scaled
  with the number of animated components. Added `src/lib/animation/ticker.ts`, a
  single reference-counted `requestAnimationFrame` loop; `useLoop` (and all loop
  hooks) now subscribe to it instead of each starting its own rAF. `useWindowWidth`
  / `Height` / `Size` now share one debounced `resize` listener via a
  `useSyncExternalStore` store (the `debounceDelay` param was dropped — unused).
  `useDynamicInView` rewritten without the per-render `Proxy`/observer churn.
  Fixed a stale-closure bug in `useLoop`. `mode="forward"` scroll listeners made
  `passive`. This was an **authorized edit to `#do-not-modify` engine files** —
  hard rule #2 amended. See [[decisions-log]] ADR-0009 and [[animation-system]].
- **`spring-text-engine` updated** — bumped `^0.1.3` → `^0.1.5` (latest). The
  public API, types, and dependencies are unchanged between these versions
  (verified) — an internal-only patch bump, no code changes required.
- **Adaptive scaling grid added** — a root-font-size scaling system landed in
  `src/components/common/grid/` (`<AdaptiveGrid>` + `useAdaptiveGrid` hook +
  `grid.config.ts`), with `vw` media queries in `globals.css` for scale-down.
  It was dropped into `common/` as a `styled-components` system; ported to the
  project stack — config-driven TS + CSS-only Tailwind, no `styled-components`.
  The unused dropped files (`colors.ts`, `fonts.ts`, `utils.ts`, `index.ts`,
  the `styled-components` `grid.tsx`) were removed. Mounted via `<AdaptiveGrid>`
  in the root layout. See [[components/common]] and [[decisions-log]] ADR-0008.
- **Vault created** — `obsidian/` Obsidian vault initialised as the project's
  second brain. Architecture, frontend, and workflow docs populated. See [[decisions-log]] ADR-0001.
- **Root README rewritten** — replaced `create-next-app` boilerplate with a real
  project README that points into this vault.
- **`generic-layout-prompt.md` moved** — relocated from repo root to
  `obsidian/workflows/` as [[generic-layout-prompt]].
- **Navigation convention resolved** — standard `next/link` confirmed; the unbuilt
  `<AnimLink>` / `useAnimRouter()` convention dropped. See [[decisions-log]] ADR-0005.
- **Docs consolidated into the vault** — `project-specs.md` deleted (decomposed into
  vault notes + new [[environment-variables]]); `text-engine-docs.md` moved in as
  [[text-engine-reference]]. `AGENTS.md` rewritten as a thin shim; `.cursorrules`
  repointed to `@AGENTS.md`. The vault is now the single source of truth.
  See [[decisions-log]] ADR-0006.
- **Vault renamed & restructured** — vault folder `getlayers.io/` → `obsidian/`;
  number prefixes dropped from section folders (`00-meta` → `meta`, etc.). Project
  name standardised to **`next16-claude-starter`** across docs and `package.json`.
- **Components linked to docs** — every file in `src/components/` now carries a
  `// 📖 Docs:` pointer comment to its catalog note, so agents can jump from code
  to docs and back.
- **Vault workflow automated** — added `.claude/settings.json` with `SessionStart`,
  `UserPromptSubmit`, and `Stop` hooks that make agents read the vault first,
  follow the relevant guide, and update docs after every change — with no manual
  reminder. See [[decisions-log]] ADR-0007 and [[ai-agent-guide]].
- **Cookie component replaced** — the `react-cookie-consent`-based `cookie.tsx`
  was replaced by an in-house `Cookie/` component (banner + category preferences
  modal + Zustand store). `react-cookie-consent` removed from dependencies. The
  component shipped using `styled-components` + an external design system; it was
  ported to the project stack — Tailwind v4 tokens and `@react-spring/web` motion.
  Mounted via `<LazyCookie>`. See [[components/common]].
- **Fixed TextEngine spring type mismatch** — the `mode="once"` heading in
  `views/home.tsx` mixed `lineIn={{ y: 0 }}` (number) with `lineOut={{ y: "100%" }}`
  (string), throwing *"Cannot animate between _AnimatedString and _AnimatedValue"*.
  Changed to `y: "0%"`. The buggy pattern in [[text-engine]] / [[text-engine-reference]]
  examples was corrected and a type-matching gotcha note added.

## Project baseline (git history)

| Commit | Description |
|--------|-------------|
| `94b0870` | feat: update starter |
| `5280ef2` | fix: linter errors & build |
| `b2b84e6` | initial — `next16-claude-starter` scaffold |

> [!note]
> The starter shipped with: Next.js 16.2, React 19.2, Tailwind v4, `@react-spring/web`,
> `spring-text-engine`, Lenis, and Zustand. See [[tech-stack]] for the current state.
