import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Spinner from "@/components/ui/custom/spinner";
import { formatDateTime } from "@/lib/format-date";

interface CustomerNoteItemProps {
  note: {
    _id: Id<"customerNotes">;
    content: string;
    createdAt: number;
    updatedAt?: number;
  };
}

export function CustomerNoteItem({ note }: CustomerNoteItemProps) {
  const { t } = useTranslation();
  const updateNote = useMutation(api.customerNotes.mutations.updateNote);
  const deleteNote = useMutation(api.customerNotes.mutations.deleteNote);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isEditOpen) {
      setEditContent(note.content);
    }
  }, [isEditOpen, note.content]);

  const handleSave = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === note.content) {
      setIsEditOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateNote({ noteId: note._id, content: trimmed });
      setIsEditOpen(false);
    } catch {
      toast.error(t("errors.updateNoteFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote({ noteId: note._id });
    } catch {
      toast.error(t("errors.deleteNoteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const dateLabel = formatDateTime(note.createdAt);

  return (
    <>
      <Card className="flex flex-col justify-between">
        <CardContent>
          <p className="line-clamp-3 text-foreground">
          {note.content}
          </p>
          <p className="mt-1 text-sm line-clamp-1 text-muted-foreground">
            {dateLabel}
          </p>
        </CardContent>
        <CardFooter className="gap-2 justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsViewOpen(true)}
                  />
                }
              >
                <Eye className="size-4.5" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("actions.view")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditOpen(true)}
                  />
                }
              >
                <Pencil className="size-4.5" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("actions.edit")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
                    <AlertDialogTitle>
                      {t("alerts.deleteNote")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("alerts.confirmDeleteNote")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="ghost" disabled={isDeleting}>
                      {t("actions.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Spinner size={5} />
                      ) : (
                        t("actions.delete")
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dateLabel}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <p className="text-muted-foreground whitespace-pre-wrap">{note.content}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsViewOpen(false)}>
              {t("actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(o) => {
          if (isSaving) return;
          setIsEditOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.edit")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !editContent.trim()}
            >
              {isSaving ? <Spinner size={5} /> : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
