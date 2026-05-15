import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import usePreferencesStore from "@/stores/preferences";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Users,
  ContactRound,
  MessageSquare,
  Briefcase,
  Package,
  SquareLibrary,
  Bot,
  CalendarDays,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/hooks/use-workspace";
import { STAFF_PAGES } from "@/lib/staff-pages";

interface NavItemProps {
  title: string;
  to: string;
  icon?: LucideIcon;
  isActive?: boolean;
  isSidebarOpen?: boolean;
  onClick?: () => void;
}

function NavItem({
  title,
  to,
  icon: Icon,
  isActive = false,
  isSidebarOpen = false,
  onClick,
}: NavItemProps) {
  const content = (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "gap-1",
        "hover:bg-background/60 dark:hover:bg-accent/60 cursor-pointer transition-all duration-150",
        "active:scale-[0.98] text-foreground",
        isSidebarOpen
          ? "flex h-12 w-full rounded-lg items-center justify-start"
          : "flex h-10 w-10 rounded-lg justify-center items-center",
        isActive &&
          "bg-background hover:bg-background dark:bg-accent dark:hover:bg-accent/40",
      )}
    >
      <div className="flex items-center gap-0">
        {Icon && (
          <div className="min-w-10 min-h-10 flex items-center justify-center">
            <Icon className="size-4.5" />
          </div>
        )}
        {isSidebarOpen && (
          <p className="line-clamp-1 flex-1 font-semibold">{title}</p>
        )}
      </div>
    </Link>
  );

  if (!isSidebarOpen) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div className="w-full" />}>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

const MemoizedNavItem = React.memo(NavItem);

type NavItemDef = { to: string; page: string; labelKey: string; icon: LucideIcon };

const ALL_NAV_ITEMS: NavItemDef[] = [
  { to: "/chat", page: "chat", labelKey: "labels.chat", icon: MessageSquare },
  { to: "/customers", page: "customers", labelKey: "labels.customers", icon: Users },
  { to: "/services", page: "services", labelKey: "labels.services", icon: Briefcase },
  { to: "/products", page: "products", labelKey: "labels.products", icon: Package },
  { to: "/collaborators", page: "collaborators", labelKey: "labels.collaborators", icon: ContactRound },
  { to: "/skills", page: "skills", labelKey: "labels.skills", icon: SquareLibrary },
  { to: "/agents", page: "agents", labelKey: "labels.agents", icon: Bot },
  { to: "/calendar", page: "calendar", labelKey: "labels.calendar", icon: CalendarDays },
  { to: "/finance", page: "finance", labelKey: "labels.finance", icon: DollarSign },
];

const STAFF_NAV_ITEMS = ALL_NAV_ITEMS.filter((item) =>
  STAFF_PAGES.has(item.page as never),
);

export function NavTree() {
  const { isSidebarOpen, setIsSidebarOpen } = usePreferencesStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  const { isStaff } = useWorkspace();

  const navItems = isStaff ? STAFF_NAV_ITEMS : ALL_NAV_ITEMS;

  return (
    <div className="flex flex-col gap-2 w-full">
      {navItems.map(({ to, labelKey, icon }) => (
        <MemoizedNavItem
          key={to}
          title={t(labelKey)}
          to={to}
          icon={icon}
          isActive={pathname === to || pathname.startsWith(`${to}/`)}
          isSidebarOpen={isSidebarOpen}
          onClick={() => setIsSidebarOpen(false)}
        />
      ))}
    </div>
  );
}
