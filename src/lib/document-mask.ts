import { applyMask } from "@/lib/date-mask";

export const DOCUMENT_MASKS: Record<
  string,
  { type: "cpf" | "ssn"; mask: string; placeholder: string; digits: number }
> = {
  "pt-BR": {
    type: "cpf",
    mask: "###.###.###-##",
    placeholder: "000.000.000-00",
    digits: 11,
  },
  "en-US": {
    type: "ssn",
    mask: "###-##-####",
    placeholder: "000-00-0000",
    digits: 9,
  },
};

export function formatDocument(value: string, mask: string): string {
  return applyMask(value, mask);
}
