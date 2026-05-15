import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import useNavigationStore from "@/stores/navigation";
import useCustomerSelectionStore from "@/stores/customer-selection";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import { CustomerSelector } from "@/components/chat/customer-selector";
import { CustomerBillingSummary } from "@/components/customers/customer-billing-summary";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { FinanceFilterList, type FinanceFilter } from "./finance-filter-list";
import { FinanceTable } from "./finance-table";
import { Receipt, Filter, X } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";

type ServiceTransaction = FunctionReturnType<
  typeof api.serviceTransactions.queries.listAll
>[number];

type ProductTransaction = FunctionReturnType<
  typeof api.productTransactions.queries.listAll
>[number];

export type UnifiedFinanceTransaction =
  | (ServiceTransaction & { _type: "service" })
  | (ProductTransaction & { _type: "product" });

export function FinanceLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "finance");

  const [activeFilter, setActiveFilter] = useState<FinanceFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { selectedCustomerId, setSelectedCustomerId } = useCustomerSelectionStore();

  const customerArg = selectedCustomerId
    ? { customerId: selectedCustomerId }
    : {};

  const serviceTransactions = useQuery(
    api.serviceTransactions.queries.listAll,
    customerArg,
  );
  const productTransactions = useQuery(
    api.productTransactions.queries.listAll,
    customerArg,
  );

  const merged = useMemo<UnifiedFinanceTransaction[]>(() => {
    const items: UnifiedFinanceTransaction[] = [];
    if (serviceTransactions) {
      for (const tx of serviceTransactions) {
        items.push({ ...tx, _type: "service" } as UnifiedFinanceTransaction);
      }
    }
    if (productTransactions) {
      for (const tx of productTransactions) {
        items.push({ ...tx, _type: "product" } as UnifiedFinanceTransaction);
      }
    }
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }, [serviceTransactions, productTransactions]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return merged;
    return merged.filter((tx) => tx.status === activeFilter);
  }, [merged, activeFilter]);

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, overdue: 0, paid: 0 };
    for (const tx of merged) {
      c.all++;
      if (tx.status === "pending") c.pending++;
      else if (tx.status === "overdue") c.overdue++;
      else if (tx.status === "paid") c.paid++;
    }
    return c;
  }, [merged]);

  const aggregatedSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaidThisMonth = 0;

    for (const tx of merged) {
      if (tx.status === "pending") {
        totalOutstanding += tx.amount;
      } else if (tx.status === "overdue") {
        totalOverdue += tx.amount;
        totalOutstanding += tx.amount;
      } else if (tx.status === "paid" && tx.paidDate?.startsWith(currentMonth)) {
        totalPaidThisMonth += tx.amount;
      }
    }

    const currency = merged.find((tx) => tx.currency)?.currency ?? "BRL";
    return { totalOutstanding, totalOverdue, totalPaidThisMonth, currency };
  }, [merged]);

  // Mobile top bar actions
  useEffect(() => {
    if (!isActive) return;
    if (!isMobile) {
      setTopBarActions(null);
      return;
    }
    setTopBarActions(
      <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)}>
        <Filter className="size-4.5" />
      </Button>,
    );
  }, [isActive, isMobile, setTopBarActions]);

  const isLoading =
    serviceTransactions === undefined || productTransactions === undefined;

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">
                    {t("labels.finance")}
                  </h2>
                </div>
                <div className="shrink-0 px-4 pb-4">
                  <CustomerSelector
                    selectedCustomerId={selectedCustomerId}
                    onSelect={setSelectedCustomerId}
                  />
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList
                    className="space-y-2 pt-2"
                    itemCount={4}
                    visible={isActive}
                  >
                    <FinanceFilterList
                      activeFilter={activeFilter}
                      onSelectFilter={setActiveFilter}
                      counts={counts}
                    />
                  </AnimatedList>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Main area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-4 gap-4">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Receipt} message={t("empty.noTransactions")} />
            ) : (
              <>
                <CustomerBillingSummary
                  totalOutstanding={aggregatedSummary.totalOutstanding}
                  totalOverdue={aggregatedSummary.totalOverdue}
                  totalPaidThisMonth={aggregatedSummary.totalPaidThisMonth}
                  currency={aggregatedSummary.currency}
                />
                <AnimatedList
                  className="flex flex-col"
                  itemCount={filtered.length}
                  dataKey={`${selectedCustomerId}-${activeFilter}`}
                  visible={isActive}
                >
                  <FinanceTable transactions={filtered} />
                </AnimatedList>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Filter drawer — mobile only */}
      {isMobile && (
        <Drawer
          direction="right"
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          handleOnly={true}
        >
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <span className="font-heading text-base font-medium">
                  {t("labels.finance")}
                </span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="shrink-0 mb-4">
                <CustomerSelector
                  selectedCustomerId={selectedCustomerId}
                  onSelect={setSelectedCustomerId}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList
                  className="space-y-2 w-full"
                  itemCount={4}
                  visible={isActive}
                >
                  <FinanceFilterList
                    activeFilter={activeFilter}
                    onSelectFilter={(filter) => {
                      setActiveFilter(filter);
                      setIsFilterOpen(false);
                    }}
                    counts={counts}
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
