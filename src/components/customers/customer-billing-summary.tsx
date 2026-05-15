import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/format-currency";

interface BillingSummaryProps {
  totalOutstanding: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  currency: string;
}

export function CustomerBillingSummary({
  totalOutstanding,
  totalOverdue,
  totalPaidThisMonth,
  currency,
}: BillingSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-muted-foreground line-clamp-1">{t("labels.outstanding")}</span>
          <span className="font-semibold truncate">{formatCurrency(totalOutstanding, currency)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-muted-foreground line-clamp-1">{t("status.overdue")}</span>
          <span className="font-semibold text-destructive truncate">{formatCurrency(totalOverdue, currency)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-muted-foreground line-clamp-1">{t("labels.paidThisMonth")}</span>
          <span className="font-semibold truncate">{formatCurrency(totalPaidThisMonth, currency)}</span>
        </div>
      </div>
    </div>
  );
}
