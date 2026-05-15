import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface WhatsAppScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function WhatsAppScrollToBottom({ visible, onClick }: WhatsAppScrollToBottomProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <div className="flex justify-end px-4 pb-2">
      <Button
        variant="secondary"
        size="icon"
        onClick={onClick}
        className="rounded-full shadow-lg size-9"
        aria-label={t("labels.scrollToBottom")}
      >
        <ChevronDown className="size-4.5" />
      </Button>
    </div>
  );
}
