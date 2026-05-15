import { useState, useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { ACCEPTED_TYPES, SIZE_LIMITS, MAX_CHAT_ATTACHMENTS } from "@/lib/file-constants";

export interface ChatAttachment {
  id: string;
  file: File;
  bunnyPath: string | null;
  name: string;
  type: string;
  size: number;
  category: string;
  previewUrl?: string;
  uploading: boolean;
  error?: string;
}

let nextId = 0;
function generateId() {
  return `att_${Date.now()}_${++nextId}`;
}

export function useFileUpload() {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const uploadChatAttachment = useAction(
    api.chatAttachments.mutations.uploadChatAttachment,
  );
  const deletePendingBunnyUpload = useAction(
    api.chatAttachments.mutations.deletePendingBunnyUpload,
  );
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const isUploading = attachments.some((a) => a.uploading);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const currentCount = attachmentsRef.current.length;
      const remaining = MAX_CHAT_ATTACHMENTS - currentCount;

      if (remaining <= 0) {
        toast.error(t("chat.attachments.maxFilesReached", { max: MAX_CHAT_ATTACHMENTS }));
        return;
      }

      const filesToAdd = fileArray.slice(0, remaining);
      if (filesToAdd.length < fileArray.length) {
        toast.error(t("chat.attachments.maxFilesReached", { max: MAX_CHAT_ATTACHMENTS }));
      }

      for (const file of filesToAdd) {
        const category = ACCEPTED_TYPES[file.type];
        if (!category) {
          toast.error(t("errors.unsupportedFileType"));
          continue;
        }

        const sizeLimit = SIZE_LIMITS[category];
        if (file.size > sizeLimit) {
          toast.error(t("errors.fileTooLarge"));
          continue;
        }

        const id = generateId();
        const previewUrl = category === "image" ? URL.createObjectURL(file) : undefined;

        const attachment: ChatAttachment = {
          id,
          file,
          bunnyPath: null,
          name: file.name,
          type: file.type,
          size: file.size,
          category,
          previewUrl,
          uploading: true,
        };

        setAttachments((prev) => [...prev, attachment]);

        // Upload in background
        (async () => {
          try {
            const bytes = await file.arrayBuffer();
            const { bunnyPath } = await uploadChatAttachment({
              bytes,
              contentType: file.type,
            });

            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id ? { ...a, bunnyPath, uploading: false } : a,
              ),
            );
          } catch {
            toast.error(t("errors.uploadFailed"));
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id ? { ...a, uploading: false, error: "upload_failed" } : a,
              ),
            );
          }
        })();
      }
    },
    [uploadChatAttachment, t],
  );

  const removeFile = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.previewUrl) {
        URL.revokeObjectURL(att.previewUrl);
      }
      if (att?.bunnyPath) {
        deletePendingBunnyUpload({ bunnyPath: att.bunnyPath }).catch(() => {});
      }
      return prev.filter((a) => a.id !== id);
    });
  }, [deletePendingBunnyUpload]);

  const clear = useCallback(() => {
    setAttachments((prev) => {
      for (const att of prev) {
        if (att.previewUrl) {
          URL.revokeObjectURL(att.previewUrl);
        }
      }
      return [];
    });
  }, []);

  return { attachments, isUploading, addFiles, removeFile, clear };
}
