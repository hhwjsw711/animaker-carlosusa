import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import { WebContentsResult } from "./web-contents-result";
import type { ToolCallProps } from "../registry";

export function WebContentsCall({ input, output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();
  const urls: string[] = input?.urls ?? [];

  return (
    <ToolCallWrapper
      icon={<Globe className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.readingUrls", { count: urls.length })}
      isLoading={isLoading}
    >
      {output && <WebContentsResult output={output} />}
    </ToolCallWrapper>
  );
}
