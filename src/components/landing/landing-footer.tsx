import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import Logo from "@/components/ui/custom/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLandingTheme } from "./landing-theme";

const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English",
  "pt-BR": "Português",
  "zh-CN": "简体中文",
};

interface LandingFooterProps {
  currentLang: "pt-BR" | "en-US" | "zh-CN";
  onSwitchLanguage: (lang: "pt-BR" | "en-US" | "zh-CN") => void;
}

export function LandingFooter({
  currentLang,
  onSwitchLanguage,
}: LandingFooterProps) {
  const { t } = useTranslation();
  const { theme, setTheme, mounted } = useLandingTheme();
  const year = new Date().getFullYear();

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                vertex
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              {t("landing.footer.tagline")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {t("landing.footer.product")}
            </h3>
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.features")}
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.pricing")}
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.faq")}
            </a>
            <Link
              to="/signin"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.signIn")}
            </Link>
            <Link
              to="/signup"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.signUp")}
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {t("landing.footer.resources")}
            </h3>
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.privacy")}
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.footer.terms")}
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-border/60 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} Vertex. {t("landing.footer.rights")}
          </p>

          <div className="flex items-center gap-1">
            {mounted ? (
              <>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" />}
                        />
                      }
                    >
                      <ThemeIcon className="size-4.5" />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {t("labels.theme")}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="center">
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(value) =>
                        setTheme(value as "light" | "dark" | "system")
                      }
                    >
                      <DropdownMenuRadioItem value="light">
                        <Sun className="size-4.5 text-muted-foreground" />
                        {t("labels.light")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <Moon className="size-4.5 text-muted-foreground" />
                        {t("labels.dark")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        <Monitor className="size-4.5 text-muted-foreground" />
                        {t("labels.system")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" />}
                        />
                      }
                    >
                      <Languages className="size-4.5" />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8}>
                      {t("labels.language")}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="center">
                    <DropdownMenuRadioGroup
                      value={currentLang}
                      onValueChange={(value) =>
                        onSwitchLanguage(value as "pt-BR" | "en-US" | "zh-CN")
                      }
                    >
                      <DropdownMenuRadioItem value="en-US">
                        {LANGUAGE_LABELS["en-US"]}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="pt-BR">
                        {LANGUAGE_LABELS["pt-BR"]}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="zh-CN">
                        {LANGUAGE_LABELS["zh-CN"]}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <div className="size-8" aria-hidden="true" />
                <div className="size-8" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
