import type { TFunction } from "i18next";

const DAYS_OF_WEEK = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

export function formatSchedule(
  task: { repeatType: string; scheduledTime: string; weekDay?: number; monthDay?: number; scheduledDate: number },
  t: TFunction,
): string {
  const time = task.scheduledTime;

  if (task.repeatType === "daily") {
    return t("labels.dailyAt", { time });
  }
  if (task.repeatType === "weekly" && task.weekDay !== undefined) {
    const day = t(`labels.${DAYS_OF_WEEK[task.weekDay]}`);
    return t("labels.weeklyOnAt", { day, time });
  }
  if (task.repeatType === "monthly" && task.monthDay !== undefined) {
    return t("labels.monthlyOnAt", { day: task.monthDay, time });
  }

  const date = new Date(task.scheduledDate).toLocaleDateString();
  return t("labels.onceOnAt", { date, time });
}

export function isTaskExpired(expirationDate?: number): boolean {
  return expirationDate !== undefined && Date.now() > expirationDate;
}
