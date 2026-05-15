import * as XLSX from "xlsx";

export function extractTextFromSpreadsheet(buffer: ArrayBuffer): {
  text: string;
  sheetCount: number;
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    parts.push(`## ${sheetName}`);
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) {
      parts.push(csv.trim());
    }
  }

  return {
    text: parts.join("\n\n"),
    sheetCount: workbook.SheetNames.length,
  };
}
