import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/custom/spinner";
import { ColorPicker } from "@/components/ui/custom/color-picker";

interface ServiceCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: { _id: Id<"serviceCategories">; name: string; color: string } | null;
}

export function ServiceCategoryDialog({
  open,
  onOpenChange,
  editCategory,
}: ServiceCategoryDialogProps) {
  const { t } = useTranslation();
  const createCategory = useMutation(api.serviceCategories.mutations.createCategory);
  const updateCategory = useMutation(api.serviceCategories.mutations.updateCategory);

  const [name, setName] = useState("");
  const [color, setColor] = useState("bg-blue-500");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editCategory;

  useEffect(() => {
    if (open && editCategory) {
      setName(editCategory.name);
      setColor(editCategory.color);
      setError(false);
    } else if (open) {
      setName("");
      setColor("bg-blue-500");
      setError(false);
    }
  }, [open, editCategory]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setError(false);
    setIsSaving(true);
    try {
      if (isEdit && editCategory) {
        await updateCategory({
          categoryId: editCategory._id,
          name: name.trim(),
          color,
        });
      } else {
        await createCategory({ name: name.trim(), color });
      }
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }, [name, color, isEdit, editCategory, createCategory, updateCategory, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSaving) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {error
              ? t(isEdit ? "errors.updateCategoryFailed" : "errors.createCategoryFailed")
              : isEdit
                ? t("actions.edit")
                : t("actions.newCategory")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>{t("labels.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("actions.classify")}</Label>
            <ColorPicker value={color} onChange={setColor} disabled={isSaving} />
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
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? <Spinner size={5} /> : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
