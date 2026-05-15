import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Citation {
  url: string;
  title: string;
  publishedDate?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WebAnswerResult({ output }: { output: any }) {
  const { t } = useTranslation();

  if (!output || output.error) {
    return (
      <p className="text-xs text-muted-foreground">{t("tools.toolError")}</p>
    );
  }

  const answer: string = output.answer ?? "";
  const citations: Citation[] = output.citations ?? [];

  return (
    <div className="flex flex-col gap-3">
      {answer && (
        <p className="text-sm text-foreground leading-relaxed">{answer}</p>
      )}
      {citations.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("tools.citations")}
          </span>
          {citations.map((citation) => {
            const displayUrl = (() => {
              try {
                return new URL(citation.url).hostname;
              } catch {
                return citation.url;
              }
            })();

            return (
              <a
                key={citation.url}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-4.5 shrink-0" />
                <span className="truncate">
                  {citation.title || displayUrl}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
