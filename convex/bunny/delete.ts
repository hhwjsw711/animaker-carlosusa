import { deleteObject } from "./client";

/** Deletes a single object from Bunny Storage. Silent on 404. */
export async function deleteFromBunny(path: string): Promise<void> {
  if (!path) return;
  await deleteObject(path);
}

/** Best-effort parallel delete; logs but doesn't throw on individual failures. */
export async function deleteManyFromBunny(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  await Promise.all(
    paths.map((p) =>
      deleteObject(p).catch((err) => {
        console.error(`[bunny] delete failed for ${p}:`, err);
      }),
    ),
  );
}
