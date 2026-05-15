import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import { WebSearchResult } from "./web-search-result";
import type { ToolCallProps } from "../registry";

export function WebSearchCall({ input, output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();
  const query = input?.query ?? "";

  return (
    <ToolCallWrapper
      icon={<Globe className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.searchingFor", { query })}
      isLoading={isLoading}
    >
      {output && <WebSearchResult output={output} />}
    </ToolCallWrapper>
  );
}
