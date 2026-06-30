"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

import { useAnimationPause } from "@/hooks/use-animation-pause";

const FRAME_INTERVAL_MS = 1000 / 30;

export function WelcomeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { containerRef, canAnimate } = useAnimationPause();
  const canAnimateRef = useRef(canAnimate);

  useEffect(() => {
    canAnimateRef.current = canAnimate;
  }, [canAnimate]);

  useEffect(() => {
    let phi = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const renderScale = prefersReducedMotion ? 1 : 1.5;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio ?? 1, renderScale),
      width: 600 * renderScale,
      height: 600 * renderScale,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: prefersReducedMotion ? 4000 : 8000,
      mapBrightness: 1.2,
      baseColor: [0.06, 0.17, 0.29],
      markerColor: [0.78, 0.24, 0.24],
      glowColor: [0.06, 0.17, 0.29],
      markers: [
        { location: [13.0827, 80.2707], size: 0.08 },
        { location: [28.6139, 77.209], size: 0.06 },
        { location: [19.076, 72.8777], size: 0.06 },
      ],
    });

    let frameId = 0;
    let lastFrameTime = 0;

    const animate = (now: number) => {
      const shouldRender =
        canAnimateRef.current &&
        !prefersReducedMotion &&
        now - lastFrameTime >= FRAME_INTERVAL_MS;

      if (shouldRender) {
        phi += 0.003;
        globe.update({ phi });
        lastFrameTime = now;
      }

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      globe.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-[min(100%,520px)]">
      <canvas
        ref={canvasRef}
        className="welcome-globe-enter mx-auto aspect-square w-full"
        style={{ contain: "layout style paint" }}
      />
    </div>
  );
}
