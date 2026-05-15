import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export function createListCustomerFilesTool(customerId: string) {
  return createTool({
    description:
      "List ALL files uploaded by the customer — names, sizes, types, and dates. Use this when the user asks what files they have, wants a summary of their documents, or asks about their uploaded content. This does NOT search file contents — use searchCustomerFiles for that.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      try {
        const files = await ctx.runQuery(
          internal.customerFiles.queries.listCustomerFileNames,
          { customerId: customerId as Id<"customers"> },
        );

        if (files.length === 0) {
          return {
            found: false,
            message: "No files uploaded for this customer.",
          };
        }

        return {
          found: true,
          fileCount: files.length,
          files: files.map((f: { name: string; size: number; type: string; category: string; status: string; createdAt: number; extractionMethod?: string; extractedCharCount?: number; extractionWarning?: string }) => ({
            name: f.name,
            size: `${(f.size / 1024).toFixed(1)} KB`,
            type: f.type,
            category: f.category,
            status: f.status,
            uploadedAt: new Date(f.createdAt).toISOString(),
            extractionMethod: f.extractionMethod,
            extractedCharCount: f.extractedCharCount,
            ...(f.extractionWarning
              ? { extractionWarning: f.extractionWarning }
              : {}),
          })),
        };
      } catch (err) {
        console.error("List customer files failed:", err);
        return {
          found: false,
          message: "Failed to list customer files.",
        };
      }
    },
  });
}
