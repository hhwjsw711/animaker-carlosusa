const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  amountInCents: number,
  currency: string,
  locale?: string,
): string {
  const key = `${currency}-${locale ?? "default"}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(key, fmt);
  }
  return fmt.format(amountInCents / 100);
}
