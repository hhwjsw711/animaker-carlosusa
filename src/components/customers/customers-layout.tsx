import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CustomerList } from "./customer-list";
import { handleConvexError } from "@/lib/convex-error-handler";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerDetail } from "./customer-detail";
import { Users, Plus, Search, X } from "lucide-react";
import useCustomerSelectionStore from "@/stores/customer-selection";

export function CustomersLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routeParams = useParams({ strict: false }) as { customerId?: string };
  const urlCustomerId = (routeParams.customerId as Id<"customers"> | undefined) ?? null;

  const goToCustomer = useCallback(
    (id: Id<"customers"> | null) => {
      if (id) {
        void navigate({ to: "/customers/$customerId", params: { customerId: id } });
      } else {
        void navigate({ to: "/customers" });
      }
    },
    [navigate],
  );

  const {
    results: customers,
    status: customersStatus,
    loadMore: loadMoreCustomers,
  } = usePaginatedQuery(
    api.customers.queries.listCustomers,
    {},
    { initialNumItems: 30 },
  );
  const customersSentinelRef = useInfiniteScroll(loadMoreCustomers, customersStatus);
  const createCustomer = useMutation(api.customers.mutations.createCustomer);
  const updateCustomerName = useMutation(api.customers.mutations.updateCustomerName);
  const deleteCustomerMutation = useMutation(api.customers.mutations.deleteCustomer);
  const updateCustomerColor = useMutation(api.customers.mutations.updateCustomerColor);

  const { selectedCustomerId, setSelectedCustomerId } = useCustomerSelectionStore();
  const selectedCustomer = useQuery(
    api.customers.queries.getCustomer,
    selectedCustomerId ? { customerId: selectedCustomerId } : "skip",
  );
  const { setTopBarActions } = useTopBarActions()!;
  const [isListOpen, setIsListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  const filteredCustomers = useMemo(() => {
    if (customersStatus === "LoadingFirstPage") return undefined;
    const trimmed = searchQuery.trim();
    if (!trimmed) return customers;
    const query = trimmed.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(query));
  }, [customers, customersStatus, searchQuery]);

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  // Edit dialog
  const [editTargetId, setEditTargetId] = useState<Id<"customers"> | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState(false);

  // Delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"customers"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // URL is the source of truth — keep the store in sync (for callers outside this layout).
  useEffect(() => {
    if (urlCustomerId !== selectedCustomerId) {
      setSelectedCustomerId(urlCustomerId);
    }
  }, [urlCustomerId, selectedCustomerId, setSelectedCustomerId]);

  // Clear selection if customer was deleted externally
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0 && !customers.some((c) => c._id === selectedCustomerId)) {
      goToCustomer(null);
    }
  }, [selectedCustomerId, customers, goToCustomer]);

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return;
    setCreateError(false);
    setIsCreating(true);
    try {
      const id = await createCustomer({ name: createName.trim() });
      setIsCreateOpen(false);
      setCreateName("");
      goToCustomer(id);
    } catch (err) {
      if (handleConvexError(err)) {
        setIsCreateOpen(false);
        setCreateName("");
        return;
      }
      setCreateError(true);
    } finally {
      setIsCreating(false);
    }
  }, [createName, createCustomer, goToCustomer]);

  const handleEditRequest = useCallback((id: Id<"customers">) => {
    const customer = customers.find((c) => c._id === id);
    setEditName(customer?.name || "");
    setEditTargetId(id);
  }, [customers]);

  const confirmEdit = useCallback(async () => {
    if (!editTargetId || !editName.trim()) return;
    setEditError(false);
    setIsEditing(true);
    try {
      await updateCustomerName({ customerId: editTargetId, name: editName.trim() });
      setEditTargetId(null);
    } catch {
      setEditError(true);
    } finally {
      setIsEditing(false);
    }
  }, [editTargetId, editName, updateCustomerName]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleteError(false);
    setIsDeleting(true);
    try {
      await deleteCustomerMutation({ customerId: deleteTargetId });
      if (selectedCustomerId === deleteTargetId) {
        goToCustomer(null);
      }
      setDeleteTargetId(null);
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTargetId, deleteCustomerMutation, selectedCustomerId, goToCustomer]);

  const handleNewCustomer = useCallback(() => {
    setCreateName("");
    setCreateError(false);
    setIsCreateOpen(true);
    if (isMobile) setIsListOpen(false);
  }, [isMobile]);

  const handleSelectCustomer = useCallback((id: Id<"customers">) => {
    goToCustomer(id);
    if (isMobile) setIsListOpen(false);
  }, [isMobile, goToCustomer]);

  const handleColorChange = useCallback((id: Id<"customers">, color: string | undefined) => {
    updateCustomerColor({ customerId: id, color });
  }, [updateCustomerColor]);

  // Mobile top bar actions
  useEffect(() => {
    if (!isMobile) {
      setTopBarActions(null);
      return;
    }
    setTopBarActions(
      <>
        <Button variant="ghost" size="icon" onClick={() => setIsListOpen(true)}>
          <Users className="size-4.5" />
        </Button>
        <Button onClick={handleNewCustomer} size="icon">
          <Plus className="size-4.5" />
        </Button>
      </>
    );
  }, [isMobile, setTopBarActions, handleNewCustomer]);

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Customer sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-semibold text-foreground">{t("labels.customers")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <div className="relative">
                    <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("labels.searchCustomers")}
                      className="pl-9!"
                    />
                  </div>
                  <Button
                    variant="default"
                    onClick={handleNewCustomer}
                    className="w-full justify-center"
                  >
                    {t("actions.newCustomer")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={filteredCustomers?.length ?? 0} dataKey={searchQuery} visible={true}>
                    <CustomerList
                      customers={filteredCustomers}
                      activeCustomerId={selectedCustomerId}
                      onSelectCustomer={handleSelectCustomer}
                      onDeleteRequest={setDeleteTargetId}
                      onEditRequest={handleEditRequest}
                      onColorChange={handleColorChange}
                    />
                    <div ref={customersSentinelRef} className="h-1" />
                    {customersStatus === "LoadingMore" && (
                      <div className="flex justify-center py-2">
                        <Spinner size={4} />
                      </div>
                    )}
                  </AnimatedList>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Main area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
            {selectedCustomerId ? (
              selectedCustomer === undefined ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner />
                </div>
              ) : selectedCustomer === null ? (
                <EmptyState icon={Users} message={t("empty.noCustomerSelected")} />
              ) : (
                <CustomerDetail customerId={selectedCustomerId} />
              )
            ) : (
              <EmptyState icon={Users} message={t("empty.noCustomerSelected")} />
            )}
          </div>
        </div>
      </main>

      {/* Create customer dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => { if (isCreating) return; if (!open) { setIsCreateOpen(false); setCreateError(false); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createError ? t("errors.createCustomerFailed") : t("actions.newCustomer")}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isCreating) handleCreate(); }}
            placeholder={t("labels.fullName")}
            autoFocus
            disabled={isCreating}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || isCreating}>
              {isCreating ? <Spinner size={5} /> : t("actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open: boolean) => { if (isDeleting) return; if (!open) { setDeleteTargetId(null); setDeleteError(false); } }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteCustomer")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError
                ? t("errors.deleteCustomerFailed")
                : t("alerts.confirmDeleteCustomer")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isDeleting}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="default" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit customer name dialog */}
      <Dialog
        open={!!editTargetId}
        onOpenChange={(open) => { if (isEditing) return; if (!open) { setEditTargetId(null); setEditError(false); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editError ? t("errors.renameCustomerFailed") : t("alerts.renameCustomer")}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isEditing) confirmEdit(); }}
            placeholder={t("labels.fullName")}
            autoFocus
            disabled={isEditing}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTargetId(null)} disabled={isEditing}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={confirmEdit} disabled={!editName.trim() || isEditing}>
              {isEditing ? <Spinner size={5} /> : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer list drawer — mobile only */}
      {isMobile && (
        <Drawer direction="right" open={isListOpen} onOpenChange={(open) => { setIsListOpen(open); if (!open) setSearchQuery(""); }} handleOnly={true}>
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <span className="font-heading text-base font-semibold">{t("labels.customers")}</span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="relative mb-4">
                <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("labels.searchCustomers")}
                  className="pl-9!"
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList className="space-y-2 w-full" itemCount={filteredCustomers?.length ?? 0} dataKey={searchQuery} visible={true}>
                  {filteredCustomers === undefined ? (
                    <div className="flex flex-1 items-center justify-center">
                      <Spinner />
                    </div>
                  ) : (
                    <>
                      <CustomerList
                        customers={filteredCustomers}
                        activeCustomerId={selectedCustomerId}
                        onSelectCustomer={handleSelectCustomer}
                        onDeleteRequest={setDeleteTargetId}
                        onEditRequest={handleEditRequest}
                        onColorChange={handleColorChange}
                      />
                      <div ref={customersSentinelRef} className="h-1" />
                      {customersStatus === "LoadingMore" && (
                        <div className="flex justify-center py-2">
                          <Spinner size={4} />
                        </div>
                      )}
                    </>
                  )}
                </AnimatedList>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
