"use client";

import createGlobe from "cobe";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAnimationPause } from "@/hooks/use-animation-pause";

const GLOBE_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / GLOBE_FPS;

const GLOBE_LOCATIONS = [
  {
    id: "chennai",
    label: "Chennai",
    location: [13.0827, 80.2707] as [number, number],
  },
  {
    id: "mumbai",
    label: "Mumbai",
    location: [19.076, 72.8777] as [number, number],
  },
  {
    id: "bangalore",
    label: "Bangalore",
    location: [12.9716, 77.5946] as [number, number],
  },
  {
    id: "delhi",
    label: "Delhi",
    location: [28.6139, 77.209] as [number, number],
  },
] as const;

function getGlobeSize() {
  if (typeof window === "undefined") return 560;
  const width = window.innerWidth;
  if (width < 480) return Math.min(width - 32, 320);
  if (width < 768) return 400;
  if (width < 1024) return 500;
  return 600;
}

export function EarthGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const [size, setSize] = useState(560);
  const { containerRef, canAnimate } = useAnimationPause();
  const canAnimateRef = useRef(canAnimate);

  useEffect(() => {
    canAnimateRef.current = canAnimate;
  }, [canAnimate]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const updateSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSize(getGlobeSize()), 200);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size === 0) return;

    let frameId = 0;
    let lastFrameTime = 0;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    canvas.classList.add("loaded");

    const renderScale = prefersReducedMotion ? 1 : 1.5;
    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio ?? 1, renderScale),
      width: size * renderScale,
      height: size * renderScale,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.35,
      mapSamples: prefersReducedMotion ? 4000 : 8000,
      mapBrightness: 5.5,
      baseColor: [0.12, 0.18, 0.28],
      markerColor: [0.78, 0.24, 0.24],
      glowColor: [0.08, 0.22, 0.42],
      markers: GLOBE_LOCATIONS.map(({ id, location }) => ({
        id,
        location,
        size: 0,
      })),
    });

    const animate = (now: number) => {
      const shouldRender =
        canAnimateRef.current &&
        !prefersReducedMotion &&
        now - lastFrameTime >= FRAME_INTERVAL_MS;

      if (shouldRender) {
        if (pointerInteracting.current === null) {
          phiRef.current += 0.0035;
        }
        globe.update({
          width: size * renderScale,
          height: size * renderScale,
          phi: phiRef.current + pointerInteractionMovement.current,
        });
        lastFrameTime = now;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      globe.destroy();
    };
  }, [size]);

  const pinSize = Math.max(20, Math.round(size * 0.052));

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[6%] rounded-full bg-[#1a4a7a]/25 blur-3xl"
      />
      {GLOBE_LOCATIONS.map(({ id, label }) => (
        <div
          key={id}
          className="globe-location-pin"
          style={
            {
              positionAnchor: `--cobe-${id}`,
              opacity: `var(--cobe-visible-${id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${id}, 0)) * 6px))`,
            } as React.CSSProperties
          }
          title={label}
        >
          <MapPin
            size={pinSize}
            strokeWidth={1.75}
            className="text-[#e04a4a] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
            fill="currentColor"
            aria-hidden
          />
        </div>
      ))}
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        className="relative z-10 block h-full w-full cursor-grab active:cursor-grabbing"
        style={{ contain: "layout paint size" }}
        onPointerDown={(e) => {
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          canvasRef.current?.setPointerCapture(e.pointerId);
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta / 120;
          }
        }}
      />
    </div>
  );
}
