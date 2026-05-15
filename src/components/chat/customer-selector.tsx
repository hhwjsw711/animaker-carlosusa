import { useCallback, useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Users, Search } from "lucide-react";

interface CustomerSelectorProps {
  selectedCustomerId: Id<"customers"> | null;
  onSelect: (customerId: Id<"customers"> | null) => void;
}

interface CustomerOption {
  value: string;
  label: string;
}

const GENERAL_VALUE = "__general__";

export function CustomerSelector({ selectedCustomerId, onSelect }: CustomerSelectorProps) {
  const { t } = useTranslation();
  const { results: customers } = usePaginatedQuery(
    api.customers.queries.listCustomers,
    {},
    { initialNumItems: 50 },
  );

  const items: CustomerOption[] = useMemo(() => [
    { value: GENERAL_VALUE, label: t("labels.general") },
    ...customers.map((c) => ({ value: c._id, label: c.name })),
  ], [customers, t]);

  const activeValue = selectedCustomerId ?? GENERAL_VALUE;
  const selectedLabel = items.find((i) => i.value === activeValue)?.label ?? t("labels.general");
  const currentItem = items.find((i) => i.value === activeValue) ?? items[0];

  const handleValueChange = useCallback(
    (value: CustomerOption | null) => {
      if (!value || value.value === GENERAL_VALUE) {
        onSelect(null);
      } else {
        onSelect(value.value as Id<"customers">);
      }
    },
    [onSelect],
  );

  return (
    <Combobox
      items={items}
      value={currentItem}
      onValueChange={handleValueChange}
    >
      <ComboboxTrigger
        data-slot="select-trigger"
        className="flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent text-sm whitespace-nowrap outline-none select-none dark:bg-input/30 dark:hover:bg-input/50 cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          <Users className="size-4.5 shrink-0" />
          <span className="truncate">{selectedLabel}</span>
        </span>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder={t("labels.selectCustomer")} showTrigger={false}>
          <InputGroupAddon align="inline-start">
            <Search className="size-4.5" />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxEmpty>{t("empty.noCustomersFound")}</ComboboxEmpty>
        <ComboboxList className="p-0!">
          {(item: CustomerOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
