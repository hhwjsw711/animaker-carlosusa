export type PaymentMethod = "pix" | "cash" | "credit_card" | "bank_transfer" | "boleto" | "other";

export type TransactionStatus = "pending" | "paid" | "overdue" | "cancelled";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "pix",
  "cash",
  "credit_card",
  "bank_transfer",
  "boleto",
  "other",
];

export const PAYMENT_METHOD_LABELS = {
  pix: "labels.pix",
  cash: "labels.cash",
  credit_card: "labels.creditCard",
  bank_transfer: "labels.bankTransfer",
  boleto: "labels.boleto",
  other: "labels.otherMethod",
} as const satisfies Record<PaymentMethod, string>;

export function todayIso(): string {
  const d = new Date();
  return [
    String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function displayToIsoAllowFuture(
  display: string,
  language: string,
): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  let day: number;
  let month: number;
  let year: number;

  if (language === "pt-BR") {
    day = parseInt(digits.slice(0, 2), 10);
    month = parseInt(digits.slice(2, 4), 10);
    year = parseInt(digits.slice(4, 8), 10);
  } else {
    month = parseInt(digits.slice(0, 2), 10);
    day = parseInt(digits.slice(2, 4), 10);
    year = parseInt(digits.slice(4, 8), 10);
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return [
    String(year),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}
