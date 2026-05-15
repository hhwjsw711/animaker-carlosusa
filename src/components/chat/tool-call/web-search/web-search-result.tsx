import { useTranslation } from "react-i18next";
import { SearchResultCard } from "./search-result-card";

interface SearchResult {
  url: string;
  title: string;
  publishedDate?: string | null;
  author?: string | null;
  text?: string | null;
  highlights?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WebSearchResult({ output }: { output: any }) {
  const { t } = useTranslation();

  if (!output || output.error) {
    return (
      <p className="text-xs text-muted-foreground">{t("tools.toolError")}</p>
    );
  }

  const results: SearchResult[] = output.results ?? [];

  if (results.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("tools.noResults")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pl-0.5">
      {results.map((result) => (
        <SearchResultCard
          key={result.url}
          url={result.url}
          title={result.title}
          publishedDate={result.publishedDate}
          highlights={result.highlights}
          text={result.text}
        />
      ))}
    </div>
  );
}
