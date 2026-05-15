import { AccessDataDialog } from "@/components/auth/access-data-dialog";
import { ConfirmSignOut } from "@/components/confirm-sign-out";
import { ProfileDialog } from "@/components/profile/profile-dialog";
import { WhatsAppSettingsDialog } from "@/components/profile/whatsapp-settings-dialog";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/format-initials";
import { cn } from "@/lib/utils";
import usePreferencesStore from "@/stores/preferences";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import {
  BarChart3,
  ChevronsUpDown,
  Blocks,
  KeyRound,
  Languages,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Sun,
  User,
  UserPen,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_LABELS: Record<string, string> = {
  "en-US": "English",
  "pt-BR": "Português",
};

interface NavUserProps {
  variant?: "default" | "mobile";
}

export function NavUser({ variant = "default" }: NavUserProps) {
  const { isSidebarOpen } = usePreferencesStore();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.queries.getMe);
  const { t, i18n } = useTranslation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showAccessData, setShowAccessData] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const userData = {
    name: user?.name || t("labels.user"),
    email: user?.email || "",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("flex items-center justify-center gap-2 w-full")}
      >
        {variant === "mobile" ? (
          <div
            className={cn(
              "flex items-center gap-3 w-full px-2 py-2 rounded-lg",
              "hover:bg-accent/20 cursor-pointer transition-all duration-150",
              "active:scale-[0.98] text-foreground"
            )}
          >
            <Avatar className="size-10 shrink-0 rounded-full!">
              {user?.photoUrl && <AvatarImage src={user.photoUrl}  className="rounded-full!"/>}
              <AvatarFallback className="text-accent-foreground bg-accent rounded-full!">
                {getInitials(userData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold line-clamp-1">
                {userData.name}
              </p>
              {userData.email && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {userData.email}
                </p>
              )}
            </div>
            <ChevronsUpDown className="size-4.5 text-muted-foreground shrink-0" />
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-150 active:scale-[0.98]",
              isSidebarOpen && !isMobile
                ? "h-10 w-full rounded-full"
                : "w-10 h-10 p-0 rounded-full"
            )}
          >
            <Avatar
              className={cn(
                "shrink-0 transition-all duration-150 rounded-full!",
                isSidebarOpen && !isMobile ? "size-4.5" : "size-10"
              )}
            >
              {user?.photoUrl && <AvatarImage src={user.photoUrl} className="rounded-full!" />}
              <AvatarFallback className="text-accent-foreground bg-accent rounded-full!">
                {isSidebarOpen && !isMobile ? (
                  <User className="size-4.5" />
                ) : (
                  getInitials(userData.name)
                )}
              </AvatarFallback>
            </Avatar>
            {isSidebarOpen && !isMobile && (
              <>
                <p className="text-sm line-clamp-1 flex-1">
                  {userData.email}
                </p>
                <ChevronsUpDown className="size-4.5 text-muted-foreground" />
              </>
            )}
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56" align="start" sideOffset={10}>
        <div className="flex flex-col gap-0 w-full py-4 mb-2 items-center justify-center">
          <Avatar className="size-24 rounded-full overflow-hidden">
            {user?.photoUrl && <AvatarImage src={user.photoUrl} />}
            <AvatarFallback>
              <User className="size-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {userData.name && (
            <p className="text-lg font-semibold line-clamp-1 mt-2">
              {userData.name}
            </p>
          )}
          {userData.email && (
            <p className="text-muted-foreground line-clamp-1">
              {userData.email}
            </p>
          )}
        </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setShowProfile(true)}>
        <UserPen className="size-4.5 text-muted-foreground" />
        {t("labels.myProfile")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setShowAccessData(true)}>
        <KeyRound className="size-4.5 text-muted-foreground" />
        {t("auth.accessData")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate({ to: "/usage" })}>
        <BarChart3 className="size-4.5 text-muted-foreground" />
        {t("labels.usage")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Blocks className="size-4.5 text-muted-foreground" />
              {t("labels.integrations")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setShowWhatsApp(true)}>
                <MessageCircle className="size-4.5 text-muted-foreground" />
                {t("labels.whatsapp")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === "dark" ? (
                <Moon className="size-4.5 text-muted-foreground" />
              ) : theme === "light" ? (
                <Sun className="size-4.5 text-muted-foreground" />
              ) : (
                <Monitor className="size-4.5 text-muted-foreground" />
              )}
              {t("labels.theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={setTheme}
              >
                <DropdownMenuRadioItem value="light">
                  <Sun className="size-4.5 text-muted-foreground" />
                  {t("labels.light")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="size-4.5 text-muted-foreground" />
                  {t("labels.dark")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor className="size-4.5 text-muted-foreground" />
                  {t("labels.system")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages className="size-4.5 text-muted-foreground" />
              {t("labels.language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={i18n.language}
                onValueChange={(lang) => i18n.changeLanguage(lang)}
              >
                <DropdownMenuRadioItem value="en-US">
                  {LANGUAGE_LABELS["en-US"]}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pt-BR">
                  {LANGUAGE_LABELS["pt-BR"]}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowSignOutConfirm(true)}>
          <LogOut className="size-4.5 text-muted-foreground" />
          {t("actions.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmSignOut
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
        onConfirm={handleSignOut}
      />
      <AccessDataDialog
        open={showAccessData}
        onOpenChange={setShowAccessData}
      />
      <ProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
      />
      <WhatsAppSettingsDialog
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
      />
    </DropdownMenu>
  );
}
