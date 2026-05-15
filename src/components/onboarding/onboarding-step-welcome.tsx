import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/custom/logo";
import {
  Users,
  Zap,
  MessageSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { OnboardingUseCase } from "./onboarding-wizard";

interface OnboardingStepWelcomeProps {
  onNext: (useCase: OnboardingUseCase) => void;
  onSkip: () => void;
}

const USE_CASE_OPTIONS: Array<{
  id: OnboardingUseCase;
  icon: LucideIcon;
  labelKey: string;
}> = [
  {
    id: "customers",
    icon: Users,
    labelKey: "onboarding.stepWelcome.useCaseCustomers",
  },
  {
    id: "chat",
    icon: Zap,
    labelKey: "onboarding.stepWelcome.useCaseChat",
  },
  {
    id: "automation",
    icon: MessageSquare,
    labelKey: "onboarding.stepWelcome.useCaseAutomation",
  },
  {
    id: "all",
    icon: Sparkles,
    labelKey: "onboarding.stepWelcome.useCaseAll",
  },
];

export function OnboardingStepWelcome({
  onNext,
  onSkip,
}: OnboardingStepWelcomeProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<OnboardingUseCase | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4">
        <Logo size="lg" />
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            {t("onboarding.stepWelcome.title")}
          </h1>
          <p className="text-muted-foreground max-w-md">
            {t("onboarding.stepWelcome.description")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-semibold">
          {t("onboarding.stepWelcome.useCaseLabel")}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {USE_CASE_OPTIONS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                selected === id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              <Icon className="size-4.5 shrink-0 text-primary" />
              <span className="text-sm font-medium">
                {t(labelKey as never)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="w-full"
        >
          {t("onboarding.actions.continue")}
        </Button>
        <Button
          onClick={onSkip}
          variant="ghost"
          className="w-full text-sm"
        >
          {t("onboarding.actions.skip")}
        </Button>
      </div>
    </div>
  );
}
