import { useTranslation } from "react-i18next";
import { MicIcon } from "lucide-react";

interface WhatsAppMediaAudioProps {
  url?: string;
}

export function WhatsAppMediaAudio({ url }: WhatsAppMediaAudioProps) {
  const { t } = useTranslation();

  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground italic p-3">
        <MicIcon className="size-4.5" />
        {t("labels.mediaAudio")}
      </div>
    );
  }

  return (
    <div className="p-3 min-w-[240px]">
      <audio controls className="w-full h-8" preload="metadata">
        <source src={url} />
      </audio>
    </div>
  );
}
