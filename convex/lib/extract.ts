import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

export { extractTextFromPdf } from "../customerFiles/extractPdf";
export { extractTextFromSpreadsheet } from "../customerFiles/extractSpreadsheet";

const EXTRACTION_MODEL = "google/gemini-2.0-flash-001";
const GEMINI_MAX_TOKENS = 16384;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function extractTextFromBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer).trim();
}

interface ExtractionResult {
  text: string;
  truncated: boolean;
  usage: { inputTokens: number; outputTokens: number };
}

export async function extractWithGemini(
  base64: string,
  mimeType: string,
  category: string,
): Promise<ExtractionResult> {
  const promptByCategory: Record<string, string> = {
    document:
      "Extract ALL text content from this document. Preserve the structure, headings, and formatting as much as possible. Return only the extracted text, nothing else.",
    image:
      "Describe this image in detail. Include all visible text, objects, people, scenes, colors, and any relevant information. Be thorough and precise.",
    audio:
      "Transcribe the audio content completely. Include all spoken words. If there are multiple speakers, indicate speaker changes. Return only the transcription.",
  };

  const result = await generateText({
    model: openrouter.chat(EXTRACTION_MODEL),
    maxOutputTokens: GEMINI_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: base64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: promptByCategory[category] ?? promptByCategory.document,
          },
        ],
      },
    ],
  });

  return {
    text: result.text.trim(),
    truncated: result.finishReason === "length",
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  };
}
