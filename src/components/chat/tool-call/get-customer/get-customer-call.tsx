import { UserSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ToolCallWrapper } from "../tool-call-wrapper";
import type { ToolCallProps } from "../registry";

export function GetCustomerCall({ output, isLoading }: ToolCallProps) {
  const { t } = useTranslation();

  return (
    <ToolCallWrapper
      icon={<UserSearch className="size-4.5 min-w-4.5 min-h-4.5" />}
      label={t("tools.gettingCustomer")}
      isLoading={isLoading}
    >
      {output?.found && (
        <p className="text-muted-foreground">{output.customer.name}</p>
      )}
      {output?.error && (
        <p className="text-muted-foreground">{output.message}</p>
      )}
    </ToolCallWrapper>
  );
}
