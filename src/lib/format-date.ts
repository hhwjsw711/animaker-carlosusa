import i18n from "@/i18n/config";

export function formatDate(
  date: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const locale = i18n.language;
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString(locale, options ?? { dateStyle: "medium" });
}

export function formatDateTime(
  date: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const locale = i18n.language;
  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleString(
    locale,
    options ?? { dateStyle: "medium", timeStyle: "short" },
  );
}

export function formatFullDateTime(date?: Date): string {
  const locale = i18n.language;
  const d = date ?? new Date();

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}
