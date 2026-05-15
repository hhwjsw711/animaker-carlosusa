import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Spinner from "@/components/ui/custom/spinner";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthLayout } from "@/components/auth/auth-layout";
import { signInSchema } from "@/lib/validations/auth";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setError(t("errors.invalidCredentials"));
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: "signIn",
      });
    } catch {
      setError(t("errors.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-7">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("auth.signInTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.signInDescription")}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="signin-email">{t("labels.email")}</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="signin-password">{t("labels.password")}</Label>
              <button
                type="button"
                className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => navigate({ to: "/recover" })}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
            <PasswordInput
              id="signin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : t("actions.signIn")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => navigate({ to: "/signup" })}
            >
              {t("auth.noAccountYet")}
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
