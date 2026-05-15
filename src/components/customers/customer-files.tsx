import { useState, useRef, useCallback } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Upload, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { CustomerFileItem } from "./customer-file-item";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import useNavigationStore from "@/stores/navigation";
import { ACCEPTED_TYPES, SIZE_LIMITS, ACCEPT_STRING } from "@/lib/file-constants";
import { uploadToBunnyViaHttp } from "@/lib/bunny-upload";

interface CustomerFilesProps {
  customerId: Id<"customers">;
}

export function CustomerFiles({ customerId }: CustomerFilesProps) {
  const { t } = useTranslation();
  const isActive = useNavigationStore((s) => s.activePage === "customers");
  const {
    results: files,
    status: filesStatus,
    loadMore: loadMoreFiles,
  } = usePaginatedQuery(
    api.customerFiles.queries.listCustomerFiles,
    { customerId },
    { initialNumItems: 30 },
  );
  const filesSentinelRef = useInfiniteScroll(loadMoreFiles, filesStatus);
  const authToken = useAuthToken();
  const createCustomerFile = useMutation(
    api.customerFiles.mutations.createCustomerFile,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const selectedFiles = Array.from(fileList);
      if (selectedFiles.length === 0) return;

      setIsUploading(true);

      try {
        for (const file of selectedFiles) {
          const category = ACCEPTED_TYPES[file.type];
          if (!category) {
            toast.error(t("errors.unsupportedFileType"));
            continue;
          }

          const sizeLimit = SIZE_LIMITS[category];
          if (file.size > sizeLimit) {
            toast.error(t("errors.fileTooLarge"));
            continue;
          }

          try {
            const bunnyPath = await uploadToBunnyViaHttp(
              file,
              `customerFiles/${customerId}`,
              authToken,
            );

            await createCustomerFile({
              customerId,
              bunnyPath,
              name: file.name,
              type: file.type,
              size: file.size,
            });
          } catch {
            toast.error(t("errors.uploadFailed"));
          }
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [customerId, authToken, createCustomerFile, t],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;
      await uploadFiles(selectedFiles);
    },
    [uploadFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        await uploadFiles(droppedFiles);
      }
    },
    [uploadFiles],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        disabled={isUploading}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6
          transition-colors cursor-pointer
          disabled:cursor-not-allowed disabled:opacity-50
          ${isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
        `}
      >
        {isUploading ? (
          <LoaderCircle className="size-6 text-muted-foreground animate-spin" />
        ) : (
          <Upload className="size-6 text-muted-foreground" />
        )}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-medium">
            {isUploading
              ? t("empty.uploadingFiles")
              : isDragOver
                ? t("empty.dropFilesActive")
                : t("empty.dropFilesHere")}
          </span>
          {!isUploading && !isDragOver && (
            <span className="text-xs text-muted-foreground">
              {t("empty.dropFilesDescription")}
            </span>
          )}
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {filesStatus === "LoadingFirstPage" ? null : files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("empty.noFiles")}
        </p>
      ) : (
        <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" itemCount={files.length} dataKey={customerId} visible={isActive}>
          {files.map((file) => (
            <CustomerFileItem key={file._id} file={file} />
          ))}
          <div ref={filesSentinelRef} className="col-span-full h-1" />
          {filesStatus === "LoadingMore" && (
            <div className="col-span-full flex justify-center py-2">
              <Spinner size={4} />
            </div>
          )}
        </AnimatedList>
      )}
    </div>
  );
}
