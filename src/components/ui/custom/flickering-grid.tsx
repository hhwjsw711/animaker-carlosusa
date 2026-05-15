import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  color?: string;
  maxOpacity?: number;
  flickerChance?: number;
  className?: string;
}

function resolveColor(color: string, canvas: HTMLCanvasElement): [number, number, number] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0, 0, 0];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export default function FlickeringGrid({
  squareSize = 6,
  gridGap = 2,
  color = "var(--color-accent)",
  maxOpacity = 0.15,
  flickerChance = 0.1,
  className,
}: FlickeringGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVisibleRef = useRef(true);
  const opacitiesRef = useRef<Float64Array | null>(null);
  const frameRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const getColorCanvas = useCallback(() => {
    if (!colorCanvasRef.current) {
      colorCanvasRef.current = document.createElement("canvas");
      colorCanvasRef.current.width = 1;
      colorCanvasRef.current.height = 1;
    }
    return colorCanvasRef.current;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const step = squareSize + gridGap;
    const cols = Math.ceil(dimensions.width / step) + 1;
    const rows = Math.ceil(dimensions.height / step) + 1;
    const total = cols * rows;

    if (!opacitiesRef.current || opacitiesRef.current.length !== total) {
      opacitiesRef.current = new Float64Array(total);
      for (let i = 0; i < total; i++) {
        opacitiesRef.current[i] = Math.random() * maxOpacity;
      }
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animId: number;
    let lastColorFrame = 0;
    let rgb: [number, number, number] = resolveColor(color, getColorCanvas());

    const draw = () => {
      if (!isVisibleRef.current) {
        animId = requestAnimationFrame(draw);
        return;
      }

      frameRef.current++;

      if (frameRef.current - lastColorFrame >= 60) {
        rgb = resolveColor(color, getColorCanvas());
        lastColorFrame = frameRef.current;
      }

      const opacities = opacitiesRef.current!;
      if (!prefersReducedMotion) {
        for (let i = 0; i < total; i++) {
          if (Math.random() < flickerChance * 0.07) {
            opacities[i] = Math.random() * maxOpacity;
          }
        }
      }

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      for (let i = 0; i < total; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacities[i]})`;
        ctx.fillRect(col * step, row * step, squareSize, squareSize);
      }

      if (prefersReducedMotion) return;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animId);
  }, [dimensions, squareSize, gridGap, color, maxOpacity, flickerChance, getColorCanvas]);

  return (
    <div ref={containerRef} className={cn("relative size-full bg-transparent", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
