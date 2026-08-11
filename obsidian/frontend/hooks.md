---
tags: [frontend, stable]
updated: 2026-08-09
---

# Catalog — Hooks

Custom hooks in `src/hooks/`, grouped by domain.

## `hooks/animation/` — `#do-not-modify`

The hooks powering the [[animation-system]]. Consume them through the spring
components — don't call them directly unless extending the engine.

| Hook | File | Role |
|------|------|------|
| `useInViewRef` | `use-in-view-ref.ts` | IntersectionObserver ref for viewport detection |
| `useDynamicInView` | `use-dynamic-in-view.ts` | in-view detection with dynamic targets; accepts `rootMargin` / `threshold` — also the **mount gate for expensive components** (see the note below) |
| `useLoopInView` | `use-loop-in-view.ts` | in-view tied to a render loop |
| `useProgressTrigger` | `use-progress-trigger.ts` | scroll → 0–1 progress (powers `<SpringTrigger>` / `<ProgressTrigger>`); returns `progress` as a `RefObject<number>` — read `.current` |
| `useSpringTrigger` | `use-spring-trigger.ts` | scroll-driven spring logic |
| `useLoop` | `use-render-loop.ts` | subscribes a callback to the shared rAF ticker (`src/lib/animation/ticker.ts`) |
| `useResizeLoop` | `user-resize-loop.ts` | runs a callback when window width changes (via `useLoop`) |

## `hooks/smooth-scroll/`

| Hook | File | Role |
|------|------|------|
| `useScroll` | `use-scroll.ts` | Zustand store for Lenis + scroll state — see [[smooth-scroll]] |

## `hooks/` (root)

| Hook | File | Role |
|------|------|------|
| `useWindowWidth` / `useWindowHeight` / `useWindowSize` | `use-window-size.ts` | SSR-safe window dimensions — all three share **one** debounced (300 ms) `resize` listener via a `useSyncExternalStore` store |
| `useAdaptiveGrid` | `use-adaptive-grid.ts` | Scales the root `<html>` font-size up while the viewport exceeds `baseWidth` — powers `<AdaptiveGrid>`, see [[components/common]] |

> [!note] Shared render loop
> Loop-based hooks (`useLoop`, `useResizeLoop`, `useLoopInView`, the trigger
> hooks) all subscribe to the single app-wide ticker in `src/lib/animation/ticker.ts`
> rather than each starting their own `requestAnimationFrame`. See
> [[animation-system]]. The ticker is **not** `#do-not-modify`.

> [!important] `useDynamicInView` is how expensive components are deferred
> `next/dynamic` defers a **bundle**; it does not defer the **work**. A
> component still mounts on render, and mounting is what fetches the chunk,
> creates a WebGL context, generates an environment map or decodes a large
> image — all on the main thread, during page load.
>
> Gate the mount itself with a generous `rootMargin` so the cost lands shortly
> before the section is needed:
> ```tsx
> const [setGateNode, near] = useDynamicInView({ rootMargin: "800px" });
> // Latch it: proximity decides when to BUILD, never when to tear down.
> const [mounted, setMounted] = useState(false);
> useEffect(() => { if (near) setMounted(true); }, [near]);
> …
> <div ref={setGateNode}>{mounted ? <HeavyThing /> : null}</div>
> ```
> This is what took 456 KB of three plus a WASM decoder off page load — measured
> as a 125 ms main-thread block. See [[decisions-log]] ADR-0024,
> `views/home/audience-mark.tsx` and `components/ui/pixel-reveal-image.tsx`.

> [!danger] Never render `near ? <Heavy/> : null`, and never use `near` as an effect dep
> Both were shipped and both were wrong. `near` goes **false again** when the
> section leaves, so the unlatched form disposes the GL context, the compiled
> program and every texture on the way out — and rebuilds all of it on the way
> back, mid-scroll. Measured on a production build: a `linkProgram` on every
> re-entry plus a long task of **81 / 59 / 57 ms**, worst frame 92.8 ms. With the
> latch above: zero long tasks on repeat entries, max frame 17.4 ms.
>
> Gate the *work* instead — an `IntersectionObserver` plus `document.hidden`
> inside the component, so the loop idles while the resources stay resident.
> [[decisions-log]] ADR-0031.

## Adding a hook

Place it under `hooks/<domain>/`. Data-fetching logic belongs in hooks, not in
presentational components. Use [[templates/hook-note]] to document it here.

## Related

[[animation-system]] · [[smooth-scroll]] · [[utils]]
