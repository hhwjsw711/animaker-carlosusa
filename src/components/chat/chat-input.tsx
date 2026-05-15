import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUp, Users, Square, Mic, MicOff, Paperclip, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useFileUpload, type ChatAttachment } from "@/hooks/use-file-upload";
import { ACCEPT_STRING } from "@/lib/file-constants";
import { SkillPopover } from "./skill-popover";
import { ChatAttachments } from "./chat-attachments";

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  onCancel?: () => void;
  isLoading: boolean;
  isStreaming?: boolean;
  companyName?: string;
  suggestedPrompt?: string;
  onSuggestedPromptConsumed?: () => void;
}

export function ChatInput({
  onSend,
  onCancel,
  isLoading,
  isStreaming,
  companyName,
  suggestedPrompt,
  onSuggestedPromptConsumed,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const { attachments, isUploading, addFiles, removeFile, clear } = useFileUpload();

  const handleFinalTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const {
    voiceState,
    interimText,
    voiceError,
    isVoiceSupported,
    startListening,
    stopListening,
  } = useVoiceRecorder({ onFinalTranscript: handleFinalTranscript });

  useEffect(() => {
    if (voiceError) toast.error(voiceError);
  }, [voiceError]);

  useEffect(() => {
    if (suggestedPrompt) {
      setInput(suggestedPrompt);
      onSuggestedPromptConsumed?.();
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [suggestedPrompt, onSuggestedPromptConsumed]);

  const handleSubmit = useCallback(() => {
    if (voiceState === "listening") return;
    const trimmed = inputRef.current.trim();
    const readyAttachments = attachments.filter((a) => a.bunnyPath && !a.uploading && !a.error);
    if ((!trimmed && readyAttachments.length === 0) || isLoading || isStreaming || isUploading) return;

    onSend(trimmed, readyAttachments.length > 0 ? readyAttachments : undefined);
    setInput("");
    clear();
  }, [isLoading, isStreaming, isUploading, onSend, voiceState, attachments, clear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        addFiles(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [addFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles],
  );

  const showStop = isLoading || isStreaming;
  const showVoice = isVoiceSupported && !input.trim() && !showStop;
  const hasContent = input.trim().length > 0 || attachments.some((a) => a.bunnyPath && !a.uploading && !a.error);
  const canSend = hasContent && !isLoading && !isStreaming && !isUploading && voiceState === "idle";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-2">
      <div
        className="relative rounded-xl overflow-hidden transition-colors border"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* <ShineBorder
          shineColor="color-mix(in srgb, var(--color-foreground) 20%, transparent)"
          borderWidth={1}
          duration={20}
          className="z-10"
        /> */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[2px]">
            <Upload className="size-6 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {t("empty.dropFilesActive")}
            </span>
          </div>
        )}

        <ChatAttachments attachments={attachments} onRemove={removeFile} />

        <Textarea
          ref={textareaRef}
          placeholder={
            voiceState === "listening"
              ? t("chat.voice.listening")
              : t("chat.inputPlaceholder")
          }
          className="text-base! min-h-8 resize-none rounded-none bg-card! border-0 p-4 shadow-none ring-0 focus-visible:ring-0 focus-visible:border-transparent"
          value={voiceState === "listening" ? interimText : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          readOnly={voiceState === "listening"}
        />

        <div className="flex items-center justify-between p-2 bg-card!">
          <div className="flex items-center justify-start gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  />
                }
              >
                <Paperclip className="size-4.5" />
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("actions.attachFile")}
              </TooltipContent>
            </Tooltip>
            <SkillPopover />
            {companyName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground border-l pl-4">
                <Users className="size-4.5 min-w-4.5 min-h-4.5" />
                <span className="line-clamp-1">{companyName}</span>
              </div>
            )}
          </div>
          {showStop ? (
            <Button variant="default" size="icon" onClick={onCancel}>
              <Square className="size-4.5" />
            </Button>
          ) : showVoice ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={voiceState === "listening" ? "destructive" : "default"}
                    size="icon"
                    onClick={() =>
                      voiceState === "idle" ? startListening() : stopListening()
                    }
                  />
                }
              >
                {voiceState === "listening" ? (
                  <MicOff className="size-4.5" />
                ) : (
                  <Mic className="size-4.5" />
                )}
              </TooltipTrigger>
              <TooltipContent side="top">
                {voiceState === "listening"
                  ? t("chat.voice.stopRecording")
                  : t("chat.voice.startRecording")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="default"
              size="icon"
              disabled={!canSend}
              onClick={handleSubmit}
            >
              <ArrowUp className="size-4.5" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2">
        {t("chat.aiDisclaimer")}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
