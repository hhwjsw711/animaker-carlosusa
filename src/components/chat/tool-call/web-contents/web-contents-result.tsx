import { useTranslation } from "react-i18next";
import { ContentsCard } from "./contents-card";

interface ContentsResult {
  url: string;
  title: string;
  author?: string | null;
  text?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WebContentsResult({ output }: { output: any }) {
  const { t } = useTranslation();

  if (!output || output.error) {
    return (
      <p className="text-xs text-muted-foreground">{t("tools.toolError")}</p>
    );
  }

  const results: ContentsResult[] = output.results ?? [];

  if (results.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("tools.noResults")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pl-0.5">
      {results.map((result) => (
        <ContentsCard
          key={result.url}
          url={result.url}
          title={result.title}
          text={result.text}
        />
      ))}
    </div>
  );
}
