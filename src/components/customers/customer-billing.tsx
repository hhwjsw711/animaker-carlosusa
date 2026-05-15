import { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import {
  type PaymentMethod,
  type TransactionStatus,
} from "@/lib/billing-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt } from "lucide-react";
import { CustomerBillingSummary } from "./customer-billing-summary";
import { CustomerBillingDialog } from "./customer-billing-dialog";
import { CustomerBillingItem } from "./customer-billing-item";
import useNavigationStore from "@/stores/navigation";

type ServiceTransaction = FunctionReturnType<
  typeof api.serviceTransactions.queries.listByCustomer
>[number];

type ProductTransaction = FunctionReturnType<
  typeof api.productTransactions.queries.listByCustomer
>[number];

export type UnifiedTransaction =
  | (ServiceTransaction & { _type: "service" })
  | (ProductTransaction & { _type: "product" });

const STATUS_FILTER_OPTIONS = ["all", "pending", "overdue", "paid", "cancelled"] as const;
const TYPE_FILTER_OPTIONS = ["all", "services", "products"] as const;
type TypeFilter = (typeof TYPE_FILTER_OPTIONS)[number];

interface EditData {
  transactionId: Id<"serviceTransactions">;
  customerServiceId: Id<"customerServices">;
  amount: number;
  dueDate: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  notes?: string;
}

export function CustomerBilling({ customerId }: { customerId: Id<"customers"> }) {
  const { t } = useTranslation();
  const isActive = useNavigationStore((s) => s.activePage === "customers");

  const serviceTransactions = useQuery(api.serviceTransactions.queries.listByCustomer, { customerId });
  const serviceSummary = useQuery(api.serviceTransactions.queries.getBillingSummary, { customerId });
  const productTransactions = useQuery(api.productTransactions.queries.listByCustomer, { customerId });
  const productSummary = useQuery(api.productTransactions.queries.getPurchaseSummary, { customerId });

  const [activeFilter, setActiveFilter] = useState<TransactionStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const statusFilterItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of STATUS_FILTER_OPTIONS) {
      map[f] = f === "all" ? t("labels.allStatuses") : t(`status.${f}` as const);
    }
    return map;
  }, [t]);
  const typeFilterItems = useMemo(() => ({
    all: t("labels.all"),
    services: t("labels.services"),
    products: t("labels.products"),
  }), [t]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);

  // Merge and sort transactions
  const merged = useMemo<UnifiedTransaction[]>(() => {
    const items: UnifiedTransaction[] = [];
    if (typeFilter !== "products" && serviceTransactions) {
      for (const tx of serviceTransactions) {
        items.push({ ...tx, _type: "service" });
      }
    }
    if (typeFilter !== "services" && productTransactions) {
      for (const tx of productTransactions) {
        items.push({ ...tx, _type: "product" });
      }
    }
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }, [serviceTransactions, productTransactions, typeFilter]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return merged;
    return merged.filter((tx) => tx.status === activeFilter);
  }, [merged, activeFilter]);

  // Aggregated summary
  const aggregatedSummary = useMemo(() => {
    const svc = typeFilter !== "products" ? serviceSummary : null;
    const prd = typeFilter !== "services" ? productSummary : null;

    const totalOutstanding = (svc?.totalOutstanding ?? 0) + (prd?.totalPending ?? 0);
    const totalOverdue = svc?.totalOverdue ?? 0;
    const totalPaidThisMonth = (svc?.totalPaidThisMonth ?? 0) + (prd?.totalPaidThisMonth ?? 0);
    const currency = svc?.currency ?? prd?.currency ?? "BRL";

    return { totalOutstanding, totalOverdue, totalPaidThisMonth, currency };
  }, [serviceSummary, productSummary, typeFilter]);

  const handleEdit = useCallback(
    (tx: UnifiedTransaction) => {
      if (tx._type !== "service") return;
      setEditData({
        transactionId: tx._id,
        customerServiceId: tx.customerServiceId,
        amount: tx.amount,
        dueDate: tx.dueDate,
        paymentMethod: tx.paymentMethod as PaymentMethod | undefined,
        reference: tx.reference,
        notes: tx.notes,
      });
      setDialogOpen(true);
    },
    [],
  );

  if (serviceTransactions === undefined || serviceSummary === undefined) {
    return null;
  }

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-12 z-9 bg-background border-b p-4 flex flex-row items-center justify-start gap-2 w-full">
        <Button
          onClick={() => {
            setEditData(null);
            setDialogOpen(true);
          }}
        >
          {t("actions.newTransaction")}
        </Button>
        <Select
          value={activeFilter}
          onValueChange={(v) => setActiveFilter((v ?? "all") as TransactionStatus | "all")}
          items={statusFilterItems}
        >
          <SelectTrigger className="w-full md:w-42">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((f) => (
              <SelectItem key={f} value={f}>
                {f === "all" ? t("labels.allStatuses") : t(`status.${f}` as const)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter((v ?? "all") as TypeFilter)}
          items={typeFilterItems}
        >
          <SelectTrigger className="w-full md:w-42">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((f) => (
              <SelectItem key={f} value={f}>
                {typeFilterItems[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Summary */}
        <CustomerBillingSummary
          totalOutstanding={aggregatedSummary.totalOutstanding}
          totalOverdue={aggregatedSummary.totalOverdue}
          totalPaidThisMonth={aggregatedSummary.totalPaidThisMonth}
          currency={aggregatedSummary.currency}
        />

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} message={t("empty.noTransactions")} />
        ) : (
          <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" itemCount={filtered.length} dataKey={`${customerId}-${activeFilter}-${typeFilter}`} visible={isActive}>
            {filtered.map((tx) => (
              <CustomerBillingItem
                key={`${tx._type}-${tx._id}`}
                transaction={tx}
                currency={aggregatedSummary.currency}
                onEdit={handleEdit}
              />
            ))}
          </AnimatedList>
        )}
      </div>

      {/* Dialog */}
      <CustomerBillingDialog
        customerId={customerId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editData={editData}
      />
    </>
  );
}
