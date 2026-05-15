import { memo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  Check,
  CheckCheck,
  X,
  ImageIcon,
  MicIcon,
  VideoIcon,
  FileIcon,
  StickerIcon,
  MapPinIcon,
  ContactIcon,
  Reply,
  Copy,
  Clock1,
} from "lucide-react";
import { WhatsAppMediaImage } from "./whatsapp-media-image";
import { WhatsAppMediaAudio } from "./whatsapp-media-audio";
import { WhatsAppMediaVideo } from "./whatsapp-media-video";
import { WhatsAppMediaDocument } from "./whatsapp-media-document";
import { WhatsAppQuotedMessage } from "./whatsapp-quoted-message";
import type { WhatsAppMessage } from "./types";

const MEDIA_TAG_REGEX = /^\[media:(\w+)(?::(.+))?\]$/;

const MEDIA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  audio: MicIcon,
  video: VideoIcon,
  document: FileIcon,
  sticker: StickerIcon,
  location: MapPinIcon,
  contact: ContactIcon,
};

const MEDIA_I18N: Record<string, string> = {
  image: "labels.mediaImage",
  audio: "labels.mediaAudio",
  video: "labels.mediaVideo",
  document: "labels.mediaDocument",
  sticker: "labels.mediaSticker",
  location: "labels.mediaLocation",
  contact: "labels.mediaContact",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  queued: Clock,
  sent: Check,
  delivered: CheckCheck,
  failed: X,
  undelivered: X,
  received: Check,
};

function detectMediaType(body: string): { type: string; fileName?: string } | null {
  const match = MEDIA_TAG_REGEX.exec(body);
  if (!match) return null;
  return { type: match[1], fileName: match[2] };
}

function MessageMedia({
  mediaType,
  mediaUrl,
  body,
}: {
  mediaType: string;
  mediaUrl?: string;
  body: string;
}) {
  switch (mediaType) {
    case "image":
      return <WhatsAppMediaImage url={mediaUrl} caption={MEDIA_TAG_REGEX.test(body) ? undefined : body} />;
    case "audio":
      return <WhatsAppMediaAudio url={mediaUrl} />;
    case "video":
      return <WhatsAppMediaVideo url={mediaUrl} caption={MEDIA_TAG_REGEX.test(body) ? undefined : body} />;
    case "document":
      return <WhatsAppMediaDocument url={mediaUrl} fileName={detectMediaType(body)?.fileName} />;
    default:
      return null;
  }
}

function MessageBody({ body }: { body: string }) {
  const { t } = useTranslation();
  const mediaInfo = detectMediaType(body);

  if (mediaInfo) {
    const Icon = MEDIA_ICONS[mediaInfo.type] ?? FileIcon;
    const i18nKey = MEDIA_I18N[mediaInfo.type];
    const label = i18nKey ? t(i18nKey as never) : mediaInfo.type;
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground italic">
        <Icon className="size-4.5" />
        {mediaInfo.fileName ? `${label}: ${mediaInfo.fileName}` : label}
      </span>
    );
  }

  return <p className="whitespace-pre-wrap wrap-break-word">{body}</p>;
}

interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
  quotedMessage?: WhatsAppMessage;
  onReply: (message: WhatsAppMessage) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export const WhatsAppMessageBubble = memo(function WhatsAppMessageBubble({
  message,
  quotedMessage,
  onReply,
  onScrollToMessage,
}: WhatsAppMessageBubbleProps) {
  const { t } = useTranslation();
  const isOutbound = message.direction === "outbound";
  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const StatusIcon = isOutbound ? STATUS_ICONS[message.status] : null;
  const isError = message.status === "failed" || message.status === "undelivered";

  const detectedMedia = detectMediaType(message.body);
  const mediaType = message.mediaType ?? detectedMedia?.type;
  const hasMedia = !!mediaType && !!message.mediaUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
    } catch {
      // Clipboard may not be available
    }
  };

  return (
    <div
      className={cn(
        "flex",
        isOutbound ? "justify-end" : "justify-start",
      )}
      data-message-id={message._id}
    >
      <Card className={cn("bg-card/50 max-w-[80%] min-w-[80%] md:max-w-[60%] md:min-w-[40%] p-0! gap-0", hasMedia && "overflow-hidden")}>
        <CardContent className="p-2!">
          {quotedMessage && (
            <div className="p-2">
              <WhatsAppQuotedMessage
                message={quotedMessage}
                onClick={() => onScrollToMessage?.(quotedMessage._id)}
              />
            </div>
          )}

          {hasMedia && (
            <MessageMedia
              mediaType={mediaType!}
              mediaUrl={message.mediaUrl}
              body={message.body}
            />
          )}

          <div className="p-2">
            {hasMedia && !MEDIA_TAG_REGEX.test(message.body) && (
              <p className="whitespace-pre-wrap wrap-break-word mb-1">{message.body}</p>
            )}
            {!hasMedia && <MessageBody body={message.body} />}
          </div>
        </CardContent>

        <CardFooter className="gap-2 justify-between flex flex-row p-2!">
          <div className="flex flex-row gap-1 items-center pl-2">
            <Clock1 className="size-4.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground leading-none">{time}</span>
            {StatusIcon && (
              <StatusIcon
                className={cn(
                  "size-3.5",
                  isError ? "text-destructive" : "text-muted-foreground",
                )}
              />
            )}
          </div>
          <div className="flex flex-row gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReply(message)}
                    />
                  }
                >
                  <Reply className="size-4.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("actions.reply")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                    />
                  }
                >
                  <Copy className="size-4.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("actions.copyText")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
});
