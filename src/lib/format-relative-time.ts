import i18n from "@/i18n/config";

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const date = new Date(timestamp);
  const locale = i18n.language;

  if (diff < 60 * 1000) return i18n.t("time.now");

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}min`;
  }

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    const time = date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${i18n.t("time.yesterday")} ${time}`;
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(locale, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}
