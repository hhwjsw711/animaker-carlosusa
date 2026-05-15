import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function ListCustomerProductsCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<Package className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.listingCustomerProducts")}
      isLoading={isLoading}
    >
      {output && !output.found && (
        <p className="text-muted-foreground">{t("tools.noResults")}</p>
      )}
      {output?.found && (
        <p className="text-muted-foreground">
          {t("tools.customerProductsFound", { count: output.count })}
        </p>
      )}
    </ToolCallWrapper>
  );
}
