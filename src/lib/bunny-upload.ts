/**
 * Uploads a file to Bunny via the Convex HTTP endpoint /api/bunny/upload.
 * Used for files larger than the 8MB action arg limit.
 */
export async function uploadToBunnyViaHttp(
  file: File,
  folder: string,
  token: string | null,
  allow?: string,
): Promise<string> {
  if (!token) throw new Error("Not authenticated");

  const baseUrl = import.meta.env.VITE_CONVEX_URL.replace(/\.cloud$/, ".site");
  const params = new URLSearchParams({ folder });
  if (allow) params.set("allow", allow);
  const url = `${baseUrl}/api/bunny/upload?${params.toString()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { bunnyPath: string };
  return data.bunnyPath;
}
