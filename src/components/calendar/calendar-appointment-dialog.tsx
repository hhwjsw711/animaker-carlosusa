import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CustomerSelector } from "@/components/chat/customer-selector";
import Spinner from "@/components/ui/custom/spinner";
import { applyMask, DATE_MASKS } from "@/lib/date-mask";
import { displayToIsoAllowFuture } from "@/lib/billing-utils";
import type { AppointmentData } from "./calendar-appointment-card";

interface CalendarAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAppointment?: AppointmentData | null;
  defaultDate?: Date;
  defaultHour?: number;
}

const TIME_MASK = "##:##";

const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

const STATUS_LABEL_MAP: Record<string, string> = {
  scheduled: "status.scheduled",
  confirmed: "status.confirmed",
  completed: "status.completed",
  cancelled: "status.cancelled",
  no_show: "status.noShow",
};

function dateToDisplay(date: Date, language: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (language === "zh-CN") return `${y}/${m}/${d}`;
  if (language === "pt-BR") return `${d}/${m}/${y}`;
  return `${m}/${d}/${y}`;
}

function timeToDisplay(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseTimeDisplay(time: string): { hours: number; minutes: number } | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const hours = parseInt(time.slice(0, 2), 10);
  const minutes = parseInt(time.slice(3, 5), 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function CalendarAppointmentDialog({
  open,
  onOpenChange,
  editAppointment,
  defaultDate,
  defaultHour,
}: CalendarAppointmentDialogProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const dateMask = DATE_MASKS[language] ?? DATE_MASKS["en-US"];

  const createAppointment = useMutation(api.appointments.mutations.createAppointment);
  const updateAppointment = useMutation(api.appointments.mutations.updateAppointment);
  const activeServices = useQuery(api.services.queries.listActiveServicesLight);

  const [customerId, setCustomerId] = useState<Id<"customers"> | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [dateDisplay, setDateDisplay] = useState("");
  const [startTimeDisplay, setStartTimeDisplay] = useState("");
  const [endTimeDisplay, setEndTimeDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("scheduled");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editAppointment;

  const serviceItems = useMemo(() => {
    const map: Record<string, string> = {};
    activeServices?.forEach((s) => { map[s._id] = s.name; });
    return map;
  }, [activeServices]);

  const statusItems = useMemo(() => {
    const map: Record<string, string> = {};
    APPOINTMENT_STATUSES.forEach((s) => { map[s] = t(STATUS_LABEL_MAP[s]); });
    return map;
  }, [t]);

  useEffect(() => {
    if (open && editAppointment) {
      setCustomerId(editAppointment.customerId);
      setServiceId(editAppointment.serviceId);
      const start = new Date(editAppointment.startTime);
      const end = new Date(editAppointment.endTime);
      setDateDisplay(dateToDisplay(start, language));
      setStartTimeDisplay(timeToDisplay(start));
      setEndTimeDisplay(timeToDisplay(end));
      setNotes(editAppointment.notes ?? "");
      setStatus(editAppointment.status);
      setError(false);
    } else if (open) {
      setCustomerId(null);
      setServiceId("");
      const d = defaultDate ?? new Date();
      setDateDisplay(dateToDisplay(d, language));
      const hour = defaultHour ?? new Date().getHours();
      setStartTimeDisplay(`${String(hour).padStart(2, "0")}:00`);
      setEndTimeDisplay(`${String(Math.min(hour + 1, 23)).padStart(2, "0")}:00`);
      setNotes("");
      setStatus("scheduled");
      setError(false);
    }
  }, [open, editAppointment, defaultDate, defaultHour, language]);

  const handleSave = useCallback(async () => {
    if (!customerId || !serviceId) return;

    const iso = displayToIsoAllowFuture(dateDisplay, language);
    if (!iso) return;

    const startParsed = parseTimeDisplay(startTimeDisplay);
    const endParsed = parseTimeDisplay(endTimeDisplay);
    if (!startParsed || !endParsed) return;

    const [year, month, day] = iso.split("-").map(Number);
    const startMs = new Date(year, month - 1, day, startParsed.hours, startParsed.minutes).getTime();
    const endMs = new Date(year, month - 1, day, endParsed.hours, endParsed.minutes).getTime();

    if (endMs <= startMs) return;

    setError(false);
    setIsSaving(true);
    try {
      if (isEdit && editAppointment) {
        await updateAppointment({
          appointmentId: editAppointment._id,
          customerId,
          serviceId: serviceId as Id<"services">,
          startTime: startMs,
          endTime: endMs,
          status: status as typeof APPOINTMENT_STATUSES[number],
          notes: notes.trim() || undefined,
        });
      } else {
        await createAppointment({
          customerId,
          serviceId: serviceId as Id<"services">,
          startTime: startMs,
          endTime: endMs,
          notes: notes.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    customerId,
    serviceId,
    dateDisplay,
    startTimeDisplay,
    endTimeDisplay,
    notes,
    status,
    language,
    isEdit,
    editAppointment,
    createAppointment,
    updateAppointment,
    onOpenChange,
  ]);

  const canSave =
    !!customerId &&
    !!serviceId &&
    displayToIsoAllowFuture(dateDisplay, language) !== null &&
    /^\d{2}:\d{2}$/.test(startTimeDisplay) &&
    /^\d{2}:\d{2}$/.test(endTimeDisplay);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSaving) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {error
              ? t(isEdit ? "errors.updateAppointmentFailed" : "errors.createAppointmentFailed")
              : isEdit
                ? t("actions.edit")
                : t("actions.newAppointment")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label>{t("labels.customer")}</Label>
            <CustomerSelector
              selectedCustomerId={customerId}
              onSelect={setCustomerId}
            />
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <Label>{t("labels.service")}</Label>
            <Select value={serviceId} onValueChange={setServiceId} items={serviceItems}>
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue placeholder={t("labels.selectService")} />
              </SelectTrigger>
              <SelectContent>
                {activeServices?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>{t("labels.date")}</Label>
            <Input
              value={dateDisplay}
              onChange={(e) => setDateDisplay(applyMask(e.target.value, dateMask.mask))}
              placeholder={dateMask.placeholder}
              disabled={isSaving}
            />
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("labels.startTime")}</Label>
              <Input
                value={startTimeDisplay}
                onChange={(e) => setStartTimeDisplay(applyMask(e.target.value, TIME_MASK))}
                placeholder="HH:MM"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("labels.endTime")}</Label>
              <Input
                value={endTimeDisplay}
                onChange={(e) => setEndTimeDisplay(applyMask(e.target.value, TIME_MASK))}
                placeholder="HH:MM"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label>{t("labels.status")}</Label>
              <Select value={status} onValueChange={setStatus} items={statusItems}>
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(STATUS_LABEL_MAP[s])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t("labels.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving}
              className="min-h-20 max-h-40 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? <Spinner size={5} /> : t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
