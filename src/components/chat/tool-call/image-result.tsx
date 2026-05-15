import { Download, CircleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import FlickeringGrid from "@/components/ui/custom/flickering-grid";

const ASPECT_RATIO_MAP: Record<string, string> = {
  "1:1": "1/1",
  "16:9": "16/9",
  "9:16": "9/16",
  "4:3": "4/3",
  "3:4": "3/4",
  "3:2": "3/2",
  "2:3": "2/3",
  "21:9": "21/9",
};

interface ImageResultProps {
  imageUrl?: string;
  alt: string;
  isLoading?: boolean;
  isError?: boolean;
  aspectRatio?: string;
}

export function ImageResult({ imageUrl, alt, isLoading, isError, aspectRatio = "1:1" }: ImageResultProps) {
  const { t } = useTranslation();
  const cssAspectRatio = ASPECT_RATIO_MAP[aspectRatio] ?? "1/1";
  const [imgLoaded, setImgLoaded] = useState(() => {
    if (!imageUrl) return false;
    const img = new Image();
    img.src = imageUrl;
    return img.complete && img.naturalWidth > 0;
  });

  const showPlaceholder = isLoading || !imageUrl || !imgLoaded;

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  }, [imageUrl]);

  if (isError) {
    return (
      <div className="relative max-w-md w-full bg-card border border-destructive/30 rounded-xl overflow-hidden p-1">
        <div
          className="w-full rounded-lg flex items-center justify-center bg-destructive/5"
          style={{ aspectRatio: cssAspectRatio }}
        >
          <CircleAlert className="size-8 text-destructive/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-md w-full bg-card border border-border rounded-xl overflow-hidden p-1">
      {showPlaceholder && (
        <div
          className="w-full rounded-lg flex items-center justify-center relative overflow-hidden"
          style={{ aspectRatio: cssAspectRatio }}
        >
          <FlickeringGrid className="absolute inset-0 dark:opacity-100 opacity-50" />
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          onLoad={() => setImgLoaded(true)}
          className={`rounded-lg w-full${showPlaceholder ? " hidden" : ""}`}
        />
      )}
      {!showPlaceholder && (
        <Button
          size="icon"
          variant="secondary"
          onClick={handleDownload}
          className="absolute bottom-4 right-4"
          aria-label={t("actions.download")}
        >
          <Download className="size-4.5" />
        </Button>
      )}
    </div>
  );
}
