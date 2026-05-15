import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";

interface RevealOptions {
  /** Selector for child elements to stagger-reveal inside the container. If omitted, only the container animates. */
  childSelector?: string;
  /** Animation duration in ms. */
  duration?: number;
  /** Distance in px elements travel upward on reveal. */
  translateY?: number;
  /** Delay between staggered children in ms. */
  staggerDelay?: number;
  /** Intersection threshold (0–1). */
  threshold?: number;
}

/**
 * Reveal-on-scroll animation using animejs. SSR-safe: sets initial hidden
 * styles in useLayoutEffect so prerendered HTML renders visible for crawlers
 * and the transition only happens on client after hydration.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
) {
  const ref = useRef<T>(null);
  const {
    childSelector,
    duration = 700,
    translateY = 24,
    staggerDelay = 80,
    threshold = 0.15,
  } = options;

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const targets: HTMLElement[] = childSelector
      ? Array.from(container.querySelectorAll<HTMLElement>(childSelector))
      : [container];

    if (targets.length === 0) return;

    for (const el of targets) {
      el.style.opacity = "0";
      el.style.transform = `translateY(${translateY}px)`;
      el.style.willChange = "opacity, transform";
    }

    let hasAnimated = false;
    const runAnimation = () => {
      if (hasAnimated) return;
      hasAnimated = true;
      animate(targets, {
        opacity: [0, 1],
        translateY: [translateY, 0],
        duration,
        ease: "outQuart",
        delay: targets.length > 1 ? stagger(staggerDelay) : 0,
        onComplete: () => {
          for (const el of targets) {
            el.style.willChange = "";
          }
        },
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            runAnimation();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      // Clean up willChange hint in case the component unmounts before the
      // animation completes (otherwise the browser keeps the layer promoted).
      if (!hasAnimated) {
        for (const el of targets) {
          el.style.willChange = "";
        }
      }
    };
  }, [childSelector, duration, translateY, staggerDelay, threshold]);

  return ref;
}
