import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CustomerSelector } from "@/components/chat/customer-selector";
import Spinner from "@/components/ui/custom/spinner";
import { handleConvexError } from "@/lib/convex-error-handler";
import { applyMask, DATE_MASKS } from "@/lib/date-mask";

const TIME_MASK = "##:##";

type RepeatType = "none" | "daily" | "weekly" | "monthly";

const DAYS_OF_WEEK = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

export interface AgentData {
  _id: Id<"scheduledTasks">;
  title: string;
  prompt: string;
  repeatType: RepeatType;
  scheduledDate: number;
  scheduledTime: string;
  weekDay?: number;
  monthDay?: number;
  expirationDate?: number;
  customerId?: Id<"customers">;
  autoSendMessages?: boolean;
}

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask?: AgentData | null;
  presetCustomerId?: Id<"customers">;
}

function timestampToDateDisplay(ts: number, language: string): string {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (language === "pt-BR") return `${d}/${m}/${y}`;
  return `${m}/${d}/${y}`;
}

function dateDisplayToTimestamp(display: string, language: string): number | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  let day: number, month: number, year: number;
  if (language === "pt-BR") {
    day = parseInt(digits.slice(0, 2), 10);
    month = parseInt(digits.slice(2, 4), 10);
    year = parseInt(digits.slice(4, 8), 10);
  } else {
    month = parseInt(digits.slice(0, 2), 10);
    day = parseInt(digits.slice(2, 4), 10);
    year = parseInt(digits.slice(4, 8), 10);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2020) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;

  return date.getTime();
}

export function AgentDialog({
  open,
  onOpenChange,
  editTask,
  presetCustomerId,
}: AgentDialogProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const dateMask = DATE_MASKS[language] ?? DATE_MASKS["en-US"];

  const createTask = useMutation(api.agents.mutations.createScheduledTask);
  const updateTask = useMutation(api.agents.mutations.updateScheduledTask);

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [repeatType, setRepeatType] = useState<RepeatType>("none");
  const [dateDisplay, setDateDisplay] = useState("");
  const [timeDisplay, setTimeDisplay] = useState("");
  const [weekDay, setWeekDay] = useState(1);
  const [monthDay, setMonthDay] = useState(1);
  const [expirationDisplay, setExpirationDisplay] = useState("");
  const [customerId, setCustomerId] = useState<string>("_global");
  const [autoSendMessages, setAutoSendMessages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isEdit = !!editTask;

  const repeatItems = useMemo(() => ({
    none: t("labels.noRepeat"),
    daily: t("labels.daily"),
    weekly: t("labels.weekly"),
    monthly: t("labels.monthly"),
  }), [t]);

  const weekDayItems = useMemo(() => {
    const map: Record<string, string> = {};
    DAYS_OF_WEEK.forEach((day, i) => { map[String(i)] = t(`labels.${day}`); });
    return map;
  }, [t]);

  const monthDayItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 1; i <= 31; i++) map[String(i)] = String(i);
    return map;
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editTask) {
      setTitle(editTask.title);
      setPrompt(editTask.prompt);
      setRepeatType(editTask.repeatType);
      setDateDisplay(timestampToDateDisplay(editTask.scheduledDate, language));
      setTimeDisplay(editTask.scheduledTime);
      setWeekDay(editTask.weekDay ?? 1);
      setMonthDay(editTask.monthDay ?? 1);
      setExpirationDisplay(
        editTask.expirationDate
          ? timestampToDateDisplay(editTask.expirationDate, language)
          : "",
      );
      setCustomerId(editTask.customerId ?? "_global");
      setAutoSendMessages(editTask.autoSendMessages ?? false);
    } else {
      setTitle("");
      setPrompt("");
      setRepeatType("none");
      const now = new Date();
      setDateDisplay(timestampToDateDisplay(now.getTime(), language));
      setTimeDisplay(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      );
      setWeekDay(1);
      setMonthDay(1);
      setExpirationDisplay("");
      setCustomerId(presetCustomerId ?? "_global");
      setAutoSendMessages(false);
    }
    setError(false);
  }, [open, editTask, language, presetCustomerId]);

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedTitle || !trimmedPrompt) return;

    const scheduledDate = dateDisplayToTimestamp(dateDisplay, language);
    if (!scheduledDate) return;

    if (!/^\d{2}:\d{2}$/.test(timeDisplay)) return;

    const expirationDate = expirationDisplay
      ? dateDisplayToTimestamp(expirationDisplay, language) ?? undefined
      : undefined;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const resolvedCustomerId = customerId === "_global" ? undefined : customerId;

    setError(false);
    setIsSaving(true);

    try {
      const args = {
        title: trimmedTitle,
        prompt: trimmedPrompt,
        repeatType,
        scheduledDate,
        scheduledTime: timeDisplay,
        timezone,
        ...(repeatType === "weekly" ? { weekDay } : {}),
        ...(repeatType === "monthly" ? { monthDay } : {}),
        ...(expirationDate ? { expirationDate } : {}),
        ...(resolvedCustomerId ? { customerId: resolvedCustomerId as Id<"customers"> } : {}),
        ...(resolvedCustomerId ? { autoSendMessages } : {}),
      };

      if (isEdit && editTask) {
        await updateTask({ taskId: editTask._id, ...args });
      } else {
        await createTask(args);
      }
      onOpenChange(false);
    } catch (err) {
      if (handleConvexError(err)) {
        onOpenChange(false);
        return;
      }
      setError(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    title, prompt, repeatType, dateDisplay, timeDisplay, weekDay, monthDay,
    expirationDisplay, customerId, autoSendMessages, language, isEdit, editTask,
    createTask, updateTask, onOpenChange,
  ]);

  const canSave =
    title.trim() &&
    prompt.trim() &&
    /^\d{2}:\d{2}$/.test(timeDisplay) &&
    dateDisplayToTimestamp(dateDisplay, language) !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isSaving) return;
        onOpenChange(o);
      }}
      modal={false}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {error
              ? t(isEdit ? "errors.updateAgentFailed" : "errors.createAgentFailed")
              : isEdit
                ? t("actions.edit")
                : t("actions.newAgent")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>{t("labels.title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label>{t("labels.prompt")}</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSaving}
              className="min-h-24 max-h-40 resize-none"
            />
          </div>

          {/* Auto-send messages */}
          <div className="flex items-start gap-4 bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-lg">
            <Switch
              checked={autoSendMessages}
              onCheckedChange={setAutoSendMessages}
              disabled={isSaving}
              size="sm"
            />
            <div className="flex flex-col">
              <Label>{t("labels.autoSendMessages")}</Label>
              <span className="text-xs mt-2 text-muted-foreground">
                {t("labels.autoSendMessagesHint")}
              </span>
            </div>
          </div>

          {/* Repeat */}
          <div className="space-y-1.5">
            <Label>{t("labels.repeat")}</Label>
            <Select
              value={repeatType}
              onValueChange={(v) => setRepeatType(v as RepeatType)}
              items={repeatItems}
            >
              <SelectTrigger className="w-full" disabled={isSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("labels.noRepeat")}</SelectItem>
                <SelectItem value="daily">{t("labels.daily")}</SelectItem>
                <SelectItem value="weekly">{t("labels.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("labels.monthly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of week (weekly) */}
          {repeatType === "weekly" && (
            <div className="space-y-1.5">
              <Label>{t("labels.dayOfWeek")}</Label>
              <Select
                value={String(weekDay)}
                onValueChange={(v) => setWeekDay(Number(v))}
                items={weekDayItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, i) => (
                    <SelectItem key={day} value={String(i)}>
                      {t(`labels.${day}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of month (monthly) */}
          {repeatType === "monthly" && (
            <div className="space-y-1.5">
              <Label>{t("labels.dayOfMonth")}</Label>
              <Select
                value={String(monthDay)}
                onValueChange={(v) => setMonthDay(Number(v))}
                items={monthDayItems}
              >
                <SelectTrigger className="w-full" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date + Time */}
          {repeatType === "none" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("labels.date")}</Label>
                <Input
                  value={dateDisplay}
                  onChange={(e) =>
                    setDateDisplay(applyMask(e.target.value, dateMask.mask))
                  }
                  placeholder={dateMask.placeholder}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("labels.time")}</Label>
                <Input
                  value={timeDisplay}
                  onChange={(e) =>
                    setTimeDisplay(applyMask(e.target.value, TIME_MASK))
                  }
                  placeholder="HH:MM"
                  disabled={isSaving}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t("labels.time")}</Label>
              <Input
                value={timeDisplay}
                onChange={(e) =>
                  setTimeDisplay(applyMask(e.target.value, TIME_MASK))
                }
                placeholder="HH:MM"
                disabled={isSaving}
              />
            </div>
          )}


          {/* Customer */}
          {!presetCustomerId && (
            <div className="space-y-1.5">
              <Label>
                {t("labels.customer")}{" "}
                <span className="text-muted-foreground">({t("labels.optional")})</span>
              </Label>
              <CustomerSelector
                selectedCustomerId={customerId === "_global" ? null : customerId as Id<"customers">}
                onSelect={(id) => setCustomerId(id ?? "_global")}
              />
            </div>
          )}

          {/* Expiration date */}
          <div className="space-y-1.5">
            <Label>
              {t("labels.expirationDate")}{" "}
              <span className="text-muted-foreground">({t("labels.optional")})</span>
            </Label>
            <Input
              value={expirationDisplay}
              onChange={(e) =>
                setExpirationDisplay(applyMask(e.target.value, dateMask.mask))
              }
              placeholder={dateMask.placeholder}
              disabled={isSaving}
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
