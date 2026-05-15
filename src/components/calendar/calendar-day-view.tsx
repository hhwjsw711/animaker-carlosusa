import { memo, useState, useMemo, useRef, useEffect, useCallback } from "react";
import { CalendarAppointmentCard, type AppointmentData } from "./calendar-appointment-card";

interface CalendarDayViewProps {
  selectedDate: Date;
  appointments: AppointmentData[];
  onClickAppointment: (appointment: AppointmentData) => void;
  onClickTimeSlot: (hour: number) => void;
}

const MIN_HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function CalendarDayViewContent({
  selectedDate,
  appointments,
  onClickAppointment,
  onClickTimeSlot,
}: CalendarDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hourRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const isToday = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()
    );
  }, [selectedDate]);

  const appointmentsByHour = useMemo(() => {
    const map = new Map<number, AppointmentData[]>();
    for (const apt of appointments) {
      const hour = new Date(apt.startTime).getHours();
      if (!map.has(hour)) map.set(hour, []);
      map.get(hour)!.push(apt);
    }
    for (const apts of map.values()) {
      apts.sort((a, b) => a.startTime - b.startTime);
    }
    return map;
  }, [appointments]);

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const handleTimeSlotClick = useCallback(
    (hour: number) => {
      onClickTimeSlot(hour);
    },
    [onClickTimeSlot],
  );

  useEffect(() => {
    const targetHour = isToday ? Math.max(currentHour - 1, 0) : 8;
    const el = hourRefs.current.get(targetHour);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTop = el.offsetTop;
    }
  }, [selectedDate, isToday, currentHour]);

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative">
          {HOURS.map((hour) => {
            const hourAppointments = appointmentsByHour.get(hour) ?? [];

            return (
              <div
                key={hour}
                ref={(el) => {
                  if (el) hourRefs.current.set(hour, el);
                }}
                className="relative border-t border-border/50 cursor-pointer hover:bg-accent/10 transition-colors"
                style={{ minHeight: MIN_HOUR_HEIGHT }}
                onClick={() => handleTimeSlotClick(hour)}
              >
                <span className="absolute left-4 top-1 text-xs text-muted-foreground select-none">
                  {String(hour).padStart(2, "0")}h
                </span>

                <div className="ml-14 flex flex-col gap-1 py-1 pr-4">
                  {hourAppointments.map((apt) => (
                    <CalendarAppointmentCard
                      key={apt._id}
                      appointment={apt}
                      onClick={onClickAppointment}
                    />
                  ))}
                </div>

                {isToday && hour === currentHour && (
                  <CurrentTimeIndicator />
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function CurrentTimeIndicator() {
  const minutes = new Date().getMinutes();
  const top = (minutes / 60) * MIN_HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <div className="flex-1 h-px bg-primary" />
        <div className="w-2 h-2 rounded-full bg-primary" />
      </div>
    </div>
  );
}

export const CalendarDayView = memo(CalendarDayViewContent);
