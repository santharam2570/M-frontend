"use client";

import { useEffect, useRef, useState } from "react";

/** Returns true when animations should run (tab visible + element in viewport). */
export function useAnimationPause() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInViewRef = useRef(true);
  const isTabVisibleRef = useRef(true);
  const [canAnimate, setCanAnimate] = useState(true);

  const sync = () => {
    setCanAnimate(isTabVisibleRef.current && isInViewRef.current);
  };

  useEffect(() => {
    const onVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      sync();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { containerRef, canAnimate };
}
