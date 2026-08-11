---
tags: [architecture, stable]
updated: 2026-08-11
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

### Runtime requirement — Node 20+

Next 16 + React 19 need **Node 20 or newer**; this project is developed on
**Node 22.23.2**. Node 14 and 16 are end-of-life and cannot run `next dev` at
all — the failure is not a helpful version warning, it is
`'next' is not recognized`, because npm never resolves the binary.

Node is managed with **nvm-windows** (`nvm use 22`), so an older system Node can
stay installed alongside for other projects. `nvm.exe` reads `NVM_HOME` from the
environment; in a non-interactive shell that variable is often absent and nvm
fails with `open \settings.txt: The system cannot find the file specified` — set
`NVM_HOME` and `NVM_SYMLINK` explicitly in that case. After `nvm use`, PATH
changes reach only newly started processes; already-running terminals and editors
keep the old Node until restarted.

### `node_modules` is platform-specific — never sync it

`node_modules` must be installed **on the machine that runs it**. A tree
installed on macOS and carried onto Windows (via Google Drive, a zip, or a
copied folder) is unusable: it holds `@next/swc-darwin-arm64` instead of
`@next/swc-win32-x64-msvc`, and `.bin/` contains Unix shims with no `.cmd`
wrappers, so npm cannot resolve `next`. Delete it and reinstall — patching the
shims does not help, because the native SWC binary is still the wrong platform.
Same for `.next/`. Both are gitignored; see [[decisions-log]] ADR-0032.

Install into the **local** working copy on `C:`, never into the Drive mount.
Beyond the platform problem, a yarn install writes ~23,000 small files, and
pushing each through Drive's sync layer is slow and burns cloud quota on files
that are pure build output. The Drive copy is an asset mirror — it does not need
`node_modules` at all.

The dev server is **pinned to port 3000** — `.claude/launch.json` sets
`autoPort: false`, so it fails loudly on a busy port rather than silently moving
to a new one. `http://localhost:3000` is therefore a stable address to keep open
in a browser; free the port instead of letting the server pick another.
`NEXT_PUBLIC_SITE_URL` falls back to that same origin — see
[[environment-variables]].

That launch config invokes **`npm run dev`**, not `yarn dev` — npm ships with
Node, so the preview starts on a machine where Yarn was never installed
globally. It runs the same `next dev` script either way. Yarn remains the
package manager of record for installs and the committed lockfile; on a machine
without it, `npx yarn@1.22.22 install` respects `yarn.lock` without needing a
global install.

## Not yet in the stack

Auth, database/ORM, payments, i18n, data-fetching libraries. The original starter
spec listed these as "add as needed" placeholders. Document them here when adopted,
and add an ADR to [[decisions-log]].

## Related

[[system-overview]] · [[folder-structure]]
