import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/format-date";

interface SearchResultCardProps {
  url: string;
  title: string;
  publishedDate?: string | null;
  highlights?: string[];
  text?: string | null;
}

export function SearchResultCard({
  url,
  title,
  publishedDate,
  highlights,
  text,
}: SearchResultCardProps) {
  const snippet =
    highlights && highlights.length > 0
      ? highlights[0]
      : text
        ? text.slice(0, 200)
        : null;

  const displayUrl = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <div className="flex flex-col gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm font-medium text-foreground hover:underline line-clamp-1"
      >
        <ExternalLink className="size-4.5 shrink-0 text-muted-foreground" />
        <span className="line-clamp-1">{title || displayUrl}</span>
      </a>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{displayUrl}</span>
        {publishedDate && (
          <>
            <span>·</span>
            <span>{formatDate(publishedDate)}</span>
          </>
        )}
      </div>
      {snippet && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 italic opacity-50">
          {snippet}
        </p>
      )}
    </div>
  );
}
