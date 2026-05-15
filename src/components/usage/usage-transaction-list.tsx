import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { Receipt } from "lucide-react";
import { formatNumber } from "./usage-helpers";

interface Transaction {
  _id: string;
  amount: number;
  balanceAfter: number;
  source: string;
  description?: string;
  createdAt: number;
}

interface TransactionListProps {
  transactions: Transaction[] | null | undefined;
}

const SOURCE_I18N: Record<string, string> = {
  chat: "labels.chatSource",
  scheduled: "labels.agentSource",
  extraction: "labels.extractionSource",
  rag: "labels.ragSource",
  exa: "labels.exaSource",
  imageGeneration: "labels.imageGenerationSource",
  monthly_refresh: "labels.monthlyRefresh",
  daily_refresh: "labels.dailyRefresh",
  addon_purchase: "labels.addonPurchase",
  subscription_grant: "labels.subscriptionGrant",
};

const SOURCE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  chat: "default",
  scheduled: "secondary",
  extraction: "outline",
  rag: "outline",
  exa: "outline",
  imageGeneration: "outline",
  monthly_refresh: "secondary",
  daily_refresh: "secondary",
  addon_purchase: "default",
  subscription_grant: "default",
};

export function UsageTransactionList({ transactions }: TransactionListProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();

  const recent = useMemo(
    () => (transactions ? [...transactions].reverse().slice(0, 50) : []),
    [transactions],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.recentTransactions")}</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="flex h-50 items-center justify-center">
            <EmptyState icon={Receipt} message={t("empty.noTransactions")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labels.date")}</TableHead>
                <TableHead>{t("labels.source")}</TableHead>
                <TableHead className="text-right">{t("labels.amount")}</TableHead>
                {!isMobile && (
                  <TableHead className="text-right">{t("labels.creditBalance")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((tx) => (
                <TableRow key={tx._id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString(i18n.language, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={SOURCE_VARIANT[tx.source] ?? "outline"}>
                      {t(SOURCE_I18N[tx.source] ?? tx.source)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                      {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount)}
                    </span>
                  </TableCell>
                  {!isMobile && (
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatNumber(tx.balanceAfter)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
