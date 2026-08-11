---
tags: [frontend, design-system, stable]
updated: 2026-08-09
---

# Design System — Tailwind v4

Styling uses **Tailwind CSS v4**, configured entirely in CSS. There is **no
`tailwind.config.js`**. ADR: [[decisions-log]] ADR-0004.

## Where config lives

`src/app/globals.css` is the single config file. Extra CSS layers can be split
into `src/style/index.css` and imported.

## Token naming convention

> [!important] This convention is **strict and portable by design**
> It is intended to be identical in every project built from this starter, so an
> agent or developer moving between them can predict a token's name without
> reading the file. Deviating in one project defeats the point. ADR: [[decisions-log]] ADR-0015.

Tokens are organised in **three tiers**. Each tier may only reference the tier
below it, and **no tier may be skipped** — semantic tokens are what make a
re-theme or a rebrand a one-line change instead of a find-and-replace.

| Tier | Grammar | Lives in | Example | Usable in markup? |
|------|---------|----------|---------|-------------------|
| **1 — Primitive** | `--raw-<category>-<name>[-<shade>]` | `:root` | `--raw-color-neutral-950` | ❌ never |
| **2 — Semantic** | `--<role>[-<variant>][-<state>]` | `:root` | `--background`, `--action-primary-hover` | ❌ only via its Tier-2 binding |
| **3 — Component** | `--<tw-namespace>-<component>[-<property>]` | `@theme inline` | `--radius-button` | ✅ `rounded-button` |

Plus the **theme binding**, which is what actually creates the utilities:

```css
@theme inline {
  --color-background: var(--background);   /* --<tw-namespace>-<role>: var(--<role>) */
}
```

### The rules

1. **Only Tier 1 contains literals.** A hex, px, or ms value anywhere else is a bug.
2. **Tier 2 names describe purpose, never appearance.** `--action-primary`, not
   `--blue`. `--surface-raised`, not `--grey-light`. If renaming the colour would
   force renaming the token, the name is wrong.
3. **Tier 2 is the themeable layer.** Dark mode and any runtime theming override
   Tier 2 tokens — never Tier 1, never a `@theme` entry.
4. **Every `@theme inline` entry is exactly `--<namespace>-<role>: var(--<role>)`.**
   No literals, no `calc()`, no skipping to `var(--raw-*)`.
5. **kebab-case, singular, unabbreviated.** `--raw-color-neutral-950`, not
   `--raw-clr-neutrals-950`. State goes last: `--action-primary-hover`.
6. **Tier 3 is rare.** Per ADR-0012 a repeated pattern is a React component, not a
   token set. Reach for a component token only when the same value must be shared
   across components that cannot import each other.

### Why Tier 2 is separate from `@theme`

`@theme inline` **inlines** each `var()` into the generated utility. That is what
makes overriding the Tier 2 token in a `prefers-color-scheme` block cascade into
every `bg-background` on the page. Binding a literal — or a `var(--raw-*)` —
directly in `@theme` freezes the value at build time and silently breaks theming.
The indirection is load-bearing, not ceremony.

### Namespaces that generate utilities

A token only becomes a utility if its prefix is a Tailwind namespace. Verified
against `tailwindcss` v4.3.3:

| Namespace | Generated utilities |
|-----------|--------------------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, … |
| `--spacing-*` | `p-*`, `m-*`, `gap-*`, … |
| `--radius-*` | `rounded-*` |
| `--leading-*` | `leading-*` |
| `--tracking-*` | `tracking-*` |
| `--text-*` | `text-*` (size) |
| `--font-*` | `font-*` |
| `--ease-*` | `ease-*` |
| `--shadow-*` / `--blur-*` / `--animate-*` | `shadow-*` / `blur-*` / `animate-*` |
| `--breakpoint-*` / `--container-*` | `sm:` … / `max-w-*` |

> [!warning] There is **no `--duration-*` namespace** in Tailwind v4
> `--duration-fast` in `@theme` generates nothing and is not even emitted — a
> `duration-fast` class silently does nothing. Durations therefore stay **Tier 2
> only** and are consumed as `duration-[var(--duration-fast)]`. (Guides that list
> `--duration-*` alongside `--ease-*` are wrong for v4; `--ease-*` *is* real.)

If a value's prefix is not in that table, it is not a utility — either pick the
right namespace or use it via `var()` in an arbitrary value.

> [!warning] A spacing value must land on a **whole pixel** — i.e. a multiple of `0.25`
> The scale is `calc(var(--spacing) * n)` with `--spacing: 0.25rem`, so `n` has
> to be a multiple of `0.25`. Anything else generates **nothing**: the property
> is never set and the element silently falls back — an absolutely positioned
> one lands at `left: 0`, an `<svg>` given no usable width falls back to its
> default 150 px box. No error, no warning; it reads as a layout bug.
>
> Confirmed both ways: `left-154.25` (617 px) and `w-4.75` (19 px) compile;
> `left-170.375` (681.5 px) and `w-4.66` (18.64 px) do not.
>
> This bites constantly here because Figma coordinates convert as
> `n = figma_px / 4`, and Figma is full of fractional values — a 681.5 px offset
> or an 18.656 px glyph. Two fixes, in order of preference:
>
> 1. **Express the intent, not the number.** The contact eyebrow is *centred* in
>    the design, so `inset-x-0 … flex justify-center` is both correct and more
>    robust than any offset — it does not depend on the text measuring exactly
>    what Figma measured.
> 2. **Round to the nearest whole pixel** where the value really is a size:
>    18.656 × 14.272 px → `w-4.75 h-3.5` (19 × 14).
>
> Audit — every fractional utility must end in `.25`, `.5` or `.75`:
> ```bash
> grep -rhoE '\b-?(left|right|top|bottom|w|h|p|m|gap|size|inset|px|py|mx|my|mt|mb|ml|mr)(-[xy])?-[0-9]+\.[0-9]+' src --include=*.tsx | sort -u | awk -F. '$2!="25" && $2!="5" && $2!="75" {print "SUSPECT: "$0}'
> ```

> [!important] The token rule
> **Never** hardcode hex values, pixel spacing, or named colours in `className` or
> inline styles. If a value doesn't exist as a token, **add it to `globals.css`
> first** — as a Tier 1 primitive plus the Tier 2 semantic token that names its
> purpose — with a comment noting where it came from (e.g. a Figma frame).

## CSS layers

Every custom style goes inside a layer — never outside one:

```css
@layer base {        /* element resets & defaults: h1, p, a … */ }
@layer components {  /* pseudo-elements & 3rd-party overrides only — see below */ }
@layer utilities {   /* single-purpose helpers: .scrollbar-none … */ }
```

## Where a style goes (ADR-0012)

`globals.css` is **not** a place to park component styles — it holds tokens and
base resets and stays a few hundred lines forever. Follow this order; the first
match wins:

| Situation | Goes where |
|-----------|-----------|
| One-off styling | Tailwind utilities in `className` — nothing in CSS |
| Repeated pattern with markup / structure / props | a **React component** in `components/ui/` |
| Repeated *pure-utility* combo, no structure | a Tailwind v4 `@utility` |
| Pseudo-elements, 3rd-party DOM overrides, complex selectors | `@layer components` — the genuine exceptions |
| A new colour / spacing / radius value | a **token** in `:root` + `@theme` |

> [!important] The default answer to "this looks repeated" is a **React
> component**, not a CSS class. An eyebrow label with a `::before` dot is an
> `<Eyebrow>` component — not a `.label-eyebrow` global class. `@layer
> components` is for what utilities and components genuinely *cannot* express.

There are **no CSS Modules** in this project — utilities + components cover
every case (motion is spring-based, so there are no keyframes to co-locate).

> [!warning] Anything applied responsively must be an `@utility`
> Tailwind generates variants (`md:`, `hover:`, …) for **utilities only**. A
> class declared in `@layer components` has no `md:` form — writing
> `md:my-class` compiles to nothing at all, silently, and the element simply
> keeps its unprefixed behaviour. `.text-engine-nowrap` was a `@layer
> components` rule and the numbers heading wrapped at desktop for exactly this
> reason; moving it to `@utility` fixed it with no change to the declaration.
> So: if a class will ever carry a variant, it is an `@utility`, whatever the
> table above says about repetition.

## Current theme state

The theme is filled in from the AERRA Figma frame "Concept 3" (`1469:1302`),
measured at a 1440 px base width. Every size is stored in **rem at 16 px = 1 rem**
so it scales with the adaptive grid.

- **Tier 1 — colour:** pure black/white plus their alpha steps
  (`--raw-color-white-85/50/0`, `--raw-color-black-50/10`), two greys
  (`--raw-color-grey-100` for cards and tiles, `--raw-color-grey-150-80` for the
  nav bar), and two gradients kept whole as primitives —
  `--raw-gradient-sky` (the hero sky ramp) and `--raw-gradient-wordmark`.
- **Tier 1 — the rest:** a five-step type scale (`--raw-font-size-100…500` =
  16 / 20 / 36 / 80 / 801.395 px), three leadings, three radii (6 / 8 / 10 px),
  two backdrop blurs (10 px nav and glass cards, 37.5 px contact panel), and
  three durations — `fast` / `normal` / `slow`, the last for the CTA's hover
  sweep.
- **Tier 2:** `--background`, `--foreground`, `--foreground-muted`,
  `--surface-muted/-glass/-nav/-panel` (`--surface-glass` is the translucent
  audience-card face the travelling 3D mark shows through — ADR-0023; it and
  `--surface-nav` resolve to the same primitives so cards and header read as one
  material, while staying separate roles either can be re-themed from),
  `--on-media` and `--on-media-muted` (text over a
  photograph), `--action-primary[-foreground]`, `--action-secondary`,
  `--border-subtle`, `--border-field`, `--backdrop-hero`, `--wordmark-fill`,
  plus the `--font-size-*`, `--line-height-*`, `--corner-*`, `--backdrop-*` and
  `--duration-*` roles.
- **Bindings:** the matching `--color-*`, `--text-*`, `--leading-*`,
  `--radius-*`, `--blur-*` entries, `--font-sans`, and `--ease-entrance`.

> [!important] This project is light-only — there is no dark mode
> The starter's `@media (prefers-color-scheme: dark)` override was **removed**.
> The design picks its type colours against photographs (`--on-media`,
> `--on-media-muted`), so inverting `--background` / `--foreground` would not
> re-theme the page, it would break it. Re-theming still happens at Tier 2 if a
> dark design is ever produced.

Two gradients are consumed as arbitrary values because each is used once —
`bg-[image:var(--backdrop-hero)]` and `bg-[image:var(--wordmark-fill)]` with
`bg-clip-text`. That is the *one-off styling* row of the table above, not a
missing token: the value itself is a token.

## Reproducing Figma's text-box trim

Almost every text node in the frame is set to `text-box-trim: trim-both` /
`text-box-edge: cap alphabetic`, so the `y` Figma reports is the **cap-height top
of the ink**, not the top of the line box. Ignoring that puts headings 8–12 px low.

The CSS equivalent (`text-box`) is Chromium-only **and** does nothing on a flex
container — which is exactly what `TextEngine` renders. So the trim is
reproduced geometrically, as two utilities in `globals.css`:

| Utility | Pairs with |
|---------|-----------|
| `text-trim-flat` | `leading-flat` (1) |
| `text-trim-body` | `leading-body` (1.2) |

Always pair the utility with the element's `leading-*` class. The values are
derived from Google Sans Flex's metrics and are **font-specific** — changing the
typeface means re-measuring. Full derivation and consequences: [[decisions-log]]
ADR-0019.

`@layer components` is **empty**. `text-engine-nowrap` — which overrides
`spring-text-engine`'s inline `flex-wrap: wrap` (hence `!important`) for the one
heading Figma sets as a single nowrap line — reads like the sanctioned
"third-party DOM override" case from the table above, and was written there
first. It is an `@utility` instead, because it is applied as
`md:text-engine-nowrap`: see the warning above.

## Motion: springs first, CSS for trivial state

Hard rule #1 stands — **all real motion is spring-based** ([[animation-system]]).
There is one narrow exception, added because wiring a spring for a colour fade on
hover costs a client component and a hook for no benefit. ADR: [[decisions-log]] ADR-0014.

**CSS transitions are allowed only for simple, discrete state changes:**

| Allowed (CSS) | Not allowed (use a spring) |
|---------------|---------------------------|
| `hover:` / `focus-visible:` / `active:` colour, `opacity`, `border-color`, underline | anything scroll-driven |
| Small decorative nudges (an arrow shifting a few px on hover) | enter/reveal animations → `<Inview>` |
| | text animation → [[text-engine]] |
| | layout/size changes, orchestrated or staggered sequences |
| | anything that must be interruptible or physical |

Conditions — all three, or it is a spring:

1. **Token-backed timing.** Duration and easing come from tokens — never raw
   values: `transition-colors duration-[var(--duration-fast)] ease-entrance`.
2. **`transition-*` only.** `@keyframes` remain **banned** outright — an
   animation long enough to need keyframes is long enough to deserve a spring.
3. **Utilities only.** The transition lives in `className`, not in a CSS file.

```tsx
<a className="text-foreground/70 transition-colors duration-[var(--duration-fast)]
              ease-entrance hover:text-foreground">
  Contact
</a>
```

If you are reaching past this list, you want `<Hover>` — see
[[components/animation-springs]].

## Typography

Font: **Google Sans Flex** (`next/font/local`), bound to
`--font-google-sans-flex` → `--font-sans`. Loaded in `src/app/layout.tsx` from
`src/app/fonts/` and exposed on `<body>`.

**Two families are loaded, and that is the correct model, not a workaround.**

| Family | Token | Files | Used for |
|---|---|---|---|
| `googleSansFlex` | `--font-sans` | static **24 pt** `Thin` (100) / `Light` (300) / `Regular` (400) / `Medium` (500) | everything at reading size |
| `googleSansFlexDisplay` | `--font-display` | the **variable** build, latin subset, `weight: "1 1000"` | display type — currently only the hero wordmark |

A static instance is drawn for **one** optical size. The 24 pt cuts are right
for body copy and wrong for an 801 px wordmark, which rendered visibly heavier
than Figma. Figma's own properties for that node are `Google Sans Flex:Thin`
with `wdth 100 / GRAD 0 / ROND 0` and **no `opsz`** — meaning it lets optical
size follow the type size, pinning `opsz` to the axis maximum at that scale.

The variable file restores that. It needs **no** `font-variation-settings`:
browsers apply `font-optical-sizing: auto` by default, so the axis follows the
computed size on its own, and at 801 px it is far above the axis range at every
grid width. Just add `font-display`. ADR-0029.

> [!note] Which family to reach for
> Anything above roughly 100 px → `font-display`. Anything at reading size →
> leave it on `--font-sans`; the 24 pt cut is doing its job there. The static
> files have **no `fvar` table** at all (their directory carries `STAT` but not
> `fvar`), so `font-variation-settings` on them is silently inert.

> [!warning] A smaller optical cut is the wrong direction
> A 9 pt Thin was tried on the wordmark and measured against the 24 pt at
> matched size by counting inked pixels: **30,610 vs 18,426** — 66 % heavier,
> and wider. Small optical sizes carry thicker strokes for legibility by design.
> Thinning the wordmark needed a **larger** optical size, which is what the
> variable file above finally supplies.
>
> To compare two cuts objectively, render both into a canvas at the same size
> and count dark pixels — do not judge by eye at a glance:
> ```js
> ctx.font = `100 300px ${family}`; ctx.fillText('aerra', 10, 200);
> // then count pixels below a luminance threshold
> ```

Sizes come from the `--text-*` bindings: `text-body` (16) · `text-lead` (20) ·
`text-title` (36) · `text-display` (80) · `text-wordmark` (801.395, the hero
lettering). Leadings: `leading-flat` (1, display headings) · `leading-body`
(1.2, everything else) · `leading-display` (1.1, the clip floor for
[[text-engine]]).

## Styling rules

- Use utilities in JSX `className`; keep class strings short and readable.
- Extract a repeated pattern to a **React component** — not a `@layer
  components` class. See *Where a style goes* above (ADR-0012).
- Mobile-first responsive: `sm:` / `md:` / `lg:` / `xl:` prefixes.
- Dark mode: `dark:` prefix or token overrides in a `prefers-color-scheme` block.
- No inline `style` except for dynamic values (e.g. spring-animated values).
- Motion is spring-based; CSS `transition-*` only for the narrow hover/focus case
  above — never `@keyframes`.

## Related

[[component-conventions]] · [[animation-system]] · [[new-page]]
