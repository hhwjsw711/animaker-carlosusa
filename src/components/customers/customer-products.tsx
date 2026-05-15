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
import { Package } from "lucide-react";
import { CustomerProductItem } from "./customer-product-item";
import useNavigationStore from "@/stores/navigation";

interface CustomerProductsProps {
  customerId: Id<"customers">;
}

export function CustomerProducts({ customerId }: CustomerProductsProps) {
  const { t } = useTranslation();
  const isActive = useNavigationStore((s) => s.activePage === "customers");

  const assignments = useQuery(
    api.customerProducts.queries.listByCustomer,
    { customerId },
  );

  const allProductsRaw = useQuery(api.products.queries.listActiveProductsLight);
  const allProducts = useMemo(() => allProductsRaw ?? [], [allProductsRaw]);

  const assignProduct = useMutation(api.customerProducts.mutations.assignProduct);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState(false);

  const productItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allProducts) {
      map[p._id] = p.name;
    }
    return map;
  }, [allProducts]);

  // Reset dialog state when opened
  useEffect(() => {
    if (dialogOpen) {
      setSelectedProductId("");
      setCustomPrice("");
      setNotes("");
      setDialogError(false);
    }
  }, [dialogOpen]);

  const canSave = selectedProductId !== "";

  const handleAssign = useCallback(async () => {
    if (!selectedProductId) return;

    setDialogError(false);
    setIsSaving(true);

    try {
      const priceValue = customPrice.trim()
        ? Math.round(parseFloat(customPrice) * 100)
        : undefined;

      await assignProduct({
        customerId,
        productId: selectedProductId as Id<"products">,
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
    selectedProductId,
    customPrice,
    notes,
    customerId,
    assignProduct,
  ]);

  if (assignments === undefined) {
    return null;
  }

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-12 z-9 bg-background border-b p-4 flex items-center justify-start">
        <Button onClick={() => setDialogOpen(true)}>
          {t("actions.assignProduct")}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {assignments.length === 0 ? (
          <EmptyState icon={Package} message={t("empty.noCustomerProducts")} />
        ) : (
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" itemCount={assignments.length} dataKey={customerId} visible={isActive}>
            {assignments.map((a) => (
              <CustomerProductItem key={a._id} assignment={a} />
            ))}
          </AnimatedList>
        )}
      </div>

      {/* Assign Product Dialog */}
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
                ? t("errors.assignProductFailed")
                : t("actions.assignProduct")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Product select */}
            <div className="space-y-1.5">
              <Label>{t("labels.product")}</Label>
              <Select
                value={selectedProductId}
                onValueChange={(v) => setSelectedProductId(v ?? "")}
                items={productItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue placeholder={t("labels.selectProduct")} />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
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
