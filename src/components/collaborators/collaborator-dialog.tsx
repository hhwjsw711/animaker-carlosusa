import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { useAction, useMutation } from "convex/react";
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
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/custom/spinner";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { PASSWORD_MIN_LENGTH } from "@/lib/validations/auth";
import { ROLE_COLORS } from "@/lib/collaborator-roles";
import { applyMask } from "@/lib/date-mask";
import { handleConvexError } from "@/lib/convex-error-handler";
import { toast } from "sonner";
import { Check } from "lucide-react";

const ROLE_PERMISSIONS: Record<"admin" | "staff", string[]> = {
  admin: [
    "labels.permAdminCustomers",
    "labels.permAdminServices",
    "labels.permAdminProducts",
    "labels.permAdminCalendar",
    "labels.permAdminFinance",
    "labels.permAdminChat",
    "labels.permAdminTeam",
    "labels.permAdminSettings",
  ],
  staff: [
    "labels.permStaffCalendar",
    "labels.permStaffCustomers",
    "labels.permStaffServices",
    "labels.permStaffChat",
  ],
};

const PHONE_MASKS: Record<string, { mask: string; placeholder: string }> = {
  "pt-BR": { mask: "(##) #####-####", placeholder: "(00) 00000-0000" },
  "en-US": { mask: "(###) ###-####", placeholder: "(000) 000-0000" },
};

interface CollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCollaborator?: {
    _id: Id<"collaborators">;
    name: string;
    email: string;
    phone?: string;
    role: "admin" | "staff";
    status: "active" | "inactive";
  } | null;
}

export function CollaboratorDialog({
  open,
  onOpenChange,
  editCollaborator,
}: CollaboratorDialogProps) {
  const { t } = useTranslation();
  const createCollaborator = useAction(api.collaborators.actions.createCollaborator);
  const updateCollaborator = useMutation(api.collaborators.mutations.updateCollaborator);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editCollaborator;
  const phoneMask = PHONE_MASKS[i18n.language] ?? PHONE_MASKS["en-US"];

  const roleItems = useMemo(() => ({
    admin: t("labels.roleAdmin"),
    staff: t("labels.roleStaff"),
  }), [t]);

  useEffect(() => {
    if (open && editCollaborator) {
      setName(editCollaborator.name);
      setEmail(editCollaborator.email);
      setPhone(editCollaborator.phone ? applyMask(editCollaborator.phone, phoneMask.mask) : "");
      setRole(editCollaborator.role);
      setPassword("");
    } else if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setRole("staff");
      setPassword("");
    }
    setError(false);
  }, [open, editCollaborator, phoneMask.mask]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhone(applyMask(e.target.value, phoneMask.mask));
    },
    [phoneMask.mask],
  );

  const canSave = name.trim().length > 0 && (isEdit || (email.trim().length > 0 && password.length >= PASSWORD_MIN_LENGTH));

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setError(false);
    setIsSaving(true);
    try {
      const phoneDigits = phone.replace(/\D/g, "") || undefined;

      const roleColor = ROLE_COLORS[role];

      if (isEdit && editCollaborator) {
        await updateCollaborator({
          collaboratorId: editCollaborator._id,
          name: name.trim(),
          phone: phoneDigits,
          role,
          color: roleColor,
        });
      } else {
        await createCollaborator({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phoneDigits,
          role,
          color: roleColor,
        });
      }
      onOpenChange(false);
    } catch (err) {
      // PLAN_LIMIT_EXCEEDED → handled centrally via toast with upgrade CTA
      if (handleConvexError(err)) {
        onOpenChange(false);
        return;
      }
      const message = err instanceof Error ? err.message : "";
      if (message.includes("Email already in use") || message.includes("already exists")) {
        toast.error(t("errors.collaboratorEmailInUse"));
      } else {
        setError(true);
      }
    } finally {
      setIsSaving(false);
    }
  }, [canSave, isEdit, editCollaborator, name, email, phone, role, createCollaborator, updateCollaborator, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("actions.edit") : t("actions.newCollaborator")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t("labels.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("labels.name")}
              disabled={isSaving}
            />
          </div>

          {/* Email (only on create) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t("labels.email")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("labels.email")}
                disabled={isSaving}
              />
            </div>
          )}

          {/* Password (only on create) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>{t("labels.password")}</Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSaving}
                minLength={PASSWORD_MIN_LENGTH}
              />
              <PasswordStrength password={password} />
            </div>
          )}

          {/* Phone */}
          <div className="space-y-1.5">
            <Label>{t("labels.phone")}</Label>
            <Input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder={phoneMask.placeholder}
              disabled={isSaving}
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>{t("labels.role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "staff")} items={roleItems}>
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("labels.roleAdmin")}</SelectItem>
                <SelectItem value="staff">{t("labels.roleStaff")}</SelectItem>
              </SelectContent>
            </Select>
            <ul className="space-y-1 pt-1">
              {ROLE_PERMISSIONS[role].map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-3.5 shrink-0 text-foreground" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {t(isEdit ? "errors.updateCollaboratorFailed" : "errors.createCollaboratorFailed")}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
