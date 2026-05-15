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

interface CollaboratorDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: Id<"collaborators"> | null;
}

export function CollaboratorDeleteDialog({
  open,
  onOpenChange,
  collaboratorId,
}: CollaboratorDeleteDialogProps) {
  const { t } = useTranslation();
  const deleteCollaborator = useMutation(api.collaborators.mutations.deleteCollaborator);

  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!collaboratorId) return;
    setHasError(false);
    setIsDeleting(true);
    try {
      await deleteCollaborator({ collaboratorId });
      onOpenChange(false);
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [collaboratorId, deleteCollaborator, onOpenChange]);

  const description = hasError
    ? t("errors.deleteCollaboratorFailed")
    : t("alerts.confirmDeleteCollaborator");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("alerts.deleteCollaborator")}</AlertDialogTitle>
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
