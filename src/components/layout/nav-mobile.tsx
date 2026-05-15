import Logo from "@/components/ui/custom/logo";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import usePreferencesStore from "@/stores/preferences";
import { Menu, X } from "lucide-react";
import { NavTree } from "./nav-tree";
import { NavUser } from "./nav-user";
import { useTopBarActions } from "./top-bar-actions-context";

export function NavMobile() {
  const { isSidebarOpen, setIsSidebarOpen } = usePreferencesStore();
  const topBarCtx = useTopBarActions();

  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 h-18 gap-4 flex flex-row w-full p-0 px-4 items-center justify-between z-50 bg-primary/15 dark:bg-primary/0"
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Drawer
          direction="left"
          open={isSidebarOpen}
          onOpenChange={setIsSidebarOpen}
          handleOnly={true}
        >
          <DrawerTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="size-4.5" />
          </DrawerTrigger>
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-r-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <Logo size="md" />
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <NavTree />
              </div>
              <Separator className="shrink-0 my-4" />
              <div className="shrink-0">
                <NavUser variant="mobile" />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        <Logo size="md" />
        </div>
      <div className="flex flex-row items-center gap-2">
        {topBarCtx?.topBarActions}
      </div>
    </div>
  );
}
