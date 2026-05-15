import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/custom/spinner";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { AuthLayout } from "@/components/auth/auth-layout";
import {
  resetRequestSchema,
  resetVerificationSchema,
} from "@/lib/validations/auth";

type Step = "request" | "verification" | "success";

export function RecoverPasswordForm() {
  const { signIn } = useAuthActions();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = resetRequestSchema.safeParse({ email });
    if (!result.success) {
      setError(t("errors.resetRequestFailed"));
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        flow: "reset",
      });
      setStep("verification");
    } catch {
      // Always show verification step to prevent email enumeration
      setStep("verification");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = resetVerificationSchema.safeParse({ code, newPassword });
    if (!result.success) {
      const firstError = result.error.issues[0];
      if (firstError?.path[0] === "newPassword") {
        setError(t("errors.passwordTooShort"));
      } else {
        setError(t("errors.resetVerificationFailed"));
      }
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        code,
        newPassword,
        flow: "reset-verification",
      });
      setStep("success");
    } catch {
      setError(t("errors.resetVerificationFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-7">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {step === "success"
              ? t("auth.resetPassword")
              : step === "verification"
                ? t("auth.resetPassword")
                : t("auth.recoverTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "success"
              ? t("auth.passwordChanged")
              : step === "verification"
                ? t("auth.enterOtp")
                : t("auth.recoverDescription")}
          </p>
        </div>

        {step === "success" && (
          <Button
            className="w-full"
            onClick={() => navigate({ to: "/signin" })}
          >
            {t("auth.backToSignIn")}
          </Button>
        )}

        {step === "request" && (
          <form onSubmit={handleRequestReset} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="recover-email">{t("labels.email")}</Label>
              <Input
                id="recover-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : t("actions.sendCode")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => navigate({ to: "/signin" })}
              >
                {t("auth.backToSignIn")}
              </Button>
            </div>
          </form>
        )}

        {step === "verification" && (
          <form onSubmit={handleVerifyReset} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="recover-code">{t("labels.code")}</Label>
              <Input
                id="recover-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recover-password">
                {t("labels.newPassword")}
              </Label>
              <PasswordInput
                id="recover-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
              <PasswordStrength password={newPassword} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner /> : t("actions.verify")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setNewPassword("");
                  setError("");
                }}
              >
                {t("auth.backToSignIn")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
