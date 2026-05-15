import { cn } from "@/lib/utils";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import { Ellipsis } from "lucide-react";

interface ProductCategoryListProps {
  activeFilter: string | null;
  onSelectFilter: (filter: string | null) => void;
  counts: Record<string, number>;
  categories: Doc<"productCategories">[];
  totalCount: number;
  onEditCategory: (id: Id<"productCategories">) => void;
  onDeleteCategory: (id: Id<"productCategories">) => void;
}

export const ProductCategoryList = memo(function ProductCategoryList({
  activeFilter,
  onSelectFilter,
  counts,
  categories,
  totalCount,
  onEditCategory,
  onDeleteCategory,
}: ProductCategoryListProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* All */}
      <div
        onClick={() => onSelectFilter(null)}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 gap-2 cursor-pointer",
          activeFilter === null && "bg-accent hover:bg-accent",
        )}
      >
        <div className="w-1 rounded-full h-8 bg-muted-foreground" />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.all")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {totalCount} {t("labels.products").toLowerCase()}
          </span>
        </div>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const count = counts[category._id] ?? 0;

        return (
          <div
            key={category._id}
            onClick={() =>
              onSelectFilter(
                activeFilter === category._id ? null : category._id,
              )
            }
            className={cn(
              "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 pr-1 py-1 gap-2 cursor-pointer",
              activeFilter === category._id && "bg-accent hover:bg-accent",
            )}
          >
            <div className={`w-1 rounded-full h-8 ${category.color}`} />
            <div className="flex-1 flex flex-col truncate min-w-0">
              <span className="truncate text-foreground">{category.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {count} {t("labels.products").toLowerCase()}
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <LazyDropdownMenu
                triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                triggerContent={<Ellipsis className="size-4.5" />}
                contentProps={{ align: "end", sideOffset: 4 }}
              >
                <DropdownMenuItem
                  onClick={() => onEditCategory(category._id)}
                >
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteCategory(category._id)}
                >
                  {t("actions.remove")}
                </DropdownMenuItem>
              </LazyDropdownMenu>
            </div>
          </div>
        );
      })}
    </>
  );
});
