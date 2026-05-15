import { useTranslation } from "react-i18next";
import { ImagePlus } from "lucide-react";
import { ToolCallWrapper } from "../tool-call-wrapper";
import { ImageResult } from "../image-result";
import type { ToolCallProps } from "../registry";

export function GenerateImageCall({ input, output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();
  const prompt = input?.prompt ?? "";

  return (
    <>
      <ToolCallWrapper
        icon={<ImagePlus className="size-4.5 min-w-4.5 min-h-4.5" />}
        label={t("tools.generatingImage")}
        isLoading={isLoading}
      >
        {prompt && <p className="text-muted-foreground">{prompt}</p>}
        {output?.error && (
          <p className="text-muted-foreground">{t("errors.imageGenerationFailed")}</p>
        )}
      </ToolCallWrapper>
      {isLoading && !output ? (
        <ImageResult alt={prompt} isLoading aspectRatio={input?.aspectRatio} />
      ) : output?.error ? (
        <ImageResult alt={prompt} isError aspectRatio={input?.aspectRatio} />
      ) : output ? (
        <ImageResult
          imageUrl={output.imageUrl}
          alt={prompt}
          aspectRatio={input?.aspectRatio}
        />
      ) : null}
    </>
  );
}
