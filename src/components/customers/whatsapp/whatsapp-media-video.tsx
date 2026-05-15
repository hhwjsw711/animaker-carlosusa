import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play, VideoIcon } from "lucide-react";

interface WhatsAppMediaVideoProps {
  url?: string;
  caption?: string;
}

export function WhatsAppMediaVideo({ url, caption }: WhatsAppMediaVideoProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground italic p-3">
        <VideoIcon className="size-4.5" />
        {t("labels.mediaVideo")}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative block cursor-pointer group/video"
      >
        <video
          src={url}
          className="max-w-[300px] w-full rounded-t-lg object-cover"
          preload="metadata"
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 rounded-full p-3">
            <Play className="size-6 text-white fill-white" />
          </div>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl p-0 bg-transparent border-none shadow-none">
          <video
            src={url}
            controls
            autoPlay
            className="w-full h-auto rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
