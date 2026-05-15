import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Zap, MessageSquare, type LucideIcon } from "lucide-react";
import type { OnboardingUseCase } from "./onboarding-wizard";
import Spinner from "@/components/ui/custom/spinner";

type TargetPath = "/chat" | "/customers";

interface ActionOption {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
  targetPath: TargetPath;
}

const ACTIONS_BY_USE_CASE: Record<OnboardingUseCase, ActionOption[]> = {
  customers: [
    {
      id: "create-customer",
      icon: Users,
      labelKey: "onboarding.stepSetup.actionCreateCustomer",
      descriptionKey: "onboarding.stepSetup.actionCreateCustomerDescription",
      targetPath: "/customers",
    },
  ],
  chat: [
    {
      id: "try-chat",
      icon: Zap,
      labelKey: "onboarding.stepSetup.actionTryChat",
      descriptionKey: "onboarding.stepSetup.actionTryChatDescription",
      targetPath: "/chat",
    },
  ],
  automation: [
    {
      id: "connect-whatsapp",
      icon: MessageSquare,
      labelKey: "onboarding.stepSetup.actionConnectWhatsApp",
      descriptionKey: "onboarding.stepSetup.actionConnectWhatsAppDescription",
      targetPath: "/chat",
    },
  ],
  all: [
    {
      id: "create-customer",
      icon: Users,
      labelKey: "onboarding.stepSetup.actionCreateCustomer",
      descriptionKey: "onboarding.stepSetup.actionCreateCustomerDescription",
      targetPath: "/customers",
    },
    {
      id: "try-chat",
      icon: Zap,
      labelKey: "onboarding.stepSetup.actionTryChat",
      descriptionKey: "onboarding.stepSetup.actionTryChatDescription",
      targetPath: "/chat",
    },
    {
      id: "connect-whatsapp",
      icon: MessageSquare,
      labelKey: "onboarding.stepSetup.actionConnectWhatsApp",
      descriptionKey: "onboarding.stepSetup.actionConnectWhatsAppDescription",
      targetPath: "/chat",
    },
  ],
};

interface OnboardingStepSetupProps {
  useCase: OnboardingUseCase;
  onBack: () => void;
}

export function OnboardingStepSetup({
  useCase,
  onBack,
}: OnboardingStepSetupProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);
  const [loading, setLoading] = useState(false);

  const actions = ACTIONS_BY_USE_CASE[useCase];

  const handleComplete = async (targetPath: TargetPath) => {
    setLoading(true);
    try {
      await completeOnboarding({ useCase });
      void navigate({ to: targetPath });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setLoading(false);
    }
  };

  const handleExploreSolo = () => handleComplete("/chat");

  const primaryAction = actions[0];
  const PrimaryIcon = primaryAction.icon;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t("onboarding.stepSetup.title")}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("onboarding.stepSetup.description")}
        </p>
      </div>

      {useCase === "all" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleComplete(action.targetPath)}
                disabled={loading}
                className="text-left"
              >
                <Card className="h-full hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                  <CardHeader>
                    <Icon className="size-4.5 text-primary mb-2" />
                    <CardTitle className="text-base">
                      {t(action.labelKey as never)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t(action.descriptionKey as never)}
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <PrimaryIcon className="size-4.5 text-primary mt-1" />
              <div>
                <CardTitle className="text-lg mb-1">
                  {t(primaryAction.labelKey as never)}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t(primaryAction.descriptionKey as never)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={
            useCase === "all"
              ? handleExploreSolo
              : () => handleComplete(primaryAction.targetPath)
          }
          disabled={loading}
          className="w-full"
        >
          {loading ? <Spinner /> : t("onboarding.actions.finish")}
        </Button>
        <div className="flex gap-2">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            {t("onboarding.actions.back")}
          </Button>
          <Button
            onClick={handleExploreSolo}
            variant="ghost"
            className="flex-1"
            disabled={loading}
          >
            {t("onboarding.stepSetup.exploreSolo")}
          </Button>
        </div>
      </div>
    </div>
  );
}
