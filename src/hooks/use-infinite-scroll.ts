import { useEffect, useRef } from "react";

/**
 * Observes a sentinel element and calls `loadMore` when it becomes visible.
 * Used with Convex's `usePaginatedQuery` to implement automatic infinite scroll.
 */
export function useInfiniteScroll(
  loadMore: (numItems: number) => void,
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted",
  numItems = 20,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || status !== "CanLoadMore") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore(numItems);
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, status, numItems]);

  return sentinelRef;
}
