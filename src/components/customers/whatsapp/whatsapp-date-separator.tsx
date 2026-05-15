import { useTranslation } from "react-i18next";

interface WhatsAppDateSeparatorProps {
  date: Date;
}

export function WhatsAppDateSeparator({ date }: WhatsAppDateSeparatorProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (date.toDateString() === today.toDateString()) {
    label = t("labels.today");
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = t("time.yesterday");
  } else {
    label = date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="flex items-center justify-center py-3">
      <span className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}
