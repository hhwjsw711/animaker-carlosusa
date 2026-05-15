/**
 * Calculate the next due date based on a recurring interval.
 * @param currentDueDate ISO date string (YYYY-MM-DD)
 * @param interval Recurring interval type
 * @returns Next due date as ISO string (YYYY-MM-DD)
 */
/**
 * Add months to a date, clamping to the last day of the target month
 * to avoid overflow (e.g. Jan 31 + 1 month → Feb 28, not Mar 3).
 */
function addMonths(date: Date, months: number): void {
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + months);
  // If the day changed, we overflowed into the next month — clamp back
  if (date.getDate() !== originalDay) {
    date.setDate(0); // last day of the previous month
  }
}

export function calculateNextDueDate(
  currentDueDate: string,
  interval: "weekly" | "biweekly" | "monthly" | "quarterly" | "semiannual" | "annual",
): string {
  const [year, month, day] = currentDueDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  switch (interval) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      addMonths(date, 1);
      break;
    case "quarterly":
      addMonths(date, 3);
      break;
    case "semiannual":
      addMonths(date, 6);
      break;
    case "annual":
      addMonths(date, 12);
      break;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
