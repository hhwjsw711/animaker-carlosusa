import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface OnboardingStepPlanProps {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const PLANS = [
  {
    id: "free",
    nameKey: "onboarding.stepPlan.planFree",
    creditsKey: "onboarding.stepPlan.plan150Credits",
    features: [
      "onboarding.stepPlan.featureChat",
      "onboarding.stepPlan.featureCustomers10",
      "onboarding.stepPlan.feature1Agent",
      "onboarding.stepPlan.feature500MB",
    ],
    isCurrent: true,
  },
  {
    id: "starter",
    nameKey: "onboarding.stepPlan.planStarter",
    creditsKey: "onboarding.stepPlan.plan3000Credits",
    features: [
      "onboarding.stepPlan.featureChat",
      "onboarding.stepPlan.featureCustomers50",
      "onboarding.stepPlan.feature5Agents",
      "onboarding.stepPlan.feature2GB",
    ],
  },
  {
    id: "pro",
    nameKey: "onboarding.stepPlan.planPro",
    creditsKey: "onboarding.stepPlan.plan10000Credits",
    features: [
      "onboarding.stepPlan.featureChat",
      "onboarding.stepPlan.featureCustomers200",
      "onboarding.stepPlan.feature10Agents",
      "onboarding.stepPlan.feature10GB",
    ],
  },
  {
    id: "business",
    nameKey: "onboarding.stepPlan.planBusiness",
    creditsKey: "onboarding.stepPlan.plan30000Credits",
    features: [
      "onboarding.stepPlan.featureChat",
      "onboarding.stepPlan.featureUnlimitedCustomers",
      "onboarding.stepPlan.feature20Agents",
      "onboarding.stepPlan.feature50GB",
    ],
  },
];

const EQUIVALENTS = [
  "onboarding.stepPlan.equivalentChat",
  "onboarding.stepPlan.equivalentSearch",
  "onboarding.stepPlan.equivalentImage",
];

export function OnboardingStepPlan({
  onNext,
  onSkip,
  onBack,
}: OnboardingStepPlanProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t("onboarding.stepPlan.title")}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("onboarding.stepPlan.description")}
        </p>
      </div>

      <div className="bg-accent/40 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold">
          {t("onboarding.stepPlan.equivalentTitle")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EQUIVALENTS.map((key) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <Zap className="size-4.5 text-primary" />
              <span>{t(key as never)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={
              plan.isCurrent ? "border-primary bg-primary/5" : ""
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">
                  {t(plan.nameKey as never)}
                </CardTitle>
                {plan.isCurrent && (
                  <Badge variant="default" className="text-xs">
                    {t("onboarding.stepPlan.current")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t(plan.creditsKey as never)}
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((featureKey) => (
                  <li key={featureKey} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{t(featureKey as never)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onNext} className="w-full">
          {t("onboarding.actions.continue")}
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
          >
            {t("onboarding.actions.back")}
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            className="flex-1"
          >
            {t("onboarding.actions.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
