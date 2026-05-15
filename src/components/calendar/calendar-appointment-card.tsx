import { memo, useMemo } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { CUSTOMER_COLORS, type CustomerColor } from "@/lib/customer-colors";

export interface AppointmentData {
  _id: Id<"appointments">;
  customerId: Id<"customers">;
  serviceId: Id<"services">;
  customerName: string;
  customerColor?: string;
  serviceName: string;
  title?: string;
  startTime: number;
  endTime: number;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string;
}

interface CalendarAppointmentCardProps {
  appointment: AppointmentData;
  onClick: (appointment: AppointmentData) => void;
}

function formatTimeShort(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CalendarAppointmentCardContent({
  appointment,
  onClick,
}: CalendarAppointmentCardProps) {
  const timeLabel = useMemo(() => {
    return `${formatTimeShort(appointment.startTime)} - ${formatTimeShort(appointment.endTime)}`;
  }, [appointment.startTime, appointment.endTime]);

  const barColor = appointment.customerColor
    ? CUSTOMER_COLORS[appointment.customerColor as CustomerColor] ?? "bg-muted-foreground"
    : "bg-muted-foreground";

  return (
    <Card
      size="sm"
      className="cursor-pointer overflow-hidden"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(appointment);
      }}
    >
      <CardContent className="flex flex-row gap-2">
        <div className={`w-1 rounded-full shrink-0 min-h-6 ${barColor}`} />
        <div className="flex flex-col min-w-0 justify-center gap-0">
          <p className="text-xs text-muted-foreground truncate">{timeLabel}</p>
          <p className="font-semibold truncate">{appointment.customerName}</p>
          <p className="text-xs text-muted-foreground truncate">{appointment.serviceName}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export const CalendarAppointmentCard = memo(CalendarAppointmentCardContent);
