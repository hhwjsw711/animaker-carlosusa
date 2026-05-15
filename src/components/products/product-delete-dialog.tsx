import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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

interface ProductDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: Id<"products"> | null;
  categoryId?: Id<"productCategories"> | null;
}

export function ProductDeleteDialog({
  open,
  onOpenChange,
  productId,
  categoryId,
}: ProductDeleteDialogProps) {
  const { t } = useTranslation();
  const deleteProduct = useMutation(api.products.mutations.deleteProduct);
  const deleteCategory = useMutation(api.productCategories.mutations.deleteCategory);

  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isCategory = !!categoryId;

  const handleConfirm = useCallback(async () => {
    setHasError(false);
    setIsDeleting(true);
    try {
      if (isCategory && categoryId) {
        await deleteCategory({ categoryId });
      } else if (productId) {
        await deleteProduct({ productId });
      }
      onOpenChange(false);
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [isCategory, categoryId, productId, deleteCategory, deleteProduct, onOpenChange]);

  const title = isCategory
    ? t("alerts.deleteCategory")
    : t("alerts.deleteProduct");

  const description = hasError
    ? t(isCategory ? "errors.deleteCategoryFailed" : "errors.deleteProductFailed")
    : t(isCategory ? "alerts.confirmDeleteCategory" : "alerts.confirmDeleteProduct");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={isDeleting}>
            {t("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
