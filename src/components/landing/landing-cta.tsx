import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useReveal } from "./use-reveal";

export function LandingCta() {
  const { t } = useTranslation();
  const cardRef = useReveal<HTMLDivElement>();

  return (
    <section
      aria-labelledby="cta-heading"
      className="border-t border-border/60 bg-primary"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div
          ref={cardRef}
          className="mx-auto flex max-w-3xl flex-col items-center rounded-2xl border border-border bg-card px-8 py-14 text-center md:px-14 md:py-20"
        >
          <span className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {t("landing.cta.eyebrow")}
          </span>
          <h2
            id="cta-heading"
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            {t("landing.cta.headline")}
          </h2>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            {t("landing.cta.subheadline")}
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Button className="h-12! px-10!" render={<Link to="/signup" />}>
              {t("landing.cta.button")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
