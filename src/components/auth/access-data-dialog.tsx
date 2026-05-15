import { useState } from "react";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/custom/spinner";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import {
  changePasswordSchema,
  changeEmailSchema,
} from "@/lib/validations/auth";

interface AccessDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccessDataDialog({
  open,
  onOpenChange,
}: AccessDataDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("auth.accessData")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("auth.accessData")}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="password">
          <TabsList className="w-full">
            <TabsTrigger value="password" className="flex-1">
              {t("auth.changePassword")}
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1">
              {t("auth.changeEmail")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="password">
            <ChangePasswordTab
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
          <TabsContent value="email">
            <ChangeEmailTab
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface TabProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function ChangePasswordTab({ onSuccess, onCancel }: TabProps) {
  const { t } = useTranslation();
  const changePassword = useAction(api.users.mutations.changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const firstError = result.error.issues[0];
      if (firstError?.path[0] === "confirmPassword") {
        setError(t("errors.passwordsDoNotMatch"));
      } else if (firstError?.path[0] === "newPassword") {
        setError(t("errors.passwordTooShort"));
      } else {
        setError(t("errors.passwordChangeFailed"));
      }
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success(t("auth.passwordChanged"));
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "";
      if (message.includes("incorrect")) {
        setError(t("errors.currentPasswordIncorrect"));
      } else {
        setError(t("errors.passwordChangeFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="cp-current">{t("labels.currentPassword")}</Label>
        <PasswordInput
          id="cp-current"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-new">{t("labels.newPassword")}</Label>
        <PasswordInput
          id="cp-new"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <PasswordStrength password={newPassword} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-confirm">{t("labels.confirmPassword")}</Label>
        <PasswordInput
          id="cp-confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={onCancel}
        >
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Spinner size={5} /> : t("actions.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ChangeEmailTab({ onSuccess, onCancel }: TabProps) {
  const { t } = useTranslation();
  const changeEmail = useAction(api.users.mutations.changeEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = changeEmailSchema.safeParse({
      currentPassword,
      newEmail,
    });

    if (!result.success) {
      setError(t("errors.emailChangeFailed"));
      return;
    }

    setLoading(true);
    try {
      await changeEmail({ currentPassword, newEmail: newEmail.trim() });
      toast.success(t("auth.emailChanged"));
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("incorrect")) {
        setError(t("errors.currentPasswordIncorrect"));
      } else {
        setError(t("errors.emailChangeFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="ce-password">{t("labels.currentPassword")}</Label>
        <PasswordInput
          id="ce-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ce-email">{t("labels.newEmail")}</Label>
        <Input
          id="ce-email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={onCancel}
        >
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Spinner size={5} /> : t("actions.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
