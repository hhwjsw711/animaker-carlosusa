import { useState, useCallback, useEffect, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import Spinner from "@/components/ui/custom/spinner";
import { SKILL_CATEGORY_KEYS, type SkillCategory } from "@/lib/skill-colors";

// Keep in sync with convex/skills/mutations.ts
const INSTRUCTIONS_MAX_LENGTH = 5000;

const DEFAULT_SKILL_ICON_NAME = "Sparkles";
const DEFAULT_SKILL_CATEGORY: SkillCategory = "productivity";

export interface SkillData {
  _id: Id<"skills">;
  name: string;
  description: string;
  instructions: string;
  icon: string;
  category: string;
}

interface SkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSkill?: SkillData | null;
}

export function SkillDialog({ open, onOpenChange, editSkill }: SkillDialogProps) {
  const { t } = useTranslation();
  const createSkill = useMutation(api.skills.mutations.createSkill);
  const updateSkill = useMutation(api.skills.mutations.updateSkill);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_SKILL_CATEGORY);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editSkill;

  const categoryItems = useMemo(() => {
    const map: Record<string, string> = {};
    SKILL_CATEGORY_KEYS.forEach((cat) => { map[cat] = t(`labels.${cat}` as never); });
    return map;
  }, [t]);

  useEffect(() => {
    if (open && editSkill) {
      setName(editSkill.name);
      setDescription(editSkill.description);
      setInstructions(editSkill.instructions);
      setCategory(editSkill.category);
      setError(false);
    } else if (open) {
      setName("");
      setDescription("");
      setInstructions("");
      setCategory(DEFAULT_SKILL_CATEGORY);
      setError(false);
    }
  }, [open, editSkill]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !description.trim() || !instructions.trim() || instructions.length > INSTRUCTIONS_MAX_LENGTH) return;
    setError(false);
    setIsSaving(true);
    try {
      if (isEdit && editSkill) {
        await updateSkill({
          skillId: editSkill._id,
          name,
          description,
          instructions,
          category,
        });
      } else {
        await createSkill({
          name,
          description,
          instructions,
          icon: DEFAULT_SKILL_ICON_NAME,
          category,
        });
      }
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }, [name, description, instructions, category, isEdit, editSkill, createSkill, updateSkill, onOpenChange]);

  const instructionsLength = instructions.length;
  const instructionsPercent = Math.min((instructionsLength / INSTRUCTIONS_MAX_LENGTH) * 100, 100);
  const isOverLimit = instructionsLength > INSTRUCTIONS_MAX_LENGTH;

  const canSave = name.trim() && description.trim() && instructions.trim() && !isOverLimit;

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
              ? t(isEdit ? "errors.updateSkillFailed" : "errors.createSkillFailed")
              : isEdit
                ? t("actions.edit")
                : t("actions.newSkill")}
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
            <Label>{t("labels.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.category")}</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              items={categoryItems}
            >
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKILL_CATEGORY_KEYS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`labels.${cat}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.instructions")}</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSaving}
              className="min-h-40 max-h-64 resize-none"
            />
            <div className="flex items-center gap-3">
              <Progress
                value={instructionsPercent}
                className="flex-1"
                data-over-limit={isOverLimit || undefined}
              />
              <span className={`text-xs tabular-nums ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {instructionsLength}/{INSTRUCTIONS_MAX_LENGTH}
              </span>
            </div>
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
