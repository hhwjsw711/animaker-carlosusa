import { FileText, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ContentPart } from "@/types/chat";
import { resolveImageSrc, getImageGridClass, extractAttachedFileNames } from "@/lib/chat-message-utils";

interface MessageAttachmentsProps {
  parts: ContentPart[];
}

export function MessageAttachments({ parts }: MessageAttachmentsProps) {
  const { t } = useTranslation();
  const imageParts = parts.filter((p) => p.type === "image");
  const fileParts = parts.filter((p) => p.type === "file");
  const attachedFileNames = extractAttachedFileNames(parts);

  if (imageParts.length === 0 && fileParts.length === 0 && attachedFileNames.length === 0) {
    return null;
  }

  return (
      <div className="border-b pb-2 mb-2">
        {imageParts.length > 0 && (
          <div className={`grid gap-2 mb-2 mt-2 ${getImageGridClass(imageParts.length)}`}>
            {imageParts.map((part) => {
              const src = resolveImageSrc(part);
              if (!src) return null;

              const isSingle = imageParts.length === 1;

              return (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    width={256}
                    height={256}
                    className={`w-full object-cover aspect-square rounded-lg ${
                      isSingle ? "max-h-64" : "size-full"
                    }`}
                  />
              );
            })}
          </div>
        )}

        {(fileParts.length > 0 || attachedFileNames.length > 0) && (
          <div className="flex flex-col gap-2 mb-2">
            {fileParts.map((part, i) => {
              const isAudio = part.mediaType?.startsWith("audio/");
              return (
                <div
                  key={`file-${i}`}
                  className="flex items-center gap-2 rounded-md bg-background/30 p-2 text-xs"
                >
                  {isAudio ? (
                    <Music className="size-4.5 shrink-0 opacity-70" />
                  ) : (
                    <FileText className="size-4.5 shrink-0 opacity-70" />
                  )}
                  <span className="opacity-80">
                    {isAudio ? t("labels.audio") : t("labels.document")}
                  </span>
                </div>
              );
            })}
            {attachedFileNames.map((name, i) => (
              <div
                key={`attached-${i}`}
                className="flex items-center gap-2 rounded-md bg-background/30 p-2 text-xs"
              >
                <FileText className="size-4.5 shrink-0 opacity-70" />
                <span className="max-w-40 truncate opacity-80">{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
