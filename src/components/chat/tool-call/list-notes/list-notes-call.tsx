import { StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function ListNotesCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<StickyNote className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.listingNotes")}
      isLoading={isLoading}
    >
      {output && !output.found && (
        <p className="text-muted-foreground">{t("tools.noResults")}</p>
      )}
      {output?.found && (
        <p className="text-muted-foreground">
          {t("tools.notesFound", { count: output.count })}
        </p>
      )}
    </ToolCallWrapper>
  );
}
