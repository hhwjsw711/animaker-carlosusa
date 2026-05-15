import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme-provider";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/custom/logo";

const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English",
  "pt-BR": "Português",
  "zh-CN": "简体中文",
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const ThemeIcon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-12">
        {/* Visual panel — placeholder for future imagery */}
        <aside
          aria-hidden="true"
          className="hidden md:col-span-7 md:block md:border-r md:border-border/60 md:bg-primary/10"
        />

        {/* Form column */}
        <section className="flex min-h-screen items-center justify-center px-8 py-10 md:col-span-5 md:px-12 md:py-16 lg:px-16">
          <div className="flex w-full max-w-sm flex-col gap-10 animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
            <Logo size="lg" asLink to="/" />
            {children}
          </div>
        </section>
      </div>

      {/* Switcher rail — same pattern as landing footer */}
      <div className="fixed bottom-5 right-5 z-10 flex items-center gap-1 md:bottom-7 md:right-7">
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
            <TooltipContent sideOffset={8}>{t("labels.theme")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
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
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={i18n.language}
              onValueChange={(lang) => i18n.changeLanguage(lang)}
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
      </div>
    </div>
  );
}
