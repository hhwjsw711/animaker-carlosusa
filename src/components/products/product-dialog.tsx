import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useMutation, useQuery } from "convex/react";
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
import { ProductPhotoManager, ProductPhotoStaging, uploadStagedPhotos } from "./product-photo-manager";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProduct?: {
    _id: Id<"products">;
    name: string;
    description?: string;
    categoryId?: Id<"productCategories">;
    sku?: string;
    price: number;
    currency: string;
    status: "active" | "inactive";
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

export function ProductDialog({
  open,
  onOpenChange,
  editProduct,
}: ProductDialogProps) {
  const { t, i18n } = useTranslation();
  const createProduct = useMutation(api.products.mutations.createProduct);
  const updateProduct = useMutation(api.products.mutations.updateProduct);
  const uploadProductPhoto = useAction(
    api.products.mutations.uploadProductPhoto,
  );
  const addPhoto = useMutation(api.products.mutations.addProductPhoto);
  const categories = useQuery(api.productCategories.queries.listCategories);

  const productDetail = useQuery(
    api.products.queries.getProduct,
    editProduct ? { productId: editProduct._id } : "skip",
  );

  const defaultCurrency = CURRENCY_BY_LOCALE[i18n.language] ?? "USD";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editProduct;

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

  useEffect(() => {
    if (open && editProduct) {
      setName(editProduct.name);
      setDescription(editProduct.description ?? "");
      setCategoryId(editProduct.categoryId ?? "");
      setSku(editProduct.sku ?? "");
      setPrice(editProduct.price > 0 ? formatPriceDisplay(editProduct.price, editProduct.currency) : "");
      setCurrency(editProduct.currency);
      setStagedPhotos([]);
      setError(false);
    } else if (open) {
      setName("");
      setDescription("");
      setCategoryId("");
      setSku("");
      setPrice("");
      setCurrency(defaultCurrency);
      setStagedPhotos([]);
      setError(false);
    }
  }, [open, editProduct, defaultCurrency]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const priceInCents = priceDisplayToCents(price);
    if (!trimmedName) return;

    setError(false);
    setIsSaving(true);
    try {
      if (isEdit && editProduct) {
        await updateProduct({
          productId: editProduct._id,
          name: trimmedName,
          description: description.trim() || undefined,
          ...(categoryId
            ? { categoryId: categoryId as Id<"productCategories"> }
            : { removeCategoryId: true }),
          sku: sku.trim() || undefined,
          price: priceInCents,
          currency,
        });
      } else {
        const newId = await createProduct({
          name: trimmedName,
          description: description.trim() || undefined,
          categoryId: (categoryId || undefined) as Id<"productCategories"> | undefined,
          sku: sku.trim() || undefined,
          price: priceInCents,
          currency,
        });

        if (stagedPhotos.length > 0) {
          await uploadStagedPhotos(stagedPhotos, newId, uploadProductPhoto, addPhoto);
        }
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
    sku,
    price,
    currency,
    stagedPhotos,
    isEdit,
    editProduct,
    createProduct,
    updateProduct,
    uploadProductPhoto,
    addPhoto,
    onOpenChange,
  ]);

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
              ? t(isEdit ? "errors.updateProductFailed" : "errors.createProductFailed")
              : isEdit
                ? t("actions.edit")
                : t("actions.newProduct")}
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

          {/* SKU */}
          <div className="space-y-1.5">
            <Label>
              {t("labels.sku")}{" "}
              <span className="text-muted-foreground">({t("labels.optional")})</span>
            </Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={isSaving}
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

          {/* Photos — staging for create, live for edit */}
          {isEdit && editProduct && productDetail ? (
            <ProductPhotoManager
              productId={editProduct._id}
              photoBunnyPaths={productDetail.photoBunnyPaths ?? []}
              legacyPhotos={productDetail.photos ?? []}
              photoUrls={productDetail.photoUrls ?? []}
              disabled={isSaving}
            />
          ) : !isEdit ? (
            <ProductPhotoStaging
              files={stagedPhotos}
              onFilesChange={setStagedPhotos}
              disabled={isSaving}
            />
          ) : null}
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
