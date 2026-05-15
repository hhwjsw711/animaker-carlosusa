import { Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function ListServicesCall({ input, output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  const label = input?.search
    ? t("tools.searchingServices", { query: input.search })
    : t("tools.listingServices");

  return (
    <ToolCallWrapper
      icon={<Briefcase className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={label}
      isLoading={isLoading}
    >
      {output && !output.found && (
        <p className="text-muted-foreground">{t("tools.noResults")}</p>
      )}
      {output?.found && (
        <p className="text-muted-foreground">
          {t("tools.servicesFound", { count: output.count })}
        </p>
      )}
    </ToolCallWrapper>
  );
}
