import { ACCEPTED_TYPES, SIZE_LIMITS } from "../lib/fileConstants";

/**
 * Ensures a user-supplied bunnyPath falls under the expected folder prefix.
 * Prevents a user from registering a file path they don't own (e.g. persisting
 * another user's upload path in their own record).
 */
export function assertBunnyPathPrefix(
  bunnyPath: string,
  expectedPrefix: string,
): void {
  const prefix = expectedPrefix.endsWith("/")
    ? expectedPrefix
    : `${expectedPrefix}/`;
  if (!bunnyPath.startsWith(prefix)) {
    throw new Error("Invalid file path");
  }
  // Defense in depth: reject traversal / control chars.
  if (bunnyPath.includes("..") || bunnyPath.includes("%")) {
    throw new Error("Invalid file path");
  }
}

export type FileCategory = "image" | "document" | "audio";

export const IMAGE_ONLY: readonly FileCategory[] = ["image"] as const;
export const ANY_CATEGORY: readonly FileCategory[] = [
  "image",
  "document",
  "audio",
] as const;

export function assertAllowedMime(
  mime: string,
  allowedCategories: readonly FileCategory[],
): FileCategory {
  const category = ACCEPTED_TYPES[mime];
  if (!category || !allowedCategories.includes(category as FileCategory)) {
    throw new Error(`File type not allowed: ${mime}`);
  }
  return category as FileCategory;
}

export function assertMaxSize(bytes: number, category: FileCategory): void {
  const max = SIZE_LIMITS[category];
  if (max === undefined) {
    throw new Error(`Unknown size limit for category: ${category}`);
  }
  if (bytes > max) {
    throw new Error(
      `File too large: ${Math.round(bytes / 1024)}KB exceeds ${Math.round(max / 1024 / 1024)}MB limit`,
    );
  }
}

function startsWith(bytes: Uint8Array, sig: readonly number[]): boolean {
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return false;
  return true;
}

/** Magic-byte signatures for types where declared Content-Type is not enough. */
const MAGIC: Record<string, readonly (readonly number[])[]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF; WEBP tag is at offset 8, partial check OK
  "application/pdf": [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.oasis.opendocument.spreadsheet": [[0x50, 0x4b, 0x03, 0x04]],
  "application/vnd.ms-excel": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // legacy .xls
    [0x50, 0x4b, 0x03, 0x04], // some exporters write xlsx-style
  ],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "audio/mpeg": [
    [0x49, 0x44, 0x33], // ID3
    [0xff, 0xfb],
    [0xff, 0xf3],
    [0xff, 0xf2],
  ],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46]], // RIFF; WAVE tag at offset 8
  "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]],
  // audio/mp4 has magic at offset 4 ("ftyp"); check separately below
};

/**
 * Validates that the file bytes start with a signature matching the declared
 * contentType. Text types (plain/markdown/csv) skip validation.
 */
export function assertMagicBytes(
  bytes: ArrayBuffer | Uint8Array,
  contentType: string,
): void {
  // Text-based formats have no reliable magic — trust declared type.
  if (
    contentType === "text/plain" ||
    contentType === "text/markdown" ||
    contentType === "text/csv"
  ) {
    return;
  }

  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  // audio/mp4: "ftyp" at offset 4
  if (contentType === "audio/mp4") {
    if (
      view.length >= 8 &&
      view[4] === 0x66 &&
      view[5] === 0x74 &&
      view[6] === 0x79 &&
      view[7] === 0x70
    ) {
      return;
    }
    throw new Error(`File content does not match declared type ${contentType}`);
  }

  const sigs = MAGIC[contentType];
  if (!sigs) {
    // Unknown type — already rejected by assertAllowedMime if not whitelisted.
    return;
  }

  for (const sig of sigs) {
    if (startsWith(view, sig)) return;
  }
  throw new Error(`File content does not match declared type ${contentType}`);
}

