import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
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
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";

type Assignment = FunctionReturnType<typeof api.customerProducts.queries.listByCustomer>[number];
type AssignmentStatus = "active" | "inactive";

const STATUS_VARIANT: Record<AssignmentStatus, "default" | "secondary"> = {
  active: "default",
  inactive: "secondary",
};

interface CustomerProductItemProps {
  assignment: Assignment;
}

export function CustomerProductItem({
  assignment: a,
}: CustomerProductItemProps) {
  const { t } = useTranslation();

  const updateAssignment = useMutation(
    api.customerProducts.mutations.updateAssignment,
  );
  const removeAssignment = useMutation(
    api.customerProducts.mutations.removeAssignment,
  );

  const [removeOpen, setRemoveOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);

  const price = a.customPrice ?? a.productPrice;
  const statusKey = a.status as AssignmentStatus;

  const handleToggleStatus = useCallback(async () => {
    try {
      await updateAssignment({
        customerProductId: a._id,
        status: statusKey === "active" ? "inactive" : "active",
      });
    } catch {
      toast.error(t("errors.updateAssignmentFailed"));
    }
  }, [updateAssignment, a._id, statusKey, t]);

  const confirmRemove = useCallback(async () => {
    setRemoveError(false);
    setIsRemoving(true);
    try {
      await removeAssignment({ customerProductId: a._id });
      setRemoveOpen(false);
    } catch {
      setRemoveError(true);
    } finally {
      setIsRemoving(false);
    }
  }, [removeAssignment, a._id]);

  return (
    <>
      <Card className="flex flex-col justify-between">
        <CardContent>
          <div className="flex items-start gap-3">
            {a.productPhotoUrl && (
              <div className="size-10 rounded-md overflow-hidden bg-muted shrink-0">
                <img
                  src={a.productPhotoUrl}
                  alt={a.productName ?? ""}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-foreground">
                {a.productName ?? t("status.untitled")}
              </p>
              <div className="flex flex-col gap-0.5 mt-1 text-sm text-muted-foreground">
                <span className="text-foreground">{formatCurrency(price, a.productCurrency)}</span>
                {a.productSku && (
                  <span>SKU: {a.productSku}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between items-center">
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={STATUS_VARIANT[statusKey]} className="text-xs">
              {t(`status.${statusKey}` as const)}
            </Badge>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <LazyDropdownMenu
              triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
              triggerContent={<Ellipsis className="size-4.5" />}
              contentProps={{ align: "end", sideOffset: 4 }}
            >
              <DropdownMenuItem onClick={handleToggleStatus}>
                {statusKey === "active" ? t("status.inactive") : t("status.active")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRemoveOpen(true)}>
                {t("actions.removeProductAssignment")}
              </DropdownMenuItem>
            </LazyDropdownMenu>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog
        open={removeOpen}
        onOpenChange={(open: boolean) => {
          if (isRemoving) return;
          if (!open) {
            setRemoveOpen(false);
            setRemoveError(false);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("alerts.removeProductAssignment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeError
                ? t("errors.removeProductAssignmentFailed")
                : t("alerts.confirmRemoveProductAssignment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isRemoving}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={confirmRemove}
              disabled={isRemoving}
            >
              {isRemoving ? <Spinner size={5} /> : t("actions.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
