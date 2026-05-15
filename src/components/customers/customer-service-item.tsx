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
import { isoToDisplay } from "@/lib/date-mask";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";

type Assignment = FunctionReturnType<typeof api.customerServices.queries.listByCustomer>[number];
type AssignmentStatus = "active" | "paused" | "cancelled" | "completed";

const STATUS_VARIANT: Record<
  AssignmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  paused: "secondary",
  cancelled: "destructive",
  completed: "outline",
};

interface CustomerServiceItemProps {
  assignment: Assignment;
}

export function CustomerServiceItem({
  assignment: a,
}: CustomerServiceItemProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const updateAssignment = useMutation(
    api.customerServices.mutations.updateAssignment,
  );
  const removeAssignment = useMutation(
    api.customerServices.mutations.removeAssignment,
  );

  const [removeOpen, setRemoveOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);

  const price = a.customPrice ?? a.servicePrice;
  const statusKey = a.status as AssignmentStatus;
  const otherStatuses: AssignmentStatus[] = (
    ["active", "paused", "cancelled", "completed"] as const
  ).filter((s) => s !== statusKey);

  const handleStatusChange = useCallback(
    async (status: AssignmentStatus) => {
      try {
        await updateAssignment({ customerServiceId: a._id, status });
      } catch {
        toast.error(t("errors.updateAssignmentFailed"));
      }
    },
    [updateAssignment, a._id, t],
  );

  const confirmRemove = useCallback(async () => {
    setRemoveError(false);
    setIsRemoving(true);
    try {
      await removeAssignment({ customerServiceId: a._id });
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
          <p className="font-medium truncate text-foreground">
            {a.serviceName ?? t("status.untitled")}
          </p>
          <div className="flex flex-col gap-0.5 mt-1 text-sm text-muted-foreground">
            <span className="text-foreground">{formatCurrency(price, a.serviceCurrency)}</span>
            {a.startDate && (
              <span>
                {t("labels.startDate")}: {isoToDisplay(a.startDate, language)}
              </span>
            )}
            {a.nextBillingDate && (
              <span>
                {t("labels.nextBilling")}:{" "}
                {isoToDisplay(a.nextBillingDate, language)}
              </span>
            )}
        </div>
      </CardContent>
        <CardFooter className="justify-between items-center">

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={STATUS_VARIANT[statusKey]} className="text-xs">
            {t(`status.${statusKey}` as const)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {a.serviceBillingType === "one_time"
              ? t("labels.oneTime")
              : t("labels.recurring")}
          </Badge>
        </div>


          <div onClick={(e) => e.stopPropagation()}>
            <LazyDropdownMenu
              triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
              triggerContent={<Ellipsis className="size-4.5" />}
              contentProps={{ align: "end", sideOffset: 4 }}
            >
              {otherStatuses.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleStatusChange(s)}
                >
                  {t(`status.${s}`)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRemoveOpen(true)}>
                {t("actions.removeAssignment")}
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
              {t("alerts.removeServiceAssignment")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeError
                ? t("errors.removeAssignmentFailed")
                : t("alerts.confirmRemoveServiceAssignment")}
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
