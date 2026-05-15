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

interface ServiceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId?: Id<"services"> | null;
  categoryId?: Id<"serviceCategories"> | null;
}

export function ServiceDeleteDialog({
  open,
  onOpenChange,
  serviceId,
  categoryId,
}: ServiceDeleteDialogProps) {
  const { t } = useTranslation();
  const deleteService = useMutation(api.services.mutations.deleteService);
  const deleteCategory = useMutation(api.serviceCategories.mutations.deleteCategory);

  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isCategory = !!categoryId;

  const handleConfirm = useCallback(async () => {
    setHasError(false);
    setIsDeleting(true);
    try {
      if (isCategory && categoryId) {
        await deleteCategory({ categoryId });
      } else if (serviceId) {
        await deleteService({ serviceId });
      }
      onOpenChange(false);
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [isCategory, categoryId, serviceId, deleteCategory, deleteService, onOpenChange]);

  const title = isCategory
    ? t("alerts.deleteCategory")
    : t("alerts.deleteService");

  const description = hasError
    ? t(isCategory ? "errors.deleteCategoryFailed" : "errors.deleteServiceFailed")
    : t(isCategory ? "alerts.confirmDeleteCategory" : "alerts.confirmDeleteService");

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
