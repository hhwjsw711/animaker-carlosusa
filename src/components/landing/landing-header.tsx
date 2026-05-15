import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/ui/custom/logo";
import { Button } from "@/components/ui/button";
import { useReveal } from "./use-reveal";

export function LandingHeader() {
  const { t } = useTranslation();
  const barRef = useReveal<HTMLDivElement>({
    translateY: -12,
    duration: 500,
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div
        ref={barRef}
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6"
      >
        <Link to="/" className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-sm font-bold uppercase tracking-wide text-foreground">
            vertex
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" render={<Link to="/signin" />}>
            {t("landing.header.signIn")}
          </Button>
          <Button render={<Link to="/signup" />}>
            {t("landing.header.signUp")}
          </Button>
        </nav>
      </div>
    </header>
  );
}
