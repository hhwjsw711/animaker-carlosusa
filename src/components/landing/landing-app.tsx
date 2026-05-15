import { LandingPage } from "./landing-page";
import { LandingThemeProvider } from "./landing-theme";

type Lang = "pt-BR" | "en-US" | "zh-CN";

interface LandingAppProps {
  initialLang: Lang;
}

export function LandingApp({ initialLang }: LandingAppProps) {
  return (
    <LandingThemeProvider>
      <LandingPage initialLang={initialLang} />
    </LandingThemeProvider>
  );
}
