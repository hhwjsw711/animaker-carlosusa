import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Plus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/* ── Edit mode: photos already saved on the server ──────────────────────── */

interface ProductPhotoManagerProps {
  productId: Id<"products">;
  photoBunnyPaths: string[];
  legacyPhotos: Id<"_storage">[];
  photoUrls: (string | null)[];
  disabled?: boolean;
}

export function ProductPhotoManager({
  productId,
  photoBunnyPaths,
  legacyPhotos,
  photoUrls,
  disabled,
}: ProductPhotoManagerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadProductPhoto = useAction(
    api.products.mutations.uploadProductPhoto,
  );
  const addPhoto = useMutation(api.products.mutations.addProductPhoto);
  const removePhoto = useMutation(api.products.mutations.removeProductPhoto);

  const totalCount = photoBunnyPaths.length + legacyPhotos.length;

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      const remaining = MAX_PHOTOS - totalCount;
      const files = Array.from(selected).slice(0, remaining);

      if (files.length === 0) {
        toast.error(t("errors.maxPhotosReached"));
        return;
      }

      setIsUploading(true);
      try {
        for (const file of files) {
          if (file.size > MAX_FILE_SIZE) {
            toast.error(t("errors.fileTooLarge"));
            continue;
          }
          const bytes = await file.arrayBuffer();
          const { bunnyPath } = await uploadProductPhoto({
            productId,
            bytes,
            contentType: file.type,
          });
          await addPhoto({ productId, bunnyPath });
        }
      } catch {
        toast.error(t("errors.photoUploadFailed"));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [productId, totalCount, uploadProductPhoto, addPhoto, t],
  );

  const handleRemoveBunny = useCallback(
    async (bunnyPath: string) => {
      try {
        await removePhoto({ productId, bunnyPath });
      } catch {
        toast.error(t("errors.photoUploadFailed"));
      }
    },
    [productId, removePhoto, t],
  );

  const handleRemoveLegacy = useCallback(
    async (storageId: Id<"_storage">) => {
      try {
        await removePhoto({ productId, storageId });
      } catch {
        toast.error(t("errors.photoUploadFailed"));
      }
    },
    [productId, removePhoto, t],
  );

  return (
    <PhotoGrid
      count={totalCount}
      disabled={disabled}
      isUploading={isUploading}
      onClickAdd={() => fileInputRef.current?.click()}
    >
      {photoBunnyPaths.map((bunnyPath, index) => (
        <PhotoThumbnail
          key={bunnyPath}
          url={photoUrls[index] ?? null}
          disabled={disabled}
          onRemove={() => handleRemoveBunny(bunnyPath)}
        />
      ))}
      {legacyPhotos.map((storageId, index) => (
        <PhotoThumbnail
          key={storageId}
          url={photoUrls[photoBunnyPaths.length + index] ?? null}
          disabled={disabled}
          onRemove={() => handleRemoveLegacy(storageId)}
        />
      ))}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </PhotoGrid>
  );
}

/* ── Create mode: staged local files, not yet uploaded ──────────────────── */

interface ProductPhotoStagingProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export function ProductPhotoStaging({
  files,
  onFilesChange,
  disabled,
}: ProductPhotoStagingProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      const remaining = MAX_PHOTOS - files.length;
      if (remaining <= 0) {
        toast.error(t("errors.maxPhotosReached"));
        return;
      }

      const valid: File[] = [];
      for (const file of Array.from(selected).slice(0, remaining)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(t("errors.fileTooLarge"));
          continue;
        }
        valid.push(file);
      }

      if (valid.length > 0) {
        onFilesChange([...files, ...valid]);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [files, onFilesChange, t],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange],
  );

  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const url of previewUrls) URL.revokeObjectURL(url);
    };
  }, [previewUrls]);

  return (
    <PhotoGrid
      count={files.length}
      disabled={disabled}
      isUploading={false}
      onClickAdd={() => fileInputRef.current?.click()}
    >
      {files.map((_, index) => (
        <PhotoThumbnail
          key={`${files[index].name}-${index}`}
          url={previewUrls[index]}
          disabled={disabled}
          onRemove={() => handleRemove(index)}
        />
      ))}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleSelect}
      />
    </PhotoGrid>
  );
}

/* ── Upload staged files after product creation ─────────────────────────── */

export async function uploadStagedPhotos(
  files: File[],
  productId: Id<"products">,
  uploadProductPhoto: (args: {
    productId: Id<"products">;
    bytes: ArrayBuffer;
    contentType: string;
  }) => Promise<{ bunnyPath: string }>,
  addPhoto: (args: {
    productId: Id<"products">;
    bunnyPath: string;
  }) => Promise<void>,
): Promise<void> {
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const { bunnyPath } = await uploadProductPhoto({
      productId,
      bytes,
      contentType: file.type,
    });
    await addPhoto({ productId, bunnyPath });
  }
}

/* ── Shared UI pieces ───────────────────────────────────────────────────── */

function PhotoGrid({
  count,
  disabled,
  isUploading,
  onClickAdd,
  children,
}: {
  count: number;
  disabled?: boolean;
  isUploading: boolean;
  onClickAdd: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("labels.photos")}</span>
        <span className="text-xs text-muted-foreground">
          {count}/{MAX_PHOTOS}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {children}
        {count < MAX_PHOTOS && (
          <button
            type="button"
            onClick={onClickAdd}
            disabled={disabled || isUploading}
            className="aspect-square rounded-md border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <LoaderCircle className="size-4.5 animate-spin text-muted-foreground" />
            ) : (
              <Plus className="size-4.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoThumbnail({
  url,
  disabled,
  onRemove,
}: {
  url: string | null;
  disabled?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative aspect-square rounded-md overflow-hidden bg-muted group">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="absolute top-0.5 right-0.5 size-5 flex items-center justify-center rounded-full bg-background/80 cursor-pointer"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
