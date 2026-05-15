import { useState, useCallback, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LazyDropdownMenuProps {
  /** ClassName applied to the trigger button */
  triggerClassName?: string;
  /** Content inside the trigger button (e.g. icon) */
  triggerContent: ReactNode;
  /** Menu items */
  children: ReactNode;
  /** Props forwarded to DropdownMenuContent */
  contentProps?: React.ComponentProps<typeof DropdownMenuContent>;
}

/**
 * Defers mounting the full DropdownMenu until the user first clicks the trigger.
 * This avoids mounting hundreds of Base UI portal/positioner instances for list
 * items that may never be opened, significantly reducing initial render cost.
 */
export function LazyDropdownMenu({
  triggerClassName,
  triggerContent,
  children,
  contentProps,
}: LazyDropdownMenuProps) {
  const [mounted, setMounted] = useState(false);

  const handleFirstClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button type="button" className={triggerClassName} onClick={handleFirstClick}>
        {triggerContent}
      </button>
    );
  }

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger className={triggerClassName}>
        {triggerContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent {...contentProps}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
