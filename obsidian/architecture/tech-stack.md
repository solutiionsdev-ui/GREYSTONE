---
tags: [architecture, stable]
updated: 2026-08-09
---

# Tech Stack

Every dependency in `package.json`, what it does, and why it is here.
Package name: `next16-claude-starter` · version `0.1.0` · private.

## Core framework

| Package | Version | Role |
|---------|---------|------|
| `next` | `16.2.0` | App Router framework. ⚠️ See warning below. |
| `react` / `react-dom` | `19.2.4` | UI runtime |
| `typescript` | `^5` | Type system — `any` is banned |

> [!warning] This is not the Next.js you may know
> `AGENTS.md` warns: APIs, conventions, and file structure may differ from older
> Next.js knowledge. Always check [[routing]] before writing routing code, and
> heed deprecation notices.

## Styling

| Package | Version | Role |
|---------|---------|------|
| `tailwindcss` | `^4` | Utility CSS — **no `tailwind.config.js`** |
| `@tailwindcss/postcss` | `^4` | PostCSS integration |

Tailwind v4 is configured entirely in `src/app/globals.css` via `@theme inline`.
See [[design-system]].

**Typeface: Google Sans Flex**, self-hosted via `next/font/local` from
`src/app/fonts/` — four static 24 pt instances (Thin / Light / Regular / Medium)
for text, **plus the variable build** (`GoogleSansFlex-Variable-latin.woff2`,
the official Google Fonts file, latin subset) for display type that needs the
`opsz` axis. This replaced Onest (`next/font/google`); no package changed, only
the loader. See [[design-system]] → Typography and [[decisions-log]] ADR-0029.

## Animation (the heart of the starter)

| Package | Version | Role |
|---------|---------|------|
| `@react-spring/web` | `^10.0.3` | Spring physics — drives **all** motion |
| `spring-text-engine` | `^0.1.5` | Scroll-aware spring text animation |

No `framer-motion`, no CSS transitions/keyframes. See [[animation-system]] and
[[text-engine]]. ADR: [[decisions-log]] ADR-0002.

## 3D

| Package | Version | Role |
|---------|---------|------|
| `three` | `0.185.1` | WebGL renderer for the audience section's glTF mark |
| `@types/three` | `^0.185.4` | Types (dev) |

Loaded only through `next/dynamic` (`ssr: false`) so it stays out of the first
load — see [[components/ui|`<ScrollModel>`]]. The model is **Draco-compressed**,
so the decoder is served from `public/draco/`, copied from
`three/examples/jsm/libs/draco/gltf/`; **re-copy it whenever three is upgraded**.
No React renderer (`@react-three/fiber`) — the scene is one model and three
lights. ADR: [[decisions-log]] ADR-0021.

> [!note] Hard rule #11 now applies
> The project renders a WebGL scene, so a performance / jank / pre-ship request
> must go through the `optimize-3d-scene` skill first — see [[optimize-3d-scene]].

## Scroll & state

| Package | Version | Role |
|---------|---------|------|
| `lenis` | `^1.3.19` | Smooth scrolling |
| `zustand` | `^5.0.12` | Lightweight global state (scroll store) |
| `resize-observer-polyfill` | `^1.5.1` | ResizeObserver fallback for animation hooks |
| `zod` | `^4.4.3` | Schema validation — env (`src/env.ts`) + API payloads. See [[api-architecture]] |

See [[smooth-scroll]] and [[data-flow]].

## Misc

No miscellaneous runtime dependencies. Cookie consent is an in-house component
(`src/components/common/Cookie/`) built on Zustand + `@react-spring/web` — the
former `react-cookie-consent` package was removed. See [[components/common]].

## Tooling

| Package | Role |
|---------|------|
| `eslint` `^9` + `eslint-config-next` | Linting — run `yarn lint` before commits |
| `@types/*` | Type definitions for node/react |

## Scripts

```bash
yarn dev      # next dev — local development
yarn build    # next build — production build
yarn start    # next start — serve production build
yarn lint     # eslint
```

Package manager: **Yarn** (`yarn.lock` is committed).

The dev server is **pinned to port 3000** — `.claude/launch.json` sets
`autoPort: false`, so it fails loudly on a busy port rather than silently moving
to a new one. `http://localhost:3000` is therefore a stable address to keep open
in a browser; free the port instead of letting the server pick another.
`NEXT_PUBLIC_SITE_URL` falls back to that same origin — see
[[environment-variables]].

## Not yet in the stack

Auth, database/ORM, payments, i18n, data-fetching libraries. The original starter
spec listed these as "add as needed" placeholders. Document them here when adopted,
and add an ADR to [[decisions-log]].

## Related

[[system-overview]] · [[folder-structure]]
