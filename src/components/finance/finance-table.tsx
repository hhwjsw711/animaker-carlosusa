import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Spinner from "@/components/ui/custom/spinner";
import { formatCurrency } from "@/lib/format-currency";
import { isoToDisplay } from "@/lib/date-mask";
import {
  type PaymentMethod,
  type TransactionStatus,
  PAYMENT_METHOD_LABELS,
} from "@/lib/billing-utils";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { UnifiedFinanceTransaction } from "./finance-layout";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
  cancelled: "outline",
};

interface FinanceTableProps {
  transactions: UnifiedFinanceTransaction[];
}

export function FinanceTable({ transactions }: FinanceTableProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const language = i18n.language;

  const updateServiceTransaction = useMutation(
    api.serviceTransactions.mutations.updateTransaction,
  );
  const deleteServiceTransaction = useMutation(
    api.serviceTransactions.mutations.deleteTransaction,
  );
  const updateProductTransaction = useMutation(
    api.productTransactions.mutations.updateTransaction,
  );
  const deleteProductTransaction = useMutation(
    api.productTransactions.mutations.deleteTransaction,
  );

  const [deleteTarget, setDeleteTarget] = useState<UnifiedFinanceTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleStatusChange = useCallback(
    async (tx: UnifiedFinanceTransaction, status: TransactionStatus) => {
      try {
        if (tx._type === "product") {
          await updateProductTransaction({
            transactionId: tx._id as Id<"productTransactions">,
            status: status as "pending" | "paid" | "cancelled",
          });
        } else {
          await updateServiceTransaction({
            transactionId: tx._id as Id<"serviceTransactions">,
            status,
          });
        }
      } catch {
        toast.error(t("errors.updateTransactionFailed"));
      }
    },
    [updateServiceTransaction, updateProductTransaction, t],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteError(false);
    setIsDeleting(true);
    try {
      if (deleteTarget._type === "product") {
        await deleteProductTransaction({
          transactionId: deleteTarget._id as Id<"productTransactions">,
        });
      } else {
        await deleteServiceTransaction({
          transactionId: deleteTarget._id as Id<"serviceTransactions">,
        });
      }
      setDeleteTarget(null);
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, deleteServiceTransaction, deleteProductTransaction]);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("labels.customer")}</TableHead>
              <TableHead>{t("labels.description")}</TableHead>
              <TableHead className="text-right">{t("labels.amount")}</TableHead>
              {!isMobile && <TableHead>{t("labels.dueDate")}</TableHead>}
              <TableHead>{t("labels.status")}</TableHead>
              {!isMobile && <TableHead>{t("labels.paymentMethod")}</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const isProduct = tx._type === "product";
              const displayName = isProduct ? tx.productName : tx.serviceName;
              const dateValue = isProduct ? tx.purchaseDate : tx.dueDate;

              return (
                <TableRow key={`${tx._type}-${tx._id}`}>
                  <TableCell className="truncate max-w-40">
                    {tx.customerName ?? t("status.untitled")}
                  </TableCell>
                  <TableCell className="truncate max-w-40">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{displayName ?? t("status.untitled")}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {isProduct ? t("labels.product") : t("labels.service")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(tx.amount, tx.currency)}
                  </TableCell>
                  {!isMobile && (
                    <TableCell className="text-muted-foreground">
                      {isoToDisplay(dateValue, language)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[tx.status] ?? "secondary"} className="text-xs">
                      {t(`status.${tx.status}` as const)}
                    </Badge>
                  </TableCell>
                  {!isMobile && (
                    <TableCell className="text-muted-foreground">
                      {tx.paymentMethod
                        ? t(PAYMENT_METHOD_LABELS[tx.paymentMethod as PaymentMethod])
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <LazyDropdownMenu
                        triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                        triggerContent={<Ellipsis className="size-4.5" />}
                        contentProps={{ align: "end", sideOffset: 4 }}
                      >
                        {tx.status !== "paid" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(tx, "paid")}>
                            {t("actions.markAsPaid")}
                          </DropdownMenuItem>
                        )}
                        {!isProduct && tx.status !== "overdue" && tx.status !== "paid" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(tx, "overdue")}>
                            {t("actions.markAsOverdue")}
                          </DropdownMenuItem>
                        )}
                        {tx.status !== "cancelled" && tx.status !== "paid" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(tx, "cancelled")}>
                            {t("status.cancelled")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteTarget(tx)}>
                          {t("actions.delete")}
                        </DropdownMenuItem>
                      </LazyDropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (isDeleting) return;
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(false);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteTransaction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError
                ? t("errors.deleteTransactionFailed")
                : t("alerts.confirmDeleteTransaction")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isDeleting}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
