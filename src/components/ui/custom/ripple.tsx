import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none",
        className,
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 140;
        const opacity = 1 - i * (1 - mainCircleOpacity) / numCircles;
        const animationDelay = `${i * 0.06}s`;

        return (
          <div
            key={i}
            className="motion-safe:animate-ripple absolute rounded-full border border-foreground/10 bg-foreground/3 dark:border-foreground/5 dark:bg-foreground/1.5"
            style={
              {
                "--i": i,
                width: `${size}px`,
                height: `${size}px`,
                opacity: Math.max(opacity, 0),
                animationDelay,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});
