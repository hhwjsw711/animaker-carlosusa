import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import Logo from "@/components/ui/custom/logo";
import { BeamCanvas, type BeamDefinition } from "./animated-beam";
import { FEATURE_ICONS, type FeatureKey } from "./feature-icons";

const LEFT_FEATURES: FeatureKey[] = [
  "chat",
  "customers",
  "services",
  "products",
  "calendar",
];
const RIGHT_FEATURES: FeatureKey[] = [
  "finance",
  "agents",
  "skills",
  "collaborators",
  "usage",
];

function FeatureCircle({
  icon: Icon,
  label,
  nodeRef,
}: {
  icon: LucideIcon;
  label: string;
  nodeRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={nodeRef}
      aria-label={label}
      title={label}
      className="z-40 flex size-14 items-center justify-center rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm"
    >
      <Icon className="size-4.5 text-primary" strokeWidth={1.5} />
    </div>
  );
}

export function FeatureBeam() {
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  // One ref per feature — created upfront so the order matches LEFT/RIGHT arrays
  const leftRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>(
    LEFT_FEATURES.map(() => ({ current: null })),
  );
  const rightRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>(
    RIGHT_FEATURES.map(() => ({ current: null })),
  );

  const beams = useMemo<BeamDefinition[]>(() => {
    // Direction is baked into the SVG path (fromRef → toRef). Timing (delay
    // and duration) is randomized internally by BeamCanvas so each beam
    // drifts independently.
    const leftBeams: BeamDefinition[] = LEFT_FEATURES.map((_, i) => ({
      fromRef: leftRefs.current[i],
      toRef: centerRef,
      pathColor: "var(--border)",
      dashColor: "var(--primary)",
    }));

    const rightBeams: BeamDefinition[] = RIGHT_FEATURES.map((_, i) => ({
      fromRef: rightRefs.current[i],
      toRef: centerRef,
      pathColor: "var(--border)",
      dashColor: "var(--primary)",
    }));

    return [...leftBeams, ...rightBeams];
  }, []);

  return (
    <section
      id="feature-beam"
      aria-labelledby="feature-beam-heading"
      className="border-t border-border/60 bg-primary/5"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {t("landing.beam.eyebrow")}
          </span>
          <h2
            id="feature-beam-heading"
            className="text-3xl font-bold tracking-tight text-foreground md:text-5xl"
          >
            {t("landing.beam.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            {t("landing.beam.subtitle")}
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto mt-0 h-96 w-full max-w-4xl overflow-visible md:h-120"
        >
          <BeamCanvas containerRef={containerRef} beams={beams} />

          {/* Left column */}
          <div className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4">
            {LEFT_FEATURES.map((key, i) => (
              <FeatureCircle
                key={key}
                icon={FEATURE_ICONS[key]}
                label={t(`landing.features.${key}.eyebrow`)}
                nodeRef={leftRefs.current[i]}
              />
            ))}
          </div>

          {/* Center — Vertex logo */}
          <div
            ref={centerRef}
            className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 p-4 backdrop-blur-sm"
          >
            <Logo size="xl" />
          </div>

          {/* Right column */}
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4">
            {RIGHT_FEATURES.map((key, i) => (
              <FeatureCircle
                key={key}
                icon={FEATURE_ICONS[key]}
                label={t(`landing.features.${key}.eyebrow`)}
                nodeRef={rightRefs.current[i]}
              />
            ))}
          </div>
        </div>

        <p className="mx-auto mt-0 max-w-2xl text-center text-sm text-muted-foreground">
          {t("landing.beam.note")}
        </p>
      </div>
    </section>
  );
}
