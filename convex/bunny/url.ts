import { getBunnyEnv } from "./client";

export type OptimizerOpts = {
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "jpeg" | "png";
  quality?: number;
};

function cleanPath(path: string): string {
  return "/" + path.replace(/^\/+/, "");
}

function buildOptimizerQuery(opts: OptimizerOpts | undefined): string {
  if (!opts) return "";
  const params: string[] = [];
  if (opts.width) params.push(`width=${opts.width}`);
  if (opts.height) params.push(`height=${opts.height}`);
  if (opts.format) params.push(`format=${opts.format}`);
  if (opts.quality) params.push(`quality=${opts.quality}`);
  return params.length ? `?${params.join("&")}` : "";
}

/** Public CDN URL with optional Optimizer transforms. No token. */
export function publicUrl(path: string, opts?: OptimizerOpts): string {
  const env = getBunnyEnv();
  const base = env.cdnUrl.replace(/\/+$/, "");
  return `${base}${cleanPath(path)}${buildOptimizerQuery(opts)}`;
}

async function sha256Base64Url(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export type SignedUrlOpts = OptimizerOpts & {
  /** Time-to-live in seconds. Defaults to 15 minutes. */
  ttlSeconds?: number;
};

/**
 * Bunny CDN Token Authentication (SHA-256 variant).
 * The Pull Zone must be configured with Token Authentication + SHA256 + the
 * same key set in BUNNY_TOKEN_AUTH_KEY.
 */
export async function signedUrl(
  path: string,
  opts: SignedUrlOpts = {},
): Promise<string> {
  const env = getBunnyEnv();
  const ttl = opts.ttlSeconds ?? 15 * 60;
  const expires = Math.floor(Date.now() / 1000) + ttl;
  const cleanP = cleanPath(path);

  const optimizerQuery = buildOptimizerQuery(opts);
  const queryForSigning = optimizerQuery ? optimizerQuery.slice(1) : "";
  const signInput =
    env.tokenAuthKey + cleanP + expires + (queryForSigning ?? "");
  const token = await sha256Base64Url(signInput);

  const base = env.cdnUrl.replace(/\/+$/, "");
  const sep = optimizerQuery ? "&" : "?";
  return `${base}${cleanP}${optimizerQuery}${sep}token=${token}&expires=${expires}`;
}
