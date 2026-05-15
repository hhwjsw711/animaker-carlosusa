import { LandingThemeProvider } from "../landing/landing-theme";
import { LegalPage, type LegalPageType } from "./legal-page";

type Lang = "pt-BR" | "en-US" | "zh-CN";

interface LegalAppProps {
  initialLang: Lang;
  type: LegalPageType;
}

export function LegalApp({ initialLang, type }: LegalAppProps) {
  return (
    <LandingThemeProvider>
      <LegalPage initialLang={initialLang} type={type} />
    </LandingThemeProvider>
  );
}
