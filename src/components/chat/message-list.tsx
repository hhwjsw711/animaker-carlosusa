import { ScrollArea } from "@/components/ui/scroll-area";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { ArrowDown, Brain } from "lucide-react";
import { useRef, memo, useCallback, useState, useEffect, Suspense } from "react";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import "streamdown/styles.css";
import Spinner from "@/components/ui/custom/spinner";
import { Button } from "../ui/button";
import { ErrorBoundary } from "@/components/error-boundary";
import { toolRegistry } from "./tool-call/registry";
import { ToolCallWrapper } from "./tool-call/tool-call-wrapper";
import { MessageAttachments } from "./message-attachments";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AgentMessage } from "@/types/chat";
import { sanitizeToolCallXml } from "@/lib/sanitize-tool-calls";
import {
  getTextContent,
  getUserTextContent,
  getToolCalls,
  getAllContentParts,
  hasAttachmentParts,
} from "@/lib/chat-message-utils";

import { STREAMING_THROTTLE_MS, SIZE_CACHE_MAX } from "@/lib/constants";

/** Module-level LRU cache: message key → measured height in px.
 *  Survives re-renders so estimateSize returns accurate values
 *  for previously-measured items, eliminating scroll jumps.
 *  Bounded to SIZE_CACHE_MAX entries (LRU eviction) to prevent memory leaks. */
const sizeCache = new Map<string, number>();


function sizeCacheGet(key: string): number | undefined {
  const val = sizeCache.get(key);
  if (val !== undefined) {
    // Move to end (most recently used) for LRU eviction
    sizeCache.delete(key);
    sizeCache.set(key, val);
  }
  return val;
}

function sizeCacheSet(key: string, size: number) {
  if (sizeCache.has(key)) sizeCache.delete(key);
  sizeCache.set(key, size);
  if (sizeCache.size > SIZE_CACHE_MAX) {
    const first = sizeCache.keys().next().value!;
    sizeCache.delete(first);
  }
}


const STREAMDOWN_PLUGINS = { code };
const SHIKI_THEME = ["github-light", "github-dark"] as [string, string];

function ReasoningBlock({ content, isThinking }: { content: string; isThinking: boolean }) {
  const { t } = useTranslation();
  const label = isThinking ? t("status.thinking") : t("labels.reasoning");

  return (
    <ToolCallWrapper
      icon={<Brain className="size-4.5" />}
      label={label}
      isLoading={isThinking}
    >
      <p className="whitespace-pre-wrap">{content}</p>
    </ToolCallWrapper>
  );
}

function AssistantContent({ text, isStreaming, isMobile }: { text: string; isStreaming: boolean; isMobile: boolean }) {
  // During streaming, throttle text updates to ~60ms intervals
  // to avoid per-token measureElement + forced reflow cascades.
  const [throttledText, setThrottledText] = useState(text);
  const lastUpdateRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) {
      setThrottledText(text);
      return;
    }
    const now = performance.now();
    if (now - lastUpdateRef.current >= STREAMING_THROTTLE_MS) {
      lastUpdateRef.current = now;
      setThrottledText(text);
    } else if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        lastUpdateRef.current = performance.now();
        setThrottledText(text);
      });
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [text, isStreaming]);

  // Ensure final text is shown when streaming ends
  useEffect(() => {
    if (!isStreaming) setThrottledText(text);
  }, [isStreaming, text]);

  const displayText = sanitizeToolCallXml(isStreaming ? throttledText : text);

  return (
    <ErrorBoundary fallback={<p className="whitespace-pre-wrap text-sm">{displayText}</p>}>
      <Streamdown
        plugins={STREAMDOWN_PLUGINS}
        isAnimating={isStreaming}
        animated={isMobile ? false : isStreaming}
        caret={undefined}
        shikiTheme={SHIKI_THEME}
        linkSafety={{ enabled: false }}
      >
        {displayText}
      </Streamdown>
    </ErrorBoundary>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolOutputMap = Record<string, any>;

const MessageBubble = memo(
  function MessageBubble({
    msg,
    toolOutputs,
    isMobile,
    chatIsLoading,
  }: {
    msg: AgentMessage;
    toolOutputs: ToolOutputMap;
    isMobile: boolean;
    chatIsLoading?: boolean;
  }) {
    const isUser = msg.message?.role === "user";
    const text = getTextContent(msg);
    const toolCalls = getToolCalls(msg);

    if (!text && !msg.reasoning && !msg.streaming && toolCalls.length === 0 && (!isUser || !hasAttachmentParts(msg))) return null;

    if (isUser) {
      const allParts = getAllContentParts(msg);
      const userText = getUserTextContent(msg);
      const hasAttachments = allParts.length > 0;
      return (
        <div className="flex gap-3 justify-end pb-4">
          <div className="user-bubble py-2.5 px-4 rounded-lg rounded-br-none bg-accent text-foreground leading-relaxed max-w-[70%]">
            {hasAttachments && <MessageAttachments parts={allParts} />}
            {userText && <p className="whitespace-pre-wrap">{userText}</p>}
          </div>
        </div>
      );
    }

    // Assistant: render blocks in the order the LLM produced them.
    // Reasoning always comes first (it precedes actual output).
    // Then walk the content array in order, flushing consecutive
    // text parts into a single bubble and rendering tool calls inline.
    const blocks: React.ReactNode[] = [];

    if (msg.reasoning) {
      blocks.push(
        <ReasoningBlock
          key="reasoning"
          content={msg.reasoning}
          isThinking={msg.streaming && !text}
        />,
      );
    }

    const content = msg.message?.content;
    if (Array.isArray(content)) {
      let textBuffer = "";
      let textBlockIdx = 0;
      let toolIdx = 0;

      const flushText = (streaming: boolean) => {
        if (!textBuffer) return;
        const key = `text-${textBlockIdx++}`;
        const t = textBuffer;
        textBuffer = "";
        blocks.push(
          <div
            key={key}
            className="py-2.5 rounded-xl rounded-bl-none assistant-bubble leading-relaxed max-w-full"
          >
            <AssistantContent text={t} isStreaming={streaming} isMobile={isMobile} />
          </div>,
        );
      };

      for (const part of content) {
        if (part.type === "text" && part.text) {
          textBuffer += part.text;
        } else if (part.type === "tool-call") {
          // Text before a tool call is complete — flush without streaming
          flushText(false);
          const entry = part.toolName ? toolRegistry[part.toolName] : null;
          if (!entry) continue;
          const CallComponent = entry.Call;
          const output = part.toolCallId ? toolOutputs[part.toolCallId] : undefined;
          blocks.push(
            <Suspense key={`${part.toolCallId}-${toolIdx++}`} fallback={null}>
              <CallComponent
                input={part.input ?? part.args}
                output={output}
                isLoading={(chatIsLoading || msg.streaming) && output === undefined}
              />
            </Suspense>,
          );
        }
        // tool-result, image, file parts are handled elsewhere
      }

      // Final text — may still be streaming
      flushText(msg.streaming);
    } else if (typeof content === "string" && content) {
      blocks.push(
        <div
          key="text"
          className="py-2.5 rounded-xl rounded-bl-none assistant-bubble leading-relaxed max-w-full"
        >
          <AssistantContent text={content} isStreaming={msg.streaming} isMobile={isMobile} />
        </div>,
      );
    }

    if (msg.streaming && blocks.length === 0 && !msg.reasoning) {
      blocks.push(<Spinner key="spinner" size={4} />);
    }

    if (blocks.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 pb-1">
        {blocks}
      </div>
    );
  },
  (prev, next) => {
    // Cheap reference/primitive checks first — short-circuit before expensive array walks
    if (prev.msg.key !== next.msg.key) return false;
    if (prev.msg.streaming !== next.msg.streaming) return false;
    if (prev.toolOutputs !== next.toolOutputs) return false;
    if (prev.isMobile !== next.isMobile) return false;
    if (prev.chatIsLoading !== next.chatIsLoading) return false;
    if (prev.msg.reasoning !== next.msg.reasoning) return false;
    // Expensive content walks — only reached when all cheap checks passed
    const prevCalls = getToolCalls(prev.msg);
    const nextCalls = getToolCalls(next.msg);
    if (prevCalls.length !== nextCalls.length) return false;
    if (prevCalls.at(-1)?.toolCallId !== nextCalls.at(-1)?.toolCallId) return false;
    return getTextContent(prev.msg) === getTextContent(next.msg);
  },
);

interface MessageListProps {
  messages: AgentMessage[];
  toolOutputs: ToolOutputMap;
  isLoading?: boolean;
  isStreaming?: boolean;
  threadId: string | null;
}

export function MessageList({ messages, toolOutputs, isLoading, isStreaming = false, threadId }: MessageListProps) {
  const isMobile = useIsMobile();
  const lastMessageRole = messages[messages.length - 1]?.message?.role;
  const { viewportRef, isScrolledUp, scrollToBottom, scrollToBottomImmediate } = useAutoScroll({
    isStreaming,
    threadId,
    messageCount: messages.length,
    isLoading,
    lastMessageRole,
  });

  const showLoader = isLoading && !isStreaming;
  const itemCount = messages.length + (showLoader ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: useCallback(() => viewportRef.current, [viewportRef]),
    estimateSize: useCallback(
      (index: number) => {
        if (index >= messages.length) return 48; // loader spinner
        const cached = sizeCacheGet(messages[index].key);
        if (cached) return cached;
        return hasAttachmentParts(messages[index]) ? 320 : 64;
      },
      [messages],
    ),
    // NOTE: Do NOT use getItemKey here. TanStack Virtual includes getItemKey
    // in its internal measurementsCache memo deps — changing it (e.g. when
    // messages ref changes during streaming) clears ALL cached measurements,
    // defeating the sizeCache optimization. The default index-based key is
    // correct for a chat that only appends.
    overscan: isMobile ? 8 : 5,
    onChange: useCallback(
      (instance: Virtualizer<HTMLDivElement, Element>) => {
        // Persist measured sizes into module-level cache
        for (const item of instance.measurementsCache) {
          if (item.size > 0 && item.index < messages.length) {
            sizeCacheSet(messages[item.index].key, item.size);
          }
        }
        // During streaming, auto-scroll via virtualizer onChange
        // instead of a separate ResizeObserver (avoids double RO work).
        // IMPORTANT: defer via rAF — onChange runs inside flushSync, so
        // setting scrollTop here would execute BEFORE the browser processes
        // queued touch events, fighting the user's scroll-up gesture.
        if (isStreaming) requestAnimationFrame(scrollToBottomImmediate);
      },
      [messages, isStreaming, scrollToBottomImmediate],
    ),
  });

  return (
    <div className="relative h-full">
      <ScrollArea className="h-full md:**:data-[slot=scroll-area-viewport]:will-change-scroll" viewportRef={viewportRef}>
        <div className="mx-auto max-w-3xl px-8 py-4">
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const isLoader = virtualItem.index >= messages.length;

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div style={{ contain: "layout style" }}>
                    {isLoader ? (
                      <div className="pb-4">
                        <Spinner size={4} />
                      </div>
                    ) : (
                      <MessageBubble
                        msg={messages[virtualItem.index]}
                        toolOutputs={toolOutputs}
                        isMobile={isMobile}
                        chatIsLoading={isLoading}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {isScrolledUp && (
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center"
        >
          <ArrowDown className="size-4.5" />
        </Button>
      )}
    </div>
  );
}
