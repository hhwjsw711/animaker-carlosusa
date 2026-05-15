import {
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface BeamDefinition {
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  pathColor?: string;
  pathOpacity?: number;
  /** Color of the flowing dot. Defaults to var(--primary). */
  dashColor?: string;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

export interface BeamCanvasProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  /** Memoize in the parent to avoid unnecessary effect re-runs. */
  beams: BeamDefinition[];
}

interface SampledBeam {
  pathD: string;
  samples: Array<{ x: number; y: number }>;
}

/** Number of sample points along each bezier curve. More = smoother motion,
 *  more CSS. 40 gives ~2.5% granularity which is imperceptibly smooth under
 *  linear timing, and keeps generated keyframe CSS under ~3KB total. */
const NUM_SAMPLES = 40;

/**
 * Sample points along a quadratic bezier curve parameterized as:
 *   B(t) = (1-t)² P0 + 2(1-t)t P1 + t² P2
 *
 * Pure math — no DOM touches, no getPointAtLength calls per frame. Runs
 * once per resize and the results are cached in the compiled CSS keyframes.
 */
function sampleQuadraticBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  count: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const inv = 1 - t;
    const a = inv * inv;
    const b = 2 * inv * t;
    const c = t * t;
    out.push({
      x: a * p0.x + b * p1.x + c * p2.x,
      y: a * p0.y + b * p1.y + c * p2.y,
    });
  }
  return out;
}

/**
 * BeamCanvas — renders N bezier curves connecting DOM nodes via refs.
 *
 * Each beam is composed of two layers:
 *   1. A static SVG `<path>` (subtle border color) that paints once per
 *      resize and sits in the default paint tree. This is the visible
 *      "wire" connecting a feature to the center hub.
 *   2. An HTML `<div>` "dot" animated via a generated `@keyframes` rule
 *      with pre-sampled `transform: translate3d(x, y, 0)` values. Because
 *      `transform` and `opacity` are the only two CSS properties that run
 *      on the compositor thread across all modern browsers (including
 *      iOS Safari / Core Animation), these dots do NOT cause scroll jank
 *      — they are fully decoupled from main-thread paint work.
 *
 * On resize: we sample every path's bezier once, regenerate the CSS
 * keyframes, and push them into a `<style>` tag. Animation timing is
 * randomized per beam so the dots drift independently.
 *
 * `prefers-reduced-motion` is honored via a CSS media query that disables
 * all beam animations at once.
 */
export function BeamCanvas({ className, containerRef, beams }: BeamCanvasProps) {
  const instanceId = useId().replace(/:/g, "");
  const keyframePrefix = `vertex-beam-${instanceId}`;
  const dotClass = `vertex-beam-dot-${instanceId}`;

  const [sampledBeams, setSampledBeams] = useState<SampledBeam[]>(() =>
    beams.map(() => ({ pathD: "", samples: [] })),
  );
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [keyframesCss, setKeyframesCss] = useState("");

  const beamsRef = useRef(beams);
  useEffect(() => {
    beamsRef.current = beams;
  });

  // Random duration + delay per beam, stable across renders.
  const timings = useRef(
    beams.map(() => ({
      duration: 3.5 + Math.random() * 3,
      delay: Math.random() * 4,
    })),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateAll = () => {
      const containerRect = container.getBoundingClientRect();
      setSvgDimensions({
        width: containerRect.width,
        height: containerRect.height,
      });

      const nextBeams: SampledBeam[] = beamsRef.current.map((beam) => {
        const {
          fromRef,
          toRef,
          curvature = 0,
          startXOffset = 0,
          startYOffset = 0,
          endXOffset = 0,
          endYOffset = 0,
        } = beam;
        if (!fromRef.current || !toRef.current) {
          return { pathD: "", samples: [] };
        }
        const rectA = fromRef.current.getBoundingClientRect();
        const rectB = toRef.current.getBoundingClientRect();
        const startX =
          rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
        const startY =
          rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
        const endX =
          rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
        const endY =
          rectB.top - containerRect.top + rectB.height / 2 + endYOffset;
        const controlX = (startX + endX) / 2;
        const controlY = startY - curvature;

        const samples = sampleQuadraticBezier(
          { x: startX, y: startY },
          { x: controlX, y: controlY },
          { x: endX, y: endY },
          NUM_SAMPLES,
        );

        return {
          pathD: `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`,
          samples,
        };
      });

      // Compile @keyframes — one rule per beam, N+1 keyframe steps.
      const blocks: string[] = [];
      for (let i = 0; i < nextBeams.length; i++) {
        const { samples } = nextBeams[i];
        if (samples.length === 0) continue;
        const name = `${keyframePrefix}-${i}`;
        const steps: string[] = [];
        for (let s = 0; s < samples.length; s++) {
          const pct = (s / (samples.length - 1)) * 100;
          const { x, y } = samples[s];
          // Fade in 0→12%, stay solid 12→88%, fade out 88→100%.
          let opacity = 1;
          if (pct < 6) opacity = 0;
          else if (pct < 12) opacity = (pct - 6) / 6;
          else if (pct > 94) opacity = 0;
          else if (pct > 88) opacity = (94 - pct) / 6;
          steps.push(
            `${pct.toFixed(2)}%{transform:translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0);opacity:${opacity.toFixed(2)}}`,
          );
        }
        blocks.push(`@keyframes ${name}{${steps.join("")}}`);
      }
      blocks.push(
        `@media (prefers-reduced-motion: reduce){.${dotClass}{animation:none!important;opacity:0!important}}`,
      );

      setSampledBeams(nextBeams);
      setKeyframesCss(blocks.join("\n"));
    };

    let rafId = 0;
    const debounced = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateAll);
    };

    const resizeObserver = new ResizeObserver(debounced);
    resizeObserver.observe(container);
    updateAll();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [containerRef, dotClass, keyframePrefix]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: keyframesCss }} />

      <svg
        fill="none"
        width={svgDimensions.width}
        height={svgDimensions.height}
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "pointer-events-none absolute left-0 top-0",
          className,
        )}
        viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      >
        {beams.map((beam, i) => {
          const {
            pathColor = "var(--border)",
            pathOpacity = 1,
          } = beam;
          const pathD = sampledBeams[i]?.pathD;
          if (!pathD) return null;
          return (
            <path
              key={i}
              d={pathD}
              style={{ stroke: pathColor }}
              strokeWidth={1}
              strokeOpacity={pathOpacity}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </svg>

      {beams.map((beam, i) => {
        const samples = sampledBeams[i]?.samples ?? [];
        if (samples.length === 0) return null;

        const { duration, delay } = timings.current[i] ?? {
          duration: 4,
          delay: 0,
        };
        const dashColor = beam.dashColor ?? "var(--primary)";

        return (
          <div
            key={i}
            aria-hidden="true"
            className={cn(
              dotClass,
              "pointer-events-none absolute rounded-full",
            )}
            style={{
              top: 0,
              left: 0,
              width: 6,
              height: 6,
              marginLeft: -3,
              marginTop: -3,
              backgroundColor: dashColor,
              willChange: "transform, opacity",
              opacity: 0,
              transform: `translate3d(${samples[0].x.toFixed(1)}px, ${samples[0].y.toFixed(1)}px, 0)`,
              animationName: `${keyframePrefix}-${i}`,
              animationDuration: `${duration}s`,
              animationTimingFunction: "linear",
              animationDelay: `${delay}s`,
              animationIterationCount: "infinite",
              animationFillMode: "backwards",
            }}
          />
        );
      })}
    </>
  );
}
