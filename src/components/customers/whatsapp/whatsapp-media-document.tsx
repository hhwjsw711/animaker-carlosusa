import { useTranslation } from "react-i18next";
import { FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppMediaDocumentProps {
  url?: string;
  fileName?: string;
}

export function WhatsAppMediaDocument({ url, fileName }: WhatsAppMediaDocumentProps) {
  const { t } = useTranslation();
  const displayName = fileName || t("labels.mediaDocument");

  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground italic p-3">
        <FileIcon className="size-4.5" />
        {displayName}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 min-w-[200px]">
      <FileIcon className="size-4.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm truncate">{displayName}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open(url, "_blank")}
        className="shrink-0"
      >
        <Download className="size-4.5" />
      </Button>
    </div>
  );
}
