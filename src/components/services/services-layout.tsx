import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import useNavigationStore from "@/stores/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import { ServiceCategoryList } from "./service-category-list";
import { ServiceCard } from "./service-card";
import { ServiceDialog } from "./service-dialog";
import { ServiceDeleteDialog } from "./service-delete-dialog";
import { ServiceCategoryDialog } from "./service-category-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, Plus, Search, X, Filter } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { EmptyState } from "@/components/ui/custom/empty-state";

export function ServicesLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "services");

  const categories = useQuery(api.serviceCategories.queries.listCategories);
  const {
    results: services,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(api.services.queries.listServices, {}, { initialNumItems: 50 });

  const sentinelRef = useInfiniteScroll(loadMore, paginationStatus);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editServiceTarget, setEditServiceTarget] = useState<{
    _id: Id<"services">;
    name: string;
    description?: string;
    categoryId?: Id<"serviceCategories">;
    price: number;
    currency: string;
    billingType: "one_time" | "recurring";
    recurringInterval?: string;
    duration?: string;
    status: "active" | "inactive";
  } | null>(null);
  const [editCategoryTarget, setEditCategoryTarget] = useState<{
    _id: Id<"serviceCategories">;
    name: string;
    color: string;
  } | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<Id<"services"> | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Id<"serviceCategories"> | null>(null);

  // Category counts from loaded services
  const counts = useMemo(() => {
    if (!services) return {};
    const map: Record<string, number> = {};
    let generalCount = 0;
    for (const s of services) {
      if (s.categoryId) {
        map[s.categoryId] = (map[s.categoryId] ?? 0) + 1;
      } else {
        generalCount++;
      }
    }
    if (generalCount > 0) {
      map["general"] = generalCount;
    }
    return map;
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    if (paginationStatus === "LoadingFirstPage") return undefined;
    let result = services;

    if (activeFilter === "general") {
      result = result.filter((s) => !s.categoryId);
    } else if (activeFilter) {
      result = result.filter((s) => s.categoryId === activeFilter);
    }

    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(trimmed) ||
          (s.description?.toLowerCase().includes(trimmed) ?? false),
      );
    }
    return result;
  }, [services, activeFilter, searchQuery, paginationStatus]);

  const handleNewService = useCallback(() => {
    setEditServiceTarget(null);
    setIsServiceDialogOpen(true);
    if (isMobile) setIsFilterOpen(false);
  }, [isMobile]);

  const handleEditService = useCallback(
    (id: Id<"services">) => {
      const service = services.find((s) => s._id === id);
      if (!service) return;
      setEditServiceTarget({
        _id: service._id,
        name: service.name,
        description: service.description,
        categoryId: service.categoryId,
        price: service.price,
        currency: service.currency,
        billingType: service.billingType,
        recurringInterval: service.recurringInterval,
        duration: service.duration,
        status: service.status,
      });
      setIsServiceDialogOpen(true);
    },
    [services],
  );

  const handleDeleteService = useCallback((id: Id<"services">) => {
    setDeleteServiceTarget(id);
  }, []);

  const handleNewCategory = useCallback(() => {
    setEditCategoryTarget(null);
    setIsCategoryDialogOpen(true);
  }, []);

  const handleEditCategory = useCallback(
    (id: Id<"serviceCategories">) => {
      const category = categories?.find((c) => c._id === id);
      if (!category) return;
      setEditCategoryTarget({
        _id: category._id,
        name: category.name,
        color: category.color,
      });
      setIsCategoryDialogOpen(true);
    },
    [categories],
  );

  const handleDeleteCategory = useCallback((id: Id<"serviceCategories">) => {
    setDeleteCategoryTarget(id);
  }, []);

  // Mobile top bar actions
  useEffect(() => {
    if (!isActive) return;
    if (!isMobile) {
      setTopBarActions(null);
      return;
    }
    setTopBarActions(
      <>
        <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)}>
          <Filter className="size-4.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon" />}>
            <Plus className="size-4.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={handleNewService}>
              {t("actions.newService")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNewCategory}>
              {t("actions.newCategory")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>,
    );
  }, [isActive, isMobile, setTopBarActions, handleNewService, handleNewCategory, t]);

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">{t("labels.services")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <div className="relative">
                    <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("labels.searchServices")}
                      className="pl-9!"
                    />
                  </div>
                  <Button
                    variant="default"
                    onClick={handleNewService}
                    className="w-full justify-center"
                  >
                    {t("actions.newService")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={(categories?.length ?? 0) + 1} visible={isActive}>
                    <ServiceCategoryList
                      activeFilter={activeFilter}
                      onSelectFilter={setActiveFilter}
                      counts={counts}
                      categories={categories ?? []}
                      totalCount={services.length}
                      onEditCategory={handleEditCategory}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  </AnimatedList>
                </div>
                <div className="shrink-0 px-4 pb-4">
                  <Button
                    variant="outline"
                    onClick={handleNewCategory}
                    className="w-full justify-center"
                  >
                    {t("actions.newCategory")}
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Main area — cards grid */}
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
            {filteredServices === undefined ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : filteredServices.length === 0 ? (
              <EmptyState icon={Briefcase} message={t("empty.noServicesFound")} />
            ) : (
              <div className="p-4 space-y-4">
                <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" itemCount={filteredServices.length} dataKey={activeFilter} visible={isActive}>
                  {filteredServices.map((service) => (
                    <ServiceCard
                      key={service._id}
                      service={service}
                      categories={categories ?? []}
                      onEditRequest={handleEditService}
                      onDeleteRequest={handleDeleteService}
                    />
                  ))}
                </AnimatedList>
                <div ref={sentinelRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      <ServiceDialog
        open={isServiceDialogOpen}
        onOpenChange={setIsServiceDialogOpen}
        editService={editServiceTarget}
      />

      <ServiceDeleteDialog
        open={!!deleteServiceTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteServiceTarget(null);
        }}
        serviceId={deleteServiceTarget}
      />

      <ServiceCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editCategory={editCategoryTarget}
      />

      {deleteCategoryTarget && (
        <ServiceDeleteDialog
          open={!!deleteCategoryTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteCategoryTarget(null);
          }}
          categoryId={deleteCategoryTarget}
        />
      )}

      {/* Filter drawer — mobile only */}
      {isMobile && (
        <Drawer direction="right" open={isFilterOpen} onOpenChange={setIsFilterOpen} handleOnly={true}>
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <span className="font-heading text-base font-medium">{t("labels.services")}</span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="relative mb-4">
                <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("labels.searchServices")}
                  className="pl-9!"
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList className="space-y-2 w-full" itemCount={(categories?.length ?? 0) + 1} visible={isActive}>
                  <ServiceCategoryList
                    activeFilter={activeFilter}
                    onSelectFilter={(filter) => {
                      setActiveFilter(filter);
                      setIsFilterOpen(false);
                    }}
                    counts={counts}
                    categories={categories ?? []}
                    totalCount={services.length}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                  />
                </AnimatedList>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
