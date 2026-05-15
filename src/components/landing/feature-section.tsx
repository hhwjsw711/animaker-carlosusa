import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FeatureVisual } from "./feature-visual";
import { useReveal } from "./use-reveal";

interface FeatureSectionProps {
  id?: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  reverse?: boolean;
}

export function FeatureSection({
  id,
  icon,
  eyebrow,
  title,
  description,
  bullets,
  reverse = false,
}: FeatureSectionProps) {
  const containerRef = useReveal<HTMLDivElement>({
    childSelector: "[data-reveal-item]",
    staggerDelay: 120,
  });

  return (
    <section
      id={id}
      className="border-t border-border/60"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div
          ref={containerRef}
          className={`grid grid-cols-1 items-center gap-10 md:gap-16 lg:grid-cols-2 ${
            reverse ? "lg:*:first:order-2" : ""
          }`}
        >
          <div data-reveal-item className="order-2 lg:order-0">
            <FeatureVisual icon={icon} />
          </div>

          <div data-reveal-item className="order-1 flex flex-col gap-5 lg:order-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {eyebrow}
            </span>
            <h2
              id={id ? `${id}-title` : undefined}
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              {title}
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
              {description}
            </p>
            <ul className="mt-2 flex flex-col gap-3">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm text-foreground md:text-base line-clamp-1">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
