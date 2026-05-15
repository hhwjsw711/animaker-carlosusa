export function validateBirthDate(value: string): string | null {
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) return "Invalid month";
  if (day < 1 || day > 31) return "Invalid day";
  if (year < 1900 || year > new Date().getFullYear()) return "Invalid year";

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "Invalid date";
  }

  if (date > new Date()) return "Birth date cannot be in the future";

  return null;
}
