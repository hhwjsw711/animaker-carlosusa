import { ConvexError } from "convex/values";
import { toast } from "sonner";
import i18n from "@/i18n/config";
import { getActiveRouter } from "@/router";
import useBillingDialogStore from "@/stores/billing-dialog";

type LimitResource =
  | "customers"
  | "services"
  | "products"
  | "collaborators"
  | "agents";

type ErrorData =
  | {
      code?: string;
      required?: number;
      available?: number;
      resource?: LimitResource;
      limit?: number;
    }
  | string
  | undefined;

function showLimitExceededToast(
  resource: LimitResource | undefined,
  limit: number | undefined,
) {
  const t = i18n.t as (key: string, options?: Record<string, unknown>) => string;
  const key = resource
    ? `billing.limitExceeded.${resource}`
    : "billing.limitExceeded.title";
  toast.error(t("billing.limitExceeded.title"), {
    description: t(key, { limit: limit ?? "?" }),
    action: {
      label: t("billing.upgrade"),
      onClick: () => {
        const router = getActiveRouter();
        if (router) {
          void router.navigate({ to: "/usage" });
        } else {
          window.location.assign("/usage");
        }
      },
    },
  });
}

/**
 * Inspects a caught Convex error and, if it's a known billing-related error,
 * opens the appropriate dialog or shows a toast. Returns true if handled,
 * false otherwise.
 */
export function handleConvexError(error: unknown): boolean {
  if (error instanceof ConvexError) {
    const data = error.data as ErrorData;

    if (typeof data === "object" && data) {
      if (data.code === "INSUFFICIENT_CREDITS") {
        useBillingDialogStore.getState().openInsufficientCredits({
          required: data.required,
          available: data.available,
        });
        return true;
      }
      if (data.code === "PLAN_LIMIT_EXCEEDED") {
        showLimitExceededToast(data.resource, data.limit);
        return true;
      }
    }
  }

  if (error instanceof Error && error.message.includes("INSUFFICIENT_CREDITS")) {
    useBillingDialogStore.getState().openInsufficientCredits();
    return true;
  }

  return false;
}
