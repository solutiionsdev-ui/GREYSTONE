"use client";

// 📖 Docs: obsidian/frontend/components/ui.md

import { useEffect, useRef, useState } from "react";

import { useDynamicInView } from "@/hooks/animation/use-dynamic-in-view";
import { subscribeToTicker } from "@/lib/animation/ticker";
import {
  clampPixelRatio,
  frameBudgetMs,
  getDeviceTier,
} from "@/lib/scene/device";
import { springsConfig } from "@/lib/springs/config";

/**
 * An image that is painted in by a pixel wave wherever the cursor moves.
 *
 * A coarse "heat" grid is kept on the CPU — a few thousand cells, cheap to
 * update — and uploaded each frame as a tiny texture. The fragment shader reads
 * it with `NEAREST` filtering, so the grid's own cells *are* the pixels of the
 * effect; no pixelation pass is needed. Heat also displaces the lookup
 * slightly, which gives the wave its swell.
 *
 * Raw WebGL rather than three.js: this is one full-screen quad, and the
 * location section should not pull in a 3D engine to draw it.
 */
export interface PixelRevealImageProps {
  src: string;
  /** Describes what is revealed — the canvas is opaque to assistive tech. */
  label: string;
  className?: string;
}

/** Heat grid resolution. Each cell is one visible pixel block. */
const COLS = 84;
const ROWS = 56;
/** Fraction of heat retained per frame — sets how long the trail lingers. */
const DECAY = 0.955;
/** Splat radius, in grid cells. */
const RADIUS = 11;
/** Spin the GL context up this far before the section reaches the viewport. */
const PRELOAD_MARGIN = "600px";

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uHeat;
uniform vec2 uGrid;
uniform vec2 uCoverScale;

void main() {
  // Heat stays in canvas space, so the wave follows the cursor regardless of
  // how the artwork is fitted. NEAREST on a low-res grid quantises the reveal
  // into blocks — the grid's own cells are the pixels of the effect.
  float heat = texture2D(uHeat, vUv).r;

  // Cover-fit, matching the object-cover photograph underneath: the canvas is
  // 120% of the section tall (it rides the same parallax layer), so sampling
  // straight would stretch the artwork out of step with the photo.
  vec2 uv = (vUv - 0.5) * uCoverScale + 0.5;

  // No displacement: warping the lookup smeared the artwork into streaks
  // instead of revealing it.
  vec4 image = texture2D(uImage, uv);

  // Quantise the alpha to the same block grid so the edge steps in pixels
  // rather than fading smoothly, then keep a touch of softness at the tail.
  float alpha = smoothstep(0.04, 0.5, heat);
  gl_FragColor = vec4(image.rgb, image.a * alpha);
}`;

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[PixelRevealImage] shader failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

export const PixelRevealImage = ({ src, label, className }: PixelRevealImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Creating the GL context, compiling the shaders and decoding a 1.4 MB PNG
  // are all main-thread work; none of it should happen while this section is
  // still far below the fold.
  const [setGateNode, near] = useDynamicInView({ rootMargin: PRELOAD_MARGIN });

  /**
   * Latched: proximity decides **when to build**, never when to tear down.
   *
   * Depending the effect on `near` directly meant leaving the section disposed
   * the program and returning re-created it — measured as a `linkProgram` plus
   * a 57–81 ms long task on *every* re-entry, landing mid-scroll. The draw is
   * already gated separately (`onScreen` below), which is what §4 of
   * `optimize-3d-scene` actually asks for; the resources stay.
   */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (near) setArmed(true);
  }, [near]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !armed) return;
    if (!window.matchMedia(`(hover: hover) and (pointer: fine) and (min-width: ${springsConfig.mobileWidth}px)`).matches) {
      return;
    }

    const tier = getDeviceTier();
    // §7: one flat quad — nothing here depth-tests, stencils or antialiases.
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // --- heat grid -------------------------------------------------------
    const heat = new Float32Array(COLS * ROWS);
    const heatBytes = new Uint8Array(COLS * ROWS * 4);
    const heatTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, heatTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // --- image -----------------------------------------------------------
    const imageTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const coverLoc = gl.getUniformLocation(program, "uCoverScale");
    let imageAspect = 1;

    /** Zooms the lookup so the artwork covers the canvas instead of stretching. */
    const applyCover = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const canvasAspect = w / h;
      if (canvasAspect > imageAspect) {
        gl.uniform2f(coverLoc, 1, imageAspect / canvasAspect);
      } else {
        gl.uniform2f(coverLoc, canvasAspect / imageAspect, 1);
      }
    };

    let imageReady = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      imageAspect = image.naturalWidth / image.naturalHeight;
      applyCover();
      imageReady = true;
    };
    image.src = src;

    gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "uHeat"), 1);
    gl.uniform2f(gl.getUniformLocation(program, "uGrid"), COLS, ROWS);

    const resize = () => {
      // The effect is quantised to an 84 × 56 grid, so it is the opposite of
      // hard-edged — it can take the lower clamp with no visible cost.
      const dpr = clampPixelRatio(tier, false);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (!width || !height) return;
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      applyCover();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Pointer position in grid space; null when the cursor is elsewhere.
    let splat: { col: number; row: number } | null = null;
    // Latest viewport-space pointer position, resolved against the canvas once
    // per frame rather than per event — `getBoundingClientRect` in a listener
    // that fires during scroll is a forced layout every event
    // (`optimize-3d-scene` §9).
    let pointerX = 0;
    let pointerY = 0;
    let pointerMoved = false;
    let lastX: number | null = null;
    let lastY: number | null = null;

    const onMove = (event: PointerEvent) => {
      // Scrolling the page under a stationary cursor makes the browser
      // synthesise pointer events at the *same* coordinates. Treating those as
      // hovering painted the reveal in wherever the cursor happened to be
      // parked, so the mask was already showing on arrival.
      if (event.clientX === lastX && event.clientY === lastY) return;
      lastX = event.clientX;
      lastY = event.clientY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerMoved = true;
    };
    const onLeave = () => {
      pointerMoved = false;
      splat = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });

    // §4: don't even decay the grid while the tab is hidden or the section is
    // off screen. Previously this ran its 4 704-cell sweep every frame for the
    // whole life of the page.
    let onScreen = true;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        // Leave cold, arrive cold: heat left in the grid would still be there
        // on the way back, which reads as a reveal nobody asked for.
        if (!onScreen) {
          heat.fill(0);
          splat = null;
          pointerMoved = false;
          lastX = null;
          lastY = null;
        }
      },
      { rootMargin: "10%" },
    );
    visibility.observe(canvas);

    let alive = 0;
    const unsubscribe = subscribeToTicker(
      () => {
        if (!imageReady || !onScreen || document.hidden) return;

        // One rect read per frame, inside the ticker — see `onMove`.
        if (pointerMoved) {
          const rect = canvas.getBoundingClientRect();
          const u = (pointerX - rect.left) / rect.width;
          const v = (pointerY - rect.top) / rect.height;
          splat =
            u < 0 || u > 1 || v < 0 || v > 1
              ? null
              : // The heat texture is sampled with the image's flipped Y, so
                // paint into the row the shader will read.
                { col: u * COLS, row: (1 - v) * ROWS };
          pointerMoved = false;
        } else {
          // A cursor that stopped moving stops feeding the wave; the trail
          // decays out on its own.
          splat = null;
        }

        let peak = 0;
        for (let i = 0; i < heat.length; i += 1) {
          heat[i] *= DECAY;
          if (heat[i] > peak) peak = heat[i];
        }

        if (splat) {
          const minCol = Math.max(0, Math.floor(splat.col - RADIUS));
          const maxCol = Math.min(COLS - 1, Math.ceil(splat.col + RADIUS));
          const minRow = Math.max(0, Math.floor(splat.row - RADIUS));
          const maxRow = Math.min(ROWS - 1, Math.ceil(splat.row + RADIUS));
          for (let row = minRow; row <= maxRow; row += 1) {
            for (let col = minCol; col <= maxCol; col += 1) {
              const dx = col + 0.5 - splat.col;
              const dy = row + 0.5 - splat.row;
              const falloff = 1 - Math.sqrt(dx * dx + dy * dy) / RADIUS;
              if (falloff <= 0) continue;
              const index = row * COLS + col;
              // Smooth the splat edge, and let heat accumulate up to 1.
              const add = falloff * falloff * 0.34;
              heat[index] = Math.min(1, heat[index] + add);
              if (heat[index] > peak) peak = heat[index];
            }
          }
        }

        // Nothing visible and nothing incoming — skip the upload and the draw.
        if (peak < 0.002 && !splat) {
          if (alive === 0) return;
          alive = 0;
        } else {
          alive = 1;
        }

        for (let i = 0; i < heat.length; i += 1) {
          heatBytes[i * 4] = heat[i] * 255;
        }
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, heatTexture);
        // FLIP_Y is global GL state, and the image upload turns it on. Left
        // set, it would flip the heat grid too and mirror the whole reveal.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, COLS, ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, heatBytes);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      // §5: budget the draw rate per tier.
      () => frameBudgetMs(tier),
    );

    return () => {
      unsubscribe();
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      gl.deleteTexture(heatTexture);
      gl.deleteTexture(imageTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [src, armed]);

  return (
    <canvas
      ref={(node) => {
        canvasRef.current = node;
        setGateNode(node);
      }}
      role="img"
      aria-label={label}
      className={className}
    />
  );
};
