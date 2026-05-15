import { createFileRoute } from "@tanstack/react-router";
import { CalendarLayout } from "@/components/calendar/calendar-layout";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarLayout,
});
