import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function ListCustomerFilesCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<FolderOpen className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.listingCustomerFiles")}
      isLoading={isLoading}
    >
      {output && !output.found && (
        <p className="text-muted-foreground">{t("tools.noResults")}</p>
      )}
      {output?.found && (
        <p className="text-muted-foreground">
          {t("tools.results", { count: output.fileCount })}
        </p>
      )}
    </ToolCallWrapper>
  );
}
