---
tags: [architecture, stable]
updated: 2026-05-21
---

# Data Flow

How state, scroll position, and animation data move through the app. There is no
server data layer yet — all "data flow" here is **client-side UI state**.

## Provider hierarchy (fixed order)

The root layout (`src/app/layout.tsx`) wraps everything in this exact order.
**Do not reorder** — see [[decisions-log]].

```
<html> <body>
  <ScrollLayout>        ← Lenis smooth scroll + scroll state store
    <LazyCookie />      ← cookie consent banner + preferences modal
    {children}          ← the routed page
  </ScrollLayout>
</body> </html>
```

## Scroll state — Zustand store

The scroll store (`src/hooks/smooth-scroll/use-scroll.ts`) is the one piece of
global state. Shape:

```ts
{
  lenis: Lenis | null      // the Lenis instance
  setLenis(...)            // setter
  isEnableScroll: boolean  // is scrolling currently allowed?
  start()                  // enable scroll
  stop()                   // disable scroll (e.g. modal open)
}
```

### Flow

```
ScrollController (in ScrollLayout) mounts
   │
   ├─ new Lenis()  →  setLenis(instance)   ──► store.lenis
   │
   ├─ requestAnimationFrame loop  →  lenis.raf(time)   (continuous)
   │
   └─ watches store.isEnableScroll:
         true  → lenis.start() + native scroll on
         false → lenis.stop()  + native scroll locked (html overflow:hidden)
```

Any component reads/writes scroll state through the store:

```ts
const lenis = useScroll((s) => s.lenis)
const [start, stop] = useScroll(useShallow((s) => [s.start, s.stop]))
```

See [[smooth-scroll]] for the full API.

## Animation data flow

Animation values never live in React state — they live in **springs**.

```
Component renders with from / to props
   │
   ▼
@react-spring/web useSpring  →  animated values (outside React render cycle)
   │
   ▼
Trigger source updates the spring:
   ├─ IntersectionObserver   → <Inview>, <Spring>     (enter viewport)
   ├─ scroll position        → <SpringTrigger>        (scroll progress)
   ├─ mouse events           → <Hover>                (pointer enter/leave)
   ├─ scroll position        → <TextEngine mode="progress">
   ├─ pointer drag / keys    → <DragSequenceVideo>    (turntable angle)
   ├─ IntersectionObserver   → <DragSequenceVideo>    (starts its one playthrough)
   └─ IntersectionObserver   → <CounterValue>         (count-up + blur)
   │
   ▼
animated.<tag> applies values directly to the DOM node — no re-render
```

### When a spring does not drive a style

Most springs end at `animated.<tag>`, which writes CSS. Three do not, and each
reads its value off the **shared ticker** instead:

| Component | The spring drives |
|-----------|-------------------|
| `<DragSequenceVideo>` | a `<video>`'s `currentTime`, from a drag phase **plus** a spring-damped play rate |
| `<ScrollModel>` | a three.js object's rotation and position (scroll progress, via a ref) |

> [!warning] Two rules these share
> - **The ticker subscription must have stable deps.** Its throttle timer is
>   stamped at subscribe time, so re-subscribing every render — which is what
>   happens if the effect depends on `springs` — means the interval never
>   elapses and the callback silently never runs. Read through a ref instead.
>   See [[animation-system]].
> - **Animated values still never live in React state**, but a *target* may. The
>   declarative `useSpring({ value })` form is required in this build, because
>   `api.start()` does not move values. State holds the destination; the spring
>   still owns the animation.
>
> See [[components/ui]], [[components/common]], and [[decisions-log]] ADR-0020 /
> ADR-0021 / ADR-0022.

Global animation behaviour (mobile disable, breakpoint) is read from
`src/lib/springs/config.ts` — see [[animation-system]].

## Page data flow

```
app/page.tsx  →  views/home.tsx  →  composed components
```

Per the [[component-conventions]]:
- **No hardcoded content** in components — data comes from props or hooks.
- Placeholder data → `src/data/mocks/<page>.ts`, passed via props.
- Async data → custom hook in `src/hooks/`; component handles `loading` / `error`
  / `empty` with skeleton loaders. See [[components/common]].

## Server / external data flow

External APIs are reached **only** through server code — the browser never
calls a third party directly or holds a secret.

```
Server Component         →  reads data at render time (no client request)
Client Component         →  apiFetch('/api/…')  →  app/api/**/route.ts  →  upstream
app/api/**/route.ts      →  validates (zod) → does the work → { data } | { error }
```

Secrets live in unprefixed env vars, read via `getServerEnv()` inside route
handlers. Full convention: [[api-architecture]].

## Hash-link scrolling

`ScrollController` watches `usePathname()`. If the path contains a `#hash`, it waits
300 ms then calls `scrollTo(hash, true)` so smooth scroll lands on the target.

## Related

[[system-overview]] · [[smooth-scroll]] · [[animation-system]]
