import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";
import { toast } from "sonner";
import { WhatsAppAttachmentButton } from "./whatsapp-attachment-button";
import { WhatsAppEmojiPicker } from "./whatsapp-emoji-picker";
import { WhatsAppReplyPreview } from "./whatsapp-reply-preview";
import type { WhatsAppMessage } from "./types";

interface WhatsAppComposeAreaProps {
  customerId: Id<"customers">;
  disabled: boolean;
  replyingTo: WhatsAppMessage | null;
  onCancelReply: () => void;
}

export function WhatsAppComposeArea({
  customerId,
  disabled,
  replyingTo,
  onCancelReply,
}: WhatsAppComposeAreaProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendTextMessage = useAction(api.messaging.actions.sendTextMessage);
  const sendMediaMessage = useAction(api.messaging.actions.sendMediaMessage);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    try {
      await sendTextMessage({
        customerId,
        body: trimmed,
        ...(replyingTo ? { quotedMessageId: replyingTo._id as Id<"messages"> } : {}),
      });
      setText("");
      onCancelReply();
      textareaRef.current?.focus();
    } catch {
      toast.error(t("errors.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, disabled, sendTextMessage, customerId, onCancelReply, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleMediaSend = useCallback(
    async (storageId: Id<"_storage">, mediaType: "image" | "video" | "document" | "audio") => {
      setIsSending(true);
      try {
        await sendMediaMessage({ customerId, storageId, mediaType });
      } catch {
        toast.error(t("errors.sendFailed"));
      } finally {
        setIsSending(false);
      }
    },
    [sendMediaMessage, customerId, t],
  );

  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    requestAnimationFrame(() => {
      textarea.selectionStart = start + emoji.length;
      textarea.selectionEnd = start + emoji.length;
      textarea.focus();
    });
  }, [text]);

  const isDisabled = disabled || isSending;
  const canSend = text.trim().length > 0 && !isDisabled;

  return (
    <div className="w-full px-4 pb-4 pt-0 bg-background">
      <div className="relative rounded-xl overflow-hidden bg-card! border">
        {replyingTo && (
          <WhatsAppReplyPreview message={replyingTo} onCancel={onCancelReply} />
        )}

        <div className="flex items-center gap-2 p-2 ">
          <WhatsAppEmojiPicker onSelect={handleEmojiSelect} disabled={isDisabled} />
          <WhatsAppAttachmentButton
            onSend={handleMediaSend}
            disabled={isDisabled}
          />
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("labels.typeMessage")}
            disabled={isDisabled}
            className="text-base! min-h-8 resize-none rounded-none bg-transparent! border-0 p-2 shadow-none ring-0 focus-visible:ring-0 focus-visible:border-transparent flex-1"
            rows={1}
            autoFocus
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
          >
            {isSending ? <Spinner size={5} /> : <ArrowUp className="size-4.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
