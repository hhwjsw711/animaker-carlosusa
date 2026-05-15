import { Collapsible } from "@/components/ui/collapsible";
import { CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import Spinner from "@/components/ui/custom/spinner";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

interface ToolCallWrapperProps {
  icon: ReactNode;
  label: string;
  isLoading: boolean;
  children?: ReactNode;
}

export function ToolCallWrapper({ icon, label, isLoading, children }: ToolCallWrapperProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible data-slot="tool-call" open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        data-slot="tool-call-trigger"
        className="flex items-center justify-start gap-2 text-sm text-muted-foreground cursor-pointer py-2 hover:text-foreground w-full"
      >
        <ChevronRight
          data-slot="tool-call-chevron"
          className="size-4.5 min-w-4.5 min-h-4.5"
        />
        <span className="flex items-center justify-start text-left gap-2 truncate">
          {isLoading && (
            <Spinner size={4} className="min-w-4 min-h-4" />
          )}
          {icon}
          <span className="truncate line-clamp-1">{label}</span>
        </span>
      </CollapsibleTrigger>
      {children && (
        <CollapsibleContent data-slot="tool-call-content">
          <div className="text-sm text-muted-foreground leading-relaxed border-l px-4 pb-1 ml-2">
            {children}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
