import { putObject } from "./client";
import {
  assertAllowedMime,
  assertMagicBytes,
  assertMaxSize,
  type FileCategory,
} from "./validate";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

export function extFor(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

function randomId(): string {
  // 16 bytes, base64url — collision-free for path segments.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export type UploadInput = {
  bytes: ArrayBuffer;
  contentType: string;
  size: number;
  /** Logical folder within the zone, e.g. `users/{userId}`. */
  folder: string;
  /** Optional pre-generated filename (without extension). */
  basename?: string;
  /** Allowed categories; upload fails if the MIME is outside this set. */
  allowedCategories: readonly FileCategory[];
};

export type UploadResult = {
  path: string;
  contentType: string;
  size: number;
  category: FileCategory;
};

/**
 * Validates then uploads bytes to Bunny Storage. Returns the relative path
 * (without host) — store this in the DB, use url helpers to build public URLs.
 */
export async function uploadToBunny(input: UploadInput): Promise<UploadResult> {
  const category = assertAllowedMime(input.contentType, input.allowedCategories);
  assertMaxSize(input.size, category);
  assertMagicBytes(input.bytes, input.contentType);

  const name = input.basename ?? randomId();
  const ext = extFor(input.contentType);
  const cleanFolder = input.folder.replace(/^\/+|\/+$/g, "");
  const path = `${cleanFolder}/${name}.${ext}`;

  await putObject(path, input.bytes, input.contentType);

  return { path, contentType: input.contentType, size: input.size, category };
}
