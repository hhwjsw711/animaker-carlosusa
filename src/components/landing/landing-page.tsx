import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { persistUserLang } from "@/i18n/config";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingPricing } from "./landing-pricing";
import { LandingFaq } from "./landing-faq";
import { LandingCta } from "./landing-cta";
import { LandingFooter } from "./landing-footer";

type Lang = "pt-BR" | "en-US" | "zh-CN";

interface LandingPageProps {
  initialLang: Lang;
}

export function LandingPage({ initialLang }: LandingPageProps) {
  const navigate = useNavigate();

  const handleSwitchLanguage = useCallback(
    async (next: Lang) => {
      if (next === initialLang) return;
      // Persist cookie first so the router's output rewrite picks the right
      // prefix for the navigate below.
      await persistUserLang(next);
      void navigate({ to: "/", replace: true });
    },
    [initialLang, navigate],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter
        currentLang={initialLang}
        onSwitchLanguage={handleSwitchLanguage}
      />
    </div>
  );
}
