import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/auth-layout";

export function AuthWelcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("auth.landing.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.landing.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => navigate({ to: "/signin" })}>
            {t("actions.signIn")}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate({ to: "/signup" })}
          >
            {t("actions.signUp")}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
