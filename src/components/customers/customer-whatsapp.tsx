import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/ui/custom/empty-state";
import Spinner from "@/components/ui/custom/spinner";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { MessageCircle } from "lucide-react";
import { WhatsAppMessageBubble } from "./whatsapp/whatsapp-message-bubble";
import { WhatsAppDateSeparator } from "./whatsapp/whatsapp-date-separator";
import { WhatsAppComposeArea } from "./whatsapp/whatsapp-compose-area";
import { WhatsAppConnectionBanner } from "./whatsapp/whatsapp-connection-banner";
import { WhatsAppScrollToBottom } from "./whatsapp/whatsapp-scroll-to-bottom";
import type { WhatsAppMessage } from "./whatsapp/types";

interface CustomerWhatsAppProps {
  customerId: Id<"customers">;
}

export function CustomerWhatsApp({ customerId }: CustomerWhatsAppProps) {
  const { t } = useTranslation();
  const [replyingTo, setReplyingTo] = useState<WhatsAppMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const isAtBottomRef = useRef(true);

  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.messaging.queries.listWhatsAppMessages,
    { customerId },
    { initialNumItems: 30 },
  );
  const sentinelRef = useInfiniteScroll(loadMore, status);

  const config = useQuery(api.messagingConfig.queries.getMessagingConfig);
  const connectionStatus = config?.evolutionStatus ?? "disconnected";

  // Messages come in desc order from the query, reverse for chronological display
  const sorted = useMemo(() => [...messages].reverse(), [messages]);

  // Build a map of messages by ID for quoted message lookup
  const messageMap = useMemo(() => {
    const map = new Map<string, WhatsAppMessage>();
    for (const msg of sorted) {
      map.set(msg._id, msg as WhatsAppMessage);
    }
    return map;
  }, [sorted]);

  // Find the nearest scrollable ancestor
  const getScrollParent = useCallback((): HTMLElement | null => {
    let el = containerRef.current?.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  // Scroll management
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const viewport = getScrollParent();
    if (!viewport) return;
    const { scrollHeight, scrollTop, clientHeight } = viewport;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, [getScrollParent]);

  // Auto-scroll when new messages arrive (only if at bottom)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isAtBottomRef.current) {
      scrollToBottom("instant");
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  const isFirstPageLoaded = status !== "LoadingFirstPage";
  useEffect(() => {
    if (isFirstPageLoaded && sorted.length > 0) {
      scrollToBottom("instant");
    }
  }, [isFirstPageLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach scroll listener to parent scroll container
  useEffect(() => {
    const viewport = getScrollParent();
    if (!viewport) return;
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [handleScroll, getScrollParent, status]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = containerRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-primary/10");
      setTimeout(() => el.classList.remove("bg-primary/10"), 1500);
    }
  }, []);

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <Spinner size={4} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div ref={containerRef} className="flex flex-col flex-1">
        <WhatsAppConnectionBanner status={connectionStatus as "disconnected" | "connecting" | "connected"} />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={MessageCircle} message={t("empty.noWhatsAppMessages")} />
        </div>
        <div className="sticky bottom-0 z-10">
          <WhatsAppComposeArea
            customerId={customerId}
            disabled={connectionStatus !== "connected"}
            replyingTo={null}
            onCancelReply={() => {}}
          />
        </div>
      </div>
    );
  }

  // Build message list with date separators
  const elements: React.ReactNode[] = [];
  let lastDate: string | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const msgDate = new Date(msg.createdAt).toDateString();

    if (msgDate !== lastDate) {
      elements.push(
        <WhatsAppDateSeparator key={`sep-${msgDate}`} date={new Date(msg.createdAt)} />,
      );
      lastDate = msgDate;
    }

    const quotedMessage = msg.quotedMessageId
      ? messageMap.get(msg.quotedMessageId)
      : undefined;

    elements.push(
      <WhatsAppMessageBubble
        key={msg._id}
        message={msg as WhatsAppMessage}
        quotedMessage={quotedMessage}
        onReply={setReplyingTo}
        onScrollToMessage={handleScrollToMessage}
      />,
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col flex-1">
      <WhatsAppConnectionBanner status={connectionStatus as "disconnected" | "connecting" | "connected"} />

      <div className="flex flex-col flex-1 gap-4 p-4 pb-0 px-8 py-0">
        <div ref={sentinelRef} className="h-1" />
        {status === "LoadingMore" && (
          <div className="flex justify-center py-2">
            <Spinner size={4} />
          </div>
        )}
        {elements}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 z-10">
        <WhatsAppScrollToBottom
          visible={showScrollButton}
          onClick={() => scrollToBottom("smooth")}
        />
        <WhatsAppComposeArea
          customerId={customerId}
          disabled={connectionStatus !== "connected"}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
}
