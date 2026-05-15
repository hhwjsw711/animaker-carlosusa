import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate, useSearch } from "@tanstack/react-router";

interface BillingSearch {
  checkout?: "success" | "canceled";
  pack?: string;
}

/**
 * Reads `?checkout=success|canceled` and `?pack=<id>` from the current route's
 * search params (set by Stripe redirects), fires a toast, then clears the params.
 */
export function useBillingRedirect() {
  const { t } = useTranslation();
  const search = useSearch({ strict: false }) as BillingSearch;
  const navigate = useNavigate();

  useEffect(() => {
    const { checkout, pack } = search;
    if (!checkout) return;

    if (checkout === "success") {
      toast.success(t("billing.successTitle"), {
        description: pack
          ? t("billing.packSuccessMessage")
          : t("billing.successMessage"),
      });
    } else if (checkout === "canceled") {
      toast.info(t("billing.canceledTitle"), {
        description: t("billing.canceledMessage"),
      });
    }

    void navigate({
      to: ".",
      search: { checkout: undefined, pack: undefined },
      replace: true,
    });
  }, [search, t, navigate]);
}
