const VALID_TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

export function isValidTimezone(tz: string): boolean {
  return VALID_TIMEZONES.has(tz);
}

/**
 * Convert a local date/time in a given timezone to a UTC timestamp.
 * Handles DST transitions correctly by computing the real offset
 * at the target instant rather than at the guess instant.
 */
function localToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timezone: string,
): number {
  // Start with a UTC guess assuming the local time equals UTC
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0);

  // Find what that guess looks like in the target timezone
  const offset1 = getTimezoneOffsetMs(utcGuess, timezone);
  // Adjust: the real UTC is the guess minus the offset
  const adjusted = utcGuess - offset1;

  // Verify: the adjusted time may have a different offset (DST boundary)
  const offset2 = getTimezoneOffsetMs(adjusted, timezone);
  if (offset1 !== offset2) {
    return utcGuess - offset2;
  }

  return adjusted;
}

/**
 * Returns the timezone offset in milliseconds (local - UTC)
 * for a given UTC timestamp and timezone.
 */
function getTimezoneOffsetMs(utcMs: number, timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);

  const localUtcEquiv = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    0,
  );

  return localUtcEquiv - utcMs;
}

/**
 * Get the current local date parts in a timezone.
 */
function getLocalParts(
  utcMs: number,
  timezone: string,
): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function getDayOfWeekInTimezone(date: Date, timezone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[formatted] ?? 0;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateNextRunTime(
  repeatType: "none" | "daily" | "weekly" | "monthly",
  scheduledTime: string,
  timezone: string,
  weekDay?: number,
  monthDay?: number,
  afterTimestamp?: number,
): number | null {
  if (repeatType === "none") return null;

  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const after = afterTimestamp ?? Date.now();
  const { year, month, day } = getLocalParts(after, timezone);

  if (repeatType === "daily") {
    let candidate = localToUtc(year, month, day, hours, minutes, timezone);
    if (candidate <= after) {
      candidate = localToUtc(year, month, day + 1, hours, minutes, timezone);
    }
    return candidate;
  }

  if (repeatType === "weekly" && weekDay !== undefined) {
    const currentDay = getDayOfWeekInTimezone(new Date(after), timezone);
    const daysUntil = (weekDay - currentDay + 7) % 7;

    let candidate = localToUtc(year, month, day + daysUntil, hours, minutes, timezone);
    if (candidate <= after) {
      candidate = localToUtc(year, month, day + daysUntil + 7, hours, minutes, timezone);
    }
    return candidate;
  }

  if (repeatType === "monthly" && monthDay !== undefined) {
    const clampedDay = Math.min(monthDay, daysInMonth(year, month));
    let candidate = localToUtc(year, month, clampedDay, hours, minutes, timezone);
    if (candidate <= after) {
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      const nextClampedDay = Math.min(monthDay, daysInMonth(nextYear, nextMonth));
      candidate = localToUtc(nextYear, nextMonth, nextClampedDay, hours, minutes, timezone);
    }
    return candidate;
  }

  return null;
}

export function calculateFirstRunTime(
  repeatType: "none" | "daily" | "weekly" | "monthly",
  scheduledDate: number,
  scheduledTime: string,
  timezone: string,
  weekDay?: number,
  monthDay?: number,
): number | null {
  if (repeatType === "none") {
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const { year, month, day } = getLocalParts(scheduledDate, timezone);
    return localToUtc(year, month, day, hours, minutes, timezone);
  }

  return calculateNextRunTime(repeatType, scheduledTime, timezone, weekDay, monthDay);
}

export function isExpired(expirationDate?: number): boolean {
  if (!expirationDate) return false;
  return Date.now() > expirationDate;
}
