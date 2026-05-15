import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatSuggestions } from "./chat-suggestions";
import { BackgroundThreadSubscriber } from "./background-thread-subscriber";
import { CustomerSelector } from "./customer-selector";
import { ThreadList } from "./thread-list";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useChat } from "@/hooks/use-chat";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useIsMobile } from "@/hooks/use-mobile";
import useNavigationStore from "@/stores/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  Plus,
  History,
  Search,
  X,
} from "lucide-react";


export function ChatLayout() {
  const { t } = useTranslation();
  const deleteThread = useMutation(api.chat.mutations.deleteThread);
  const updateThreadTitle = useMutation(api.chat.mutations.updateThreadTitle);
  const toggleFavorite = useMutation(api.chat.mutations.toggleFavorite);
  const updateThreadCustomer = useMutation(api.chat.mutations.updateThreadCustomer);
  const { results: allCustomers } = usePaginatedQuery(
    api.customers.queries.listCustomers,
    {},
    { initialNumItems: 20 },
  );
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "chat");
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"threads"> | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [editTargetId, setEditTargetId] = useState<Id<"threads"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<Id<"threads"> | null>(null);
  const [moveCustomerId, setMoveCustomerId] = useState<Id<"customers"> | null | undefined>(undefined);
  const [moveSearch, setMoveSearch] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState(false);
  const isMobile = useIsMobile();

  async function confirmDelete() {
    if (!deleteTargetId) return;
    setDeleteError(false);
    setIsDeleting(true);
    try {
      await deleteThread({ threadId: deleteTargetId });
      setDeleteTargetId(null);
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  }

  const {
    threadId,
    selectThread,
    threads,
    threadsStatus,
    loadMoreThreads,
    messages,
    isLoading,
    isStreaming,
    loadingThreadIds,
    error,
    clearError,
    send,
    cancel,
    newThread,
    isCreatingThread,
    selectedCustomerId,
    setSelectedCustomerId,
    toolOutputs,
  } = useChat();

  const threadsSentinelRef = useInfiniteScroll(loadMoreThreads, threadsStatus);

  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const handleEditRequest = useCallback((id: Id<"threads">) => {
    const thread = threadsRef.current.find((t) => t._id === id);
    setEditTitle(thread?.title || "");
    setEditTargetId(id);
  }, []);

  const [editError, setEditError] = useState(false);

  async function confirmEdit() {
    if (!editTargetId || !editTitle.trim()) return;
    setEditError(false);
    setIsEditing(true);
    try {
      await updateThreadTitle({ threadId: editTargetId, title: editTitle.trim() });
      setEditTargetId(null);
    } catch {
      setEditError(true);
    } finally {
      setIsEditing(false);
    }
  }

  const handleToggleFavorite = useCallback((id: Id<"threads">) => {
    toggleFavorite({ threadId: id }).catch((err) =>
      console.warn("Failed to toggle favorite:", err),
    );
  }, [toggleFavorite]);

  const handleMoveRequest = useCallback((id: Id<"threads">) => {
    setMoveTargetId(id);
    setMoveCustomerId(undefined);
    setMoveSearch("");
    setMoveError(false);
  }, []);

  const moveCustomerName = useMemo(() => {
    if (moveCustomerId === undefined) return "";
    if (moveCustomerId === null) return t("labels.general");
    return allCustomers.find((c) => c._id === moveCustomerId)?.name ?? "";
  }, [moveCustomerId, allCustomers, t]);

  const filteredMoveCustomers = useMemo(() => {
    if (allCustomers.length === 0) return [];
    if (!moveSearch.trim()) return allCustomers;
    const q = moveSearch.toLowerCase();
    return allCustomers.filter((c) => c.name.toLowerCase().includes(q));
  }, [allCustomers, moveSearch]);

  async function confirmMove() {
    if (!moveTargetId || moveCustomerId === undefined) return;
    setMoveError(false);
    setIsMoving(true);
    try {
      await updateThreadCustomer({
        threadId: moveTargetId,
        customerId: moveCustomerId ?? undefined,
      });
      setMoveTargetId(null);
      setMoveCustomerId(undefined);
    } catch {
      setMoveError(true);
    } finally {
      setIsMoving(false);
    }
  }

  const [suggestedPrompt, setSuggestedPrompt] = useState("");
  const handleSuggestionSelect = useCallback((prompt: string) => {
    setSuggestedPrompt(prompt);
  }, []);
  const handleSuggestedPromptConsumed = useCallback(() => {
    setSuggestedPrompt("");
  }, []);

  const handleCustomerSelect = useCallback((id: typeof selectedCustomerId) => {
    setSuggestedPrompt("");
    setSelectedCustomerId(id);
  }, [setSelectedCustomerId]);

  const activeCustomerName = useMemo(() => {
    if (!selectedCustomerId) return t("labels.general");
    return allCustomers.find((c) => c._id === selectedCustomerId)?.name ?? t("labels.general");
  }, [selectedCustomerId, allCustomers, t]);

  // Query streaming status for threads the user has active sends on.
  // streamingAt now lives in threadStatus (separate from threads table).
  const bgCandidateIds = useMemo(
    () => Array.from(loadingThreadIds).filter((tid) => tid !== threadId),
    [loadingThreadIds, threadId],
  );
  const serverStreamingIds = useQuery(
    api.chat.queries.listStreamingThreadIds,
    bgCandidateIds.length > 0 ? { threadIds: bgCandidateIds } : "skip",
  );

  const MAX_BACKGROUND_SUBS = isMobile ? 1 : 3;
  const backgroundSubscribers = useMemo(() => {
    const streamingIds = new Set([
      ...loadingThreadIds,
      ...(serverStreamingIds ?? []),
    ]);
    return Array.from(streamingIds)
      .filter((tid) => tid !== threadId)
      .flatMap((tid) => {
        const agentTid = threads.find((t) => t._id === tid)?.agentThreadId;
        return agentTid ? [{ tid, agentTid }] : [];
      })
      .slice(0, MAX_BACKGROUND_SUBS);
  }, [isMobile, loadingThreadIds, serverStreamingIds, threadId, threads]);

  const handleNewChat = useCallback(() => {
    newThread();
    if (isMobile) setIsHistoryOpen(false);
  }, [newThread, isMobile]);


  // Mobile actions (rendered inside NavMobile via context)
  useEffect(() => {
    if (!isActive) return;
    if (!isMobile) {
      setTopBarActions(null);
      return;
    }
    setTopBarActions(
      <>
        <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)}>
          <History className="size-4.5" />
        </Button>
        <Button onClick={handleNewChat} size="icon" disabled={isCreatingThread}>
          {isCreatingThread ? <Spinner /> : <Plus className="size-4.5" />}
        </Button>
      </>
    );
  }, [
    isActive,
    isMobile,
    setTopBarActions,
    handleNewChat,
    isCreatingThread,
  ]);

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Thread sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
          <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">{t("labels.chat")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <CustomerSelector
                    selectedCustomerId={selectedCustomerId}
                    onSelect={handleCustomerSelect}
                  />
                  <Button
                    variant="default"
                    onClick={handleNewChat}
                    className="w-full justify-center"
                    disabled={isCreatingThread}
                  >
                    {isCreatingThread && <Spinner />}
                    {t("actions.newConversation")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={threads?.length ?? 0} dataKey={selectedCustomerId} visible={isActive}>
                    <ThreadList
                      threads={threads}
                      activeThreadId={threadId}
                      loadingThreadIds={loadingThreadIds}
                      onSelectThread={selectThread}
                      onDeleteRequest={setDeleteTargetId}
                      onEditRequest={handleEditRequest}
                      onToggleFavorite={handleToggleFavorite}
                      onMoveRequest={handleMoveRequest}
                    />
                    <div ref={threadsSentinelRef} className="h-1" />
                    {threadsStatus === "LoadingMore" && (
                      <div className="flex justify-center py-2">
                        <Spinner size={4} />
                      </div>
                    )}
                  </AnimatedList>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Chat main area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative">
            {/* Messages area */}
            <div className="grow min-h-0 overflow-hidden">
              {messages.length === 0 && !isLoading ? (
                <ChatSuggestions
                  onSelect={handleSuggestionSelect}
                  hasCustomer={!!selectedCustomerId}
                />
              ) : (
                <MessageList messages={messages} toolOutputs={toolOutputs} isLoading={isLoading} isStreaming={isStreaming} threadId={threadId} />
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div className="shrink-0 mx-auto w-full max-w-3xl px-4 mb-4">
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <span className="flex-1">{error}</span>
                  <button
                    onClick={clearError}
                    className="shrink-0 rounded-sm p-0.5 hover:bg-destructive/20 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Composer */}
            <div className="shrink-0">
              <ChatInput
                onSend={send}
                onCancel={cancel}
                isLoading={isLoading}
                isStreaming={isStreaming}
                customerName={activeCustomerName}
                suggestedPrompt={suggestedPrompt}
                onSuggestedPromptConsumed={handleSuggestedPromptConsumed}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Background subscriptions */}
      {backgroundSubscribers.map(({ tid, agentTid }) => (
        <BackgroundThreadSubscriber key={tid} agentThreadId={agentTid} />
      ))}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open: boolean) => { if (isDeleting) return; if (!open) { setDeleteTargetId(null); setDeleteError(false); } }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteConversation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError
                ? t("errors.deleteFailed")
                : t("alerts.confirmDeleteConversation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isDeleting}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="default" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit thread title dialog */}
      <Dialog
        open={!!editTargetId}
        onOpenChange={(open) => { if (isEditing) return; if (!open) { setEditTargetId(null); setEditError(false); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editError ? t("errors.renameFailed") : t("alerts.renameConversation")}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isEditing) confirmEdit(); }}
            placeholder={t("labels.conversationName")}
            autoFocus
            disabled={isEditing}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTargetId(null)} disabled={isEditing}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={confirmEdit} disabled={!editTitle.trim() || isEditing}>
              {isEditing ? <Spinner size={5} /> : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to customer — selection dialog */}
      <Dialog
        open={!!moveTargetId && moveCustomerId === undefined}
        onOpenChange={(open) => { if (!open) { setMoveTargetId(null); setMoveSearch(""); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("actions.move")}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={moveSearch}
              onChange={(e) => setMoveSearch(e.target.value)}
              placeholder={t("labels.selectCustomer")}
              className="pl-9!"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-60">
            <div className="space-y-1">
              <div
                onClick={() => setMoveCustomerId(null)}
                className="flex items-center justify-between rounded-lg p-2 cursor-pointer bg-accent/20 hover:bg-accent/40"
              >
                <span className="text-sm">{t("labels.general")}</span>
                <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" />
              </div>
              {filteredMoveCustomers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => setMoveCustomerId(customer._id)}
                  className="flex items-center justify-between rounded-lg p-2 cursor-pointer bg-accent/20 hover:bg-accent/40"
                >
                  <span className="text-sm truncate">{customer.name}</span>
                  <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveTargetId(null)}>
              {t("actions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to customer — confirmation alert */}
      <AlertDialog
        open={!!moveTargetId && moveCustomerId !== undefined}
        onOpenChange={(open: boolean) => { if (isMoving) return; if (!open) { setMoveCustomerId(undefined); setMoveError(false); } }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.move")}</AlertDialogTitle>
            <AlertDialogDescription>
              {moveError
                ? t("errors.moveFailed")
                : t("alerts.confirmMoveToCustomer", { customer: moveCustomerName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isMoving} onClick={() => setMoveCustomerId(undefined)}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="default" onClick={confirmMove} disabled={isMoving}>
              {isMoving ? <Spinner size={5} /> : t("actions.move")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Thread history drawer — mobile only, mirrors left drawer structure exactly */}
      {isMobile && (
        <Drawer direction="right" open={isHistoryOpen} onOpenChange={setIsHistoryOpen} handleOnly={true}>
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <span className="font-heading text-base font-medium">{t("labels.history")}</span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="shrink-0 mb-4">
                <CustomerSelector
                  selectedCustomerId={selectedCustomerId}
                  onSelect={handleCustomerSelect}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList className="space-y-2 w-full" itemCount={threads?.length ?? 0} dataKey={selectedCustomerId} visible={isActive}>
                  <ThreadList
                    threads={threads}
                    activeThreadId={threadId}
                    loadingThreadIds={loadingThreadIds}
                    onSelectThread={(id) => {
                      selectThread(id);
                      setIsHistoryOpen(false);
                    }}
                    onDeleteRequest={setDeleteTargetId}
                    onEditRequest={handleEditRequest}
                    onToggleFavorite={handleToggleFavorite}
                    onMoveRequest={handleMoveRequest}
                  />
                  <div ref={threadsSentinelRef} className="h-1" />
                  {threadsStatus === "LoadingMore" && (
                    <div className="flex justify-center py-2">
                      <Spinner size={4} />
                    </div>
                  )}
                </AnimatedList>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
