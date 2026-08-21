"use client";

// 📖 Docs: obsidian/frontend/components/ui.md

import { useSpring } from "@react-spring/web";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDynamicInView } from "@/hooks/animation/use-dynamic-in-view";
import { subscribeToTicker } from "@/lib/animation/ticker";
import { frameBudgetMs, getDeviceTier } from "@/lib/scene/device";

/**
 * A turntable: a video advanced frame-by-frame rather than played.
 *
 * The clip is never `play()`ed. A phase is advanced on the shared ticker and
 * mapped onto `currentTime`, so the file behaves like an image sequence while
 * staying a single compressed asset. Requires an **all-keyframe** encode; with
 * sparse keyframes the browser snaps to the nearest one and the rotation looks
 * steppy rather than continuous.
 *
 * It plays itself through **once**, starting when it scrolls into view, and is
 * draggable throughout — by the surface itself or by the scrubber, which are
 * two views of one phase value. Taking hold of either **cancels** the
 * playthrough rather than fighting it, so the two inputs never argue over the
 * same value and the handle never jumps.
 */
export interface DragSequenceVideoProps {
  src: string;
  /** Describes what the sequence shows — becomes the control's accessible name. */
  label: string;
  className?: string;
  /**
   * How many element-widths of drag equal one full turn. Higher is less
   * sensitive.
   */
  widthsPerTurn?: number;
  /** Render the pill scrubber along the bottom edge. */
  scrubber?: boolean;
}

/** One arrow-key press — a 15° notch. */
const KEY_STEP = 1 / 24;
/** How much of the release velocity carries into the glide. */
const FLICK_DAMPING = 0.14;
/** Don't re-seek for a difference smaller than a quarter-frame at 60fps. */
const SEEK_EPSILON = 1 / 240;
/** Minimum gap between seeks (ms) — roughly the clip's own frame rate. */
const SEEK_INTERVAL_MS = 1000 / 30;
/** Ignore absurd frame deltas (tab was backgrounded). */
const MAX_DELTA_MS = 100;
/**
 * Where the single playthrough stops. Just short of a whole turn, because the
 * phase is wrapped before it becomes a timestamp and `wrap(1)` is 0 — landing
 * on exactly 1 would snap back to the first frame instead of resting on the
 * last one.
 */
const AUTO_END = 0.9995;
/** Multiplier on the clip's authored speed for the one automatic playthrough. */
const PLAY_SPEED = 2.2;

const wrap = (value: number): number => ((value % 1) + 1) % 1;
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const DragSequenceVideo = ({
  src,
  label,
  className,
  widthsPerTurn = 1,
  scrubber = false,
}: DragSequenceVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const duration = useRef(0);
  const target = useRef(0);
  const pointer = useRef<{ id: number; x: number; time: number; velocity: number } | null>(null);
  /** Phase contributed by the clip playing itself, in turns. */
  const autoPhase = useRef(0);
  const lastTick = useRef(0);
  /**
   * Set while the scrubber is held. The handle then follows the pointer
   * **exactly** — routing it through the spring made it lag behind the cursor,
   * and wrapping made it jump the full width at the ends. Both read as the
   * "seams" in the drag.
   */
  const scrubPhase = useRef<number | null>(null);
  /** Timestamp of the last seek, so decoding is throttled but painting is not. */
  const lastSeek = useRef(0);

  const [ready, setReady] = useState(false);
  const [turn, setTurn] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** True once the playthrough has finished or been taken over by a drag. */
  const [spent, setSpent] = useState(false);
  const spentRef = useRef(false);
  /** Coarse position for assistive tech — updated on release, not per frame. */
  const [announced, setAnnounced] = useState(0);

  const [setInViewNode, inView] = useDynamicInView({});
  /**
   * Fetching is armed a viewport ahead of the section rather than on load.
   *
   * The clip is several megabytes and sits well down the page, so preloading it
   * eagerly made every visitor pay for it whether or not they ever reached it.
   * A margin of one viewport gives it time to arrive before it is looked at
   * without competing with the hero for bandwidth.
   */
  const [setNearNode, near] = useDynamicInView({ rootMargin: "100% 0px" });

  /**
   * Whether the decoder has been woken. See `prime`.
   */
  const primed = useRef(false);

  /**
   * Wake the decoder with a muted, inline play/pause.
   *
   * Seeking alone paints a frame on desktop, but not in iOS Safari: there
   * `preload` is ignored and the decoder is only spun up by playback, so a clip
   * that is never `play()`ed stays blank however much it is seeked. A muted
   * `playsInline` clip is allowed to start without a gesture, so starting it and
   * stopping it on the same tick primes the decoder without the clip visibly
   * running.
   *
   * Autoplay is refused outright in Low Power Mode, so the flag is cleared on
   * rejection and the first touch tries again — see `handlePointerDown`.
   */
  const prime = useCallback((video: HTMLVideoElement) => {
    if (primed.current) return;
    primed.current = true;
    const resume = video.currentTime;
    const started = video.play();
    if (!started || typeof started.then !== "function") return;
    started
      .then(() => {
        video.pause();
        // Playback advances the clip; put it back where the phase expects it.
        video.currentTime = resume;
      })
      .catch(() => {
        primed.current = false;
      });
  }, []);

  // `preload="none"` holds the element empty until this runs, so the load has to
  // be asked for explicitly once the section is near.
  useEffect(() => {
    if (!near) return;
    const video = videoRef.current;
    if (video && video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
  }, [near]);

  useEffect(() => {
    if (!inView) return;
    if (!spentRef.current) setPlaying(true);
    // iOS fetches nothing until playback is asked for, so a clip scrolled into
    // view has to be woken here as well as on metadata.
    const video = videoRef.current;
    if (video) prime(video);
  }, [inView, prime]);

  // Declarative form on purpose: `useSpring` diffs values each render. The
  // imperative `useSpring(fn).api.start` form does not move the values in this
  // project's react-spring build — same finding as
  // src/components/animation/springs/in-view.tsx.
  const springs = useSpring({
    turn,
    rate: playing ? 1 : 0,
    config: { tension: 210, friction: 30, mass: 0.8 },
  });

  const moveTo = useCallback((next: number) => {
    target.current = next;
    setTurn(next);
  }, []);

  /** Jump straight to a 0–1 position on the timeline (scrubber / keyboard). */
  const seekToFraction = useCallback(
    (fraction: number) => {
      moveTo(clamp01(fraction) - autoPhase.current);
    },
    [moveTo],
  );

  const adopt = useCallback(
    (video: HTMLVideoElement) => {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) return;
      duration.current = video.duration;
      // Nudge off zero so the first frame paints on browsers that decode a seek.
      if (video.currentTime === 0) video.currentTime = SEEK_EPSILON;
      prime(video);
      setReady(true);
    },
    [prime],
  );

  // The element is server-rendered, so it can finish loading *before* hydration
  // attaches `onLoadedMetadata` — in which case that event never fires for us.
  // Adopt whatever state it already reached.
  useEffect(() => {
    const video = videoRef.current;
    if (video) adopt(video);
  }, [adopt]);

  // Read through a ref so the subscription below can have empty deps. Each
  // drag frame calls `setTurn`, which re-renders and gives `springs` a new
  // identity; subscribing on that identity would tear the ticker subscription
  // down and rebuild it every frame, resetting its throttle timer so the
  // interval never elapses and the video never seeks.
  const springsRef = useRef(springs);
  useEffect(() => {
    springsRef.current = springs;
  });

  useEffect(() => {
    // The clip has far fewer than 60 frames a second, so seeking every rAF just
    // burns decodes for frames nobody sees. A slower tier stretches this
    // further; painting the handle stays uncapped either way.
    const seekInterval = Math.max(SEEK_INTERVAL_MS, frameBudgetMs(getDeviceTier()));

    return subscribeToTicker(
      (time) => {
        const video = videoRef.current;
        if (!video || !duration.current || document.hidden) return;

        const delta = lastTick.current ? Math.min(time - lastTick.current, MAX_DELTA_MS) : 0;
        lastTick.current = time;

        // Advance at the clip's authored speed, and stop dead on the last
        // frame — this plays once, not on a loop.
        if (autoPhase.current < AUTO_END && scrubPhase.current === null) {
          autoPhase.current = Math.min(
            AUTO_END,
            autoPhase.current +
              (springsRef.current.rate.get() * PLAY_SPEED * (delta / 1000)) /
                duration.current,
          );
          if (autoPhase.current >= AUTO_END && !spentRef.current) {
            spentRef.current = true;
            setSpent(true);
            setPlaying(false);
            setAnnounced(100);
          }
        }

        // A held scrubber is authoritative: no spring between the pointer and
        // the frame, and clamped rather than wrapped so the ends are walls
        // instead of a jump back to the far side.
        const phase =
          scrubPhase.current !== null
            ? scrubPhase.current
            : wrap(autoPhase.current + springsRef.current.turn.get());

        // Move the scrubber handle imperatively — it changes every frame and
        // React has no reason to see it. `left` rather than `translateX`,
        // because a percentage translate resolves against the handle's own
        // width, not the track it is supposed to travel.
        if (handleRef.current) {
          handleRef.current.style.left = `${(phase * 100).toFixed(3)}%`;
        }

        // Only the *seek* is throttled. Writing the handle's position is a
        // style assignment costing nothing, and inheriting the seek's 30 Hz
        // budget made it step visibly behind a 60 Hz cursor — which is what
        // read as a choppy scrubber.
        if (time - lastSeek.current < seekInterval) return;
        lastSeek.current = time;

        // A seek that is still decoding must not be given another target —
        // queued seeks are what makes scrubbing stutter. Skipping instead
        // means we always chase the *latest* value, never a backlog.
        if (video.seeking) return;
        const next = phase * duration.current;
        if (Math.abs(video.currentTime - next) > SEEK_EPSILON) {
          video.currentTime = next;
        }
      },
      () => 0,
    );
  }, []);

  // Draggable as soon as the clip can be seeked — waiting for the playthrough
  // to finish made the control feel dead on arrival.
  const draggable = ready;

  /** Taking hold cancels the playthrough instead of fighting it for the phase. */
  const takeOver = useCallback(() => {
    if (!spentRef.current) {
      spentRef.current = true;
      setSpent(true);
      setPlaying(false);
    }
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    // Runs before the `draggable` guard: when autoplay was refused this touch is
    // the gesture that is allowed to wake the decoder, and the clip is not yet
    // draggable precisely because it never woke.
    if (videoRef.current) prime(videoRef.current);
    if (!draggable) return;
    takeOver();
    pointer.current = { id: event.pointerId, x: event.clientX, time: event.timeStamp, velocity: 0 };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer already gone — dragging still works without capture.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const active = pointer.current;
    const width = hostRef.current?.clientWidth ?? 0;
    if (!active || active.id !== event.pointerId || !width) return;

    const dx = event.clientX - active.x;
    const dt = Math.max(event.timeStamp - active.time, 1);
    const turns = dx / (width * widthsPerTurn);

    active.x = event.clientX;
    active.time = event.timeStamp;
    active.velocity = turns / dt;

    // Drag right → rotate the subject right, i.e. run the sequence backwards.
    moveTo(target.current - turns);
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    pointer.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Capture was never taken.
    }
    // Let a flick keep spinning; the same spring decelerates it.
    if (Math.abs(active.velocity) > 0) {
      moveTo(target.current - active.velocity * FLICK_DAMPING * 1000);
    }
  };

  /** Scrubbing maps the pointer's x straight onto the timeline, clamped. */
  const scrubTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (!rect.width) return;
    scrubPhase.current = clamp01((clientX - rect.left) / rect.width);
  };

  const handleScrubDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    event.stopPropagation();
    takeOver();
    pointer.current = { id: event.pointerId, x: event.clientX, time: event.timeStamp, velocity: 0 };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is optional.
    }
    scrubTo(event.clientX);
  };

  const handleScrubMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    event.stopPropagation();
    scrubTo(event.clientX);
  };

  const handleScrubUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current || pointer.current.id !== event.pointerId) return;
    pointer.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Capture was never taken.
    }
    // Hand the value back to the spring path without moving it: rebase
    // `autoPhase` so `autoPhase + turn` already equals where the scrub ended.
    // Skipping this is what would make the frame jump on release.
    if (scrubPhase.current !== null) {
      const landed = scrubPhase.current;
      autoPhase.current = landed - springs.turn.get();
      setAnnounced(Math.round(landed * 100));
      scrubPhase.current = null;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!draggable) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(target.current + KEY_STEP);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(target.current - KEY_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      seekToFraction(0);
    }
  };

  return (
    <div
      ref={(node) => {
        hostRef.current = node;
        setInViewNode(node);
        setNearNode(node);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // pan-y keeps vertical page scrolling while horizontal drag rotates.
      className={`relative touch-pan-y select-none overflow-hidden bg-surface-muted ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload={near ? "auto" : "none"}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
        onLoadedMetadata={(event) => adopt(event.currentTarget)}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />

      {scrubber ? (
        <div
          role="slider"
          tabIndex={draggable ? 0 : -1}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={announced}
          aria-disabled={draggable ? undefined : true}
          onPointerDown={handleScrubDown}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubUp}
          onPointerCancel={handleScrubUp}
          onKeyDown={handleKeyDown}
          className={`absolute inset-x-6.75 bottom-7.5 flex h-8.75 items-center rounded-full bg-surface-glass px-6.25 backdrop-blur-glass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-media ${
            draggable ? "cursor-ew-resize" : "cursor-default"
          }`}
        >
          {/* The track is the measured element; the handle rides it. */}
          <div ref={trackRef} className="relative h-px w-full bg-on-media">
            <span
              ref={handleRef}
              aria-hidden="true"
              className="absolute left-0 top-1/2 block h-2.75 w-9.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-on-media bg-action-primary"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
