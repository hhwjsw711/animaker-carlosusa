import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/custom/empty-state";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { DATE_MASKS, applyMask, isoToDisplay } from "@/lib/date-mask";
import { todayIso, displayToIsoAllowFuture } from "@/lib/billing-utils";
import { Briefcase } from "lucide-react";
import { CustomerServiceItem } from "./customer-service-item";
import useNavigationStore from "@/stores/navigation";

interface CustomerServicesProps {
  customerId: Id<"customers">;
}

export function CustomerServices({ customerId }: CustomerServicesProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isActive = useNavigationStore((s) => s.activePage === "customers");
  const dateMask = DATE_MASKS[language] ?? DATE_MASKS["en-US"];

  const assignments = useQuery(
    api.customerServices.queries.listByCustomer,
    { customerId },
  );

  const allServicesRaw = useQuery(api.services.queries.listActiveServicesLight);
  const allServices = useMemo(() => allServicesRaw ?? [], [allServicesRaw]);

  const assignService = useMutation(api.customerServices.mutations.assignService);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [customPrice, setCustomPrice] = useState("");
  const [startDateDisplay, setStartDateDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState(false);

  const serviceItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of allServices) {
      map[s._id] = s.name;
    }
    return map;
  }, [allServices]);

  // Reset dialog state when opened
  useEffect(() => {
    if (dialogOpen) {
      setSelectedServiceId("");
      setCustomPrice("");
      setStartDateDisplay(isoToDisplay(todayIso(), language));
      setNotes("");
      setDialogError(false);
    }
  }, [dialogOpen, language]);

  const canSave =
    selectedServiceId !== "" &&
    displayToIsoAllowFuture(startDateDisplay, language) !== null;

  const handleAssign = useCallback(async () => {
    const startDate = displayToIsoAllowFuture(startDateDisplay, language);
    if (!selectedServiceId || !startDate) return;

    setDialogError(false);
    setIsSaving(true);

    try {
      const priceValue = customPrice.trim()
        ? Math.round(parseFloat(customPrice) * 100)
        : undefined;

      await assignService({
        customerId,
        serviceId: selectedServiceId as Id<"services">,
        startDate,
        customPrice: priceValue,
        notes: notes.trim() || undefined,
      });
      setDialogOpen(false);
    } catch {
      setDialogError(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedServiceId,
    customPrice,
    startDateDisplay,
    notes,
    language,
    customerId,
    assignService,
  ]);

  if (assignments === undefined) {
    return null;
  }

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-12 z-9 bg-background border-b p-4 flex items-center justify-start">
        <Button onClick={() => setDialogOpen(true)}>
          {t("actions.assignService")}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {assignments.length === 0 ? (
          <EmptyState icon={Briefcase} message={t("empty.noCustomerServices")} />
        ) : (
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" itemCount={assignments.length} dataKey={customerId} visible={isActive}>
            {assignments.map((a) => (
              <CustomerServiceItem key={a._id} assignment={a} />
            ))}
          </AnimatedList>
        )}
      </div>

      {/* Assign Service Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (isSaving) return;
          setDialogOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogError
                ? t("errors.assignServiceFailed")
                : t("actions.assignService")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Service select */}
            <div className="space-y-1.5">
              <Label>{t("labels.service")}</Label>
              <Select
                value={selectedServiceId}
                onValueChange={(v) => setSelectedServiceId(v ?? "")}
                items={serviceItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue placeholder={t("labels.selectService")} />
                </SelectTrigger>
                <SelectContent>
                  {allServices.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom price */}
            <div className="space-y-1.5">
              <Label>
                {t("labels.customPrice")}{" "}
                <span className="text-muted-foreground">
                  ({t("labels.optional")})
                </span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Start date */}
            <div className="space-y-1.5">
              <Label>{t("labels.startDate")}</Label>
              <Input
                value={startDateDisplay}
                onChange={(e) =>
                  setStartDateDisplay(
                    applyMask(e.target.value, dateMask.mask),
                  )
                }
                placeholder={dateMask.placeholder}
                disabled={isSaving}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>
                {t("labels.notes")}{" "}
                <span className="text-muted-foreground">
                  ({t("labels.optional")})
                </span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSaving}
                className="min-h-20 max-h-32 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleAssign} disabled={!canSave || isSaving}>
              {isSaving ? <Spinner size={5} /> : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
