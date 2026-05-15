import { useRef, useLayoutEffect } from "react";
import { animate, stagger } from "animejs";

interface StaggerOptions {
  duration?: number;
  staggerDelay?: number;
  maxItems?: number;
  translateY?: number;
  enabled?: boolean;
}

export function useStaggerAnimation(
  itemCount: number,
  dataKey?: string | number | null,
  visible = true,
  options?: StaggerOptions,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const prevDataKeyRef = useRef(dataKey);
  const prevVisibleRef = useRef(false);

  const {
    duration = 350,
    staggerDelay = 40,
    maxItems = 20,
    translateY = -12,
    enabled = true,
  } = options ?? {};

  useLayoutEffect(() => {
    const becameVisible = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (!enabled || !visible || !containerRef.current || itemCount === 0) {
      prevCountRef.current = itemCount;
      // Don't update prevDataKeyRef when itemCount is 0 — preserve the
      // "dataKey changed" signal so the animation triggers when data arrives.
      if (itemCount > 0) {
        prevDataKeyRef.current = dataKey;
      }
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      prevCountRef.current = itemCount;
      prevDataKeyRef.current = dataKey;
      return;
    }

    const dataKeyChanged = prevDataKeyRef.current !== dataKey;

    // Determine animation type
    const isAppend =
      !becameVisible &&
      !dataKeyChanged &&
      itemCount > prevCountRef.current &&
      prevCountRef.current > 0;

    // Skip if nothing changed or items were removed
    if (!becameVisible && !dataKeyChanged && itemCount <= prevCountRef.current) {
      prevCountRef.current = itemCount;
      return;
    }

    const container = containerRef.current;
    const children = Array.from(container.children) as HTMLElement[];

    let targets: HTMLElement[];
    if (isAppend) {
      targets = children.slice(prevCountRef.current);
    } else {
      targets = children;
    }

    // Filter out sentinel/spinner (elements < 4px height)
    targets = targets.filter((el) => el.offsetHeight > 4);

    if (targets.length === 0) {
      prevCountRef.current = itemCount;
      prevDataKeyRef.current = dataKey;
      return;
    }

    const animated = targets.slice(0, maxItems);
    const instant = targets.slice(maxItems);

    for (const el of instant) {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }

    for (const el of animated) {
      el.style.opacity = "0";
      el.style.transform = `translateY(${translateY}px)`;
    }

    animate(animated, {
      opacity: [0, 1],
      translateY: [translateY, 0],
      duration,
      ease: "outQuart",
      delay: stagger(staggerDelay),
    });

    prevCountRef.current = itemCount;
    prevDataKeyRef.current = dataKey;
  }, [itemCount, dataKey, visible, duration, staggerDelay, maxItems, translateY, enabled]);

  return containerRef;
}
