import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { persistUserLang } from "@/i18n/config";
import { LandingHeader } from "../landing/landing-header";
import { LandingFooter } from "../landing/landing-footer";
import { PrivacyPtBR } from "./privacy/privacy-pt-br";
import { PrivacyEnUS } from "./privacy/privacy-en-us";
import { PrivacyZhCN } from "./privacy/privacy-zh-cn";
import { TermsPtBR } from "./terms/terms-pt-br";
import { TermsEnUS } from "./terms/terms-en-us";
import { TermsZhCN } from "./terms/terms-zh-cn";

export type LegalPageType = "privacy" | "terms";
type Lang = "pt-BR" | "en-US" | "zh-CN";

interface LegalPageProps {
  initialLang: Lang;
  type: LegalPageType;
}

function Content({ type, lang }: { type: LegalPageType; lang: Lang }) {
  if (type === "privacy") {
    if (lang === "pt-BR") return <PrivacyPtBR />;
    if (lang === "zh-CN") return <PrivacyZhCN />;
    return <PrivacyEnUS />;
  }
  if (lang === "pt-BR") return <TermsPtBR />;
  if (lang === "zh-CN") return <TermsZhCN />;
  return <TermsEnUS />;
}

export function LegalPage({ initialLang, type }: LegalPageProps) {
  const navigate = useNavigate();

  const handleSwitchLanguage = useCallback(
    async (next: Lang) => {
      if (next === initialLang) return;
      // Persist cookie before navigate so the router's output rewrite adds
      // the correct `/en` prefix for the new-language URL.
      await persistUserLang(next);
      void navigate({
        to: type === "privacy" ? "/privacy" : "/terms",
        replace: true,
      });
    },
    [initialLang, type, navigate],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <LandingHeader />
      <main className="flex-1">
        <section className="border-b border-border/60">
          <article className="mx-auto w-full max-w-3xl px-6 py-20 md:py-28">
            <Content type={type} lang={initialLang} />
          </article>
        </section>
      </main>
      <LandingFooter
        currentLang={initialLang}
        onSwitchLanguage={handleSwitchLanguage}
      />
    </div>
  );
}
