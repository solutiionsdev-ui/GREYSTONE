---
tags: [frontend, stable]
updated: 2026-08-09
---

# Routing

Next.js 16 App Router. The defining convention: **routes delegate to views**.

> [!warning]
> Per `AGENTS.md`, this version of Next.js may differ from older knowledge. Heed
> deprecation notices before writing routing code.

## Route → View delegation

`app/**/page.tsx` files contain **no UI logic**. They import a component from
`src/views/` and render it. ADR: [[decisions-log]] ADR-0003.

```tsx
// src/app/page.tsx
import { HomeView } from "@/views/home";

export default function Home() {
  return <HomeView />;
}
```

All layout and UI logic lives in `src/views/home.tsx` (`HomeView`). The view is
a **Server Component**; isolate any client-only animation in a leaf component —
see [[component-conventions]] hard rule #6.

`HomeView` is **built** — it is the AERRA landing page, ported from the Figma
frame "Concept 3" (`1469:1302`). It renders the `<Preloader>` curtain, a skip
link, the fixed `<SiteNav>` (a sibling of `<main>`, not nested in a section),
and then one section component per band of that frame from `src/views/home/`,
with copy from `src/data/mocks/home.ts`:

| Section component | Figma band |
|-------------------|-----------|
| `hero-section.tsx` (+ `site-nav.tsx`) | 0 → 1514 |
| `about-section.tsx` | 1514 → 2849 |
| `numbers-section.tsx` | 2849 → 3421 |
| `location-section.tsx` | 3421 → 4379 |
| `audience-section.tsx` | 4379 → 6073 |
| `contact-section.tsx` | 6073 → 7199 |

From `lg:` (**1280 px**) up each section keeps its Figma height and places children at their
Figma coordinates through the rem spacing scale (1 Figma px = 0.0625rem), so the
1440 composition holds its proportions — see [[decisions-log]] ADR-0018.

**Below `lg:` every section stacks instead.** The desktop rules live behind the
`lg:` prefix and the default is ordinary flow. `SiteNav` collapses to a burger
there, with the panel spring-animated and the desktop links `hidden`. The hero's
oversized decorative wordmark is `hidden` below `lg:` — at phone width it is far
wider than the viewport and reads as stray fragments rather than a word.

The same stack serves phones and tablets, with **`tablet:`** (540 px) refining
it for the wider range: audience cards two-up, the three stats in a row, contact
fields side by side, and a capped reading measure so body copy does not run the
full 780 px. `md:` is Tailwind's default 768 and is **deliberately unused for
layout** — a stray `md:` would otherwise half-apply the desktop composition to a
tablet. Ranges and the reasoning: ADR-0027 and ADR-0030.

> [!warning] A `TextEngine` heading cannot be made responsive with CSS
> It positions its split children absolutely, so they never flex-wrap — a
> heading that fits at 1440 runs off a narrow screen and no override reaches it.
> The hero and contact headings render plain text below `lg:` and the animated
> version above, inside a single heading element. Copy that shape for any new
> one. See ADR-0027.

Editing one? Follow [[new-page]] and keep diffs minimal.

## Current routes

| Route | File | View |
|-------|------|------|
| `/` | `src/app/page.tsx` | `views/home.tsx` → `HomeView` |

## Special files

`src/app/` carries the App Router special files:

| File | Role |
|------|------|
| `layout.tsx` | Root layout — provider tree, font, `metadata` + `viewport`, JSON-LD |
| `loading.tsx` | Suspense fallback — its presence enables streaming |
| `error.tsx` | Route-segment error boundary (Client Component) |
| `not-found.tsx` | 404 page — served with a 404 status |
| `robots.ts` / `sitemap.ts` | Generate `/robots.txt` and `/sitemap.xml` — see [[seo-metadata]] |
| `api/<resource>/route.ts` | API endpoints (Route Handlers) — see [[api-architecture]] |

## Adding a route

1. Create `src/app/<route>/page.tsx` — keep it ~3 lines, delegate to a view.
2. Create `src/views/<route>.tsx` — the actual page component.
3. Use route groups `app/(feature)/` to scope feature pages without affecting the URL.
4. Follow the [[new-page]] playbook.

## Layouts

- `src/app/layout.tsx` — the **root layout**. Holds the provider tree
  (`ScrollLayout` → `AdaptiveGrid` / `ReducedMotion` / `Cookie` → children),
  loads the Google Sans Flex font (`next/font/local`) and `globals.css`, exports
  `metadata` + `viewport`, and renders the JSON-LD script. Note `AdaptiveGrid`
  takes `coef={1}` here — see [[decisions-log]] ADR-0018. See [[data-flow]].
- Reusable layout *wrappers* (not route layouts) live in `src/layouts/` —
  e.g. [[smooth-scroll|ScrollLayout]].

## Navigation

Use **standard Next.js navigation** — `<Link>` from `next/link` and `useRouter`
from `next/navigation`. ADR: [[decisions-log]] ADR-0005.

```tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';
```

> [!note]
> Earlier drafts of `generic-layout-prompt.md` referenced `<AnimLink>` /
> `useAnimRouter()`. Those were never built and the convention is dropped — use
> `next/link` directly.

## SEO per route

Each route exports `metadata` via the shared generator — see [[seo-metadata]].

## Related

[[system-overview]] · [[component-conventions]] · [[new-page]]
