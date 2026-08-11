---
tags: [architecture, stable]
updated: 2026-08-09
---

# Folder Structure

Where everything lives and what belongs where. The repo has two top-level concerns:
the **app** (`src/`) and this **vault** (`obsidian/`).

## Repo root

```
next16-claude-starter/
├── src/                     ← application code (see below)
├── public/                  ← static assets (see "public/" section below)
├── obsidian/                ← this Obsidian vault — ALL project documentation
├── .claude/settings.json    ← Claude Code hooks — automate the vault workflow
├── app config files         ← next.config.ts, tsconfig, eslint, postcss
├── README.md                ← project README → points into the vault
├── AGENTS.md                ← agent guide — breaking-change warning, hard rules, vault pointer
├── CLAUDE.md                ← Claude Code entry → @AGENTS.md
└── .cursorrules             ← Cursor entry → @AGENTS.md
```

All documentation lives in the vault. The root `AGENTS.md` / `CLAUDE.md` /
`.cursorrules` are thin shims that carry the hard rules and point into it —
see [[ai-agent-guide]]. `.claude/settings.json` holds hooks that enforce the
documentation workflow automatically — also see [[ai-agent-guide]].

## `src/` — application code

```
src/
├── env.ts                  # zod-validated env (public + server-only split)
│
├── app/                    # Next.js routes — keep lean, routing only
│   ├── layout.tsx          # Root layout — provider tree lives here
│   ├── page.tsx            # Route → delegates to a view
│   ├── api/<resource>/route.ts  # API endpoints — see [[api-architecture]]
│   ├── loading.tsx         # Suspense fallback (enables streaming)
│   ├── error.tsx           # Route-segment error boundary
│   ├── not-found.tsx       # 404 page
│   ├── icon.tsx            # → /icon         favicon, drawn from the brand mark
│   ├── apple-icon.tsx      # → /apple-icon   home-screen icon
│   ├── opengraph-image.tsx # → /opengraph-image  1200×630 share card
│   ├── robots.ts           # → /robots.txt
│   ├── sitemap.ts          # → /sitemap.xml
│   └── globals.css         # Tailwind v4 config + design tokens
│
├── data/mocks/             # Placeholder content, passed into views via props
│   └── home.ts             # AERRA home page copy (from the Figma frame)
│
├── views/                  # Page-level components — one per route
│   ├── home.tsx            # HomeView (Server Component) — assembles the sections
│   └── home/               # Feature components for that view, one per Figma band
│       ├── site-nav.tsx · hero-section.tsx · about-section.tsx
│       ├── numbers-section.tsx · location-section.tsx · audience-section.tsx · contact-section.tsx
│       └── audience-mark.tsx   # client leaf — dynamic-imports the 3D mark
│
├── layouts/                # Reusable layout wrappers
│   └── scroll-layout.tsx   # Lenis smooth-scroll wrapper
│
├── components/
│   ├── ui/                 # Design-system primitives — CtaButton, Eyebrow, TextField,
│   │                       #   ParallaxMedia, DragSequenceVideo, CounterValue,
│   │                       #   ScrollModel, PixelRevealImage, SplitWordmark, icons/
│   ├── common/             # Shared infrastructure (Cookie, grid, ReducedMotion, Skeletons)
│   └── animation/springs/  # ⚠️ Animation engine — #do-not-modify
│
├── hooks/                  # Custom hooks, grouped by domain
│   ├── animation/          # ⚠️ Animation hooks — #do-not-modify
│   ├── smooth-scroll/      # useScroll Zustand store
│   └── use-window-size.ts
│
├── lib/                    # Third-party client init / global config
│   ├── animation/ticker.ts # Shared app-wide requestAnimationFrame loop
│   ├── api/                # API route-handler helpers (handle, ApiError)
│   ├── api-client.ts       # Typed same-origin /api fetch wrapper (client)
│   ├── site.ts             # Site-wide SEO config (single source of truth)
│   ├── scene/device.ts     # Device tier → DPR, frame budget, antialias (ADR-0026)
│   ├── springs/config.ts   # Global animation config
│   └── springs/reveal.ts   # Shared reveal presets (numeric — must cross RSC boundary)
│   └── springs/preloader-timing.ts  # Curtain durations + the HERO_DELAY offsets derived from them
│
├── utils/                  # Pure utility functions (no side effects)
│   ├── animation/coords.ts
│   ├── seo/generate-page-metadata.ts · seo/structured-data.ts
│   ├── is-bot.ts · lvh.ts · math.ts · scroll-to.ts
│
├── types/                  # Shared TypeScript types
│   └── springs.ts
│
└── style/                  # Extra CSS layers imported into globals.css
    └── index.css
```

## `public/` — static assets

```
public/
├── manifest.json            # the only meta file left here — points at /icon
│                            #   and /apple-icon, which are generated routes
├── draco/                   # vendored glTF Draco decoder — see note below
└── assets/                  # site content assets (images, video, models …)
    └── <section>/           # one folder per section that uses them
```

> [!important] `public/draco/` is vendored, not authored
> Copied verbatim from `three/examples/jsm/libs/draco/gltf/` so `GLTFLoader` can
> read the Draco-compressed model. **Re-copy it whenever three is upgraded** — a
> decoder mismatched to the runtime fails silently at load. It is minified
> third-party code, which is why `public/**` is ESLint-ignored.

> [!important] Asset convention
> Content assets used **on the site** (images, videos, …) live under
> `public/assets/`, and **each section gets its own folder** — e.g.
> `public/assets/hero/`, `public/assets/footer/`. Reference them by absolute
> path (`/assets/hero/bg.webp`).
>
> **Icons and the share card are not files.** They are generated from the brand
> mark by `src/app/icon.tsx`, `apple-icon.tsx` and `opengraph-image.tsx` — do not
> add a `favicon.ico` or `open-graph.png` back to `public/`, because
> `app/favicon.ico` and a hard-coded `icons` block both *shadow* the generated
> routes. See [[seo-metadata]]. Only `manifest.json` remains at the root.

## Placement rules — where do I put a new file?

| I am adding… | It goes in… |
|--------------|-------------|
| A route | `app/<route>/page.tsx` — 3 lines, delegates to a view |
| An API endpoint | `app/api/<resource>/route.ts` — see [[api-architecture]] |
| A page's UI | `views/<page-name>.tsx` — see [[new-page]] |
| A reusable design primitive | `components/ui/` |
| Shared infra (provider-dependent) | `components/common/` |
| A feature-specific component | next to the feature, **not** in `components/` |
| A custom hook | `hooks/<domain>/` |
| A pure helper | `utils/<domain>/` |
| A shared type | `types/` |
| Mock/placeholder data | `src/data/mocks/<page-name>.ts` (create folder as needed) |
| A third-party client init | `lib/` |
| A site content asset (image, video) | `public/assets/<section>/` — one folder per section |
| A favicon / icon / OG image | **generated** — `src/app/icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`, not a file |

## Do-not-modify zones

`components/animation/springs/` and `hooks/animation/` are the animation engine.
Treat them as a vendored library — consume them, never edit them. See [[animation-system]].

## Related

[[system-overview]] · [[component-conventions]] · [[routing]]
