export const DATE_MASKS: Record<string, { mask: string; placeholder: string }> = {
  "pt-BR": { mask: "##/##/####", placeholder: "DD/MM/AAAA" },
  "en-US": { mask: "##/##/####", placeholder: "MM/DD/YYYY" },
  "zh-CN": { mask: "####/##/##", placeholder: "YYYY/MM/DD" },
};

export function applyMask(value: string, mask: string): string {
  const digits = value.replace(/\D/g, "");
  let result = "";
  let digitIndex = 0;

  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === "#") {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += mask[i];
    }
  }

  return result;
}

export function isoToDisplay(iso: string, language: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (language === "zh-CN") return `${year}/${month}/${day}`;
  if (language === "pt-BR") return `${day}/${month}/${year}`;
  return `${month}/${day}/${year}`;
}

export function displayToIso(display: string, language: string): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  let day: number;
  let month: number;
  let year: number;

  if (language === "zh-CN") {
    year = parseInt(digits.slice(0, 4), 10);
    month = parseInt(digits.slice(4, 6), 10);
    day = parseInt(digits.slice(6, 8), 10);
  } else if (language === "pt-BR") {
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
  if (year < 1900 || year > new Date().getFullYear()) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  if (date > new Date()) return null;

  return [
    String(year),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}
