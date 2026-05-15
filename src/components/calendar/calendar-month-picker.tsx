import { memo, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarMonthPickerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  currentMonth: Date;
  onChangeMonth: (date: Date) => void;
  appointmentDates?: Set<string>;
}

const WEEKDAY_KEYS = [
  "labels.sunday",
  "labels.monday",
  "labels.tuesday",
  "labels.wednesday",
  "labels.thursday",
  "labels.friday",
  "labels.saturday",
] as const;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function CalendarMonthPickerContent({
  selectedDate,
  onSelectDate,
  currentMonth,
  onChangeMonth,
  appointmentDates,
}: CalendarMonthPickerProps) {
  const { t } = useTranslation();
  const today = useMemo(() => new Date(), []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];

    for (let i = 0; i < startOffset; i++) {
      const prevDate = new Date(year, month, -startOffset + i + 1);
      cells.push(prevDate);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }

    while (cells.length % 7 !== 0) {
      const nextDate = new Date(year, month + 1, cells.length - startOffset - daysInMonth + 1);
      cells.push(nextDate);
    }

    const result: Date[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7) as Date[]);
    }
    return result;
  }, [year, month]);

  const handlePrevMonth = useCallback(() => {
    onChangeMonth(new Date(year, month - 1, 1));
  }, [year, month, onChangeMonth]);

  const handleNextMonth = useCallback(() => {
    onChangeMonth(new Date(year, month + 1, 1));
  }, [year, month, onChangeMonth]);

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(currentMonth);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="size-4.5" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="size-4.5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center justify-center min-h-10 text-xs text-muted-foreground font-medium uppercase"
          >
            {t(key).slice(0, 2)}
          </div>
        ))}

        {weeks.flat().map((date, idx) => {
          const isCurrentMonth = date.getMonth() === month;
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const hasAppointment = appointmentDates?.has(toDateKey(date));

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative flex items-center justify-center min-h-12 w-full text-sm rounded-md transition-colors cursor-pointer",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && !isSelected && "text-foreground  bg-accent/20 hover:bg-accent/40",
                isSelected && "bg-primary text-primary-foreground",
                isToday && !isSelected && "border border-primary/50",
              )}
            >
              {date.getDate()}
              {hasAppointment && !isSelected && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const CalendarMonthPicker = memo(CalendarMonthPickerContent);
