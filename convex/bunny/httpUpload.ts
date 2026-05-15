import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { uploadToBunny } from "./upload";
import { ANY_CATEGORY, type FileCategory } from "./validate";

const ALLOWED_FOLDER_PREFIXES = [
  "users",
  "companies",
  "customers",
  "collaborators",
  "products",
  "companyFiles",
  "customerFiles",
  "chat",
  "blog",
  "images",
] as const;

// Strict: alphanumeric + _ and - inside segments; 2-3 segments total; no "..", "%", or leading/trailing slashes.
const FOLDER_RE = /^[a-zA-Z][a-zA-Z0-9]*(?:\/[a-zA-Z0-9_-]+){1,2}$/;

function isAllowedFolder(folder: string): boolean {
  if (!FOLDER_RE.test(folder)) return false;
  if (folder.includes("..")) return false;
  const prefix = folder.split("/")[0];
  return (ALLOWED_FOLDER_PREFIXES as readonly string[]).includes(prefix);
}

function allowedOrigins(): readonly string[] {
  const raw = process.env.BUNNY_UPLOAD_ALLOWED_ORIGINS;
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Fallback: the deploy's own site URL (if configured) plus local dev ports.
  // Keeps uploads working in prod without requiring an extra env var and still
  // rejects every other origin.
  const defaults = ["http://localhost:5180", "http://localhost:5181", "http://localhost:5182", "http://localhost:5183"];
  const siteUrl = process.env.VITE_SITE_URL?.trim();
  if (siteUrl) defaults.unshift(siteUrl);
  return defaults;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Digest",
    "Access-Control-Max-Age": "3600",
    Vary: "Origin",
  };
  const allowlist = allowedOrigins();
  if (origin && allowlist.includes(origin)) {
    base["Access-Control-Allow-Origin"] = origin;
  }
  return base;
}

const PARSE_CATEGORY: Record<string, FileCategory> = {
  image: "image",
  document: "document",
  audio: "audio",
};

/**
 * POST /api/bunny/upload?folder=...&allow=image,document,audio
 *
 * Body: raw file bytes.
 * Headers: Authorization: Bearer <Convex session token>, Content-Type: <mime>.
 *
 * Streams body to Bunny Storage and returns { bunnyPath }.
 * Used for files larger than the action arg limit (8MB).
 */
export const upload = httpAction(async (ctx, req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders(origin),
    });
  }

  try {
    await ctx.runMutation(internal.rateLimit.mutations.checkUploadRateLimit, {
      userId,
    });
  } catch {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: corsHeaders(origin),
    });
  }

  const url = new URL(req.url);
  const folder = url.searchParams.get("folder");
  if (!folder || !isAllowedFolder(folder)) {
    return new Response("Invalid folder", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const allowParam = url.searchParams.get("allow");
  const allowedCategories: readonly FileCategory[] = allowParam
    ? allowParam
        .split(",")
        .map((s) => PARSE_CATEGORY[s.trim()])
        .filter((v): v is FileCategory => Boolean(v))
    : ANY_CATEGORY;

  if (allowedCategories.length === 0) {
    return new Response("Invalid allow categories", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const contentType = req.headers.get("Content-Type") ?? "application/octet-stream";

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return new Response("Empty body", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  try {
    const result = await uploadToBunny({
      bytes,
      contentType,
      size: bytes.byteLength,
      folder,
      allowedCategories,
    });

    return new Response(JSON.stringify({ bunnyPath: result.path }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(origin),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(origin),
      },
    });
  }
});
