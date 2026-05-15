import Logo from "@/components/ui/custom/logo";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import usePreferencesStore from "@/stores/preferences";
import { useEffect, useRef } from "react";
import { NavTree } from "./nav-tree";
import { NavUser } from "./nav-user";

export function NavDesktop() {
  const { isSidebarOpen, setIsSidebarOpen } = usePreferencesStore();
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    };

    // Delay to prevent immediate close on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  if (isMobile) return null;

  return (
    <div className="min-w-18 flex flex-col h-full items-start justify-between fixed left-0 top-0 z-40">
      <div
        ref={sidebarRef}
        className={cn(
          "absolute top-0 left-0 flex flex-col h-full transition-all duration-200 items-center gap-4 select-none z-50 bg-primary/15 dark:bg-primary/0 py-4",
          isSidebarOpen
            ? "bg-card/90 backdrop-blur-lg w-72 shadow-xl border-0 border-r border-r-border"
            : "min-w-18 border-r border-border"
        )}
      >
        <div className="flex min-w-10 min-h-10 max-w-10 max-h-10 items-center justify-center">
          <Logo size="md" />
        </div>
        <div className="flex flex-1 items-start justify-center overflow-hidden overflow-y-auto">
          <NavTree />
        </div>
        <div
          className={cn(
            "flex w-full items-center gap-2 transition-all duration-200",
            isSidebarOpen ? "flex-row justify-between" : "flex-col-reverse"
          )}
        >
          <NavUser />
        </div>
      </div>
    </div>
  );
}
