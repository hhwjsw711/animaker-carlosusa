import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OnboardingStepWelcome } from "./onboarding-step-welcome";
import { OnboardingStepPlan } from "./onboarding-step-plan";
import { OnboardingStepSetup } from "./onboarding-step-setup";
import { Progress } from "@/components/ui/progress";
import { AuthLayout } from "@/components/auth/auth-layout";

export type OnboardingUseCase = "customers" | "chat" | "automation" | "all";
type Step = "welcome" | "plan" | "setup";

const STEPS: Step[] = ["welcome", "plan", "setup"];

export function OnboardingWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("welcome");
  const [useCase, setUseCase] = useState<OnboardingUseCase | null>(null);

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleSkip = () => {
    if (!useCase) {
      setUseCase("all");
    }
    setStep("setup");
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <Progress value={progress} className="h-1" />
          <div className="text-right text-xs text-muted-foreground">
            {t("onboarding.actions.stepOf", {
              current: currentStepIndex + 1,
              total: STEPS.length,
            })}
          </div>
        </div>

        {step === "welcome" && (
          <OnboardingStepWelcome
            onNext={(useCaseValue) => {
              setUseCase(useCaseValue);
              setStep("plan");
            }}
            onSkip={handleSkip}
          />
        )}

        {step === "plan" && (
          <OnboardingStepPlan
            onNext={() => setStep("setup")}
            onSkip={handleSkip}
            onBack={() => setStep("welcome")}
          />
        )}

        {step === "setup" && useCase && (
          <OnboardingStepSetup
            useCase={useCase}
            onBack={() => setStep("plan")}
          />
        )}
      </div>
    </AuthLayout>
  );
}
