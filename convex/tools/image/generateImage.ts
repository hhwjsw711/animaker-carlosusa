import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { fal } from "@fal-ai/client";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { isCancelled, withTimeout, TOOL_TIMEOUT_IMAGE } from "../utils";
import { uploadToBunny } from "../../bunny/upload";
import { publicUrl } from "../../bunny/url";

export function createGenerateImageTool(
  userId?: string,
  threadId?: string,
) {
  return createTool({
    description:
      "Generate an image from a text description. Use when the user asks to create, draw, illustrate, design, or generate any kind of image or visual. Returns imageUrl and bunnyPath. If the request is vague, briefly ask about aspect ratio or style before generating. Write detailed, descriptive prompts for best results. Use addProductPhoto with the returned bunnyPath to attach the image to a product.",
    inputSchema: z.object({
      prompt: z.string().describe("A detailed description of the image to generate"),
      aspectRatio: z
        .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"])
        .optional()
        .describe("Aspect ratio for the image. Defaults to 1:1"),
    }),
    execute: async (ctx, input) => {
      try {
        // Check if user already cancelled before starting expensive API call
        if (await isCancelled(ctx, threadId)) {
          return { error: true, message: "Cancelled by user" };
        }

        const falKey = process.env.FAL_KEY;
        if (!falKey) {
          return { error: true, message: "Image service not configured" };
        }
        fal.config({ credentials: falKey });

        const result = await withTimeout(fal.subscribe("fal-ai/nano-banana-2", {
          input: {
            prompt: input.prompt,
            aspect_ratio: input.aspectRatio ?? "1:1",
            output_format: "webp",
            resolution: "1K",
            num_images: 1,
          },
        }), TOOL_TIMEOUT_IMAGE, "generateImage");

        const images = result.data?.images;
        if (!images || images.length === 0) {
          return { error: true, message: "No image was generated" };
        }

        const imageData = images[0];
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          return { error: true, message: "Failed to download generated image" };
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
            imageType: "generation",
          });
        }

        return {
          success: true,
          imageUrl,
          bunnyPath: uploaded.path,
          prompt: input.prompt,
        };
      } catch (err) {
        console.error("generateImage error:", err);
        const message =
          err instanceof Error ? err.message : "Image generation failed";
        return { error: true, message };
      }
    },
  });
}
