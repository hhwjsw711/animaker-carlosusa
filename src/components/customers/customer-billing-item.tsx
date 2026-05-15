import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import type { UnifiedTransaction } from "./customer-billing";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
  cancelled: "outline",
};

interface CustomerBillingItemProps {
  transaction: UnifiedTransaction;
  currency: string;
  onEdit: (tx: UnifiedTransaction) => void;
}

export function CustomerBillingItem({
  transaction: tx,
  currency,
  onEdit,
}: CustomerBillingItemProps) {
  const { t, i18n } = useTranslation();
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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const isProduct = tx._type === "product";
  const statusKey = tx.status;
  const displayName = isProduct
    ? (tx as UnifiedTransaction & { _type: "product" }).productName
    : (tx as UnifiedTransaction & { _type: "service" }).serviceName;
  const dateLabel = isProduct ? "labels.purchaseDate" : "labels.dueDate";
  const dateValue = isProduct
    ? (tx as UnifiedTransaction & { _type: "product" }).purchaseDate
    : (tx as UnifiedTransaction & { _type: "service" }).dueDate;

  const handleStatusChange = useCallback(
    async (status: TransactionStatus) => {
      try {
        if (isProduct) {
          await updateProductTransaction({ transactionId: tx._id as never, status: status as "pending" | "paid" | "cancelled" });
        } else {
          await updateServiceTransaction({ transactionId: tx._id as never, status });
        }
      } catch {
        toast.error(t("errors.updateTransactionFailed"));
      }
    },
    [isProduct, updateServiceTransaction, updateProductTransaction, tx._id, t],
  );

  const confirmDelete = useCallback(async () => {
    setDeleteError(false);
    setIsDeleting(true);
    try {
      if (isProduct) {
        await deleteProductTransaction({ transactionId: tx._id as never });
      } else {
        await deleteServiceTransaction({ transactionId: tx._id as never });
      }
      setDeleteOpen(false);
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [isProduct, deleteServiceTransaction, deleteProductTransaction, tx._id]);

  return (
    <>
      <Card className="flex flex-col justify-between">
        <CardContent>
          <p className="font-medium truncate text-foreground">
            {displayName ?? t("status.untitled")}
          </p>
          <div className="flex flex-col gap-0.5 mt-1 text-sm text-muted-foreground">
            <span className="text-foreground">
              {formatCurrency(tx.amount, currency)}
            </span>
            {isProduct && (tx as UnifiedTransaction & { _type: "product" }).quantity > 1 && (
              <span>
                {t("labels.quantity")}: {(tx as UnifiedTransaction & { _type: "product" }).quantity} x {formatCurrency((tx as UnifiedTransaction & { _type: "product" }).unitPrice, currency)}
              </span>
            )}
            <span>
              {t(dateLabel)}: {isoToDisplay(dateValue, language)}
            </span>
            {tx.paidDate && (
              <span>
                {t("labels.paidDate")}: {isoToDisplay(tx.paidDate, language)}
              </span>
            )}
            {tx.reference && <span>{tx.reference}</span>}
          </div>
        </CardContent>
        <CardFooter className="justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_VARIANT[statusKey] ?? "secondary"} className="text-xs">
              {t(`status.${statusKey}` as const)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {isProduct ? t("labels.product") : t("labels.service")}
            </Badge>
            {tx.paymentMethod && (
              <Badge variant="outline" className="text-xs">
                {t(PAYMENT_METHOD_LABELS[tx.paymentMethod as PaymentMethod])}
              </Badge>
            )}
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <LazyDropdownMenu
              triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
              triggerContent={<Ellipsis className="size-4.5" />}
              contentProps={{ align: "end", sideOffset: 4 }}
            >
              {statusKey !== "paid" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("paid")}
                >
                  {t("actions.markAsPaid")}
                </DropdownMenuItem>
              )}
              {!isProduct && statusKey !== "overdue" && statusKey !== "paid" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("overdue")}
                >
                  {t("actions.markAsOverdue")}
                </DropdownMenuItem>
              )}
              {statusKey !== "cancelled" && statusKey !== "paid" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("cancelled")}
                >
                  {t("status.cancelled")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!isProduct && (
                <DropdownMenuItem onClick={() => onEdit(tx)}>
                  {t("actions.editTransaction")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                {t("actions.delete")}
              </DropdownMenuItem>
            </LazyDropdownMenu>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open: boolean) => {
          if (isDeleting) return;
          if (!open) {
            setDeleteOpen(false);
            setDeleteError(false);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("alerts.deleteTransaction")}
            </AlertDialogTitle>
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
