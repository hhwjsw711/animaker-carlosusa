import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReveal } from "./use-reveal";

type PlanKey = "starter" | "pro" | "business";

const PLAN_ORDER: PlanKey[] = ["starter", "pro", "business"];
const FEATURE_KEYS = [
  "credits",
  "customers",
  "services",
  "agents",
  "storage",
  "collaborators",
] as const;
const HIGHLIGHTED: PlanKey = "pro";

export function LandingPricing() {
  const { t } = useTranslation();
  const headerRef = useReveal<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>({
    childSelector: "[data-reveal-item]",
    staggerDelay: 100,
  });

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="border-t border-border/60 bg-muted/30"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div
          ref={headerRef}
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
        >
          <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {t("landing.pricing.eyebrow")}
          </span>
          <h2
            id="pricing-heading"
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            {t("landing.pricing.title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            {t("landing.pricing.subtitle")}
          </p>
        </div>

        <div ref={gridRef} className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const isHighlighted = plan === HIGHLIGHTED;
            const isBusiness = plan === "business";
            return (
              <article
                key={plan}
                data-reveal-item
                className={
                  isHighlighted
                    ? "relative flex flex-col rounded-2xl border border-primary bg-card p-6 md:p-8"
                    : "relative flex flex-col rounded-2xl border border-border bg-card p-6 md:p-8"
                }
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {t("landing.pricing.mostPopular")}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t(`landing.pricing.plans.${plan}.name`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`landing.pricing.plans.${plan}.tagline`)}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {t(`landing.pricing.plans.${plan}.price`)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("landing.pricing.monthSuffix")}
                  </span>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {FEATURE_KEYS.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3" strokeWidth={2.5} />
                      </span>
                      <span className="text-sm text-foreground">
                        {t(`landing.pricing.plans.${plan}.features.${featureKey}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    variant={isHighlighted ? "default" : "outline"}
                    className="w-full"
                    render={<a href={isBusiness ? "/signup" : "/signup"} />}
                  >
                    {isBusiness
                      ? t("landing.pricing.ctaBusiness")
                      : t("landing.pricing.cta")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          {t("landing.pricing.creditsExplainer")}
        </p>
      </div>
    </section>
  );
}
