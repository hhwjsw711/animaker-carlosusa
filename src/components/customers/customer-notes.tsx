import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StickyNote } from "lucide-react";
import { toast } from "sonner";
import { CustomerNoteItem } from "./customer-note-item";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { EmptyState } from "@/components/ui/custom/empty-state";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import useNavigationStore from "@/stores/navigation";

interface CustomerNotesProps {
  customerId: Id<"customers">;
}

export function CustomerNotes({ customerId }: CustomerNotesProps) {
  const { t } = useTranslation();
  const isActive = useNavigationStore((s) => s.activePage === "customers");
  const {
    results: notes,
    status: notesStatus,
    loadMore: loadMoreNotes,
  } = usePaginatedQuery(
    api.customerNotes.queries.listCustomerNotes,
    { customerId },
    { initialNumItems: 30 },
  );
  const notesSentinelRef = useInfiniteScroll(loadMoreNotes, notesStatus);
  const createNote = useMutation(api.customerNotes.mutations.createNote);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      await createNote({ customerId, content: trimmed });
      setContent("");
      setDialogOpen(false);
    } catch {
      toast.error(t("errors.createNoteFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-12 z-9 bg-background border-b p-4 flex items-center justify-start">
        <Button onClick={() => setDialogOpen(true)}>
          {t("actions.create")}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {notesStatus === "LoadingFirstPage" ? null : notes.length === 0 ? (
          <EmptyState icon={StickyNote} message={t("empty.noNotes")} />
        ) : (
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" itemCount={notes.length} dataKey={customerId} visible={isActive}>
            {notes.map((note) => (
              <CustomerNoteItem key={note._id} note={note} />
            ))}
            <div ref={notesSentinelRef} className="col-span-full h-1" />
            {notesStatus === "LoadingMore" && (
              <div className="col-span-full flex justify-center py-2">
                <Spinner size={4} />
              </div>
            )}
          </AnimatedList>
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (isCreating) return;
          if (!o) {
            setDialogOpen(false);
            setContent("");
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("actions.create")}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t("labels.noteContent")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-32 max-h-48 resize-none"
            disabled={isCreating}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                setContent("");
              }}
              disabled={isCreating}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !content.trim()}
            >
              {isCreating ? <Spinner size={5} /> : t("actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
