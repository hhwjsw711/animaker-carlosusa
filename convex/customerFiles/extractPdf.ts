import { getDocumentProxy, extractText } from "unpdf";

const SCANNED_PDF_CHARS_PER_PAGE_THRESHOLD = 50;

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<{
  text: string;
  pageCount: number;
  isScanned: boolean;
}> {
  const document = await getDocumentProxy(new Uint8Array(buffer));

  try {
    const { totalPages, text } = await extractText(document, {
      mergePages: true,
    });

    const avgCharsPerPage = totalPages > 0 ? text.length / totalPages : 0;
    const isScanned = avgCharsPerPage < SCANNED_PDF_CHARS_PER_PAGE_THRESHOLD;

    return { text: text.trim(), pageCount: totalPages, isScanned };
  } finally {
    document.destroy();
  }
}
