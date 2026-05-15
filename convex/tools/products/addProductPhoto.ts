import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createAddProductPhotoTool() {
  return createTool({
    description:
      "Add a photo to a product. Use the bunnyPath returned by generateImage or editImage to attach the generated image to a product in the catalog. WORKFLOW: Use listProducts first to find the productId. Only call once per bunnyPath — do not add the same photo twice.",
    inputSchema: z.object({
      productId: z.string().describe("The product ID to add the photo to"),
      bunnyPath: z.string().describe("The bunnyPath returned by generateImage or editImage"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.products.mutations.addProductPhotoInternal,
          {
            userId,
            productId: input.productId as Id<"products">,
            bunnyPath: input.bunnyPath,
          },
        );

        return {
          success: true,
          productId: input.productId,
          message: "Photo added to product successfully.",
        };
      } catch (err) {
        console.error("Add product photo failed:", err);
        const message = err instanceof Error ? err.message : "Failed to add photo to product";
        return { error: true, message };
      }
    },
  });
}
