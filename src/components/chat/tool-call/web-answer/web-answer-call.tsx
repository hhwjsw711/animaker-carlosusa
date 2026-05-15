import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import { WebAnswerResult } from "./web-answer-result";
import type { ToolCallProps } from "../registry";

export function WebAnswerCall({ input, output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();
  const query = input?.query ?? "";

  return (
    <ToolCallWrapper
      icon={<Globe className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.answeringQuery", { query })}
      isLoading={isLoading}
    >
      {output && <WebAnswerResult output={output} />}
    </ToolCallWrapper>
  );
}
