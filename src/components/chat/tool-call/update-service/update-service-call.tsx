import { Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function UpdateServiceCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<Briefcase className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.updatingService")}
      isLoading={isLoading}
    >
      {output?.success && (
        <p className="text-muted-foreground">{t("tools.serviceUpdated")}</p>
      )}
      {output?.error && (
        <p className="text-muted-foreground">{output.message}</p>
      )}
    </ToolCallWrapper>
  );
}
