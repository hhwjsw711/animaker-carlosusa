import type { ContentPart, AgentMessage } from "@/types/chat";
import { ATTACHED_FILE_PREFIX, ATTACHED_FILE_REGEX, IMAGE_URL_PREFIX } from "@/lib/file-constants";

// ---------------------------------------------------------------------------
// Message text extraction
// ---------------------------------------------------------------------------

export function getTextContent(msg: AgentMessage): string {
  const content = msg.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("");
  }
  return "";
}

/** For user messages: extract only the user's text, excluding injected file content. */
export function getUserTextContent(msg: AgentMessage): string {
  const content = msg.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p) => p.type === "text" && p.text && !p.text.startsWith(ATTACHED_FILE_PREFIX) && !p.text.startsWith(IMAGE_URL_PREFIX))
      .map((p) => p.text!)
      .join("");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Tool call / result extraction
// ---------------------------------------------------------------------------

export function getToolCalls(msg: AgentMessage): ContentPart[] {
  const content = msg.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((p) => p.type === "tool-call");
}

export function getToolResults(msg: AgentMessage): ContentPart[] {
  const content = msg.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((p) => p.type === "tool-result");
}

export function resolveToolOutput(part: ContentPart): unknown {
  const output = part.output;
  if (!output) return null;
  if (typeof output === "object" && "value" in output) return output.value;
  return output;
}

// ---------------------------------------------------------------------------
// Attachment parts
// ---------------------------------------------------------------------------

/** Get all content parts relevant for attachment display (images, files, and attached file text parts). */
export function getAllContentParts(msg: AgentMessage): ContentPart[] {
  const content = msg.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter(
    (p) =>
      p.type === "image" ||
      p.type === "file" ||
      (p.type === "text" && p.text?.startsWith(ATTACHED_FILE_PREFIX)),
  );
}

/** Check if a user message has any attachment-related content parts. */
export function hasAttachmentParts(msg: AgentMessage): boolean {
  const content = msg.message?.content;
  if (!Array.isArray(content)) return false;
  return content.some(
    (p) =>
      p.type === "image" ||
      p.type === "file" ||
      (p.type === "text" && p.text?.startsWith(ATTACHED_FILE_PREFIX)),
  );
}

// ---------------------------------------------------------------------------
// Image / file helpers (used by MessageAttachments)
// ---------------------------------------------------------------------------

export function resolveImageSrc(part: ContentPart): string | undefined {
  if (typeof part.image === "string") return part.image;
  if (part.image instanceof URL) return part.image.toString();
  return undefined;
}

export function getImageGridClass(count: number): string {
  if (count === 1) return "grid-cols-1 max-w-64";
  if (count === 2) return "grid-cols-2 max-w-72";
  return "grid-cols-2 max-w-72";
}

/** Extract attached file names from text parts like "[Attached file: CV2026.pdf]\n..." */
export function extractAttachedFileNames(parts: ContentPart[]): string[] {
  const names: string[] = [];
  for (const p of parts) {
    if (p.type === "text" && p.text?.startsWith(ATTACHED_FILE_PREFIX)) {
      const match = p.text.match(ATTACHED_FILE_REGEX);
      if (match) names.push(match[1]);
    }
  }
  return names;
}
