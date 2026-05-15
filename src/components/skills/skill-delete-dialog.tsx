import { useTranslation } from "react-i18next";
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

interface SkillDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  hasError: boolean;
}

export function SkillDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  hasError,
}: SkillDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("alerts.deleteSkill")}</AlertDialogTitle>
          <AlertDialogDescription>
            {hasError
              ? t("errors.deleteSkillFailed")
              : t("alerts.confirmDeleteSkill")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={isDeleting}>
            {t("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
