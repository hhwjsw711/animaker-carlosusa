import { X, FileText, Music, CircleAlert } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";
import type { ChatAttachment } from "@/hooks/use-file-upload";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImagePreview({ att, onRemove }: { att: ChatAttachment; onRemove: () => void }) {
  return (
    <div className="group relative shrink-0">
      <img
        src={att.previewUrl}
        alt={att.name}
        className={`size-14 object-cover border rounded-lg overflow-hidden ${att.error ? "ring-2 ring-destructive" : ""}`}
      />
      {att.uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
          <Spinner size={4} className="text-white" />
        </div>
      )}
      {att.error && (
        <div className="absolute bottom-1 left-1">
          <CircleAlert className="size-4.5 text-destructive" />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background cursor-pointer"
      >
        <X className="size-4.5" />
      </button>
    </div>
  );
}

function FilePill({ att, onRemove }: { att: ChatAttachment; onRemove: () => void }) {
  const isAudio = att.category === "audio";

  return (
    <div
      className={`group relative flex shrink-0 items-center gap-2 rounded-lg border p-2 h-14 ${
        att.error ? "border-destructive bg-destructive/5" : "border-border bg-muted/50"
      }`}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        {att.uploading ? (
          <Spinner size={3} />
        ) : att.error ? (
          <CircleAlert className="size-4.5 text-destructive" />
        ) : isAudio ? (
          <Music className="size-4.5 text-muted-foreground" />
        ) : (
          <FileText className="size-4.5 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col min-w-0 max-w-28">
        <span className="truncate text-xs font-medium leading-tight">{att.name}</span>
        <span className="text-[11px] leading-tight text-muted-foreground">
          {formatFileSize(att.size)}
        </span>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background cursor-pointer"
      >
        <X className="size-4.5" />
      </button>
    </div>
  );
}

interface ChatAttachmentsProps {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}

export function ChatAttachments({ attachments, onRemove }: ChatAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto p-2 bg-card border-b">
      {attachments.map((att) =>
        att.category === "image" && att.previewUrl ? (
          <ImagePreview key={att.id} att={att} onRemove={() => onRemove(att.id)} />
        ) : (
          <FilePill key={att.id} att={att} onRemove={() => onRemove(att.id)} />
        ),
      )}
    </div>
  );
}
