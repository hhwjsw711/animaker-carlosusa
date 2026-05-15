import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useThreadMessages } from "@convex-dev/agent/react";
import { api } from "../../convex/_generated/api";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "@tanstack/react-router";
import { mergeAgentMessages } from "@/lib/merge-agent-messages";
import { getToolResults, resolveToolOutput } from "@/lib/chat-message-utils";
import type { Id } from "../../convex/_generated/dataModel";
import useCustomerSelectionStore from "@/stores/customer-selection";
import { formatFullDateTime } from "@/lib/format-date";
import { FRONTEND_STREAM_TIMEOUT, ACTION_TIMEOUT, STALE_STREAM_TIMEOUT, THREAD_CREATION_TIMEOUT_MS, MAX_PROMPT_LENGTH } from "@/lib/constants";
import { ERROR_CODES } from "@/lib/error-codes";
import { handleConvexError } from "@/lib/convex-error-handler";
import type { ChatAttachment } from "@/hooks/use-file-upload";

interface PendingPrompt {
  text: string;
  attachments?: ChatAttachment[];
  /** Number of user messages at the time of send — used to detect when
   *  the server has ingested this message (user count increases). */
  userMsgCountAtSend: number;
}

const ERROR_PATTERNS: [test: (msg: string) => boolean, key: string][] = [
  [(m) => m.startsWith(ERROR_CODES.INSUFFICIENT_CREDITS), "errors.insufficientCredits"],
  [(m) => m.startsWith(ERROR_CODES.RATE_LIMIT) || m.includes("rate limit"), "errors.rateLimitReached"],
  [(m) => m.startsWith(ERROR_CODES.MODEL_TIMEOUT) || m.startsWith(ERROR_CODES.ACTION_TIMEOUT), "errors.modelTimeout"],
  [(m) => m.startsWith(ERROR_CODES.GENERATION_FAILED), "errors.generationFailed"],
];

export function useChat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routeParams = useParams({ strict: false }) as { threadId?: string };
  // Only treat the URL param as a thread id when it's a non-empty string.
  // Convex rejects malformed ids server-side, but narrowing here avoids
  // firing queries with empty-string keys on first render of `/chat`.
  const threadId =
    typeof routeParams.threadId === "string" && routeParams.threadId.length > 0
      ? (routeParams.threadId as Id<"threads">)
      : null;

  const goToThread = useCallback(
    (id: Id<"threads"> | null) => {
      if (id) {
        void navigate({ to: "/chat/$threadId", params: { threadId: id } });
      } else {
        void navigate({ to: "/chat" });
      }
    },
    [navigate],
  );

  const [loadingThreadIds, setLoadingThreadIds] = useState<Set<Id<"threads">>>(
    new Set(),
  );
  // Optimistic user messages — one per thread to support concurrent sends
  const [pendingPrompts, setPendingPrompts] = useState<
    Map<Id<"threads">, PendingPrompt>
  >(new Map());
  const { selectedCustomerId, setSelectedCustomerId: setStoreCustomerId } = useCustomerSelectionStore();
  const [error, setError] = useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const cancelledThreadsRef = useRef<Set<Id<"threads">>>(new Set());

  const createThread = useMutation(api.chat.mutations.createThread);
  const updateTitle = useMutation(api.chat.mutations.updateThreadTitle);
  const sendMessageAction = useAction(api.chat.actions.sendMessage);
  const cancelStreamMutation = useMutation(api.chat.mutations.cancelStream);
  const {
    results: paginatedThreads,
    status: threadsStatus,
    loadMore: loadMoreThreads,
  } = usePaginatedQuery(
    api.chat.queries.listThreads,
    { customerId: selectedCustomerId ?? undefined },
    { initialNumItems: 30 },
  );
  const favoriteThreads = useQuery(api.chat.queries.listFavoriteThreads, {
    customerId: selectedCustomerId ?? undefined,
  });

  // Merge favorites (always loaded) with paginated results, deduplicating
  const threads = useMemo(() => {
    if (!favoriteThreads) return paginatedThreads;
    const paginatedIds = new Set(paginatedThreads.map((t) => t._id));
    const missingFavorites = favoriteThreads.filter((t) => !paginatedIds.has(t._id));
    if (missingFavorites.length === 0) return paginatedThreads;
    return [...missingFavorites, ...paginatedThreads];
  }, [paginatedThreads, favoriteThreads]);
  // If the active thread was deleted (no longer in the list), reset to welcome screen.
  // Guard: only check after initial data has loaded to avoid false positives during
  // paginated loading.
  useEffect(() => {
    if (
      threadId &&
      threads.length > 0 &&
      !threads.some((t) => t._id === threadId)
    ) {
      goToThread(null);
    }
  }, [threadId, threads, goToThread]);

  // Subscribe to threadStatus separately — this is a high-churn document
  // (streaming, cancel, image ops) isolated from the threads table to avoid
  // OCC contention with normal thread operations.
  const threadStatus = useQuery(
    api.chat.queries.getThreadStatus,
    threadId ? { threadId } : "skip",
  );

  // Force a re-render when the stream timeout expires so isServerStreaming
  // transitions from true → false without needing an external trigger.
  const [, setStreamTick] = useState(0);
  useEffect(() => {
    if (!threadStatus?.streamingAt) return;
    const remaining =
      FRONTEND_STREAM_TIMEOUT - (Date.now() - threadStatus.streamingAt);
    if (remaining <= 0) return;
    const timerId = setTimeout(
      () => setStreamTick((n) => n + 1),
      remaining + 50,
    );
    return () => clearTimeout(timerId);
  }, [threadStatus?.streamingAt]);

  const isServerStreaming = !!threadStatus?.streamingAt && (Date.now() - threadStatus.streamingAt < FRONTEND_STREAM_TIMEOUT);
  const isLoading = (threadId !== null && loadingThreadIds.has(threadId)) || isServerStreaming;

  // Auto-cancel stuck streams that exceed the frontend timeout.
  useEffect(() => {
    if (!threadStatus?.streamingAt || !threadId) return;
    const age = Date.now() - threadStatus.streamingAt;
    const remaining = FRONTEND_STREAM_TIMEOUT - age;

    const doCancel = () => {
      cancelStreamMutation({ threadId }).catch((err) =>
        console.warn("Auto-cancel failed:", err),
      );
      setPendingPrompts((prev) => {
        const next = new Map(prev);
        next.delete(threadId);
        return next;
      });
    };

    if (remaining <= 0) {
      doCancel();
      return;
    }

    const timerId = setTimeout(doCancel, remaining);
    return () => clearTimeout(timerId);
  }, [threadStatus?.streamingAt, threadId, cancelStreamMutation]);

  // Staleness detection refs (initialized after `messages` is defined below)
  const lastMsgUpdateRef = useRef(Date.now());

  const agentThreadId = useMemo(() => {
    if (!threadId || threads.length === 0) return null;
    return threads.find((t) => t._id === threadId)?.agentThreadId ?? null;
  }, [threadId, threads]);

  const { results: serverMessages } = useThreadMessages(
    api.chat.queries.listThreadMessages,
    agentThreadId ? { threadId: agentThreadId } : "skip",
    { initialNumItems: 50, stream: true },
  );

  const mergedMessages = useMemo(
    () => mergeAgentMessages(serverMessages),
    [serverMessages],
  );

  // Build toolCallId → output map from raw (unmerged) server messages.
  // Tool-result parts live in separate "tool" role messages that the merge
  // skips, so this must run on the raw data.
  // Optimization: only rebuild when the number of tool-result messages changes,
  // not on every streaming text delta (which also changes serverMessages ref).
  const toolResultCount = useMemo(
    () => serverMessages.filter((m) => m.message?.role === "tool").length,
    [serverMessages],
  );
  const toolOutputs = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any> = {};
    for (const msg of serverMessages) {
      for (const part of getToolResults(msg)) {
        if (part.toolCallId) {
          map[part.toolCallId] = resolveToolOutput(part);
        }
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolResultCount]);

  // Append optimistic user bubble when server hasn't caught up yet.
  // Detection: compare current user-message count against the count at send time.
  // When the server ingests the message, the user count increases — safer than
  // text comparison which breaks when the same message is sent twice.
  const messages = useMemo(() => {
    const pending = threadId ? pendingPrompts.get(threadId) : undefined;
    if (!pending) return mergedMessages;

    const currentUserMsgCount = mergedMessages.filter(
      (m) => m.message?.role === "user",
    ).length;
    const serverHasIt = currentUserMsgCount > pending.userMsgCountAtSend;
    if (serverHasIt) return mergedMessages;

    const optimistic = {
      key: "__pending__",
      streaming: false,
      status: "pending",
      order: mergedMessages.length,
      stepOrder: 0,
      message: { role: "user" as const, content: pending.text },
    };

    return [...mergedMessages, optimistic];
  }, [mergedMessages, pendingPrompts, threadId]);

  const prevMessagesRef = useRef(messages);

  // Track when messages actually change (for staleness detection).
  // Compare by reference — during streaming, Convex replaces the array on every
  // delta even when length stays the same (content of existing message changes).
  useEffect(() => {
    if (messages !== prevMessagesRef.current) {
      prevMessagesRef.current = messages;
      lastMsgUpdateRef.current = Date.now();
    }
  }, [messages]);

  // Fire once after STALE_STREAM_TIMEOUT since the last message update
  useEffect(() => {
    if (!isLoading || !threadId) return;
    lastMsgUpdateRef.current = Date.now();

    const timeoutId = setTimeout(() => {
      if (Date.now() - lastMsgUpdateRef.current >= STALE_STREAM_TIMEOUT) {
        console.warn("Stream stale, auto-cancelling thread", threadId);
        cancelStreamMutation({ threadId }).catch((err) =>
          console.warn("Stale cancel failed:", err),
        );
        setLoadingThreadIds((prev) => {
          const next = new Set(prev);
          next.delete(threadId);
          return next;
        });
        setPendingPrompts((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        setError(t("errors.sendFailed"));
      }
    }, STALE_STREAM_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [isLoading, threadId, cancelStreamMutation, t]);

  // Guard against concurrent thread creation (double-click, rapid sends)
  const creatingThreadRef = useRef<Promise<Id<"threads">> | null>(null);
  const creatingThreadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCreatingRef = useCallback(() => {
    creatingThreadRef.current = null;
    if (creatingThreadTimeout.current) {
      clearTimeout(creatingThreadTimeout.current);
      creatingThreadTimeout.current = null;
    }
  }, []);

  // Creates a new empty thread and navigates to it
  const newThread = useCallback(async () => {
    if (creatingThreadRef.current) return;
    setIsCreatingThread(true);
    const promise = createThread({
      customerId: selectedCustomerId ?? undefined,
    });
    creatingThreadRef.current = promise;
    creatingThreadTimeout.current = setTimeout(clearCreatingRef, THREAD_CREATION_TIMEOUT_MS);
    try {
      const tid = await promise;
      goToThread(tid);
    } finally {
      clearCreatingRef();
      setIsCreatingThread(false);
    }
  }, [createThread, selectedCustomerId, clearCreatingRef, goToThread]);

  const send = useCallback(
    async (prompt: string, attachments?: ChatAttachment[]) => {
      const trimmed = prompt.slice(0, MAX_PROMPT_LENGTH);
      let tid = threadId;

      // If sending from the welcome screen (no thread yet), create one first
      if (!tid) {
        // Reuse in-flight thread creation to prevent duplicates from rapid sends
        if (!creatingThreadRef.current) {
          creatingThreadRef.current = createThread({
            title: trimmed.slice(0, 100),
            customerId: selectedCustomerId ?? undefined,
          });
          creatingThreadTimeout.current = setTimeout(clearCreatingRef, THREAD_CREATION_TIMEOUT_MS);
        }
        tid = await creatingThreadRef.current;
        clearCreatingRef();
        goToThread(tid);
      } else {
        // First message in a thread that was created empty — set its title
        const thread = threads.find((t) => t._id === tid);
        if (thread && !thread.title) {
          updateTitle({ threadId: tid, title: trimmed.slice(0, 100) }).catch((err) =>
            console.warn("Failed to update thread title:", err),
          );
        }
      }

      // Show optimistic bubble scoped to the resolved thread.
      // Track current user message count for detection (see messages useMemo).
      const userMsgCountAtSend = mergedMessages.filter(
        (m) => m.message?.role === "user",
      ).length;
      setPendingPrompts((prev) => new Map(prev).set(tid, { text: trimmed, attachments, userMsgCountAtSend }));
      setLoadingThreadIds((prev) => new Set(prev).add(tid));

      setError(null);

      try {
        const actionArgs: Parameters<typeof sendMessageAction>[0] = {
          threadId: tid,
          prompt: trimmed,
          userDate: formatFullDateTime(),
        };

        if (attachments && attachments.length > 0) {
          actionArgs.attachments = attachments
            .filter((a) => a.bunnyPath)
            .map((a) => ({
              bunnyPath: a.bunnyPath!,
              name: a.name,
              type: a.type,
              size: a.size,
              category: a.category,
            }));
        }

        await Promise.race([
          sendMessageAction(actionArgs),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("ACTION_TIMEOUT")), ACTION_TIMEOUT),
          ),
        ]);
        // Success: server has the message, remove optimistic bubble
        setPendingPrompts((prev) => {
          const next = new Map(prev);
          next.delete(tid);
          return next;
        });
      } catch (err: unknown) {
        // Suppress errors from user-initiated cancellation
        if (cancelledThreadsRef.current.has(tid)) return;
        console.error("sendMessage error:", err);
        // Billing errors open the InsufficientCreditsDialog globally
        if (handleConvexError(err)) return;
        const raw =
          err instanceof Error ? err.message : "";
        const errorKey = ERROR_PATTERNS.find(([test]) => test(raw))?.[1] ?? "errors.sendFailed";
        setError(t(errorKey));
        // Keep pending prompt visible so user sees their message + error
      } finally {
        cancelledThreadsRef.current.delete(tid);
        setLoadingThreadIds((prev) => {
          const next = new Set(prev);
          next.delete(tid);
          return next;
        });
      }
    },
    [threadId, threads, mergedMessages, selectedCustomerId, createThread, updateTitle, sendMessageAction, clearCreatingRef, goToThread, t],
  );

  const selectThread = useCallback((id: Id<"threads">) => {
    goToThread(id);
    setError(null);
  }, [goToThread]);

  const cancel = useCallback(async () => {
    if (!threadId) return;

    cancelledThreadsRef.current.add(threadId);

    // Clear client-side state immediately for responsive UX
    setLoadingThreadIds((prev) => {
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
    setPendingPrompts((prev) => {
      const next = new Map(prev);
      next.delete(threadId);
      return next;
    });

    // Abort on the backend
    try {
      await cancelStreamMutation({ threadId });
    } catch (err) {
      console.error("Failed to cancel stream:", err);
    }
  }, [threadId, cancelStreamMutation]);

  const setSelectedCustomerId = useCallback((customerId: Id<"customers"> | null) => {
    setStoreCustomerId(customerId);
    goToThread(null);
    setError(null);
  }, [setStoreCustomerId, goToThread]);

  const clearError = useCallback(() => setError(null), []);

  const isStreaming = useMemo(
    () => messages.some((m) => m.streaming),
    [messages],
  );

  return {
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
  };
}
