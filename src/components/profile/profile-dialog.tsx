import { useState, useCallback, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Spinner from "@/components/ui/custom/spinner";
import {
  DATE_MASKS,
  applyMask,
  isoToDisplay,
  displayToIso,
} from "@/lib/date-mask";
import { getInitials } from "@/lib/format-initials";
import { Camera, Trash2, User } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_BIO_LENGTH = 200;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { t, i18n } = useTranslation();
  const user = useQuery(api.users.queries.getMe);
  const updateProfile = useMutation(api.users.mutations.updateProfile);
  const uploadProfilePhoto = useAction(
    api.users.mutations.uploadProfilePhoto,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bio, setBio] = useState("");
  const [birthDateError, setBirthDateError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBunnyPath, setPendingBunnyPath] = useState<string | null>(
    null,
  );
  const [removePhoto, setRemovePhoto] = useState(false);

  const dateMask = DATE_MASKS[i18n.language] ?? DATE_MASKS["en-US"];
  const isLoading = isSaving || isUploading;

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      revokePreview();
      return;
    }
    if (open && user && !initializedRef.current) {
      initializedRef.current = true;
      setName(user.name ?? "");
      setBirthDate(
        user.birthDate ? isoToDisplay(user.birthDate, i18n.language) : "",
      );
      setBio(user.bio ?? "");
      setBirthDateError(false);
      setPreviewUrl(null);
      setPendingBunnyPath(null);
      setRemovePhoto(false);
    }
  }, [open, user, i18n.language, revokePreview]);

  const currentPhotoUrl = removePhoto
    ? null
    : previewUrl ?? user?.photoUrl ?? null;

  const handlePhotoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE) return;

      revokePreview();
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setRemovePhoto(false);
      setPendingBunnyPath(null);
      setIsUploading(true);

      try {
        const bytes = await file.arrayBuffer();
        const { bunnyPath } = await uploadProfilePhoto({
          bytes,
          contentType: file.type,
        });
        setPendingBunnyPath(bunnyPath);
      } catch {
        revokePreview();
        setPreviewUrl(null);
        setPendingBunnyPath(null);
        toast.error(t("errors.uploadPhotoFailed"));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [uploadProfilePhoto, revokePreview, t],
  );

  const handleRemovePhoto = useCallback(() => {
    revokePreview();
    setPreviewUrl(null);
    setPendingBunnyPath(null);
    setRemovePhoto(true);
  }, [revokePreview]);

  const handleBirthDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBirthDate(applyMask(e.target.value, dateMask.mask));
      setBirthDateError(false);
    },
    [dateMask.mask],
  );

  const handleSave = useCallback(async () => {
    if (!user) return;

    let birthDateIso = "";
    if (birthDate) {
      const iso = displayToIso(birthDate, i18n.language);
      if (!iso) {
        setBirthDateError(true);
        return;
      }
      birthDateIso = iso;
    }
    setBirthDateError(false);

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        birthDate: birthDateIso,
        bio: bio.trim(),
        ...(pendingBunnyPath ? { photoBunnyPath: pendingBunnyPath } : {}),
        ...(removePhoto ? { removePhoto: true } : {}),
      });
      onOpenChange(false);
    } catch {
      toast.error(t("errors.updateProfileFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [
    user,
    name,
    birthDate,
    bio,
    pendingBunnyPath,
    removePhoto,
    i18n.language,
    t,
    updateProfile,
    onOpenChange,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isLoading) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("labels.myProfile")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="flex size-28 items-center justify-center rounded-full overflow-hidden bg-accent">
                {currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : user?.name ? (
                  <span className="text-3xl text-muted-foreground">
                    {getInitials(user.name)}
                  </span>
                ) : (
                  <User className="size-12 text-muted-foreground" />
                )}
              </div>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Spinner />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Camera className="size-4.5" />
                {t("labels.changePhoto")}
              </Button>
              {(user?.photo ||
                user?.photoBunnyPath ||
                pendingBunnyPath) &&
                !removePhoto && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemovePhoto}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4.5" />
                  {/* {t("labels.removePhoto")} */}
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("labels.birthDate")}</Label>
            <Input
              value={birthDate}
              onChange={handleBirthDateChange}
              placeholder={dateMask.placeholder}
              aria-invalid={birthDateError || undefined}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("labels.bio")}</Label>
              <span className="text-xs text-muted-foreground">
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= MAX_BIO_LENGTH) {
                  setBio(e.target.value);
                }
              }}
              className="resize-none max-h-32 overflow-y-auto"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
          >
            {isSaving ? <Spinner size={5} /> : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
