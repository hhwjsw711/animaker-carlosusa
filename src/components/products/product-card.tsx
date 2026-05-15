import { memo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import { formatCurrency } from "@/lib/format-currency";
import { Ellipsis, ChevronLeft, ChevronRight, Package } from "lucide-react";

interface ProductCardProps {
  product: Doc<"products"> & { photoUrls: (string | null)[] };
  categories: Doc<"productCategories">[];
  onEditRequest: (id: Id<"products">) => void;
  onDeleteRequest: (id: Id<"products">) => void;
}

export const ProductCard = memo(function ProductCard({
  product,
  categories,
  onEditRequest,
  onDeleteRequest,
}: ProductCardProps) {
  const { t } = useTranslation();
  const updateProduct = useMutation(api.products.mutations.updateProduct);

  const category = product.categoryId
    ? categories.find((c) => c._id === product.categoryId)
    : null;
  const colorClass = category?.color ?? "bg-muted-foreground";

  const photos = product.photoUrls.filter((u): u is string => u !== null);

  const handleToggleStatus = () => {
    updateProduct({
      productId: product._id,
      status: product.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <Card size="sm" className="relative overflow-hidden pt-0!">
      {/* Photo carousel / placeholder */}
      {photos.length > 0 ? (
        <PhotoCarousel photos={photos} />
      ) : (
        <div className="w-full shrink-0 aspect-square bg-muted flex items-center justify-center">
          <Package className="size-10 text-muted-foreground" />
        </div>
      )}

      <CardContent className="flex flex-row gap-2 flex-1">
        {/* Color bar */}
        <div className={`w-1 rounded-full shrink-0 min-h-10 ${colorClass}`} />

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate line-clamp-1">{product.name}</p>
              <p className="truncate line-clamp-1">{formatCurrency(product.price, product.currency)}</p>
              {product.description && (
                <p className="text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div onClick={(e) => e.stopPropagation()}>
                <LazyDropdownMenu
                  triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                  triggerContent={<Ellipsis className="size-4.5" />}
                  contentProps={{ align: "end", sideOffset: 4 }}
                >
                  <DropdownMenuItem onClick={() => onEditRequest(product._id)}>
                    {t("actions.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    {product.status === "active" ? t("status.inactive") : t("status.active")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDeleteRequest(product._id)}>
                    {t("actions.delete")}
                  </DropdownMenuItem>
                </LazyDropdownMenu>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Badge variant="secondary" className="text-xs">
              {category?.name ?? t("labels.general")}
            </Badge>
            {product.sku && (
              <Badge variant="outline" className="text-xs">
                {product.sku}
              </Badge>
            )}
            {product.status === "inactive" && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {t("status.inactive")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/* ── Photo Carousel ─────────────────────────────────────────────────────── */

function PhotoCarousel({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);

  const prev = useCallback(() => {
    setIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  return (
    <div className="relative w-full shrink-0 aspect-square bg-muted overflow-hidden group">
      <img
        src={photos[index]}
        alt=""
        className="w-full h-full object-cover"
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-1 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-full bg-background/70 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-1 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center rounded-full bg-background/70 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`size-1.5 rounded-full cursor-pointer transition-colors ${
                  i === index ? "bg-foreground" : "bg-foreground/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
