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
import { signUpSchema } from "@/lib/validations/auth";

export function SignUpForm() {
  const { signIn } = useAuthActions();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = signUpSchema.safeParse({ name, email, password });
    if (!result.success) {
      const firstError = result.error.issues[0];
      if (firstError?.path[0] === "password") {
        setError(t("errors.passwordTooShort"));
      } else {
        setError(t("errors.signUpFailed"));
      }
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        flow: "signUp",
      });
    } catch {
      setError(t("errors.signUpFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-7">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("auth.signUpTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.signUpDescription")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">{t("labels.fullName")}</Label>
            <Input
              id="signup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-email">{t("labels.email")}</Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-password">{t("labels.password")}</Label>
            <PasswordInput
              id="signup-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <PasswordStrength password={password} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : t("actions.signUp")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate({ to: "/signin" })}
            >
              {t("auth.alreadyHaveAccount")}
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
