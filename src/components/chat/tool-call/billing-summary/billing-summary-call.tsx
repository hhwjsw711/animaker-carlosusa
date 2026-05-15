import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function BillingSummaryCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<Receipt className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.loadingBillingSummary")}
      isLoading={isLoading}
    >
      {output?.success && (
        <p className="text-muted-foreground">
          {t("status.pending")}: {output.countPending} | {t("status.overdue")}: {output.countOverdue} | {t("status.paid")}: {output.countPaid}
        </p>
      )}
      {output?.error && (
        <p className="text-muted-foreground">{output.message}</p>
      )}
    </ToolCallWrapper>
  );
}
