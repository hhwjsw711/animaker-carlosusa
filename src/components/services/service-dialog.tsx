import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/custom/spinner";
import { handleConvexError } from "@/lib/convex-error-handler";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editService?: {
    _id: Id<"services">;
    name: string;
    description?: string;
    categoryId?: Id<"serviceCategories">;
    price: number;
    currency: string;
    billingType: "one_time" | "recurring";
    recurringInterval?: string;
    duration?: string;
  } | null;
}

const CURRENCY_BY_LOCALE: Record<string, string> = {
  "pt-BR": "BRL",
  "en-US": "USD",
};

const CURRENCY_OPTIONS = ["BRL", "USD"] as const;

const CURRENCY_CONFIG: Record<string, { decimal: string; prefix: string }> = {
  BRL: { decimal: ",", prefix: "R$ " },
  USD: { decimal: ".", prefix: "$ " },
};

function formatPriceDisplay(cents: number, currencyCode: string): string {
  const cfg = CURRENCY_CONFIG[currencyCode] ?? CURRENCY_CONFIG.USD;
  const value = (cents / 100).toFixed(2);
  const [int, dec] = value.split(".");
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.decimal === "," ? "." : ",");
  return `${cfg.prefix}${formattedInt}${cfg.decimal}${dec}`;
}

function parsePriceInput(raw: string, currencyCode: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return formatPriceDisplay(cents, currencyCode);
}

function priceDisplayToCents(display: string): number {
  const digits = display.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

const RECURRING_INTERVALS = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

export function ServiceDialog({
  open,
  onOpenChange,
  editService,
}: ServiceDialogProps) {
  const { t, i18n } = useTranslation();
  const createService = useMutation(api.services.mutations.createService);
  const updateService = useMutation(api.services.mutations.updateService);
  const categories = useQuery(api.serviceCategories.queries.listCategories);

  const defaultCurrency = CURRENCY_BY_LOCALE[i18n.language] ?? "USD";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [billingType, setBillingType] = useState<"one_time" | "recurring">("one_time");
  const [recurringInterval, setRecurringInterval] = useState("");
  const [duration, setDuration] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editService;

  // Items maps for Select display
  const categoryItems = useMemo(() => {
    const map: Record<string, string> = { "": t("labels.general") };
    categories?.forEach((cat) => { map[cat._id] = cat.name; });
    return map;
  }, [categories, t]);

  const currencyItems = useMemo(() => {
    const map: Record<string, string> = {};
    CURRENCY_OPTIONS.forEach((c) => { map[c] = c; });
    return map;
  }, []);

  const billingTypeItems = useMemo(() => ({
    one_time: t("labels.oneTime"),
    recurring: t("labels.recurring"),
  }), [t]);

  const recurringIntervalItems = useMemo(() => {
    const map: Record<string, string> = {};
    RECURRING_INTERVALS.forEach((interval) => {
      map[interval] = t(`labels.${interval}` as never);
    });
    return map;
  }, [t]);

  useEffect(() => {
    if (open && editService) {
      setName(editService.name);
      setDescription(editService.description ?? "");
      setCategoryId(editService.categoryId ?? "");
      setPrice(editService.price > 0 ? formatPriceDisplay(editService.price, editService.currency) : "");
      setCurrency(editService.currency);
      setBillingType(editService.billingType);
      setRecurringInterval(editService.recurringInterval ?? "");
      setDuration(editService.duration ?? "");
      setError(false);
    } else if (open) {
      setName("");
      setDescription("");
      setCategoryId("");
      setPrice("");
      setCurrency(defaultCurrency);
      setBillingType("one_time");
      setRecurringInterval("");
      setDuration("");
      setError(false);
    }
  }, [open, editService, defaultCurrency]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const priceInCents = priceDisplayToCents(price);
    if (!trimmedName) return;

    setError(false);
    setIsSaving(true);
    try {

      if (isEdit && editService) {
        await updateService({
          serviceId: editService._id,
          name: trimmedName,
          description: description.trim() || undefined,
          ...(categoryId
            ? { categoryId: categoryId as Id<"serviceCategories"> }
            : { removeCategoryId: true }),
          price: priceInCents,
          currency,
          billingType,
          recurringInterval: billingType === "recurring" ? recurringInterval || undefined : undefined,
          duration: duration.trim() || undefined,
        });
      } else {
        await createService({
          name: trimmedName,
          description: description.trim() || undefined,
          categoryId: (categoryId || undefined) as Id<"serviceCategories"> | undefined,
          price: priceInCents,
          currency,
          billingType,
          recurringInterval: billingType === "recurring" ? recurringInterval || undefined : undefined,
          duration: duration.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch (err) {
      if (handleConvexError(err)) {
        onOpenChange(false);
        return;
      }
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    description,
    categoryId,
    price,
    currency,
    billingType,
    recurringInterval,
    duration,
    isEdit,
    editService,
    createService,
    updateService,
    onOpenChange,
  ]);

  // Re-format price when currency changes
  useEffect(() => {
    if (price) {
      const cents = priceDisplayToCents(price);
      if (cents > 0) {
        setPrice(formatPriceDisplay(cents, currency));
      }
    }
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = !!name.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSaving) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {error
              ? t(isEdit ? "errors.updateServiceFailed" : "errors.createServiceFailed")
              : isEdit
                ? t("actions.edit")
                : t("actions.newService")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t("labels.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t("labels.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              className="min-h-20 max-h-40 resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>{t("labels.category")}</Label>
            <Select value={categoryId} onValueChange={setCategoryId} items={categoryItems}>
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("labels.general")}</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label>{t("labels.price")}</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(parsePriceInput(e.target.value, currency))}
              disabled={isSaving}
              placeholder={formatPriceDisplay(0, currency)}
            />
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label>{t("labels.currency")}</Label>
            <Select value={currency} onValueChange={setCurrency} items={currencyItems}>
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Type */}
          <div className="space-y-1.5">
            <Label>{t("labels.billingType")}</Label>
            <Select
              value={billingType}
              onValueChange={(v) => setBillingType(v as "one_time" | "recurring")}
              items={billingTypeItems}
            >
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">{t("labels.oneTime")}</SelectItem>
                <SelectItem value="recurring">{t("labels.recurring")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurring Interval */}
          {billingType === "recurring" && (
            <div className="space-y-1.5">
              <Label>{t("labels.recurringInterval")}</Label>
              <Select
                value={recurringInterval}
                onValueChange={setRecurringInterval}
                items={recurringIntervalItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_INTERVALS.map((interval) => (
                    <SelectItem key={interval} value={interval}>
                      {t(`labels.${interval}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>{t("labels.duration")}</Label>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isSaving}
              placeholder={t("labels.durationPlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? <Spinner size={5} /> : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
