import { cn } from "@/lib/utils";
import { Bolt } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  asLink?: boolean;
  to?: string;
  withLogoText?: boolean;
}

export default function Logo({
  size = "md",
  className,
  asLink = false,
  to = "/",
  withLogoText = false,
}: LogoProps) {
  const sizeClasses = {
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
    xl: "size-14",
    "2xl": "size-32",
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-7",
    "2xl": "size-20",
  };

  const logoTextSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-2xl",
  };

  const logoElement = (
    <div
      className={cn(
        "bg-primary text-primary-foreground flex aspect-square items-center justify-center rounded-full overflow-hidden relative",
        sizeClasses[size]
      )}
    >
      <Bolt className={cn("size-6", iconSizes[size])} />
    </div>
  );

  if (!asLink) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        {logoElement}
      </div>
    );
  }

  return (
    <a
      href={to}
      className={cn(
        "flex flex-row items-center justify-center gap-2",
        className
      )}
    >
      {logoElement}
      {withLogoText && (
        <div
          className={cn(
            logoTextSizes[size],
            "text-foreground hover:text-primary font-bold uppercase whitespace-nowrap"
          )}
        >
          vertex
        </div>
      )}
    </a>
  );
}
