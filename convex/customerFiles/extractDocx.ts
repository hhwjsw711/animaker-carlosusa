import { unzipSync } from "fflate";

/**
 * Extracts raw text from a .docx file buffer.
 * DOCX is a ZIP archive containing XML files. The main content is in word/document.xml.
 * We unzip, parse the XML, and extract text from <w:t> tags.
 */
export function extractTextFromDocx(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));

  const docEntry = files["word/document.xml"];
  if (!docEntry) {
    throw new Error("Invalid DOCX: word/document.xml not found");
  }

  const xml = new TextDecoder().decode(docEntry);

  // Extract text from <w:t> and <w:t xml:space="preserve"> tags
  // Each <w:p> is a paragraph — join runs within a paragraph, separate paragraphs with newlines
  const paragraphs: string[] = [];
  const paragraphRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;

  let pMatch;
  while ((pMatch = paragraphRegex.exec(xml)) !== null) {
    const paragraphXml = pMatch[0];
    const runs: string[] = [];
    let tMatch;
    textRegex.lastIndex = 0;
    while ((tMatch = textRegex.exec(paragraphXml)) !== null) {
      runs.push(tMatch[1]);
    }
    if (runs.length > 0) {
      paragraphs.push(runs.join(""));
    }
  }

  return paragraphs.join("\n").trim();
}
