import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useReveal } from "./use-reveal";

export function LandingHero() {
  const { t } = useTranslation();
  const contentRef = useReveal<HTMLDivElement>({
    childSelector: "[data-reveal-item]",
    staggerDelay: 90,
    translateY: 16,
  });

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-0 h-160 w-275 -translate-x-1/2 rounded-full bg-primary/15 blur-[140px] dark:bg-primary/10" />
      </div>

      <div
        ref={contentRef}
        className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-20 pb-16 md:pt-28 md:pb-24"
      >
        <span
          data-reveal-item
          className="mb-6 inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
        >
          {t("landing.hero.badge")}
        </span>

        <h1
          data-reveal-item
          className="max-w-3xl text-center text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
        >
          {t("landing.hero.headline")}
        </h1>

        <p
          data-reveal-item
          className="mt-6 max-w-2xl text-center text-base text-muted-foreground md:text-lg"
        >
          {t("landing.hero.subheadline")}
        </p>

        <div
          data-reveal-item
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button className="h-12! px-10!" render={<Link to="/signup" />}>
            {t("landing.hero.ctaPrimary")}
          </Button>
          <Button className="h-12! px-10!" variant="outline" render={<a href="#features" />}>
            {t("landing.hero.ctaSecondary")}
          </Button>
        </div>

        <p
          data-reveal-item
          className="mt-6 text-xs text-muted-foreground"
        >
          {t("landing.hero.note")}
        </p>
      </div>
    </section>
  );
}
