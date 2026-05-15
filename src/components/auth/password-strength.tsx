import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PASSWORD_MIN_LENGTH } from "@/lib/validations/auth";

type Strength = "none" | "weak" | "medium" | "strong";

function getStrength(password: string): Strength {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return "none";

  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const strengthColors: Record<Strength, string> = {
  none: "bg-muted",
  weak: "bg-destructive",
  medium: "bg-amber-500",
  strong: "bg-emerald-500",
};

const strengthWidths: Record<Strength, string> = {
  none: "w-0",
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation();
  const strength = getStrength(password);

  if (!password) return null;

  const labelKey =
    strength === "none"
      ? "errors.passwordTooShort"
      : `auth.passwordStrength.${strength}`;

  return (
    <div className="space-y-1.5">
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            strengthColors[strength],
            strengthWidths[strength],
          )}
        />
      </div>
      <p
        className={cn(
          "text-xs",
          strength === "none" || strength === "weak"
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {t(labelKey)}
      </p>
    </div>
  );
}
