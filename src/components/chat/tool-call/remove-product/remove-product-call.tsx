import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function RemoveProductCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<Package className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.removingProductAssignment")}
      isLoading={isLoading}
    >
      {output?.success && (
        <p className="text-muted-foreground">{t("tools.productAssignmentRemoved")}</p>
      )}
      {output?.error && (
        <p className="text-muted-foreground">{output.message}</p>
      )}
    </ToolCallWrapper>
  );
}
