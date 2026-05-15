import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";

interface WhatsAppMediaImageProps {
  url?: string;
  caption?: string;
}

export function WhatsAppMediaImage({ url, caption }: WhatsAppMediaImageProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground italic p-3">
        <ImageIcon className="size-4.5" />
        {t("labels.mediaImage")}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block cursor-pointer"
      >
        <img
          src={url}
          alt={caption || t("labels.mediaImage")}
          className="max-w-[300px] w-full rounded-t-lg object-cover"
          loading="lazy"
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl p-0 bg-transparent border-none shadow-none">
          <img
            src={url}
            alt={caption || t("labels.mediaImage")}
            className="w-full h-auto rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
