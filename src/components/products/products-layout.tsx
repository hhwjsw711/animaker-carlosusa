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
import { ProductCategoryList } from "./product-category-list";
import { ProductCard } from "./product-card";
import { ProductDialog } from "./product-dialog";
import { ProductDeleteDialog } from "./product-delete-dialog";
import { ProductCategoryDialog } from "./product-category-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, Plus, Search, X, Filter } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { EmptyState } from "@/components/ui/custom/empty-state";

export function ProductsLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "products");

  const categories = useQuery(api.productCategories.queries.listCategories);
  const {
    results: products,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(api.products.queries.listProducts, {}, { initialNumItems: 50 });

  const sentinelRef = useInfiniteScroll(loadMore, paginationStatus);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editProductTarget, setEditProductTarget] = useState<{
    _id: Id<"products">;
    name: string;
    description?: string;
    categoryId?: Id<"productCategories">;
    sku?: string;
    price: number;
    currency: string;
    status: "active" | "inactive";
  } | null>(null);
  const [editCategoryTarget, setEditCategoryTarget] = useState<{
    _id: Id<"productCategories">;
    name: string;
    color: string;
  } | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Id<"products"> | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Id<"productCategories"> | null>(null);

  // Category counts from loaded products
  const counts = useMemo(() => {
    if (!products) return {};
    const map: Record<string, number> = {};
    let generalCount = 0;
    for (const p of products) {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] ?? 0) + 1;
      } else {
        generalCount++;
      }
    }
    if (generalCount > 0) {
      map["general"] = generalCount;
    }
    return map;
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (paginationStatus === "LoadingFirstPage") return undefined;
    let result = products;

    if (activeFilter === "general") {
      result = result.filter((p) => !p.categoryId);
    } else if (activeFilter) {
      result = result.filter((p) => p.categoryId === activeFilter);
    }

    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          (p.description?.toLowerCase().includes(trimmed) ?? false) ||
          (p.sku?.toLowerCase().includes(trimmed) ?? false),
      );
    }
    return result;
  }, [products, activeFilter, searchQuery, paginationStatus]);

  const handleNewProduct = useCallback(() => {
    setEditProductTarget(null);
    setIsProductDialogOpen(true);
    if (isMobile) setIsFilterOpen(false);
  }, [isMobile]);

  const handleEditProduct = useCallback(
    (id: Id<"products">) => {
      const product = products.find((p) => p._id === id);
      if (!product) return;
      setEditProductTarget({
        _id: product._id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        sku: product.sku,
        price: product.price,
        currency: product.currency,
        status: product.status,
      });
      setIsProductDialogOpen(true);
    },
    [products],
  );

  const handleDeleteProduct = useCallback((id: Id<"products">) => {
    setDeleteProductTarget(id);
  }, []);

  const handleNewCategory = useCallback(() => {
    setEditCategoryTarget(null);
    setIsCategoryDialogOpen(true);
  }, []);

  const handleEditCategory = useCallback(
    (id: Id<"productCategories">) => {
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

  const handleDeleteCategory = useCallback((id: Id<"productCategories">) => {
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
            <DropdownMenuItem onClick={handleNewProduct}>
              {t("actions.newProduct")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNewCategory}>
              {t("actions.newCategory")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>,
    );
  }, [isActive, isMobile, setTopBarActions, handleNewProduct, handleNewCategory, t]);

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">{t("labels.products")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <div className="relative">
                    <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("labels.searchProducts")}
                      className="pl-9!"
                    />
                  </div>
                  <Button
                    variant="default"
                    onClick={handleNewProduct}
                    className="w-full justify-center"
                  >
                    {t("actions.newProduct")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={(categories?.length ?? 0) + 1} visible={isActive}>
                    <ProductCategoryList
                      activeFilter={activeFilter}
                      onSelectFilter={setActiveFilter}
                      counts={counts}
                      categories={categories ?? []}
                      totalCount={products.length}
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
            {filteredProducts === undefined ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState icon={Package} message={t("empty.noProductsFound")} />
            ) : (
              <div className="p-4 space-y-4">
                <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" itemCount={filteredProducts.length} dataKey={activeFilter} visible={isActive}>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      categories={categories ?? []}
                      onEditRequest={handleEditProduct}
                      onDeleteRequest={handleDeleteProduct}
                    />
                  ))}
                </AnimatedList>
                <div ref={sentinelRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      <ProductDialog
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        editProduct={editProductTarget}
      />

      <ProductDeleteDialog
        open={!!deleteProductTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteProductTarget(null);
        }}
        productId={deleteProductTarget}
      />

      <ProductCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        editCategory={editCategoryTarget}
      />

      {deleteCategoryTarget && (
        <ProductDeleteDialog
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
                <span className="font-heading text-base font-medium">{t("labels.products")}</span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="relative mb-4">
                <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("labels.searchProducts")}
                  className="pl-9!"
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList className="space-y-2 w-full" itemCount={(categories?.length ?? 0) + 1} visible={isActive}>
                  <ProductCategoryList
                    activeFilter={activeFilter}
                    onSelectFilter={(filter) => {
                      setActiveFilter(filter);
                      setIsFilterOpen(false);
                    }}
                    counts={counts}
                    categories={categories ?? []}
                    totalCount={products.length}
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
