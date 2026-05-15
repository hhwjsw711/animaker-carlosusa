import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

interface SpinnerProps {
  size?: "default" | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12 | 14 | 16 | 18 | 20;
  color?: "default" | "primary";
  className?: string;
}

const SpinnerVariants = cva(
  `animate-[spinner-rotate_1.2s_linear_infinite]`,
  {
    variants: {
      size: {
        default: `size-4.5`,
        3: `size-3`,
        4: `size-4.5`,
        5: `size-4.5`,
        6: `size-6`,
        7: `size-7`,
        8: `size-8`,
        9: `size-9`,
        10: `size-10`,
        12: `size-12`,
        14: `size-14`,
        16: `size-16`,
        18: `size-18`,
        20: `size-20`,
      },
      color: {
        default: ``,
        primary: `text-primary`,
      },
    },
    defaultVariants: {
      size: "default",
      color: "default",
    },
  }
);

export default function Spinner({ size, color, className }: SpinnerProps) {
  return (
    <svg
      className={cn(SpinnerVariants({ size, color }), className)}
      viewBox="0 0 50 50"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        style={{
          animation: "spinner-dash 1s ease-in-out infinite",
        }}
      />
    </svg>
  );
}
