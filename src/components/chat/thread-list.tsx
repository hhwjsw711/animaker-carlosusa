import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import Spinner from "@/components/ui/custom/spinner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { Ellipsis } from "lucide-react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "../../../convex/_generated/dataModel";

interface Thread {
  _id: Id<"threads">;
  _creationTime: number;
  title?: string;
  model?: string;
  favorite?: boolean;
}

interface ThreadListProps {
  threads: Thread[] | undefined;
  activeThreadId: Id<"threads"> | null;
  loadingThreadIds: Set<Id<"threads">>;
  onSelectThread: (id: Id<"threads">) => void;
  onDeleteRequest: (id: Id<"threads">) => void;
  onEditRequest: (id: Id<"threads">) => void;
  onToggleFavorite: (id: Id<"threads">) => void;
  onMoveRequest: (id: Id<"threads">) => void;
}

const ThreadListContent = memo(function ThreadListContent({
  threads,
  activeThreadId,
  loadingThreadIds,
  onSelectThread,
  onDeleteRequest,
  onEditRequest,
  onToggleFavorite,
  onMoveRequest,
}: ThreadListProps) {
  const { t } = useTranslation();

  const sorted = useMemo(() => {
    if (!threads) return [];
    return [...threads].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0;
    });
  }, [threads]);

  if (threads === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t("empty.noConversations")}
      </div>
    );
  }

  return (
    <>
      {sorted.map((thread) => {
        const isActive = activeThreadId === thread._id;
        const isLoading = loadingThreadIds.has(thread._id);
        const title = thread.title || t("status.untitled");

        return (
          <div
            key={thread._id}
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 52px" } as React.CSSProperties}
            onClick={() => onSelectThread(thread._id)}
            className={cn(
              "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-1 gap-2 cursor-pointer",
              isActive && "bg-accent hover:bg-accent"
            )}
          >
            {thread.favorite && (
              <div className="w-1 h-8 rounded-full bg-primary"></div>
            )}
            <div className="flex-1 flex flex-col truncate min-w-0">
              <span className="truncate text-foreground flex items-center gap-1">
                {title}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {formatRelativeTime(thread._creationTime)}
              </span>
            </div>
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {isLoading ? (
                <Button variant="ghost" size="icon" className="bg-accent/0 hover:bg-accent/0 active:bg-accent/0">
                  <Spinner size={4} />
                </Button>
              ) : (
                <LazyDropdownMenu
                  triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                  triggerContent={<Ellipsis className="size-4.5" />}
                  contentProps={{ align: "end", sideOffset: 4 }}
                >
                  <DropdownMenuItem onClick={() => onEditRequest(thread._id)}>
                    {t("actions.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleFavorite(thread._id)}>
                    {thread.favorite ? t("actions.unfavorite") : t("actions.favorite")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveRequest(thread._id)}>
                    {t("actions.move")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteRequest(thread._id)}
                  >
                    {t("actions.remove")}
                  </DropdownMenuItem>
                </LazyDropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
});

export const ThreadList = ThreadListContent;
