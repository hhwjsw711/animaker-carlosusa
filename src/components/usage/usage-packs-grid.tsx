import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction } from "convex/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/custom/spinner";
import { api } from "../../../convex/_generated/api";
import { formatNumber } from "./usage-helpers";

type PackId = "small" | "medium" | "large";

// IMPORTANT: keep these prices in sync with:
//   - convex/billing/packs.ts (CREDIT_PACKS — credit amounts must match exactly)
//   - Stripe Dashboard one-time prices (priced in cents)
// The Stripe Price IDs themselves live in env vars (STRIPE_PRICE_PACK_*).
const PACKS: ReadonlyArray<{
  id: PackId;
  credits: number;
  priceUsd: number;
  priceBrl: number;
}> = [
  { id: "small", credits: 1_000, priceUsd: 4, priceBrl: 20 },
  { id: "medium", credits: 5_000, priceUsd: 18, priceBrl: 90 },
  { id: "large", credits: 15_000, priceUsd: 50, priceBrl: 250 },
];

interface PacksGridProps {
  currency: "usd" | "brl";
}

export function UsagePacksGrid({ currency }: PacksGridProps) {
  const { t, i18n } = useTranslation();
  const createPackCheckout = useAction(
    api.billing.stripe.createPackCheckout,
  );
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);

  const locale = i18n.language.startsWith("pt") ? "pt-BR" : "en-US";
  const currencyCode = currency === "brl" ? "BRL" : "USD";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });

  const handleBuy = async (packId: PackId) => {
    setLoadingPack(packId);
    try {
      const { url } = await createPackCheckout({ packId, currency });
      if (url) {
        window.location.href = url;
        return;
      }
      toast.error(t("errors.generationFailed"));
    } catch {
      toast.error(t("errors.generationFailed"));
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">
          {t("billing.packs.sectionTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("billing.packs.sectionDescription")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map((pack) => {
          const price = currency === "brl" ? pack.priceBrl : pack.priceUsd;
          return (
            <Card key={pack.id}>
              <CardHeader>
                <CardTitle>{t(`billing.packs.${pack.id}.name`)}</CardTitle>
                <CardDescription>
                  {t(`billing.packs.${pack.id}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {formatter.format(price)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {formatNumber(pack.credits)} {t("labels.credits")}
                </div>
                <Button
                  variant="default"
                  disabled={loadingPack !== null}
                  onClick={() => handleBuy(pack.id)}
                >
                  {loadingPack === pack.id ? (
                    <Spinner />
                  ) : (
                    t("billing.packs.buyNow")
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
