import { useTranslation } from "react-i18next";
import { useConvex, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Trash2,
  CircleX,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format-date";
import Spinner from "../ui/custom/spinner";
import { Card, CardContent, CardFooter } from "../ui/card";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CustomerFileItemProps {
  file: {
    _id: Id<"customerFiles">;
    name: string;
    size: number;
    category: string;
    status: string;
    error?: string;
    createdAt: number;
  };
}

function getFileErrorMessage(error: string | undefined, t: (key: string) => string): string | undefined {
  if (!error) return undefined;
  if (error.includes("INSUFFICIENT_CREDITS")) return t("errors.insufficientCredits");
  if (error.includes("No content could be extracted")) return t("errors.noContentExtracted");
  return t("errors.processingFailed");
}

export function CustomerFileItem({ file }: CustomerFileItemProps) {
  const { t } = useTranslation();
  const convex = useConvex();
  const deleteFile = useMutation(
    api.customerFiles.mutations.deleteCustomerFile,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const result = await convex.query(
        api.customerFiles.queries.getFileDownloadUrl,
        { fileId: file._id },
      );
      if (!result) return;

      const response = await fetch(result.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = result.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error(t("errors.downloadFailed"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteFile({ fileId: file._id });
    } catch {
      toast.error(t("errors.deleteFileFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="flex flex-col justify-between">
      <CardContent>
        <p className="font-medium truncate text-foreground">{file.name}</p>
        <div className="flex flex-col gap-0.5 mt-1 text-sm text-muted-foreground">
          <span>{formatDateTime(file.createdAt)}</span>
          <span>{formatFileSize(file.size)}</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between items-center">
        <div className="flex items-center gap-2">
          {file.status === "processing" && (
            <Badge variant="secondary">
              <Spinner className="size-4" />
              {t("status.processing")}
            </Badge>
          )}
          {file.status === "failed" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={<Badge variant="destructive" className="gap-2" />}
                >
                  <CircleX className="size-3" />
                  {t("status.failed")}
                </TooltipTrigger>
                {file.error && (
                  <TooltipContent>
                    <p>{getFileErrorMessage(file.error, t)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file.status === "ready" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDownloading}
                      onClick={handleDownload}
                    />
                  }
                >
                  {isDownloading ? (
                    <Spinner className="size-4.5" />
                  ) : (
                    <Download className="size-4.5" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("actions.download")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <AlertDialog>
                <TooltipTrigger
                  render={
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isDeleting}
                        />
                      }
                    />
                  }
                >
                  {isDeleting ? (
                    <Spinner className="size-4.5" />
                  ) : (
                    <Trash2 className="size-4.5" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("actions.delete")}</p>
                </TooltipContent>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("alerts.deleteFile")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("alerts.confirmDeleteFile")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="ghost" disabled={isDeleting}>
                      {t("actions.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
}
