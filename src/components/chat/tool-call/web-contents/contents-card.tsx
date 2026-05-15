import { ExternalLink } from "lucide-react";

interface ContentsCardProps {
  url: string;
  title: string;
  text?: string | null;
}

export function ContentsCard({ url, title, text }: ContentsCardProps) {
  const displayUrl = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  const preview = text ? text.slice(0, 500) : null;

  return (
    <div className="flex flex-col gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-medium text-foreground hover:underline line-clamp-1"
      >
        <ExternalLink className="size-4.5 shrink-0 text-muted-foreground" />
        {title || displayUrl}
      </a>
      <span className="text-xs text-muted-foreground">{displayUrl}</span>
      {preview && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 italic opacity-50">
          {preview}
        </p>
      )}
    </div>
  );
}
