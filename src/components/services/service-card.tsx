import { memo } from "react";
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
import { Ellipsis } from "lucide-react";

interface ServiceCardProps {
  service: Doc<"services">;
  categories: Doc<"serviceCategories">[];
  onEditRequest: (id: Id<"services">) => void;
  onDeleteRequest: (id: Id<"services">) => void;
}

export const ServiceCard = memo(function ServiceCard({
  service,
  categories,
  onEditRequest,
  onDeleteRequest,
}: ServiceCardProps) {
  const { t } = useTranslation();
  const updateService = useMutation(api.services.mutations.updateService);

  const category = service.categoryId
    ? categories.find((c) => c._id === service.categoryId)
    : null;
  const colorClass = category?.color ?? "bg-muted-foreground";

  const handleToggleStatus = () => {
    updateService({
      serviceId: service._id,
      status: service.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <Card size="sm" className="relative overflow-hidden">
      <CardContent className="flex flex-row gap-2 h-full">
        {/* Color bar */}
        <div className={`w-1 rounded-full shrink-0 min-h-10 ${colorClass}`} />

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate line-clamp-1">{service.name}</p>
              <p className="truncate line-clamp-1">{formatCurrency(service.price, service.currency)}</p>
              {service.description && (
                <p className="text-muted-foreground line-clamp-2 mt-1">{service.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div onClick={(e) => e.stopPropagation()}>
                <LazyDropdownMenu
                  triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                  triggerContent={<Ellipsis className="size-4.5" />}
                  contentProps={{ align: "end", sideOffset: 4 }}
                >
                  <DropdownMenuItem onClick={() => onEditRequest(service._id)}>
                    {t("actions.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    {service.status === "active" ? t("status.inactive") : t("status.active")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDeleteRequest(service._id)}>
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
            <Badge variant="outline" className="text-xs">
              {service.billingType === "one_time" ? t("labels.oneTime") : t("labels.recurring")}
            </Badge>
            {service.status === "inactive" && (
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
