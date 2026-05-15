import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X, Reply } from "lucide-react";
import type { WhatsAppMessage } from "./types";

interface WhatsAppReplyPreviewProps {
  message: WhatsAppMessage;
  onCancel: () => void;
}

export function WhatsAppReplyPreview({ message, onCancel }: WhatsAppReplyPreviewProps) {
  const { t } = useTranslation();
  const isOutbound = message.direction === "outbound";

  return (
    <div className="flex items-center gap-2 px-4 pt-3">
      <Reply className="size-4.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2 py-1">
        <p className="text-xs font-medium text-primary">
          {isOutbound ? t("labels.you") : t("labels.customer")}
        </p>
        <p className="text-xs text-muted-foreground truncate">{message.body}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onCancel} className="size-6 shrink-0">
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
