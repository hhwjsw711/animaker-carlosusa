import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";

interface WhatsAppConnectionBannerProps {
  status: "disconnected" | "connecting" | "connected";
}

export function WhatsAppConnectionBanner({ status }: WhatsAppConnectionBannerProps) {
  if (status === "connected") return null;

  return (
    <div className="sticky top-12 z-10 flex items-center gap-2 bg-destructive/20 backdrop-blur-lg text-destructive text-sm px-4 py-2.5">
      <WifiOff className="size-4.5 shrink-0" />
      <ConnectionMessage status={status} />
    </div>
  );
}

function ConnectionMessage({ status }: { status: "disconnected" | "connecting" }) {
  const { t } = useTranslation();

  if (status === "connecting") {
    return <span className="line-clamp-1">{t("labels.connecting")}...</span>;
  }

  return <span className="line-clamp-1">{t("alerts.whatsappDisconnected")}</span>;
}
