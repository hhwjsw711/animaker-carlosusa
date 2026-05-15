import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomerRegistrationDialog } from "./customer-registration-dialog";
import { CustomerFiles } from "./customer-files";
import { CustomerAgents } from "./customer-agents";
import { CustomerWhatsApp } from "./customer-whatsapp";
import { CustomerNotes } from "./customer-notes";
import { CustomerServices } from "./customer-services";
import { CustomerProducts } from "./customer-products";
import { CustomerBilling } from "./customer-billing";
import { getInitials } from "@/lib/format-initials";
import { Camera, Pencil } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function CustomerDetail({
  customerId,
}: {
  customerId: Id<"customers">;
}) {
  const { t } = useTranslation();
  const customer = useQuery(api.customers.queries.getCustomer, { customerId });
  const updateRegistration = useMutation(
    api.customers.mutations.updateCustomerRegistration,
  );
  const uploadCustomerPhoto = useAction(
    api.customers.mutations.uploadCustomerPhoto,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("notes");

  const updateIndicator = useCallback(() => {
    const list = tabsListRef.current;
    if (!list) return;
    const activeEl = list.querySelector<HTMLElement>("[data-active]");
    if (!activeEl) {
      list.style.setProperty("--tab-indicator-opacity", "0");
      return;
    }
    list.style.setProperty("--tab-indicator-left", `${activeEl.offsetLeft}px`);
    list.style.setProperty("--tab-indicator-width", `${activeEl.offsetWidth}`);
    list.style.setProperty("--tab-indicator-opacity", "1");
  }, []);

  useLayoutEffect(() => {
    updateIndicator();

    const list = tabsListRef.current;
    if (!list) return;

    const ro = new ResizeObserver(updateIndicator);
    ro.observe(list);

    document.fonts.ready.then(updateIndicator);

    return () => ro.disconnect();
  }, [activeTab, updateIndicator]);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("errors.fileTooLarge"));
        return;
      }

      setIsUploading(true);
      try {
        const bytes = await file.arrayBuffer();
        const { bunnyPath } = await uploadCustomerPhoto({
          customerId,
          bytes,
          contentType: file.type,
        });
        await updateRegistration({
          customerId,
          photoBunnyPath: bunnyPath,
        });
      } catch {
        toast.error(t("errors.uploadPhotoFailed"));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [customerId, uploadCustomerPhoto, updateRegistration, t],
  );

  if (customer === undefined || customer === null) return null;

  const displayName = customer.name;
  const initials = getInitials(displayName);

  return (
    <>
      <div className="flex flex-col w-full grow shrink-0">
        {/* Header */}
        <div className="flex flex-row items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="relative shrink-0 group cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Avatar className="size-28 rounded-full">
              {customer.photoUrl ? (
                <AvatarImage src={customer.photoUrl} className="rounded-full" />
              ) : null}
              <AvatarFallback className="text-2xl rounded-full">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-card/80">
              <Camera className="size-8 text-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-xl font-semibold">{displayName}</h1>
              {customer.email && (
                <span className="text-sm text-muted-foreground block">{customer.email}</span>
              )}
            </div>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="size-4.5" />
              {t("actions.edit")}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="gap-0 grow shrink-0">
          <TabsList ref={tabsListRef} variant="line" className="sticky top-0 z-10 bg-background w-full justify-start border-b px-4 min-h-12 overflow-x-auto overflow-y-hidden scrollbar-none flex-nowrap">
            <span
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-primary transition-[transform,opacity] duration-300 ease-out will-change-transform"
              style={{
                transform: `translateX(var(--tab-indicator-left, 0)) scaleX(var(--tab-indicator-width, 0))`,
                opacity: `var(--tab-indicator-opacity, 0)`,
              }}
            />
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="notes">{t("labels.notes")}</TabsTrigger>
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="services">{t("labels.services")}</TabsTrigger>
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="products">{t("labels.products")}</TabsTrigger>
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="billing">{t("labels.billing")}</TabsTrigger>
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="files">{t("labels.files")}</TabsTrigger>
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="agents">{t("labels.agents")}</TabsTrigger>
            <TabsTrigger className="min-w-fit px-4 line-clamp-1 min-h-12 shrink-0 cursor-pointer" value="whatsapp">{t("labels.whatsapp")}</TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="flex flex-col flex-1">
            <CustomerNotes customerId={customerId} />
          </TabsContent>
          <TabsContent value="services" className="flex flex-col flex-1">
            <CustomerServices customerId={customerId} />
          </TabsContent>
          <TabsContent value="products" className="flex flex-col flex-1">
            <CustomerProducts customerId={customerId} />
          </TabsContent>
          <TabsContent value="billing" className="flex flex-col flex-1">
            <CustomerBilling customerId={customerId} />
          </TabsContent>
          <TabsContent value="files" className="flex flex-col flex-1">
            <CustomerFiles customerId={customerId} />
          </TabsContent>
          <TabsContent value="agents" className="flex flex-col flex-1">
            <CustomerAgents customerId={customerId} />
          </TabsContent>
          <TabsContent value="whatsapp" className="flex flex-col flex-1">
            <CustomerWhatsApp customerId={customerId} />
          </TabsContent>
        </Tabs>
      </div>

      <CustomerRegistrationDialog
        customerId={customerId}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
