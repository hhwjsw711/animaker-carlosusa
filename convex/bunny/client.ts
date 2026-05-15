type BunnyEnv = {
  storageZone: string;
  storageApiKey: string;
  storageHostname: string;
  cdnUrl: string;
  tokenAuthKey: string;
};

export function getBunnyEnv(): BunnyEnv {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
  const cdnUrl = process.env.BUNNY_CDN_URL;
  const tokenAuthKey = process.env.BUNNY_TOKEN_AUTH_KEY;
  const storageHostname =
    process.env.BUNNY_STORAGE_HOSTNAME ?? "storage.bunnycdn.com";

  if (!storageZone || !storageApiKey || !cdnUrl || !tokenAuthKey) {
    throw new Error(
      "Bunny.net is not configured: set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_CDN_URL, BUNNY_TOKEN_AUTH_KEY",
    );
  }

  return { storageZone, storageApiKey, storageHostname, cdnUrl, tokenAuthKey };
}

function storageUrl(env: BunnyEnv, path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `https://${env.storageHostname}/${env.storageZone}/${clean}`;
}

export async function putObject(
  path: string,
  body: ArrayBuffer | Blob,
  contentType: string,
): Promise<void> {
  const env = getBunnyEnv();
  const res = await fetch(storageUrl(env, path), {
    method: "PUT",
    headers: {
      AccessKey: env.storageApiKey,
      "Content-Type": contentType,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny PUT failed (${res.status}): ${text}`);
  }
}

export async function deleteObject(path: string): Promise<void> {
  const env = getBunnyEnv();
  const res = await fetch(storageUrl(env, path), {
    method: "DELETE",
    headers: { AccessKey: env.storageApiKey },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bunny DELETE failed (${res.status}): ${text}`);
  }
}

export async function getObjectBytes(path: string): Promise<ArrayBuffer> {
  const env = getBunnyEnv();
  const res = await fetch(storageUrl(env, path), {
    method: "GET",
    headers: { AccessKey: env.storageApiKey },
  });
  if (!res.ok) {
    throw new Error(`Bunny GET failed (${res.status})`);
  }
  return await res.arrayBuffer();
}
