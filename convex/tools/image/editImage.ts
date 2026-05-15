import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { fal } from "@fal-ai/client";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { isCancelled, withTimeout, TOOL_TIMEOUT_IMAGE } from "../utils";
import { uploadToBunny } from "../../bunny/upload";
import { publicUrl } from "../../bunny/url";

export function createEditImageTool(
  userId?: string,
  threadId?: string,
) {
  return createTool({
    description:
      "Edit or modify an existing image. Use when the user asks to change, modify, alter, fix, or edit an image. Requires the URL of the source image (from a previous generation or user attachment).",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe("Description of the edits to apply to the image"),
      imageUrl: z
        .string()
        .url()
        .describe(
          "URL of the image to edit. Use the imageUrl from a previous generateImage result, or from an image the user attached in their message.",
        ),
    }),
    execute: async (ctx, input) => {
      try {
        if (await isCancelled(ctx, threadId)) {
          return { error: true, message: "Cancelled by user" };
        }

        const falKey = process.env.FAL_KEY;
        if (!falKey) {
          return { error: true, message: "Image service not configured" };
        }
        fal.config({ credentials: falKey });

        const result = await withTimeout(fal.subscribe("fal-ai/nano-banana-2/edit", {
          input: {
            prompt: input.prompt,
            image_urls: [input.imageUrl],
            output_format: "webp",
            resolution: "1K",
            num_images: 1,
          },
        }), TOOL_TIMEOUT_IMAGE, "editImage");

        const images = result.data?.images;
        if (!images || images.length === 0) {
          return { error: true, message: "No edited image was generated" };
        }

        const imageData = images[0];
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          return { error: true, message: "Failed to download edited image" };
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const mime = imageResponse.headers.get("content-type") || "image/webp";
        const size = imageData.file_size ?? arrayBuffer.byteLength;
        const folder = userId ? `images/${userId}` : "images/orphan";
        const uploaded = await uploadToBunny({
          bytes: arrayBuffer,
          contentType: mime,
          size,
          folder,
          allowedCategories: ["image"],
        });
        const imageUrl = publicUrl(uploaded.path);

        // Register as chat attachment for storage tracking
        if (userId && threadId) {
          await ctx.runMutation(
            internal.chatAttachments.mutations.registerGeneratedImage,
            {
              userId: userId as Id<"users">,
              threadId: threadId as Id<"threads">,
              bunnyPath: uploaded.path,
              size,
            },
          );
        }

        // Track usage
        if (userId) {
          await ctx.runMutation(internal.usage.mutations.trackUsage, {
            userId: userId as Id<"users">,
            source: "imageGeneration",
            imageType: "edit",
          });
        }

        return {
          success: true,
          imageUrl,
          bunnyPath: uploaded.path,
          prompt: input.prompt,
        };
      } catch (err) {
        console.error("editImage error:", err);
        const message =
          err instanceof Error ? err.message : "Image editing failed";
        return { error: true, message };
      }
    },
  });
}
