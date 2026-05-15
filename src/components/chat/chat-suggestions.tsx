import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

interface Suggestion {
  labelKey: string;
  promptKey: string;
}

const segmentCustomerSuggestions: Suggestion[] = [
  { labelKey: "suggestions.segment.customer.listServices", promptKey: "suggestions.segment.customer.listServicesPrompt" },
  { labelKey: "suggestions.segment.customer.listProducts", promptKey: "suggestions.segment.customer.listProductsPrompt" },
  { labelKey: "suggestions.segment.customer.listAppointments", promptKey: "suggestions.segment.customer.listAppointmentsPrompt" },
  { labelKey: "suggestions.segment.customer.billingSummary", promptKey: "suggestions.segment.customer.billingSummaryPrompt" },
  { labelKey: "suggestions.segment.customer.createAppointment", promptKey: "suggestions.segment.customer.createAppointmentPrompt" },
  { labelKey: "suggestions.segment.customer.createNote", promptKey: "suggestions.segment.customer.createNotePrompt" },
];

const segmentGeneralSuggestions: Suggestion[] = [
  { labelKey: "suggestions.segment.general.listServices", promptKey: "suggestions.segment.general.listServicesPrompt" },
  { labelKey: "suggestions.segment.general.listProducts", promptKey: "suggestions.segment.general.listProductsPrompt" },
  { labelKey: "suggestions.segment.general.listAppointments", promptKey: "suggestions.segment.general.listAppointmentsPrompt" },
  { labelKey: "suggestions.segment.general.billingSummary", promptKey: "suggestions.segment.general.billingSummaryPrompt" },
  { labelKey: "suggestions.segment.general.createService", promptKey: "suggestions.segment.general.createServicePrompt" },
  { labelKey: "suggestions.segment.general.createProduct", promptKey: "suggestions.segment.general.createProductPrompt" },
];

const supportCustomerSuggestions: Suggestion[] = [
  { labelKey: "suggestions.support.customer.viewProfile", promptKey: "suggestions.support.customer.viewProfilePrompt" },
  { labelKey: "suggestions.support.customer.searchFiles", promptKey: "suggestions.support.customer.searchFilesPrompt" },
  { labelKey: "suggestions.support.customer.draftEmail", promptKey: "suggestions.support.customer.draftEmailPrompt" },
  { labelKey: "suggestions.support.customer.draftWhatsApp", promptKey: "suggestions.support.customer.draftWhatsAppPrompt" },
  { labelKey: "suggestions.support.customer.webSearch", promptKey: "suggestions.support.customer.webSearchPrompt" },
  { labelKey: "suggestions.support.customer.askCapabilities", promptKey: "suggestions.support.customer.askCapabilitiesPrompt" },
];

const supportGeneralSuggestions: Suggestion[] = [
  { labelKey: "suggestions.support.general.listCustomers", promptKey: "suggestions.support.general.listCustomersPrompt" },
  { labelKey: "suggestions.support.general.createCustomer", promptKey: "suggestions.support.general.createCustomerPrompt" },
  { labelKey: "suggestions.support.general.sendMessage", promptKey: "suggestions.support.general.sendMessagePrompt" },
  { labelKey: "suggestions.support.general.webSearch", promptKey: "suggestions.support.general.webSearchPrompt" },
  { labelKey: "suggestions.support.general.helpWriting", promptKey: "suggestions.support.general.helpWritingPrompt" },
  { labelKey: "suggestions.support.general.askCapabilities", promptKey: "suggestions.support.general.askCapabilitiesPrompt" },
];

interface ChatSuggestionsProps {
  onSelect: (prompt: string) => void;
  hasCustomer: boolean;
}

export function ChatSuggestions({ onSelect, hasCustomer }: ChatSuggestionsProps) {
  const { t } = useTranslation();
  const segmentSuggestions = hasCustomer ? segmentCustomerSuggestions : segmentGeneralSuggestions;
  const supportSuggestions = hasCustomer ? supportCustomerSuggestions : supportGeneralSuggestions;

  return (
    <div className="flex h-full flex-col items-center gap-8 mx-auto max-w-3xl overflow-y-auto px-8 py-4 md:justify-center md:py-0">
      {/* Segment section */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{t("suggestions.segment.title")}</p>
          <p className="text-sm text-muted-foreground">{t("suggestions.segment.description")}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
          {segmentSuggestions.map((item) => (
            <button
              key={item.labelKey}
              type="button"
              onClick={() => onSelect(t(item.promptKey as never))}
              className="flex w-full cursor-pointer items-center gap-1 rounded-lg border border-border p-2 text-left text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            >
              <ChevronRight className="size-4.5 shrink-0" />
              <span>{t(item.labelKey as never)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Support section */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{t("suggestions.support.title")}</p>
          <p className="text-sm text-muted-foreground">{t("suggestions.support.description")}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
          {supportSuggestions.map((item) => (
            <button
              key={item.labelKey}
              type="button"
              onClick={() => onSelect(t(item.promptKey as never))}
              className="flex w-full cursor-pointer items-center gap-1 rounded-lg border border-border p-2 text-left text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            >
              <ChevronRight className="size-4.5 shrink-0" />
              <span>{t(item.labelKey as never)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
