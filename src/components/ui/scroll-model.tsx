"use client";

// 📖 Docs: obsidian/frontend/components/ui.md

import { useEffect, useRef, type RefObject } from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { subscribeToTicker } from "@/lib/animation/ticker";
import {
  clampPixelRatio,
  frameBudgetMs,
  getDeviceTier,
  sceneShouldFreeze,
  shouldAntialias,
} from "@/lib/scene/device";

/**
 * A glTF model that turns and travels with the scroll.
 *
 * Progress is handed in as a **ref**, not a prop: the caller writes it every
 * frame from a scroll trigger, and the render loop reads it. Passing it as a
 * prop would re-render this component ~60 times a second for a value React
 * never needs to see.
 *
 * Size is expressed as a fraction of the canvas rather than in world units, so
 * it stays put when the canvas is resized or the adaptive grid rescales the
 * page — a world-unit scale silently changes apparent size with the container.
 */
export interface ScrollModelProps {
  src: string;
  /** 0–1 scroll progress, written by the caller. */
  progress: RefObject<number>;
  /** Accessible description — the canvas is otherwise opaque to assistive tech. */
  label: string;
  className?: string;
  /** Full turns across the scroll range. */
  turns?: number;
  /** Model height as a fraction of the canvas height. */
  heightRatio?: number;
  /**
   * Travel the model down the canvas as progress runs 0 → 1, entering from
   * above the top edge and leaving past the bottom. Set false to keep it
   * centred.
   */
  travel?: boolean;
}

/** Seconds for the rendered angle to close most of the gap to the scroll value. */
const CHASE_TAU = 0.12;
/** Below this the frame is identical, so skip the draw. */
const EPSILON = 0.0004;
const CAMERA_FOV = 35;
const CAMERA_Z = 4.2;

export const ScrollModel = ({
  src,
  progress,
  label,
  className,
  turns = 1,
  heightRatio = 0.5,
  travel = false,
}: ScrollModelProps) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    const tier = getDeviceTier();
    const frozen = sceneShouldFreeze();

    // §7 renderer flags: the canvas is transparent over the page so `alpha`
    // stays, but nothing here stencils, and antialiasing is dropped on mobile
    // where the DPR clamp hides its absence.
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: shouldAntialias(tier),
      stencil: false,
      powerPreference: tier === "desktop" ? "high-performance" : "default",
    });
    renderer.setPixelRatio(clampPixelRatio(tier));
    renderer.outputColorSpace = SRGBColorSpace;
    // Filmic tone mapping keeps the specular roll-off on a dark metal from
    // clipping to a flat white edge.
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, 0, CAMERA_Z);

    /** World height the camera sees at z = 0 — the canvas height in world units. */
    const visibleHeight = 2 * CAMERA_Z * Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));

    // A metal is almost entirely reflection, so without an environment it
    // renders as a flat black silhouette. This synthetic room is what makes it
    // read as metal rather than plastic.
    const pmrem = new PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;

    // §8: one directional key plus the environment map. Every real-time light
    // multiplies the fragment cost of every lit material, and the PMREM'd room
    // above already supplies the fill and rim the two extra lights were doing.
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(2.5, 3, 2.5);
    scene.add(key);

    const pivot = new Group();
    scene.add(pivot);

    const material = new MeshStandardMaterial({
      color: 0x0b0b0b,
      metalness: 1,
      // High roughness on a full metal is what "matte metal" means — it keeps
      // the reflection broad and soft instead of mirror-sharp.
      roughness: 0.62,
      envMapIntensity: 1.1,
    });

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      if (!clientWidth || !clientHeight) return;
      // `updateStyle` must stay on: with a pixel ratio above 1 the backing
      // store is larger than the layout box, and without the CSS size three
      // leaves the canvas to lay out at its attribute size — overflowing the
      // box by exactly the device pixel ratio.
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Don't render while the section is off screen.
    let onScreen = true;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { rootMargin: "10%" },
    );
    visibility.observe(host);

    let angle = 0;
    let offsetY = 0;
    let lastAngle = Number.NaN;
    let lastOffset = Number.NaN;
    let lastTime = 0;
    let loaded = false;
    /** False until a frame has actually been drawn — see the snap below. */
    let primed = false;
    let modelHeight = 0;

    // The model is Draco-compressed (3 KB on the wire), so the loader needs a
    // decoder. The glTF-specific build is served from `public/draco/` — copied
    // from `three/examples/jsm/libs/draco/gltf/`, and it must be re-copied when
    // three is upgraded.
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      src,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((child) => {
          if (child instanceof Mesh) child.material = material;
        });

        // Normalise whatever the file was authored at: centre it on the pivot,
        // then scale so it occupies `heightRatio` of what the camera sees.
        const box = new Box3().setFromObject(model);
        const size = box.getSize(new Vector3());
        const centre = box.getCenter(new Vector3());
        const largest = Math.max(size.x, size.y, size.z) || 1;
        modelHeight = visibleHeight * heightRatio;
        model.position.sub(centre);
        model.scale.setScalar(modelHeight / largest);

        pivot.add(model);

        // §3 prewarm: compile the program and upload the environment while the
        // model is still off screen, so the first frame after it scrolls into
        // view does not stall on a shader link or a texture upload.
        renderer.compile(scene, camera);
        renderer.render(scene, camera);
        loaded = true;
      },
      undefined,
      (error) => console.error("[ScrollModel] failed to load", src, error),
    );

    const unsubscribe = subscribeToTicker(
      (time) => {
        // §4: a background tab paints nothing, and neither does an off-screen
        // section. `frozen` honours reduced motion / low-power by settling on
        // one frame — WebGL keeps it on the canvas, so that costs nothing.
        if (!loaded || !onScreen || document.hidden || (frozen && !Number.isNaN(lastAngle))) {
          lastTime = time;
          // Scroll keeps moving while this is gated off, so whatever is chased
          // toward on resume would be stale. Re-prime instead.
          primed = false;
          return;
        }

        const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
        lastTime = time;

        const value = progress.current ?? 0;
        const targetAngle = value * turns * Math.PI * 2;
        // Enter from above the top edge, leave past the bottom.
        const targetOffset = travel
          ? (0.5 - value) * (visibleHeight + modelHeight * 2)
          : offsetY;

        if (!primed) {
          // First drawn frame: **snap**. `offsetY` starts at 0, which is the
          // middle of the travel rather than the start of it, so chasing from
          // there made the model fly up to its entry point and only then
          // descend. Same reasoning as `optimize-3d-scene` §10 — snap on a
          // jump, ease only while tracking.
          primed = true;
          angle = targetAngle;
          offsetY = targetOffset;
        } else {
          // Frame-rate independent chase: a fixed per-frame lerp would spin at
          // different speeds on 60 Hz and 120 Hz displays, and stutter whenever
          // a frame is long. This settles at the same rate on any refresh rate.
          const k = delta > 0 ? 1 - Math.exp(-delta / CHASE_TAU) : 1;
          angle += (targetAngle - angle) * k;
          offsetY += (targetOffset - offsetY) * k;
        }

        if (
          Math.abs(angle - lastAngle) < EPSILON &&
          Math.abs(offsetY - lastOffset) < EPSILON
        ) {
          return;
        }
        lastAngle = angle;
        lastOffset = offsetY;
        pivot.rotation.y = angle;
        pivot.position.y = offsetY;
        renderer.render(scene, camera);
      },
      // §5: budget the draw rate per tier rather than drawing every rAF.
      () => frameBudgetMs(tier),
    );

    return () => {
      disposed = true;
      unsubscribe();
      observer.disconnect();
      visibility.disconnect();
      draco.dispose();
      environment.texture.dispose();
      pmrem.dispose();
      material.dispose();
      pivot.traverse((child) => {
        if (child instanceof Mesh) child.geometry.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, progress, turns, heightRatio, travel]);

  return <div ref={hostRef} role="img" aria-label={label} className={className} />;
};
