import { useState, useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
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
import Spinner from "@/components/ui/custom/spinner";
import { DATE_MASKS, applyMask, isoToDisplay } from "@/lib/date-mask";
import {
  type PaymentMethod,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  todayIso,
  displayToIsoAllowFuture,
} from "@/lib/billing-utils";

type TransactionType = "service" | "product";

interface EditData {
  transactionId: Id<"serviceTransactions">;
  customerServiceId: Id<"customerServices">;
  amount: number;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
}

interface CustomerBillingDialogProps {
  customerId: Id<"customers">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: EditData | null;
}

export function CustomerBillingDialog({
  customerId,
  open,
  onOpenChange,
  editData,
}: CustomerBillingDialogProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const dateMask = DATE_MASKS[language] ?? DATE_MASKS["en-US"];

  const serviceAssignments = useQuery(
    api.customerServices.queries.listByCustomer,
    { customerId },
  );
  const productAssignments = useQuery(
    api.customerProducts.queries.listByCustomer,
    { customerId },
  );

  const createServiceTransaction = useMutation(api.serviceTransactions.mutations.createTransaction);
  const updateServiceTransaction = useMutation(api.serviceTransactions.mutations.updateTransaction);
  const createProductTransaction = useMutation(api.productTransactions.mutations.createTransaction);

  const isEdit = !!editData;

  const [transactionType, setTransactionType] = useState<TransactionType>("service");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [dueDateDisplay, setDueDateDisplay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState(false);

  useEffect(() => {
    if (open) {
      if (editData) {
        setTransactionType("service");
        setSelectedAssignmentId(editData.customerServiceId);
        setAmount(String(editData.amount / 100));
        setDueDateDisplay(isoToDisplay(editData.dueDate, language));
        setPaymentMethod(editData.paymentMethod ?? "");
        setReference(editData.reference ?? "");
        setNotes(editData.notes ?? "");
      } else {
        setTransactionType("service");
        setSelectedAssignmentId("");
        setAmount("");
        setQuantity("1");
        setUnitPrice("");
        setDueDateDisplay(isoToDisplay(todayIso(), language));
        setPaymentMethod("");
        setReference("");
        setNotes("");
      }
      setDialogError(false);
    }
  }, [open, editData, language]);

  // Reset assignment selection when type changes
  useEffect(() => {
    if (!isEdit) {
      setSelectedAssignmentId("");
    }
  }, [transactionType, isEdit]);

  // Auto-fill unit price when product assignment is selected
  useEffect(() => {
    if (transactionType === "product" && selectedAssignmentId && productAssignments) {
      const assignment = productAssignments.find((a) => a._id === selectedAssignmentId);
      if (assignment) {
        const price = assignment.customPrice ?? assignment.productPrice;
        if (price > 0) {
          setUnitPrice(String(price / 100));
        }
      }
    }
  }, [selectedAssignmentId, transactionType, productAssignments]);

  const canSaveService =
    (isEdit || selectedAssignmentId !== "") &&
    amount.trim() !== "" &&
    parseFloat(amount) >= 0 &&
    displayToIsoAllowFuture(dueDateDisplay, language) !== null;

  const canSaveProduct =
    selectedAssignmentId !== "" &&
    quantity.trim() !== "" &&
    parseInt(quantity, 10) >= 1 &&
    unitPrice.trim() !== "" &&
    parseFloat(unitPrice) >= 0 &&
    displayToIsoAllowFuture(dueDateDisplay, language) !== null;

  const canSave = transactionType === "service" ? canSaveService : canSaveProduct;

  const handleSave = useCallback(async () => {
    const dateValue = displayToIsoAllowFuture(dueDateDisplay, language);
    if (!dateValue) return;

    setDialogError(false);
    setIsSaving(true);

    try {
      if (transactionType === "service") {
        const amountCents = Math.round(parseFloat(amount) * 100);

        if (isEdit && editData) {
          await updateServiceTransaction({
            transactionId: editData.transactionId,
            amount: amountCents,
            dueDate: dateValue,
            paymentMethod: (paymentMethod as PaymentMethod) || undefined,
            reference: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          });
        } else {
          await createServiceTransaction({
            customerServiceId: selectedAssignmentId as Id<"customerServices">,
            amount: amountCents,
            dueDate: dateValue,
            paymentMethod: (paymentMethod as PaymentMethod) || undefined,
            reference: reference.trim() || undefined,
            notes: notes.trim() || undefined,
          });
        }
      } else {
        const qty = parseInt(quantity, 10);
        const unitPriceCents = Math.round(parseFloat(unitPrice) * 100);

        await createProductTransaction({
          customerProductId: selectedAssignmentId as Id<"customerProducts">,
          quantity: qty,
          unitPrice: unitPriceCents,
          purchaseDate: dateValue,
          paymentMethod: (paymentMethod as PaymentMethod) || undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch {
      setDialogError(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    transactionType,
    selectedAssignmentId,
    amount,
    quantity,
    unitPrice,
    dueDateDisplay,
    paymentMethod,
    reference,
    notes,
    language,
    isEdit,
    editData,
    createServiceTransaction,
    updateServiceTransaction,
    createProductTransaction,
    onOpenChange,
  ]);

  const serviceAssignmentItems = useMemo(() => {
    const map: Record<string, string> = {};
    if (serviceAssignments) {
      for (const a of serviceAssignments) {
        if (a.status === "active" || a.status === "paused") {
          map[a._id] = a.serviceName ?? t("status.untitled");
        }
      }
    }
    return map;
  }, [serviceAssignments, t]);

  const productAssignmentItems = useMemo(() => {
    const map: Record<string, string> = {};
    if (productAssignments) {
      for (const a of productAssignments) {
        if (a.status === "active") {
          map[a._id] = a.productName ?? t("status.untitled");
        }
      }
    }
    return map;
  }, [productAssignments, t]);

  const typeItems = useMemo(() => ({
    service: t("labels.service"),
    product: t("labels.product"),
  }), [t]);

  const paymentMethodItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of PAYMENT_METHODS) {
      map[m] = t(PAYMENT_METHOD_LABELS[m]);
    }
    return map;
  }, [t]);

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
            {dialogError
              ? t(isEdit ? "errors.updateTransactionFailed" : "errors.createTransactionFailed")
              : isEdit
                ? t("actions.editTransaction")
                : t("actions.newTransaction")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Transaction type selector — only when creating */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t("labels.type")}</Label>
              <Select
                value={transactionType}
                onValueChange={(v) => setTransactionType((v ?? "service") as TransactionType)}
                items={typeItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">{t("labels.service")}</SelectItem>
                  <SelectItem value="product">{t("labels.product")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignment select */}
          {!isEdit && transactionType === "service" && (
            <div className="space-y-1.5">
              <Label>{t("labels.service")}</Label>
              <Select
                value={selectedAssignmentId}
                onValueChange={setSelectedAssignmentId}
                items={serviceAssignmentItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue placeholder={t("labels.selectAssignment")} />
                </SelectTrigger>
                <SelectContent>
                  {serviceAssignments
                    ?.filter((a) => a.status === "active" || a.status === "paused")
                    .map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.serviceName ?? t("status.untitled")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isEdit && transactionType === "product" && (
            <div className="space-y-1.5">
              <Label>{t("labels.product")}</Label>
              <Select
                value={selectedAssignmentId}
                onValueChange={setSelectedAssignmentId}
                items={productAssignmentItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue placeholder={t("labels.selectProduct")} />
                </SelectTrigger>
                <SelectContent>
                  {productAssignments
                    ?.filter((a) => a.status === "active")
                    .map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.productName ?? t("status.untitled")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service fields: Amount */}
          {transactionType === "service" && (
            <div className="space-y-1.5">
              <Label>{t("labels.amount")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSaving}
              />
            </div>
          )}

          {/* Product fields: Quantity + Unit price */}
          {transactionType === "product" && (
            <>
              <div className="space-y-1.5">
                <Label>{t("labels.quantity")}</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("labels.unitPrice")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label>
              {transactionType === "service" ? t("labels.dueDate") : t("labels.purchaseDate")}
            </Label>
            <Input
              value={dueDateDisplay}
              onChange={(e) =>
                setDueDateDisplay(applyMask(e.target.value, dateMask.mask))
              }
              placeholder={dateMask.placeholder}
              disabled={isSaving}
            />
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>
              {t("labels.paymentMethod")}{" "}
              <span className="text-muted-foreground">({t("labels.optional")})</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              items={paymentMethodItems}
            >
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue placeholder={t("labels.paymentMethod")} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(PAYMENT_METHOD_LABELS[m])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label>
              {t("labels.reference")}{" "}
              <span className="text-muted-foreground">({t("labels.optional")})</span>
            </Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>
              {t("labels.notes")}{" "}
              <span className="text-muted-foreground">({t("labels.optional")})</span>
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
