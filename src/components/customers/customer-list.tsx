import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import Spinner from "@/components/ui/custom/spinner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { CUSTOMER_COLORS, CUSTOMER_COLOR_KEYS, type CustomerColor } from "@/lib/customer-colors";
import { Ellipsis } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "../../../convex/_generated/dataModel";

interface Customer {
  _id: Id<"customers">;
  _creationTime: number;
  name: string;
  color?: string;
}

interface CustomerListProps {
  customers: Customer[] | undefined;
  activeCustomerId: Id<"customers"> | null;
  onSelectCustomer: (id: Id<"customers">) => void;
  onDeleteRequest: (id: Id<"customers">) => void;
  onEditRequest: (id: Id<"customers">) => void;
  onColorChange: (id: Id<"customers">, color: string | undefined) => void;
}

const CustomerListContent = memo(function CustomerListContent({
  customers,
  activeCustomerId,
  onSelectCustomer,
  onDeleteRequest,
  onEditRequest,
  onColorChange,
}: CustomerListProps) {
  const { t } = useTranslation();

  if (customers === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t("empty.noCustomers")}
      </div>
    );
  }

  return (
    <>
      {customers.map((customer) => {
        const isActive = activeCustomerId === customer._id;

        return (
          <div
            key={customer._id}
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 52px" } as React.CSSProperties}
            onClick={() => onSelectCustomer(customer._id)}
            className={cn(
              "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-1 gap-2 cursor-pointer",
              isActive && "bg-accent hover:bg-accent"
            )}
          >
            {customer.color && CUSTOMER_COLORS[customer.color as CustomerColor] && (
              <div className={`w-1 rounded-full h-8 ${CUSTOMER_COLORS[customer.color as CustomerColor]}`}></div>
            )}
            <div className="flex-1 flex flex-col truncate min-w-0">
              <span className="truncate text-foreground flex items-center gap-1">
                {customer.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {formatRelativeTime(customer._creationTime)}
              </span>
            </div>
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <LazyDropdownMenu
                triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                triggerContent={<Ellipsis className="size-4.5" />}
                contentProps={{ align: "end", sideOffset: 4 }}
              >
                <DropdownMenuItem onClick={() => onEditRequest(customer._id)}>
                  {t("actions.rename")}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {t("actions.classify")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <div className="flex items-center gap-1.5 px-1.5 py-1">
                      {CUSTOMER_COLOR_KEYS.map((colorKey) => (
                        <button
                          key={colorKey}
                          onClick={() => onColorChange(customer._id, colorKey)}
                          className={cn(
                            "size-5 rounded-full cursor-pointer ring-offset-background transition-all hover:scale-110",
                            CUSTOMER_COLORS[colorKey],
                            customer.color === colorKey && "ring-2 ring-foreground ring-offset-2"
                          )}
                        />
                      ))}
                    </div>
                    {customer.color && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onColorChange(customer._id, undefined)}>
                          {t("actions.removeColor")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteRequest(customer._id)}>
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

export const CustomerList = CustomerListContent;
