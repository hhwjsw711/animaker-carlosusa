import { useTranslation } from "react-i18next";
import type { WhatsAppMessage } from "./types";

interface WhatsAppQuotedMessageProps {
  message: WhatsAppMessage;
  onClick?: () => void;
}

export function WhatsAppQuotedMessage({ message, onClick }: WhatsAppQuotedMessageProps) {
  const { t } = useTranslation();
  const isOutbound = message.direction === "outbound";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left border-l border-primary bg-accent/20 p-2 mb-2 px-3 cursor-pointer"
    >
      <p className="font-medium text-primary">
        {isOutbound ? t("labels.you") : t("labels.customer")}
      </p>
      <p className="text-muted-foreground truncate">{message.body}</p>
    </button>
  );
}
