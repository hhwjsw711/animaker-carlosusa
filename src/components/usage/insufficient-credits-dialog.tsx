import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useBillingDialogStore from "@/stores/billing-dialog";
import { formatNumber } from "./usage-helpers";

export function InsufficientCreditsDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useBillingDialogStore((s) => s.insufficientCreditsOpen);
  const data = useBillingDialogStore((s) => s.insufficientCreditsData);
  const close = useBillingDialogStore((s) => s.closeInsufficientCredits);

  const goToBilling = () => {
    close();
    void navigate({ to: "/usage" });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("billing.insufficientCredits.title")}</DialogTitle>
          <DialogDescription>
            {t("billing.insufficientCredits.description")}
          </DialogDescription>
        </DialogHeader>

        {data && (data.available !== undefined || data.required !== undefined) && (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            {data.available !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("billing.insufficientCredits.available")}
                </span>
                <span className="tabular-nums font-medium">
                  {formatNumber(data.available)}
                </span>
              </div>
            )}
            {data.required !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("billing.insufficientCredits.required")}
                </span>
                <span className="tabular-nums font-medium">
                  {formatNumber(data.required)}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t("billing.insufficientCredits.dismiss")}
          </Button>
          <Button onClick={goToBilling}>
            {t("billing.insufficientCredits.upgradePlan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
