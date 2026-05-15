import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "../../../convex/_generated/dataModel";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerSelector } from "@/components/chat/customer-selector";
import { CalendarMonthPicker } from "./calendar-month-picker";

interface CalendarSidebarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  currentMonth: Date;
  onChangeMonth: (date: Date) => void;
  selectedCustomerId: Id<"customers"> | null;
  onSelectCustomer: (customerId: Id<"customers"> | null) => void;
  onNewAppointment: () => void;
  appointmentDates?: Set<string>;
}

function CalendarSidebarContent({
  selectedDate,
  onSelectDate,
  currentMonth,
  onChangeMonth,
  selectedCustomerId,
  onSelectCustomer,
  onNewAppointment,
  appointmentDates,
}: CalendarSidebarProps) {
  const { t } = useTranslation();

  const handleSelectDate = useCallback(
    (date: Date) => {
      onSelectDate(date);
      if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
        onChangeMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    },
    [onSelectDate, currentMonth, onChangeMonth],
  );

  return (
    <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <h2 className="text-base font-medium text-foreground">
          {t("labels.calendar")}
        </h2>
      </div>

      <div className="shrink-0 px-4 pb-4 space-y-2">
        <CustomerSelector
          selectedCustomerId={selectedCustomerId}
          onSelect={onSelectCustomer}
        />
        <Button className="w-full justify-center" onClick={onNewAppointment}>
          {t("actions.newAppointment")}
        </Button>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <CalendarMonthPicker
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          currentMonth={currentMonth}
          onChangeMonth={onChangeMonth}
          appointmentDates={appointmentDates}
        />
      </div>

    </CardContent>
  );
}

export const CalendarSidebar = memo(CalendarSidebarContent);
