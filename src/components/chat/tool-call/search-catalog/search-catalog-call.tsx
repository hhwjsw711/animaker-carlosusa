import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function SearchCatalogCall({ input, output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();
  const query = input?.query ?? "";

  return (
    <ToolCallWrapper
      icon={<Search className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.searchingCatalog", { query })}
      isLoading={isLoading}
    >
      {output && !output.found && (
        <p className="text-muted-foreground">{t("tools.noResults")}</p>
      )}
      {output?.found && (
        <p className="text-muted-foreground">
          {t("tools.results", { count: output.resultCount })}
        </p>
      )}
    </ToolCallWrapper>
  );
}
