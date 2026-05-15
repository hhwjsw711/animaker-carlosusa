import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Paperclip, ImageIcon, VideoIcon, FileIcon, MicIcon } from "lucide-react";
import { toast } from "sonner";

const MEDIA_ACCEPT: Record<string, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
  document: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  audio: "audio/mpeg,audio/ogg,audio/wav,audio/webm",
};

interface WhatsAppAttachmentButtonProps {
  onSend: (storageId: Id<"_storage">, mediaType: "image" | "video" | "document" | "audio") => Promise<void>;
  disabled?: boolean;
}

export function WhatsAppAttachmentButton({ onSend, disabled }: WhatsAppAttachmentButtonProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaTypeRef = useRef<"image" | "video" | "document" | "audio">("image");
  const generateUploadUrl = useMutation(api.customerFiles.mutations.generateUploadUrl);

  const handleSelect = useCallback((mediaType: "image" | "video" | "document" | "audio") => {
    mediaTypeRef.current = mediaType;
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = MEDIA_ACCEPT[mediaType];
    input.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      e.target.value = "";

      try {
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error("Upload failed");
        const data = (await result.json()) as { storageId: Id<"_storage"> };
        await onSend(data.storageId, mediaTypeRef.current);
      } catch {
        toast.error(t("errors.uploadFailed"));
      }
    },
    [generateUploadUrl, onSend, t],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={disabled} className="shrink-0" aria-label="Attach">
              <Paperclip className="size-4.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="min-w-36">
          <DropdownMenuItem onClick={() => handleSelect("image")}>
            <ImageIcon className="size-4.5 mr-2" />
            {t("labels.mediaImage")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect("video")}>
            <VideoIcon className="size-4.5 mr-2" />
            {t("labels.mediaVideo")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect("document")}>
            <FileIcon className="size-4.5 mr-2" />
            {t("labels.mediaDocument")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelect("audio")}>
            <MicIcon className="size-4.5 mr-2" />
            {t("labels.mediaAudio")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
