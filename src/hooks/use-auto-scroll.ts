import { useCallback, useEffect, useRef, useState } from "react";
import { SCROLL_THRESHOLD_PX } from "@/lib/constants";

interface UseAutoScrollOptions {
  /** Pixel threshold from bottom to consider "at bottom" */
  threshold?: number;
  /** Whether content is currently streaming */
  isStreaming: boolean;
  /** Thread/conversation ID — resets scroll when it changes */
  threadId: string | null;
  /** Number of messages — used to scroll to bottom when messages first load */
  messageCount: number;
  /** Whether a loading indicator is visible (e.g. "Thinking...") */
  isLoading?: boolean;
  /** Role of the last message — forces scroll when user sends a message */
  lastMessageRole?: string;
}

function isAtBottom(el: HTMLElement, threshold: number): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

export function useAutoScroll({
  threshold = SCROLL_THRESHOLD_PX,
  isStreaming,
  threadId,
  messageCount,
  isLoading = false,
  lastMessageRole,
}: UseAutoScrollOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  // Synchronous ref — effects and observers read this instead of React state
  // to avoid render-delay race conditions
  const userScrolledUpRef = useRef(false);

  // Touch tracking for direction detection
  const touchStartYRef = useRef(0);

  const engage = useCallback(() => {
    userScrolledUpRef.current = false;
    setIsScrolledUp(false);
  }, []);

  const disengage = useCallback(() => {
    userScrolledUpRef.current = true;
    setIsScrolledUp(true);
  }, []);

  // Detect user scroll direction via wheel/touch events
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      // Ignore pinch-to-zoom (ctrl+wheel)
      if (e.ctrlKey) return;

      if (e.deltaY < 0) {
        // Scrolling UP — disengage auto-scroll
        if (!userScrolledUpRef.current) disengage();
        return;
      }

      // Scrolling DOWN — check if back at bottom after browser applies scroll
      if (userScrolledUpRef.current) {
        requestAnimationFrame(() => {
          const vp = viewportRef.current;
          if (vp && isAtBottom(vp, threshold)) engage();
        });
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - currentY;

      // deltaY < 0 → finger moved down → content scrolls up → user wants to read above
      if (deltaY < -10 && !userScrolledUpRef.current) {
        disengage();
      }

      // deltaY > 0 → finger moved up → content scrolls down → check if back at bottom
      if (deltaY > 10 && userScrolledUpRef.current) {
        requestAnimationFrame(() => {
          const vp = viewportRef.current;
          if (vp && isAtBottom(vp, threshold)) engage();
        });
      }

      // Update for continuous incremental tracking
      touchStartYRef.current = currentY;
    };

    // Final check after finger lifts — catches fling-to-bottom momentum scrolls
    const onTouchEnd = () => {
      if (!userScrolledUpRef.current) return;
      requestAnimationFrame(() => {
        const vp = viewportRef.current;
        if (vp && isAtBottom(vp, threshold)) engage();
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: true });
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, engage, disengage]);

  // Re-engage auto-scroll when user scrolls back to bottom (covers all scroll sources)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onScroll = () => {
      if (!userScrolledUpRef.current) return;
      if (isAtBottom(viewport, threshold)) engage();
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [threshold, engage]);

  // ResizeObserver — scroll to bottom when content dimensions change.
  // During streaming, the virtualizer onChange handles auto-scroll (avoids double RO).
  // This RO only runs when NOT streaming, to handle lazy image loads, code expansion, etc.
  const lastHeightRef = useRef(0);
  useEffect(() => {
    if (isStreaming) return;

    const viewport = viewportRef.current;
    if (!viewport) return;
    const content = viewport.firstElementChild;
    if (!content) return;

    lastHeightRef.current = viewport.scrollHeight;

    const ro = new ResizeObserver(() => {
      if (userScrolledUpRef.current) return;
      const newHeight = viewport.scrollHeight;
      const delta = newHeight - lastHeightRef.current;
      if (delta <= 0) return; // no content growth — skip (e.g. address bar show/hide)
      lastHeightRef.current = newHeight;
      viewport.scrollTop = viewport.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [isStreaming]);

  // Reset on thread change — scroll to bottom instantly
  useEffect(() => {
    engage();
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  }, [threadId, engage]);

  // Scroll to bottom whenever new messages arrive.
  // When the last message is from the user (they just sent), ALWAYS scroll + re-engage
  // regardless of scroll position — matches ChatGPT/Claude/Gemini behavior.
  // For assistant messages, respect the user's scroll-up state.
  const prevCountRef = useRef(messageCount);
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = messageCount;
    if (messageCount <= prev) return;

    if (lastMessageRole === "user") {
      engage();
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      });
    } else if (!userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [messageCount, lastMessageRole, engage]);

  // Scroll to bottom when loading indicator appears (e.g. "Thinking...")
  useEffect(() => {
    if (isLoading && !userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [isLoading]);

  const scrollToBottom = useCallback(() => {
    engage();
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: isStreaming ? "instant" : "smooth",
      });
    }
  }, [engage, isStreaming]);

  // Immediate (non-smooth) scroll used by virtualizer onChange during streaming.
  // Skips if user scrolled up. Does not call engage() — that's already managed.
  const scrollToBottomImmediate = useCallback(() => {
    if (userScrolledUpRef.current) return;
    const viewport = viewportRef.current;
    if (viewport && viewport.scrollHeight > viewport.clientHeight) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, []);

  return { viewportRef, isScrolledUp, scrollToBottom, scrollToBottomImmediate };
}
