import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import useNavigationStore from "@/stores/navigation";
import useCustomerSelectionStore from "@/stores/customer-selection";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import Spinner from "@/components/ui/custom/spinner";
import { CustomerSelector } from "@/components/chat/customer-selector";
import { CalendarSidebar } from "./calendar-sidebar";
import { CalendarDayView } from "./calendar-day-view";
import { CalendarMonthPicker } from "./calendar-month-picker";
import { CalendarAppointmentDialog } from "./calendar-appointment-dialog";
import type { AppointmentData } from "./calendar-appointment-card";
import { Filter, X } from "lucide-react";

export function CalendarLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "calendar");

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  // Global, persisted customer filter shared with chat/customers/finance/etc.
  const { selectedCustomerId, setSelectedCustomerId } = useCustomerSelectionStore();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<AppointmentData | null>(null);
  const [defaultHour, setDefaultHour] = useState<number | undefined>(undefined);

  const dayBounds = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { dayStart: start.getTime(), dayEnd: end.getTime() + 1 };
  }, [selectedDate]);

  const monthBounds = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const monthStart = new Date(y, m, 1).getTime();
    const monthEnd = new Date(y, m + 1, 1).getTime();
    return { monthStart, monthEnd };
  }, [currentMonth]);

  const appointments = useQuery(api.appointments.queries.listByDay, {
    dayStart: dayBounds.dayStart,
    dayEnd: dayBounds.dayEnd,
    customerId: selectedCustomerId ?? undefined,
  });

  const monthAppointmentTimes = useQuery(api.appointments.queries.listDaysWithAppointments, {
    monthStart: monthBounds.monthStart,
    monthEnd: monthBounds.monthEnd,
    customerId: selectedCustomerId ?? undefined,
  });

  const appointmentDates = useMemo(() => {
    if (!monthAppointmentTimes) return undefined;
    const set = new Set<string>();
    for (const ts of monthAppointmentTimes) {
      const d = new Date(ts);
      set.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
    }
    return set;
  }, [monthAppointmentTimes]);

  const handleNewAppointment = useCallback(() => {
    setEditAppointment(null);
    setDefaultHour(undefined);
    setIsDialogOpen(true);
  }, []);

  const handleClickAppointment = useCallback((appointment: AppointmentData) => {
    setEditAppointment(appointment);
    setDefaultHour(undefined);
    setIsDialogOpen(true);
  }, []);

  const handleClickTimeSlot = useCallback((hour: number) => {
    setEditAppointment(null);
    setDefaultHour(hour);
    setIsDialogOpen(true);
  }, []);

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

  const isLoading = appointments === undefined;

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CalendarSidebar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                currentMonth={currentMonth}
                onChangeMonth={setCurrentMonth}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
                onNewAppointment={handleNewAppointment}
                appointmentDates={appointmentDates}
              />
            </div>
          </div>

          {/* Main area */}
          <div className="flex flex-1 flex-col min-h-0 p-0">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <CalendarDayView
                selectedDate={selectedDate}
                appointments={(appointments ?? []) as AppointmentData[]}
                onClickAppointment={handleClickAppointment}
                onClickTimeSlot={handleClickTimeSlot}
              />
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
                  {t("labels.calendar")}
                </span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="shrink-0 mb-4 space-y-2">
                <CustomerSelector
                  selectedCustomerId={selectedCustomerId}
                  onSelect={setSelectedCustomerId}
                />
                <Button
                  className="w-full justify-center"
                  onClick={() => {
                    setIsFilterOpen(false);
                    handleNewAppointment();
                  }}
                >
                  {t("actions.newAppointment")}
                </Button>
              </div>
              <div className="shrink-0 mb-4">
                <CalendarMonthPicker
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
                      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                    }
                    setIsFilterOpen(false);
                  }}
                  currentMonth={currentMonth}
                  onChangeMonth={setCurrentMonth}
                  appointmentDates={appointmentDates}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Appointment create/edit dialog */}
      <CalendarAppointmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editAppointment={editAppointment}
        defaultDate={selectedDate}
        defaultHour={defaultHour}
      />

    </>
  );
}
