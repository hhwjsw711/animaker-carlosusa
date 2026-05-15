export const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "document",
  "text/plain": "document",
  "text/markdown": "document",
  "text/csv": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.oasis.opendocument.spreadsheet": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/msword": "document",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/mp4": "audio",
};

export const SIZE_LIMITS: Record<string, number> = {
  document: 10 * 1024 * 1024,
  image: 5 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
};

export const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(",");

export const MAX_CHAT_ATTACHMENTS = 5;

export const ATTACHED_FILE_PREFIX = "[Attached file: ";
export const ATTACHED_FILE_REGEX = /^\[Attached file: (.+?)\]/;
export const IMAGE_URL_PREFIX = "[Image URL: ";
